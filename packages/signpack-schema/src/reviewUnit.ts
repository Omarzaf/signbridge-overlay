import {
  REVIEW_UNIT_SCHEMA_VERSION,
  SEMVER_PATTERN,
  type ReviewUnitV2,
  type ValidationIssue,
  type ValidationResult,
} from "./types";

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const ISO_639_3_PATTERN = /^[a-z]{3}$/u;
const REGION_PATTERN = /^[A-Z]{2}$/u;
const REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/u;

const ID_PATTERNS = {
  reviewUnit: /^runit_[a-z0-9]{12,64}$/u,
  proposal: /^proposal_[a-z0-9]{12,64}$/u,
  run: /^run_[a-z0-9]{12,64}$/u,
  pack: /^spk_[a-z0-9]{12,64}$/u,
  segment: /^seg_[a-z0-9]{12,64}$/u,
} as const;

const MAX_SEGMENT_MS = 86_400_000;

class Collector {
  readonly issues: ValidationIssue[] = [];

  add(path: string, code: string, message: string): void {
    this.issues.push({ path, code, message });
  }
}

function asObject(
  value: unknown,
  path: string,
  collector: Collector,
): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    collector.add(path, "type", "must be an object");
    return undefined;
  }
  try {
    return { ...(value as Record<string, unknown>) };
  } catch {
    collector.add(path, "unsafe_input", "could not be read safely");
    return undefined;
  }
}

function stringField(
  source: Record<string, unknown>,
  key: string,
  path: string,
  pattern: RegExp,
  collector: Collector,
): string | undefined {
  const value = source[key];
  if (typeof value !== "string") {
    collector.add(`${path}.${key}`, "type", "must be a string");
    return undefined;
  }
  if (!pattern.test(value)) {
    collector.add(`${path}.${key}`, "pattern", "does not match its contract");
    return undefined;
  }
  return value;
}

function integerField(
  source: Record<string, unknown>,
  key: string,
  path: string,
  collector: Collector,
): number | undefined {
  const value = source[key];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_SEGMENT_MS
  ) {
    collector.add(
      `${path}.${key}`,
      "range",
      `must be a whole number of milliseconds between 0 and ${MAX_SEGMENT_MS}`,
    );
    return undefined;
  }
  return value;
}

function booleanFalseField(
  source: Record<string, unknown>,
  key: string,
  path: string,
  collector: Collector,
): boolean {
  const value = source[key];
  if (value !== false) {
    collector.add(
      `${path}.${key}`,
      "presentation_transform",
      "must be false; approval covers the untransformed asset only",
    );
    return false;
  }
  return true;
}

/**
 * Structural validation of a review unit. It proves the unit is well formed and
 * internally consistent. It does not prove that a reviewer approved anything,
 * that rights exist, or that the referenced media is real.
 */
export function validateReviewUnit(
  input: unknown,
): ValidationResult<ReviewUnitV2> {
  const collector = new Collector();
  const root = asObject(input, "$", collector);
  if (root === undefined) {
    return { ok: false, issues: collector.issues };
  }

  if (root["schemaVersion"] !== REVIEW_UNIT_SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${REVIEW_UNIT_SCHEMA_VERSION}`,
    );
  }

  stringField(root, "reviewUnitId", "$", ID_PATTERNS.reviewUnit, collector);
  stringField(root, "proposalId", "$", ID_PATTERNS.proposal, collector);
  stringField(root, "runId", "$", ID_PATTERNS.run, collector);
  stringField(root, "packId", "$", ID_PATTERNS.pack, collector);
  stringField(root, "segmentId", "$", ID_PATTERNS.segment, collector);

  const source = asObject(root["source"], "$.source", collector);
  if (source !== undefined) {
    stringField(source, "fingerprint", "$.source", HASH_PATTERN, collector);
    stringField(source, "timedTextHash", "$.source", HASH_PATTERN, collector);
    const startMs = integerField(source, "startMs", "$.source", collector);
    const endMs = integerField(source, "endMs", "$.source", collector);
    if (startMs !== undefined && endMs !== undefined && endMs <= startMs) {
      collector.add(
        "$.source.endMs",
        "segment_range",
        "must be greater than startMs",
      );
    }
  }

  const language = asObject(root["language"], "$.language", collector);
  if (language !== undefined) {
    stringField(
      language,
      "signedLanguage",
      "$.language",
      ISO_639_3_PATTERN,
      collector,
    );
    stringField(language, "region", "$.language", REGION_PATTERN, collector);
  }

  const catalog = asObject(root["catalog"], "$.catalog", collector);
  if (catalog !== undefined) {
    stringField(
      catalog,
      "catalogVersion",
      "$.catalog",
      SEMVER_PATTERN,
      collector,
    );
    stringField(
      catalog,
      "candidateSetHash",
      "$.catalog",
      HASH_PATTERN,
      collector,
    );
  }

  const selection = asObject(root["selection"], "$.selection", collector);
  if (selection !== undefined) {
    const translationStatus = selection["translationStatus"];
    if (
      translationStatus !== "proposed" &&
      translationStatus !== "mapped" &&
      translationStatus !== "unsupported"
    ) {
      collector.add(
        "$.selection.translationStatus",
        "enum",
        "must be one of: proposed, mapped, unsupported",
      );
    }

    const assetHashes = selection["assetHashes"];
    if (!Array.isArray(assetHashes)) {
      collector.add("$.selection.assetHashes", "type", "must be an array");
    } else {
      if (assetHashes.length > 1) {
        collector.add(
          "$.selection.assetHashes",
          "multi_asset_violation",
          "must reference at most one asset per segment",
        );
      }
      assetHashes.forEach((hash, index) => {
        if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
          collector.add(
            `$.selection.assetHashes[${index}]`,
            "pattern",
            "must be an exact sha256 media hash",
          );
        }
      });
      if (translationStatus === "mapped" && assetHashes.length !== 1) {
        collector.add(
          "$.selection.assetHashes",
          "selection_state",
          "a mapped selection must reference exactly one asset",
        );
      }
      if (translationStatus === "unsupported" && assetHashes.length !== 0) {
        collector.add(
          "$.selection.assetHashes",
          "selection_state",
          "an unsupported selection must reference no asset",
        );
      }
    }

    const reasonCode = selection["reasonCode"];
    if (reasonCode !== undefined) {
      if (
        typeof reasonCode !== "string" ||
        !REASON_CODE_PATTERN.test(reasonCode)
      ) {
        collector.add(
          "$.selection.reasonCode",
          "pattern",
          "does not match its contract",
        );
      }
    } else if (translationStatus === "unsupported") {
      collector.add(
        "$.selection.reasonCode",
        "required",
        "an unsupported selection must state its reason code",
      );
    }
  }

  const presentation = asObject(
    root["presentation"],
    "$.presentation",
    collector,
  );
  if (presentation !== undefined) {
    booleanFalseField(presentation, "cropped", "$.presentation", collector);
    booleanFalseField(presentation, "mirrored", "$.presentation", collector);
    booleanFalseField(presentation, "transformed", "$.presentation", collector);
  }

  if (collector.issues.length > 0) {
    return { ok: false, issues: collector.issues };
  }
  return { ok: true, value: root as unknown as ReviewUnitV2 };
}

function canonicalString(value: string): string {
  return JSON.stringify(value);
}

/**
 * The canonical serialization a review unit hash is taken over.
 *
 * Canonicalisation rules, fixed by this function and by
 * `contracts/review-unit.schema.json`:
 *
 * - Every bound field is emitted explicitly, in the order written here, so key
 *   order in the caller's object cannot change the result.
 * - Numbers are emitted as base-ten integers; the schema admits no other form.
 * - Strings are emitted with `JSON.stringify` escaping and no normalisation, so
 *   two differently-encoded strings stay different.
 * - Absent optional fields are emitted as `null`, never omitted, so "absent"
 *   and "present but empty" cannot collide.
 *
 * The unit is validated first. An invalid unit throws rather than producing a
 * hash that would look authoritative.
 */
export function canonicalizeReviewUnit(unit: ReviewUnitV2): string {
  const validation = validateReviewUnit(unit);
  if (!validation.ok) {
    throw new TypeError(
      `review unit is not canonicalizable: ${validation.issues
        .map((issue) => `${issue.path} ${issue.code}`)
        .join(", ")}`,
    );
  }
  const value = validation.value;

  const parts = [
    `"schemaVersion":${canonicalString(value.schemaVersion)}`,
    `"reviewUnitId":${canonicalString(value.reviewUnitId)}`,
    `"proposalId":${canonicalString(value.proposalId)}`,
    `"runId":${canonicalString(value.runId)}`,
    `"packId":${canonicalString(value.packId)}`,
    `"segmentId":${canonicalString(value.segmentId)}`,
    `"source":{` +
      `"fingerprint":${canonicalString(value.source.fingerprint)},` +
      `"timedTextHash":${canonicalString(value.source.timedTextHash)},` +
      `"startMs":${value.source.startMs.toString(10)},` +
      `"endMs":${value.source.endMs.toString(10)}}`,
    `"language":{` +
      `"signedLanguage":${canonicalString(value.language.signedLanguage)},` +
      `"region":${canonicalString(value.language.region)}}`,
    `"catalog":{` +
      `"catalogVersion":${canonicalString(value.catalog.catalogVersion)},` +
      `"candidateSetHash":${canonicalString(value.catalog.candidateSetHash)}}`,
    `"selection":{` +
      `"translationStatus":${canonicalString(
        value.selection.translationStatus,
      )},` +
      `"assetHashes":[${value.selection.assetHashes
        .map((hash) => canonicalString(hash))
        .join(",")}],` +
      `"reasonCode":${
        value.selection.reasonCode === undefined
          ? "null"
          : canonicalString(value.selection.reasonCode)
      }}`,
    `"presentation":{"cropped":false,"mirrored":false,"transformed":false}`,
  ];

  return `{${parts.join(",")}}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The exact hash a human approval signs. Uses WebCrypto, which both the Node
 * targets and the browser runtime provide, so the playback path stays
 * dependency-free.
 */
export async function computeReviewUnitHash(
  unit: ReviewUnitV2,
): Promise<string> {
  const canonical = canonicalizeReviewUnit(unit);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${toHex(digest)}`;
}
