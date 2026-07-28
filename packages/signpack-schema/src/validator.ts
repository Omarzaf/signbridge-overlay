import {
  CONTEST_EVIDENCE_CATEGORIES,
  CONTEST_EVIDENCE_METHODS,
  RELEASE_CHANNELS,
  RELEASE_PURPOSES,
  SCHEMA_VERSION,
  SEMVER_PATTERN,
  type AssetLedger,
  type ContestEvidence,
  type ContestEvidenceCategory,
  type DraftReleaseCandidateSignPack,
  type ReviewEvent,
  type ReleaseRequest,
  type ReleaseScope,
  type RunManifest,
  type SignPack,
  type StructurallyValidReleaseCandidate,
  type ValidationIssue,
  type ValidationResult,
} from "./types";

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const ISO_639_3_PATTERN = /^[a-z]{3}$/u;
const REGION_PATTERN = /^[A-Z]{2}$/u;
const BCP_47_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;
const REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/u;
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_-]{2,63}$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;
const PERIOD_MONTH_PATTERN = /^[0-9]{4}-(?:0[1-9]|1[0-2])$/u;
const RFC_3339_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

const ID_PATTERNS = {
  pack: /^spk_[a-z0-9]{12,64}$/u,
  segment: /^seg_[a-z0-9]{12,64}$/u,
  asset: /^ast_[a-z0-9]{12,64}$/u,
  event: /^rev_[a-z0-9]{12,64}$/u,
  proposal: /^proposal_[a-z0-9]{12,64}$/u,
  run: /^run_[a-z0-9]{12,64}$/u,
  ledger: /^ledger_[a-z0-9]{12,64}$/u,
  evidenceLedger: /^evidence_[a-z0-9]{12,64}$/u,
  evidence: /^evd_[a-z0-9]{12,64}$/u,
  signer: /^signer_[a-z0-9]{12,64}$/u,
  reviewer: /^reviewer_[a-z0-9]{12,64}$/u,
  publisher: /^publisher_[a-z0-9]{12,64}$/u,
  service: /^service_[a-z0-9]{12,64}$/u,
  owner: /^owner_[a-z0-9]{12,64}$/u,
  source: /^source_[a-z0-9]{12,64}$/u,
  consent: /^consent_[a-z0-9]{12,64}$/u,
  rights: /^rights_[a-z0-9]{12,64}$/u,
  entrant: /^entrant_[a-z0-9]{12,64}$/u,
  releaseRequest: /^relreq_[a-z0-9]{12,64}$/u,
} as const;

const COUNT_CATEGORY_UNITS: Partial<
  Record<ContestEvidenceCategory, "users" | "participants" | "calls">
> = {
  gemini_production_call: "calls",
  user_count: "users",
  pilot_participant_count: "participants",
};

const MONEY_CATEGORIES = new Set<ContestEvidenceCategory>([
  "arms_length_revenue",
  "monthly_arms_length_revenue",
  "related_party_revenue",
  "expense",
  "marketing_spend",
  "refund",
]);

const RELATIONSHIP_FINANCIAL_CATEGORIES = new Set<ContestEvidenceCategory>([
  "arms_length_revenue",
  "monthly_arms_length_revenue",
  "related_party_revenue",
  "refund",
]);

const HOSTING_REQUIRED_PURPOSES = new Set([
  "public_demo",
  "contest_submission",
  "sponsor_publicity",
]);

const HOSTING_REQUIRED_CHANNELS = new Set([
  "pwa",
  "chrome_extension",
  "demo_video",
  "contest_platform",
  "sponsor_media",
]);

const MODIFICATION_REQUIRED_CHANNELS = new Set([
  "demo_video",
  "sponsor_media",
]);

function releaseScopeRequiresHosting(
  purposes: readonly string[],
  channels: readonly string[],
): boolean {
  return (
    purposes.some((purpose) => HOSTING_REQUIRED_PURPOSES.has(purpose)) ||
    channels.some((channel) => HOSTING_REQUIRED_CHANNELS.has(channel))
  );
}

function releaseScopeRequiresModification(
  channels: readonly string[],
): boolean {
  return channels.some((channel) =>
    MODIFICATION_REQUIRED_CHANNELS.has(channel),
  );
}

// Internal contract helper. It is intentionally not re-exported by index.ts.
export function deriveRequiredReleaseOperations(
  scope: ReleaseScope,
): Record<
  "modification" | "hosting" | "redistribution" | "sublicensing",
  boolean
> {
  return {
    modification:
      scope.modification || releaseScopeRequiresModification(scope.channels),
    hosting:
      scope.hosting ||
      releaseScopeRequiresHosting(scope.purposes, scope.channels),
    redistribution: true,
    sublicensing:
      scope.sublicensing || scope.purposes.includes("sponsor_publicity"),
  };
}

type JsonObject = Record<string, unknown>;

class Collector {
  readonly issues: ValidationIssue[] = [];

  add(path: string, code: string, message: string): void {
    this.issues.push({ path, code, message });
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function objectAt(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  collector: Collector,
): JsonObject | undefined {
  if (!isPlainObject(value)) {
    collector.add(path, "type", "must be an object");
    return undefined;
  }

  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      collector.add(`${path}.${key}`, "unknown_property", "is not allowed");
    }
  }

  for (const key of requiredKeys) {
    if (!(key in value)) {
      collector.add(`${path}.${key}`, "required", "is required");
    }
  }

  return value;
}

function stringAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
  options: {
    readonly pattern?: RegExp;
    readonly enumValues?: readonly string[];
    readonly minLength?: number;
    readonly maxLength?: number;
  } = {},
): string | undefined {
  const value = object[key];
  if (typeof value !== "string") {
    collector.add(`${path}.${key}`, "type", "must be a string");
    return undefined;
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    collector.add(
      `${path}.${key}`,
      "min_length",
      `must contain at least ${options.minLength} character(s)`,
    );
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    collector.add(
      `${path}.${key}`,
      "max_length",
      `must contain at most ${options.maxLength} character(s)`,
    );
  }
  if (options.pattern !== undefined && !options.pattern.test(value)) {
    collector.add(`${path}.${key}`, "format", "has an invalid format");
  }
  if (
    options.enumValues !== undefined &&
    !options.enumValues.includes(value)
  ) {
    collector.add(
      `${path}.${key}`,
      "enum",
      `must be one of: ${options.enumValues.join(", ")}`,
    );
  }

  return value;
}

function optionalStringAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
  options: Parameters<typeof stringAt>[4] = {},
): string | undefined {
  if (!(key in object)) {
    return undefined;
  }
  return stringAt(object, key, path, collector, options);
}

function booleanAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
): boolean | undefined {
  const value = object[key];
  if (typeof value !== "boolean") {
    collector.add(`${path}.${key}`, "type", "must be a boolean");
    return undefined;
  }
  return value;
}

function integerAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
  minimum: number,
): number | undefined {
  const value = object[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    collector.add(`${path}.${key}`, "type", "must be an integer");
    return undefined;
  }
  if (!Number.isSafeInteger(value)) {
    collector.add(
      `${path}.${key}`,
      "safe_integer",
      "must be a JavaScript safe integer",
    );
    return undefined;
  }
  const integer = value;
  if (integer < minimum) {
    collector.add(
      `${path}.${key}`,
      "minimum",
      `must be at least ${minimum}`,
    );
  }
  return integer;
}

function arrayAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
  minimumLength = 0,
): unknown[] | undefined {
  const value = object[key];
  if (!Array.isArray(value)) {
    collector.add(`${path}.${key}`, "type", "must be an array");
    return undefined;
  }
  if (value.length < minimumLength) {
    collector.add(
      `${path}.${key}`,
      "min_items",
      `must contain at least ${minimumLength} item(s)`,
    );
  }
  return value;
}

function dateTimeAt(
  object: JsonObject,
  key: string,
  path: string,
  collector: Collector,
): string | undefined {
  const value = stringAt(object, key, path, collector);
  if (value !== undefined && parseCanonicalUtcTimestamp(value) === undefined) {
    collector.add(
      `${path}.${key}`,
      "date_time",
      "must be a valid RFC 3339 UTC timestamp",
    );
  }
  return value;
}

function parseCanonicalUtcTimestamp(value: string): number | undefined {
  if (!RFC_3339_UTC_PATTERN.test(value)) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  const canonical = new Date(timestamp).toISOString();
  const normalizedInput = value.includes(".")
    ? value
    : value.replace(/Z$/u, ".000Z");
  return canonical === normalizedInput ? timestamp : undefined;
}

function uniqueStringArray(
  values: readonly unknown[],
  path: string,
  collector: Collector,
  pattern: RegExp,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  values.forEach((value, index) => {
    const itemPath = `${path}[${index}]`;
    if (typeof value !== "string") {
      collector.add(itemPath, "type", "must be a string");
      return;
    }
    if (!pattern.test(value)) {
      collector.add(itemPath, "format", "has an invalid identifier format");
    }
    if (seen.has(value)) {
      collector.add(itemPath, "duplicate", "must be unique");
    }
    seen.add(value);
    result.push(value);
  });

  return result;
}

function uniqueEnumStringArray<T extends string>(
  values: readonly unknown[],
  path: string,
  collector: Collector,
  allowedValues: readonly T[],
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();

  values.forEach((value, index) => {
    const itemPath = `${path}[${index}]`;
    if (
      typeof value !== "string" ||
      !(allowedValues as readonly string[]).includes(value)
    ) {
      collector.add(
        itemPath,
        "enum",
        `must be one of: ${allowedValues.join(", ")}`,
      );
      return;
    }
    if (seen.has(value)) {
      collector.add(itemPath, "duplicate", "must be unique");
    }
    seen.add(value);
    result.push(value as T);
  });

  return result;
}

function uniqueTerritoryArray(
  values: readonly unknown[],
  path: string,
  collector: Collector,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  values.forEach((value, index) => {
    const itemPath = `${path}[${index}]`;
    if (
      typeof value !== "string" ||
      (value !== "worldwide" && !REGION_PATTERN.test(value))
    ) {
      collector.add(
        itemPath,
        "format",
        "must be worldwide or an ISO alpha-2 region",
      );
      return;
    }
    if (seen.has(value)) {
      collector.add(itemPath, "duplicate", "must be unique");
    }
    seen.add(value);
    result.push(value);
  });

  return result;
}

function checkHash(
  value: string | undefined,
  path: string,
  collector: Collector,
): void {
  if (value !== undefined && !HASH_PATTERN.test(value)) {
    collector.add(
      path,
      "hash_format",
      "must be sha256 followed by exactly 64 lowercase hexadecimal characters",
    );
  }
}

function checkDateOrder(
  start: string | undefined,
  end: string | undefined,
  endPath: string,
  collector: Collector,
): void {
  const startTimestamp =
    start === undefined ? undefined : parseCanonicalUtcTimestamp(start);
  const endTimestamp =
    end === undefined ? undefined : parseCanonicalUtcTimestamp(end);
  if (
    startTimestamp !== undefined &&
    endTimestamp !== undefined &&
    endTimestamp < startTimestamp
  ) {
    collector.add(endPath, "time_order", "must not precede the start time");
  }
}

function checkRelativeAssetPath(
  value: string | undefined,
  path: string,
  collector: Collector,
): void {
  if (value === undefined) {
    return;
  }

  const validCharacters = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(value);
  const parts = value.split("/");
  const safeParts = parts.every(
    (part) => part.length > 0 && part !== "." && part !== "..",
  );
  const hasScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value);

  if (
    !value.startsWith("assets/") ||
    value.length > 512 ||
    !validCharacters ||
    !safeParts ||
    hasScheme ||
    value.includes("\\")
  ) {
    collector.add(
      path,
      "relative_asset_path",
      "must be a normalized relative path below assets/",
    );
  }
}

function finish<T>(input: unknown, collector: Collector): ValidationResult<T> {
  if (collector.issues.length > 0) {
    return { ok: false, issues: collector.issues };
  }
  return { ok: true, value: input as T };
}

function validateCaptionFallback(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const object = objectAt(
    value,
    path,
    ["language", "text"],
    ["language", "text"],
    collector,
  );
  if (object === undefined) {
    return;
  }

  stringAt(object, "language", path, collector, {
    pattern: BCP_47_PATTERN,
  });
  stringAt(object, "text", path, collector, {
    minLength: 1,
    maxLength: 1000,
  });
}

function validatePublication(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const object = objectAt(
    value,
    path,
    [
      "releaseId",
      "releasedAt",
      "publisherId",
      "assetLedgerHash",
      "reviewLogHash",
      "humanApprovalEventIds",
    ],
    [
      "releaseId",
      "releasedAt",
      "publisherId",
      "assetLedgerHash",
      "reviewLogHash",
      "humanApprovalEventIds",
    ],
    collector,
  );
  if (object === undefined) {
    return;
  }

  checkHash(
    stringAt(object, "releaseId", path, collector),
    `${path}.releaseId`,
    collector,
  );
  dateTimeAt(object, "releasedAt", path, collector);
  stringAt(object, "publisherId", path, collector, {
    pattern: ID_PATTERNS.publisher,
  });
  checkHash(
    stringAt(object, "assetLedgerHash", path, collector),
    `${path}.assetLedgerHash`,
    collector,
  );
  checkHash(
    stringAt(object, "reviewLogHash", path, collector),
    `${path}.reviewLogHash`,
    collector,
  );

  const eventIds = arrayAt(
    object,
    "humanApprovalEventIds",
    path,
    collector,
    1,
  );
  if (eventIds !== undefined) {
    uniqueStringArray(
      eventIds,
      `${path}.humanApprovalEventIds`,
      collector,
      ID_PATTERNS.event,
    );
  }
}

export function validateSignPack(input: unknown): ValidationResult<SignPack> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    [
      "schemaVersion",
      "packId",
      "releaseStatus",
      "developmentOnly",
      "linguisticReviewStatus",
      "language",
      "sourceVideo",
      "runtimeCompatibility",
      "participants",
      "segments",
      "assets",
      "publication",
    ],
    [
      "schemaVersion",
      "packId",
      "releaseStatus",
      "developmentOnly",
      "linguisticReviewStatus",
      "language",
      "sourceVideo",
      "runtimeCompatibility",
      "participants",
      "segments",
      "assets",
    ],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "packId", "$", collector, { pattern: ID_PATTERNS.pack });
  const releaseStatus = stringAt(root, "releaseStatus", "$", collector, {
    enumValues: ["draft", "published"],
  });
  const developmentOnly = booleanAt(
    root,
    "developmentOnly",
    "$",
    collector,
  );
  const linguisticReviewStatus = stringAt(
    root,
    "linguisticReviewStatus",
    "$",
    collector,
    { enumValues: ["not_reviewed", "human_reviewed"] },
  );

  const language = objectAt(
    root["language"],
    "$.language",
    [
      "signedLanguage",
      "region",
      "dialect",
      "audience",
      "educationalContext",
    ],
    [
      "signedLanguage",
      "region",
      "dialect",
      "audience",
      "educationalContext",
    ],
    collector,
  );
  let languageSigned: string | undefined;
  let languageRegion: string | undefined;
  if (language !== undefined) {
    languageSigned = stringAt(
      language,
      "signedLanguage",
      "$.language",
      collector,
      {
        pattern: ISO_639_3_PATTERN,
      },
    );
    languageRegion = stringAt(
      language,
      "region",
      "$.language",
      collector,
      {
        pattern: REGION_PATTERN,
      },
    );
    stringAt(language, "dialect", "$.language", collector, {
      minLength: 1,
      maxLength: 120,
    });
    stringAt(language, "audience", "$.language", collector, {
      minLength: 1,
      maxLength: 160,
    });
    stringAt(language, "educationalContext", "$.language", collector, {
      minLength: 1,
      maxLength: 240,
    });
  }

  const sourceVideo = objectAt(
    root["sourceVideo"],
    "$.sourceVideo",
    ["fingerprint", "durationMs"],
    ["fingerprint", "durationMs"],
    collector,
  );
  let videoDuration: number | undefined;
  if (sourceVideo !== undefined) {
    checkHash(
      stringAt(sourceVideo, "fingerprint", "$.sourceVideo", collector),
      "$.sourceVideo.fingerprint",
      collector,
    );
    videoDuration = integerAt(
      sourceVideo,
      "durationMs",
      "$.sourceVideo",
      collector,
      1,
    );
  }

  const runtime = objectAt(
    root["runtimeCompatibility"],
    "$.runtimeCompatibility",
    ["minimumVersion"],
    ["minimumVersion"],
    collector,
  );
  if (runtime !== undefined) {
    stringAt(
      runtime,
      "minimumVersion",
      "$.runtimeCompatibility",
      collector,
      { pattern: SEMVER_PATTERN },
    );
  }

  const participants = objectAt(
    root["participants"],
    "$.participants",
    ["signerRefs", "reviewerRefs"],
    ["signerRefs", "reviewerRefs"],
    collector,
  );
  let signerRefs: string[] = [];
  let reviewerRefs: string[] = [];
  if (participants !== undefined) {
    const signers = arrayAt(
      participants,
      "signerRefs",
      "$.participants",
      collector,
    );
    if (signers !== undefined) {
      signerRefs = uniqueStringArray(
        signers,
        "$.participants.signerRefs",
        collector,
        ID_PATTERNS.signer,
      );
    }
    const reviewers = arrayAt(
      participants,
      "reviewerRefs",
      "$.participants",
      collector,
    );
    if (reviewers !== undefined) {
      reviewerRefs = uniqueStringArray(
        reviewers,
        "$.participants.reviewerRefs",
        collector,
        ID_PATTERNS.reviewer,
      );
    }
  }

  const segments = arrayAt(root, "segments", "$", collector, 1);
  const segmentIds = new Set<string>();
  const referencedAssetIds = new Set<string>();
  let previousEnd = 0;

  segments?.forEach((value, index) => {
    const path = `$.segments[${index}]`;
    const segment = objectAt(
      value,
      path,
      [
        "segmentId",
        "startMs",
        "endMs",
        "translationStatus",
        "reviewStatus",
        "decisionHash",
        "captionFallback",
        "assetIds",
        "unsupportedReason",
        "proposalId",
      ],
      [
        "segmentId",
        "startMs",
        "endMs",
        "translationStatus",
        "reviewStatus",
        "decisionHash",
        "captionFallback",
        "assetIds",
      ],
      collector,
    );
    if (segment === undefined) {
      return;
    }

    const segmentId = stringAt(segment, "segmentId", path, collector, {
      pattern: ID_PATTERNS.segment,
    });
    if (segmentId !== undefined) {
      if (segmentIds.has(segmentId)) {
        collector.add(`${path}.segmentId`, "duplicate", "must be unique");
      }
      segmentIds.add(segmentId);
    }

    const startMs = integerAt(segment, "startMs", path, collector, 0);
    const endMs = integerAt(segment, "endMs", path, collector, 1);
    if (startMs !== undefined && endMs !== undefined) {
      if (endMs <= startMs) {
        collector.add(
          `${path}.endMs`,
          "time_order",
          "must be greater than startMs",
        );
      }
      if (startMs < previousEnd) {
        collector.add(
          `${path}.startMs`,
          "non_monotonic",
          "must not overlap or precede the prior segment",
        );
      }
      if (videoDuration !== undefined && endMs > videoDuration) {
        collector.add(
          `${path}.endMs`,
          "video_bounds",
          "must not exceed sourceVideo.durationMs",
        );
      }
      previousEnd = Math.max(previousEnd, endMs);
    }

    const translationStatus = stringAt(
      segment,
      "translationStatus",
      path,
      collector,
      { enumValues: ["proposed", "mapped", "unsupported"] },
    );
    const reviewStatus = stringAt(
      segment,
      "reviewStatus",
      path,
      collector,
      {
        enumValues: ["pending", "approved", "changes_requested", "rejected"],
      },
    );
    checkHash(
      stringAt(segment, "decisionHash", path, collector),
      `${path}.decisionHash`,
      collector,
    );
    validateCaptionFallback(
      segment["captionFallback"],
      `${path}.captionFallback`,
      collector,
    );

    const assetValues = arrayAt(segment, "assetIds", path, collector);
    let assetIds: string[] = [];
    if (assetValues !== undefined) {
      assetIds = uniqueStringArray(
        assetValues,
        `${path}.assetIds`,
        collector,
        ID_PATTERNS.asset,
      );
      assetIds.forEach((assetId) => referencedAssetIds.add(assetId));
    }

    const unsupportedReason = optionalStringAt(
      segment,
      "unsupportedReason",
      path,
      collector,
      { pattern: REASON_CODE_PATTERN },
    );
    optionalStringAt(segment, "proposalId", path, collector, {
      pattern: ID_PATTERNS.proposal,
    });

    if (translationStatus === "mapped") {
      if (assetIds.length === 0) {
        collector.add(
          `${path}.assetIds`,
          "mapped_assets",
          "mapped segments require at least one asset",
        );
      }
      if (unsupportedReason !== undefined) {
        collector.add(
          `${path}.unsupportedReason`,
          "state_conflict",
          "mapped segments cannot declare an unsupported reason",
        );
      }
    }
    if (translationStatus === "unsupported") {
      if (assetIds.length > 0) {
        collector.add(
          `${path}.assetIds`,
          "state_conflict",
          "unsupported segments cannot reference signing assets",
        );
      }
      if (unsupportedReason === undefined) {
        collector.add(
          `${path}.unsupportedReason`,
          "required",
          "unsupported segments require an explicit reason code",
        );
      }
    }
    if (translationStatus === "proposed" && reviewStatus !== "pending") {
      collector.add(
        `${path}.reviewStatus`,
        "authority",
        "proposed translations must remain pending",
      );
    }
  });

  const assets = arrayAt(root, "assets", "$", collector);
  const assetIds = new Set<string>();
  const assetPaths = new Set<string>();
  assets?.forEach((value, index) => {
    const path = `$.assets[${index}]`;
    const asset = objectAt(
      value,
      path,
      ["assetId", "path", "sha256", "mediaType", "durationMs"],
      ["assetId", "path", "sha256", "mediaType", "durationMs"],
      collector,
    );
    if (asset === undefined) {
      return;
    }

    const assetId = stringAt(asset, "assetId", path, collector, {
      pattern: ID_PATTERNS.asset,
    });
    if (assetId !== undefined) {
      if (assetIds.has(assetId)) {
        collector.add(`${path}.assetId`, "duplicate", "must be unique");
      }
      assetIds.add(assetId);
    }
    const assetPath = stringAt(asset, "path", path, collector);
    checkRelativeAssetPath(assetPath, `${path}.path`, collector);
    if (assetPath !== undefined) {
      if (assetPaths.has(assetPath)) {
        collector.add(`${path}.path`, "duplicate", "must be unique");
      }
      assetPaths.add(assetPath);
    }
    checkHash(
      stringAt(asset, "sha256", path, collector),
      `${path}.sha256`,
      collector,
    );
    stringAt(asset, "mediaType", path, collector, {
      enumValues: ["video/mp4", "video/webm"],
    });
    integerAt(asset, "durationMs", path, collector, 1);
  });

  for (const assetId of referencedAssetIds) {
    if (!assetIds.has(assetId)) {
      collector.add(
        "$.segments",
        "unknown_asset",
        `references undeclared asset ${assetId}`,
      );
    }
  }

  if ("publication" in root) {
    validatePublication(root["publication"], "$.publication", collector);
  }

  if (releaseStatus === "draft" && "publication" in root) {
    collector.add(
      "$.publication",
      "draft_publication",
      "draft packs cannot carry publication metadata",
    );
  }
  if (releaseStatus === "published") {
    if (!("publication" in root)) {
      collector.add(
        "$.publication",
        "required",
        "published packs require publication metadata",
      );
    }
    if (developmentOnly !== false) {
      collector.add(
        "$.developmentOnly",
        "publication_gate",
        "published packs cannot be development-only",
      );
    }
    if (linguisticReviewStatus !== "human_reviewed") {
      collector.add(
        "$.linguisticReviewStatus",
        "publication_gate",
        "published packs require human linguistic review",
      );
    }
    if (languageSigned === "zxx" || languageRegion === "ZZ") {
      collector.add(
        "$.language",
        "publication_gate",
        "synthetic language and region sentinels cannot be published",
      );
    }
    if (reviewerRefs.length === 0) {
      collector.add(
        "$.participants.reviewerRefs",
        "publication_gate",
        "published packs require a consent-safe reviewer reference",
      );
    }
    if (assetIds.size > 0 && signerRefs.length === 0) {
      collector.add(
        "$.participants.signerRefs",
        "publication_gate",
        "packs with signing media require a consent-safe signer reference",
      );
    }
    segments?.forEach((value, index) => {
      if (!isPlainObject(value)) {
        return;
      }
      if (value["reviewStatus"] !== "approved") {
        collector.add(
          `$.segments[${index}].reviewStatus`,
          "publication_gate",
          "every released segment requires human approval",
        );
      }
      if (value["translationStatus"] === "proposed") {
        collector.add(
          `$.segments[${index}].translationStatus`,
          "publication_gate",
          "proposals cannot be published",
        );
      }
    });
  }

  return finish(input, collector);
}

export function validateReviewEvent(
  input: unknown,
): ValidationResult<ReviewEvent> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    [
      "schemaVersion",
      "eventId",
      "sequence",
      "occurredAt",
      "environment",
      "packId",
      "segmentId",
      "decisionHash",
      "actor",
      "action",
      "translationStatus",
      "reviewStatus",
      "assetIds",
      "reasonCode",
    ],
    [
      "schemaVersion",
      "eventId",
      "sequence",
      "occurredAt",
      "environment",
      "packId",
      "segmentId",
      "decisionHash",
      "actor",
      "action",
      "translationStatus",
      "reviewStatus",
      "assetIds",
    ],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "eventId", "$", collector, { pattern: ID_PATTERNS.event });
  integerAt(root, "sequence", "$", collector, 1);
  dateTimeAt(root, "occurredAt", "$", collector);
  stringAt(root, "environment", "$", collector, {
    enumValues: ["synthetic_test", "development", "production"],
  });
  stringAt(root, "packId", "$", collector, { pattern: ID_PATTERNS.pack });
  stringAt(root, "segmentId", "$", collector, {
    pattern: ID_PATTERNS.segment,
  });
  checkHash(
    stringAt(root, "decisionHash", "$", collector),
    "$.decisionHash",
    collector,
  );

  const actor = objectAt(
    root["actor"],
    "$.actor",
    ["kind", "actorRef"],
    ["kind", "actorRef"],
    collector,
  );
  let actorKind: string | undefined;
  let actorRef: string | undefined;
  if (actor !== undefined) {
    actorKind = stringAt(actor, "kind", "$.actor", collector, {
      enumValues: ["authoring_service", "human_reviewer"],
    });
    actorRef = stringAt(actor, "actorRef", "$.actor", collector, {
      minLength: 1,
      maxLength: 80,
    });
    if (
      actorKind === "authoring_service" &&
      actorRef !== undefined &&
      !ID_PATTERNS.service.test(actorRef)
    ) {
      collector.add(
        "$.actor.actorRef",
        "actor_ref",
        "authoring-service actors require a service_ identifier",
      );
    }
    if (
      actorKind === "human_reviewer" &&
      actorRef !== undefined &&
      !ID_PATTERNS.reviewer.test(actorRef)
    ) {
      collector.add(
        "$.actor.actorRef",
        "actor_ref",
        "human reviewers require a consent-safe reviewer_ identifier",
      );
    }
  }

  const action = stringAt(root, "action", "$", collector, {
    enumValues: [
      "proposal_created",
      "approved",
      "unsupported_confirmed",
      "changes_requested",
      "rejected",
    ],
  });
  const translationStatus = stringAt(
    root,
    "translationStatus",
    "$",
    collector,
    { enumValues: ["proposed", "mapped", "unsupported"] },
  );
  const reviewStatus = stringAt(root, "reviewStatus", "$", collector, {
    enumValues: ["pending", "approved", "changes_requested", "rejected"],
  });
  const assetValues = arrayAt(root, "assetIds", "$", collector);
  const assetIds =
    assetValues === undefined
      ? []
      : uniqueStringArray(
          assetValues,
          "$.assetIds",
          collector,
          ID_PATTERNS.asset,
        );
  const reasonCode = optionalStringAt(
    root,
    "reasonCode",
    "$",
    collector,
    { pattern: REASON_CODE_PATTERN },
  );

  if (actorKind === "authoring_service") {
    if (action !== "proposal_created") {
      collector.add(
        "$.action",
        "authority",
        "authoring services may only create proposals",
      );
    }
    if (reviewStatus !== "pending") {
      collector.add(
        "$.reviewStatus",
        "authority",
        "authoring services cannot make review decisions",
      );
    }
  }
  if (action === "proposal_created" && actorKind !== "authoring_service") {
    collector.add(
      "$.actor.kind",
      "authority",
      "only the authoring service may create a proposal event",
    );
  }
  if (action !== "proposal_created" && actorKind !== "human_reviewer") {
    collector.add(
      "$.actor.kind",
      "authority",
      "only a human reviewer may make a review decision",
    );
  }
  if (action === "proposal_created" && reviewStatus !== "pending") {
    collector.add(
      "$.reviewStatus",
      "state_conflict",
      "new proposals must remain pending",
    );
  }
  if (
    action === "approved" &&
    (translationStatus !== "mapped" || reviewStatus !== "approved")
  ) {
    collector.add(
      "$.action",
      "state_conflict",
      "approved actions require mapped translation and approved review states",
    );
  }
  if (
    action === "unsupported_confirmed" &&
    (translationStatus !== "unsupported" || reviewStatus !== "approved")
  ) {
    collector.add(
      "$.action",
      "state_conflict",
      "unsupported confirmation requires unsupported translation and approved review states",
    );
  }
  if (action === "changes_requested" && reviewStatus !== "changes_requested") {
    collector.add(
      "$.reviewStatus",
      "state_conflict",
      "changes_requested actions require the matching review state",
    );
  }
  if (action === "rejected" && reviewStatus !== "rejected") {
    collector.add(
      "$.reviewStatus",
      "state_conflict",
      "rejected actions require the rejected review state",
    );
  }
  if (translationStatus === "mapped" && assetIds.length === 0) {
    collector.add(
      "$.assetIds",
      "mapped_assets",
      "mapped decisions require at least one asset",
    );
  }
  if (translationStatus === "unsupported" && assetIds.length > 0) {
    collector.add(
      "$.assetIds",
      "state_conflict",
      "unsupported decisions cannot reference signing assets",
    );
  }
  if (
    (translationStatus === "unsupported" ||
      action === "changes_requested" ||
      action === "rejected") &&
    reasonCode === undefined
  ) {
    collector.add(
      "$.reasonCode",
      "required",
      "this decision requires a controlled reason code",
    );
  }

  return finish(input, collector);
}

export function validateRunManifest(
  input: unknown,
): ValidationResult<RunManifest> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    [
      "schemaVersion",
      "runId",
      "environment",
      "startedAt",
      "completedAt",
      "status",
      "tool",
      "model",
      "input",
      "output",
      "privacy",
    ],
    [
      "schemaVersion",
      "runId",
      "environment",
      "startedAt",
      "completedAt",
      "status",
      "tool",
      "input",
      "output",
      "privacy",
    ],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "runId", "$", collector, { pattern: ID_PATTERNS.run });
  stringAt(root, "environment", "$", collector, {
    enumValues: ["synthetic_test", "development", "production"],
  });
  const startedAt = dateTimeAt(root, "startedAt", "$", collector);
  const completedAt = dateTimeAt(root, "completedAt", "$", collector);
  checkDateOrder(startedAt, completedAt, "$.completedAt", collector);
  stringAt(root, "status", "$", collector, {
    enumValues: ["succeeded", "failed"],
  });

  const tool = objectAt(
    root["tool"],
    "$.tool",
    ["name", "version"],
    ["name", "version"],
    collector,
  );
  if (tool !== undefined) {
    stringAt(tool, "name", "$.tool", collector, {
      pattern: TOOL_NAME_PATTERN,
    });
    stringAt(tool, "version", "$.tool", collector, {
      pattern: SEMVER_PATTERN,
    });
  }

  if ("model" in root) {
    const model = objectAt(
      root["model"],
      "$.model",
      ["provider", "name", "version"],
      ["provider", "name", "version"],
      collector,
    );
    if (model !== undefined) {
      stringAt(model, "provider", "$.model", collector, {
        enumValues: ["google"],
      });
      stringAt(model, "name", "$.model", collector, {
        minLength: 1,
        maxLength: 120,
      });
      stringAt(model, "version", "$.model", collector, {
        minLength: 1,
        maxLength: 120,
      });
    }
  }

  const runInput = objectAt(
    root["input"],
    "$.input",
    ["timedTextHash", "segmentCount", "signedLanguage", "region"],
    ["timedTextHash", "segmentCount", "signedLanguage", "region"],
    collector,
  );
  if (runInput !== undefined) {
    checkHash(
      stringAt(runInput, "timedTextHash", "$.input", collector),
      "$.input.timedTextHash",
      collector,
    );
    integerAt(runInput, "segmentCount", "$.input", collector, 1);
    stringAt(runInput, "signedLanguage", "$.input", collector, {
      pattern: ISO_639_3_PATTERN,
    });
    stringAt(runInput, "region", "$.input", collector, {
      pattern: REGION_PATTERN,
    });
  }

  const output = objectAt(
    root["output"],
    "$.output",
    ["proposalLogHash", "reviewEventIds"],
    ["proposalLogHash", "reviewEventIds"],
    collector,
  );
  if (output !== undefined) {
    checkHash(
      stringAt(output, "proposalLogHash", "$.output", collector),
      "$.output.proposalLogHash",
      collector,
    );
    const eventIds = arrayAt(
      output,
      "reviewEventIds",
      "$.output",
      collector,
    );
    if (eventIds !== undefined) {
      uniqueStringArray(
        eventIds,
        "$.output.reviewEventIds",
        collector,
        ID_PATTERNS.event,
      );
    }
  }

  const privacy = objectAt(
    root["privacy"],
    "$.privacy",
    ["containsTranscript", "containsIdentity", "containsMediaUrl"],
    ["containsTranscript", "containsIdentity", "containsMediaUrl"],
    collector,
  );
  if (privacy !== undefined) {
    for (const key of [
      "containsTranscript",
      "containsIdentity",
      "containsMediaUrl",
    ] as const) {
      const value = booleanAt(privacy, key, "$.privacy", collector);
      if (value !== false) {
        collector.add(
          `$.privacy.${key}`,
          "privacy_gate",
          "must remain false; sensitive content belongs outside the manifest",
        );
      }
    }
  }

  return finish(input, collector);
}

export function validateReleaseRequest(
  input: unknown,
): ValidationResult<ReleaseRequest> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    [
      "schemaVersion",
      "requestId",
      "packId",
      "requestedAt",
      "assurance",
      "selectedReviewEventIds",
      "scope",
    ],
    [
      "schemaVersion",
      "requestId",
      "packId",
      "requestedAt",
      "assurance",
      "selectedReviewEventIds",
      "scope",
    ],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "requestId", "$", collector, {
    pattern: ID_PATTERNS.releaseRequest,
  });
  stringAt(root, "packId", "$", collector, { pattern: ID_PATTERNS.pack });
  dateTimeAt(root, "requestedAt", "$", collector);
  stringAt(root, "assurance", "$", collector, {
    enumValues: ["structural_preflight_only"],
  });
  const selectedEvents = arrayAt(
    root,
    "selectedReviewEventIds",
    "$",
    collector,
    1,
  );
  if (selectedEvents !== undefined) {
    uniqueStringArray(
      selectedEvents,
      "$.selectedReviewEventIds",
      collector,
      ID_PATTERNS.event,
    );
  }

  const scope = objectAt(
    root["scope"],
    "$.scope",
    [
      "purposes",
      "channels",
      "territories",
      "modification",
      "hosting",
      "redistribution",
      "sublicensing",
    ],
    [
      "purposes",
      "channels",
      "territories",
      "modification",
      "hosting",
      "redistribution",
      "sublicensing",
    ],
    collector,
  );
  if (scope !== undefined) {
    let releasePurposes: string[] = [];
    let releaseChannels: string[] = [];
    const purposes = arrayAt(scope, "purposes", "$.scope", collector, 1);
    if (purposes !== undefined) {
      releasePurposes = uniqueEnumStringArray(
        purposes,
        "$.scope.purposes",
        collector,
        RELEASE_PURPOSES,
      );
    }
    const channels = arrayAt(scope, "channels", "$.scope", collector, 1);
    if (channels !== undefined) {
      releaseChannels = uniqueEnumStringArray(
        channels,
        "$.scope.channels",
        collector,
        RELEASE_CHANNELS,
      );
    }
    const territories = arrayAt(
      scope,
      "territories",
      "$.scope",
      collector,
      1,
    );
    if (territories !== undefined) {
      uniqueTerritoryArray(territories, "$.scope.territories", collector);
    }
    const modification = booleanAt(
      scope,
      "modification",
      "$.scope",
      collector,
    );
    const hosting = booleanAt(scope, "hosting", "$.scope", collector);
    const redistribution = booleanAt(
      scope,
      "redistribution",
      "$.scope",
      collector,
    );
    const sublicensing = booleanAt(
      scope,
      "sublicensing",
      "$.scope",
      collector,
    );

    if (redistribution === false) {
      collector.add(
        "$.scope.redistribution",
        "scope_implication",
        "every release candidate inherently requires redistribution rights",
      );
    }
    const requiresHosting = releaseScopeRequiresHosting(
      releasePurposes,
      releaseChannels,
    );
    if (requiresHosting && hosting === false) {
      collector.add(
        "$.scope.hosting",
        "scope_implication",
        "the requested purpose or channel inherently requires hosting rights",
      );
    }
    if (
      releaseScopeRequiresModification(releaseChannels) &&
      modification === false
    ) {
      collector.add(
        "$.scope.modification",
        "scope_implication",
        "demo-video and sponsor-media channels require modification rights",
      );
    }
    if (
      releasePurposes.includes("sponsor_publicity") &&
      sublicensing === false
    ) {
      collector.add(
        "$.scope.sublicensing",
        "scope_implication",
        "sponsor publicity inherently requires sublicensing rights",
      );
    }
  }

  return finish(input, collector);
}

export function validateAssetLedger(
  input: unknown,
): ValidationResult<AssetLedger> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    [
      "schemaVersion",
      "ledgerId",
      "packId",
      "generatedAt",
      "developmentOnly",
      "assets",
    ],
    [
      "schemaVersion",
      "ledgerId",
      "packId",
      "generatedAt",
      "developmentOnly",
      "assets",
    ],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "ledgerId", "$", collector, {
    pattern: ID_PATTERNS.ledger,
  });
  stringAt(root, "packId", "$", collector, { pattern: ID_PATTERNS.pack });
  dateTimeAt(root, "generatedAt", "$", collector);
  booleanAt(root, "developmentOnly", "$", collector);
  const assets = arrayAt(root, "assets", "$", collector);

  const assetIds = new Set<string>();
  const assetPaths = new Set<string>();
  const hashes = new Set<string>();
  assets?.forEach((value, index) => {
    const path = `$.assets[${index}]`;
    const asset = objectAt(
      value,
      path,
      [
        "assetId",
        "path",
        "sha256",
        "ownerRef",
        "sourceRef",
        "signerRefs",
        "assetStatus",
        "reviewStatus",
        "consent",
        "rights",
        "attribution",
        "reviewerApproval",
      ],
      [
        "assetId",
        "path",
        "sha256",
        "ownerRef",
        "sourceRef",
        "signerRefs",
        "assetStatus",
        "reviewStatus",
        "consent",
        "rights",
        "attribution",
      ],
      collector,
    );
    if (asset === undefined) {
      return;
    }

    const assetId = stringAt(asset, "assetId", path, collector, {
      pattern: ID_PATTERNS.asset,
    });
    if (assetId !== undefined) {
      if (assetIds.has(assetId)) {
        collector.add(`${path}.assetId`, "duplicate", "must be unique");
      }
      assetIds.add(assetId);
    }
    const assetPath = stringAt(asset, "path", path, collector);
    checkRelativeAssetPath(assetPath, `${path}.path`, collector);
    if (assetPath !== undefined) {
      if (assetPaths.has(assetPath)) {
        collector.add(`${path}.path`, "duplicate", "must be unique");
      }
      assetPaths.add(assetPath);
    }
    const sha256 = stringAt(asset, "sha256", path, collector);
    checkHash(sha256, `${path}.sha256`, collector);
    if (sha256 !== undefined) {
      if (hashes.has(sha256)) {
        collector.add(
          `${path}.sha256`,
          "duplicate",
          "each exact asset hash must have one immutable asset identifier",
        );
      }
      hashes.add(sha256);
    }
    stringAt(asset, "ownerRef", path, collector, {
      pattern: ID_PATTERNS.owner,
    });
    stringAt(asset, "sourceRef", path, collector, {
      pattern: ID_PATTERNS.source,
    });
    const signerValues = arrayAt(asset, "signerRefs", path, collector);
    const signerRefs =
      signerValues === undefined
        ? []
        : uniqueStringArray(
            signerValues,
            `${path}.signerRefs`,
            collector,
            ID_PATTERNS.signer,
          );
    const assetStatus = stringAt(asset, "assetStatus", path, collector, {
      enumValues: ["draft", "licensed", "withdrawn"],
    });
    const reviewStatus = stringAt(asset, "reviewStatus", path, collector, {
      enumValues: ["pending", "approved", "changes_requested", "rejected"],
    });
    stringAt(asset, "attribution", path, collector, { maxLength: 240 });

    const consent = objectAt(
      asset["consent"],
      `${path}.consent`,
      ["status", "consentRef", "subjectSignerRefs", "exactHash"],
      ["status", "subjectSignerRefs"],
      collector,
    );
    let consentStatus: string | undefined;
    let consentRef: string | undefined;
    let consentHash: string | undefined;
    let consentSignerRefs: string[] = [];
    if (consent !== undefined) {
      consentStatus = stringAt(
        consent,
        "status",
        `${path}.consent`,
        collector,
        { enumValues: ["pending", "granted", "withdrawn"] },
      );
      consentRef = optionalStringAt(
        consent,
        "consentRef",
        `${path}.consent`,
        collector,
        { pattern: ID_PATTERNS.consent },
      );
      const consentSignerValues = arrayAt(
        consent,
        "subjectSignerRefs",
        `${path}.consent`,
        collector,
      );
      if (consentSignerValues !== undefined) {
        consentSignerRefs = uniqueStringArray(
          consentSignerValues,
          `${path}.consent.subjectSignerRefs`,
          collector,
          ID_PATTERNS.signer,
        );
      }
      consentHash = optionalStringAt(
        consent,
        "exactHash",
        `${path}.consent`,
        collector,
      );
      checkHash(consentHash, `${path}.consent.exactHash`, collector);
      if (consentStatus === "granted" && consentRef === undefined) {
        collector.add(
          `${path}.consent.consentRef`,
          "required",
          "granted consent requires a private evidence reference",
        );
      }
    }

    const rights = objectAt(
      asset["rights"],
      `${path}.rights`,
      [
        "grantRef",
        "exactHash",
        "termModel",
        "grantedPurposes",
        "grantedChannels",
        "territories",
        "modification",
        "hosting",
        "redistribution",
        "sublicensing",
      ],
      [
        "grantedPurposes",
        "grantedChannels",
        "territories",
        "modification",
        "hosting",
        "redistribution",
        "sublicensing",
      ],
      collector,
    );
    let rightsHash: string | undefined;
    let grantRef: string | undefined;
    let termModel: string | undefined;
    let grantedPurposes: string[] = [];
    let grantedChannels: string[] = [];
    if (rights !== undefined) {
      grantRef = optionalStringAt(
        rights,
        "grantRef",
        `${path}.rights`,
        collector,
        { pattern: ID_PATTERNS.rights },
      );
      rightsHash = optionalStringAt(
        rights,
        "exactHash",
        `${path}.rights`,
        collector,
      );
      checkHash(rightsHash, `${path}.rights.exactHash`, collector);
      termModel = optionalStringAt(
        rights,
        "termModel",
        `${path}.rights`,
        collector,
        { enumValues: ["irrevocable_exact_hash"] },
      );
      const purposeValues = arrayAt(
        rights,
        "grantedPurposes",
        `${path}.rights`,
        collector,
      );
      if (purposeValues !== undefined) {
        grantedPurposes = uniqueEnumStringArray(
          purposeValues,
          `${path}.rights.grantedPurposes`,
          collector,
          RELEASE_PURPOSES,
        );
      }
      const channelValues = arrayAt(
        rights,
        "grantedChannels",
        `${path}.rights`,
        collector,
      );
      if (channelValues !== undefined) {
        grantedChannels = uniqueEnumStringArray(
          channelValues,
          `${path}.rights.grantedChannels`,
          collector,
          RELEASE_CHANNELS,
        );
      }
      for (const key of [
        "modification",
        "hosting",
        "redistribution",
        "sublicensing",
      ] as const) {
        booleanAt(rights, key, `${path}.rights`, collector);
      }
      const territories = arrayAt(
        rights,
        "territories",
        `${path}.rights`,
        collector,
        1,
      );
      if (territories !== undefined) {
        uniqueTerritoryArray(
          territories,
          `${path}.rights.territories`,
          collector,
        );
      }
    }

    let approvalHash: string | undefined;
    if ("reviewerApproval" in asset) {
      const approval = objectAt(
        asset["reviewerApproval"],
        `${path}.reviewerApproval`,
        ["reviewerRef", "eventId", "approvedHash"],
        ["reviewerRef", "eventId", "approvedHash"],
        collector,
      );
      if (approval !== undefined) {
        stringAt(
          approval,
          "reviewerRef",
          `${path}.reviewerApproval`,
          collector,
          { pattern: ID_PATTERNS.reviewer },
        );
        stringAt(
          approval,
          "eventId",
          `${path}.reviewerApproval`,
          collector,
          { pattern: ID_PATTERNS.event },
        );
        approvalHash = stringAt(
          approval,
          "approvedHash",
          `${path}.reviewerApproval`,
          collector,
        );
        checkHash(
          approvalHash,
          `${path}.reviewerApproval.approvedHash`,
          collector,
        );
      }
    }

    if (assetStatus === "licensed") {
      if (reviewStatus !== "approved") {
        collector.add(
          `${path}.reviewStatus`,
          "license_gate",
          "licensed assets require approved human review",
        );
      }
      if (consentStatus !== "granted" || consentRef === undefined) {
        collector.add(
          `${path}.consent`,
          "license_gate",
          "licensed assets require granted consent and its evidence reference",
        );
      }
      if (signerRefs.length === 0) {
        collector.add(
          `${path}.signerRefs`,
          "license_gate",
          "licensed assets require at least one consent-safe signer reference",
        );
      }
      if (
        signerRefs.length !== consentSignerRefs.length ||
        signerRefs.some(
          (signerRef) => !consentSignerRefs.includes(signerRef),
        )
      ) {
        collector.add(
          `${path}.consent.subjectSignerRefs`,
          "signer_consent",
          "must exactly match the asset signerRefs set",
        );
      }
      if (
        grantRef === undefined ||
        rightsHash === undefined ||
        termModel !== "irrevocable_exact_hash"
      ) {
        collector.add(
          `${path}.rights`,
          "license_gate",
          "licensed assets require an exact-hash irrevocable grant reference",
        );
      }
      if (grantedPurposes.length === 0 || grantedChannels.length === 0) {
        collector.add(
          `${path}.rights`,
          "license_gate",
          "licensed assets require at least one granted purpose and channel",
        );
      }
      if (!("reviewerApproval" in asset)) {
        collector.add(
          `${path}.reviewerApproval`,
          "license_gate",
          "licensed assets require approval tied to the exact hash",
        );
      }
      if (sha256 !== undefined && rightsHash !== sha256) {
        collector.add(
          `${path}.rights.exactHash`,
          "hash_mismatch",
          "must equal the asset sha256",
        );
      }
      if (sha256 !== undefined && consentHash !== sha256) {
        collector.add(
          `${path}.consent.exactHash`,
          "hash_mismatch",
          "must equal the asset sha256",
        );
      }
      if (sha256 !== undefined && approvalHash !== sha256) {
        collector.add(
          `${path}.reviewerApproval.approvedHash`,
          "hash_mismatch",
          "must equal the asset sha256",
        );
      }
    }
  });

  return finish(input, collector);
}

function validateContestMeasurement(
  value: unknown,
  path: string,
  collector: Collector,
): string | undefined {
  if (!isPlainObject(value)) {
    collector.add(path, "type", "must be an object");
    return undefined;
  }
  const kind = value["kind"];
  if (kind === "count") {
    const measurement = objectAt(
      value,
      path,
      ["kind", "value", "unit"],
      ["kind", "value", "unit"],
      collector,
    );
    if (measurement !== undefined) {
      stringAt(measurement, "kind", path, collector, {
        enumValues: ["count"],
      });
      integerAt(measurement, "value", path, collector, 0);
      stringAt(measurement, "unit", path, collector, {
        enumValues: ["users", "participants", "calls"],
      });
    }
    return "count";
  }
  if (kind === "money") {
    const measurement = objectAt(
      value,
      path,
      ["kind", "minorUnits", "currency"],
      ["kind", "minorUnits", "currency"],
      collector,
    );
    if (measurement !== undefined) {
      stringAt(measurement, "kind", path, collector, {
        enumValues: ["money"],
      });
      integerAt(measurement, "minorUnits", path, collector, 0);
      stringAt(measurement, "currency", path, collector, {
        pattern: CURRENCY_PATTERN,
      });
    }
    return "money";
  }
  if (kind === "artifact") {
    const measurement = objectAt(
      value,
      path,
      ["kind", "artifactHash"],
      ["kind", "artifactHash"],
      collector,
    );
    if (measurement !== undefined) {
      stringAt(measurement, "kind", path, collector, {
        enumValues: ["artifact"],
      });
      checkHash(
        stringAt(measurement, "artifactHash", path, collector),
        `${path}.artifactHash`,
        collector,
      );
    }
    return "artifact";
  }

  collector.add(
    `${path}.kind`,
    "enum",
    "must be one of: count, money, artifact",
  );
  return undefined;
}

function expectedMeasurement(
  category: ContestEvidenceCategory,
): {
  readonly kind: "count" | "money" | "artifact";
  readonly unit?: "users" | "participants" | "calls";
} {
  const countUnit = COUNT_CATEGORY_UNITS[category];
  if (countUnit !== undefined) {
    return { kind: "count", unit: countUnit };
  }
  return MONEY_CATEGORIES.has(category)
    ? { kind: "money" }
    : { kind: "artifact" };
}

function isContestEvidenceCategory(
  value: string | undefined,
): value is ContestEvidenceCategory {
  return (
    value !== undefined &&
    (CONTEST_EVIDENCE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function validateContestEvidence(
  input: unknown,
): ValidationResult<ContestEvidence> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    ["schemaVersion", "ledgerId", "generatedAt", "entrant", "records", "privacy"],
    ["schemaVersion", "ledgerId", "generatedAt", "entrant", "records", "privacy"],
    collector,
  );
  if (root === undefined) {
    return finish(input, collector);
  }

  const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
  if (schemaVersion !== undefined && schemaVersion !== SCHEMA_VERSION) {
    collector.add(
      "$.schemaVersion",
      "schema_version",
      `must equal ${SCHEMA_VERSION}`,
    );
  }
  stringAt(root, "ledgerId", "$", collector, {
    pattern: ID_PATTERNS.evidenceLedger,
  });
  dateTimeAt(root, "generatedAt", "$", collector);

  const entrant = objectAt(
    root["entrant"],
    "$.entrant",
    ["type", "entrantRef"],
    ["type", "entrantRef"],
    collector,
  );
  if (entrant !== undefined) {
    stringAt(entrant, "type", "$.entrant", collector, {
      enumValues: ["individual", "team", "organization"],
    });
    stringAt(entrant, "entrantRef", "$.entrant", collector, {
      pattern: ID_PATTERNS.entrant,
    });
  }

  const records = arrayAt(root, "records", "$", collector);
  const evidenceIds = new Set<string>();
  const claimScopes = new Set<string>();
  const financialWindows: Array<{
    readonly category: ContestEvidenceCategory;
    readonly relationship: "arms_length" | "related_party" | "not_applicable";
    readonly start: number;
    readonly end: number;
    readonly path: string;
  }> = [];
  records?.forEach((value, index) => {
    const path = `$.records[${index}]`;
    const record = objectAt(
      value,
      path,
      [
        "evidenceId",
        "category",
        "status",
        "periodStart",
        "periodEnd",
        "periodMonth",
        "sourceHash",
        "metricDefinition",
        "evidenceMethod",
        "relationship",
        "measurement",
        "consentRef",
      ],
      [
        "evidenceId",
        "category",
        "status",
        "periodStart",
        "periodEnd",
        "sourceHash",
        "metricDefinition",
        "evidenceMethod",
        "relationship",
        "measurement",
      ],
      collector,
    );
    if (record === undefined) {
      return;
    }

    const evidenceId = stringAt(record, "evidenceId", path, collector, {
      pattern: ID_PATTERNS.evidence,
    });
    if (evidenceId !== undefined) {
      if (evidenceIds.has(evidenceId)) {
        collector.add(`${path}.evidenceId`, "duplicate", "must be unique");
      }
      evidenceIds.add(evidenceId);
    }
    const categoryValue = stringAt(record, "category", path, collector, {
      enumValues: CONTEST_EVIDENCE_CATEGORIES,
    });
    const category = isContestEvidenceCategory(categoryValue)
      ? categoryValue
      : undefined;
    const statusValue = stringAt(record, "status", path, collector, {
      enumValues: ["draft", "evidence_linked", "withdrawn"],
    });
    const status =
      statusValue === "draft" ||
      statusValue === "evidence_linked" ||
      statusValue === "withdrawn"
        ? statusValue
        : undefined;
    const periodStart = dateTimeAt(record, "periodStart", path, collector);
    const periodEnd = dateTimeAt(record, "periodEnd", path, collector);
    checkDateOrder(periodStart, periodEnd, `${path}.periodEnd`, collector);
    const periodMonth = optionalStringAt(
      record,
      "periodMonth",
      path,
      collector,
      { pattern: PERIOD_MONTH_PATTERN },
    );
    checkHash(
      stringAt(record, "sourceHash", path, collector),
      `${path}.sourceHash`,
      collector,
    );
    stringAt(record, "metricDefinition", path, collector, {
      minLength: 1,
      maxLength: 500,
    });
    stringAt(record, "evidenceMethod", path, collector, {
      enumValues: CONTEST_EVIDENCE_METHODS,
    });
    const relationship = stringAt(
      record,
      "relationship",
      path,
      collector,
      {
        enumValues: ["arms_length", "related_party", "not_applicable"],
      },
    );
    const normalizedRelationship =
      relationship === "arms_length" ||
      relationship === "related_party" ||
      relationship === "not_applicable"
        ? relationship
        : undefined;
    const measurementKind = validateContestMeasurement(
      record["measurement"],
      `${path}.measurement`,
      collector,
    );
    const consentRef = optionalStringAt(
      record,
      "consentRef",
      path,
      collector,
      { pattern: ID_PATTERNS.consent },
    );

    if (category !== undefined) {
      if (
        category === "monthly_arms_length_revenue" &&
        periodMonth === undefined
      ) {
        collector.add(
          `${path}.periodMonth`,
          "period_month",
          "monthly arms-length revenue requires YYYY-MM periodMonth",
        );
      }
      if (
        category === "monthly_arms_length_revenue" &&
        periodMonth !== undefined &&
        PERIOD_MONTH_PATTERN.test(periodMonth) &&
        periodStart !== undefined &&
        periodEnd !== undefined &&
        parseCanonicalUtcTimestamp(periodStart) !== undefined &&
        parseCanonicalUtcTimestamp(periodEnd) !== undefined &&
        (periodStart.slice(0, 7) !== periodMonth ||
          periodEnd.slice(0, 7) !== periodMonth)
      ) {
        collector.add(
          `${path}.periodMonth`,
          "period_month",
          "must match the canonical UTC month of both periodStart and periodEnd",
        );
      }
      if (
        category !== "monthly_arms_length_revenue" &&
        periodMonth !== undefined
      ) {
        collector.add(
          `${path}.periodMonth`,
          "period_month",
          "periodMonth is reserved for monthly arms-length revenue",
        );
      }
      const expected = expectedMeasurement(category);
      if (measurementKind !== expected.kind) {
        collector.add(
          `${path}.measurement.kind`,
          "category_measurement",
          `${category} evidence requires a ${expected.kind} measurement`,
        );
      }
      if (
        expected.unit !== undefined &&
        isPlainObject(record["measurement"]) &&
        record["measurement"]["unit"] !== expected.unit
      ) {
        collector.add(
          `${path}.measurement.unit`,
          "category_measurement",
          `${category} evidence requires unit ${expected.unit}`,
        );
      }
      const usesFinancialRelationship =
        RELATIONSHIP_FINANCIAL_CATEGORIES.has(category);
      if (usesFinancialRelationship && relationship === "not_applicable") {
        collector.add(
          `${path}.relationship`,
          "relationship",
          "revenue and refund evidence must declare arms-length or related-party status",
        );
      }
      if (!usesFinancialRelationship && relationship !== "not_applicable") {
        collector.add(
          `${path}.relationship`,
          "relationship",
          "non-revenue evidence, including ordinary spend, must use not_applicable",
        );
      }
      if (
        (category === "arms_length_revenue" ||
          category === "monthly_arms_length_revenue") &&
        relationship !== "arms_length"
      ) {
        collector.add(
          `${path}.relationship`,
          "relationship",
          `${category} evidence must be explicitly arms_length`,
        );
      }
      if (
        category === "related_party_revenue" &&
        relationship !== "related_party"
      ) {
        collector.add(
          `${path}.relationship`,
          "relationship",
          "related_party_revenue evidence must be explicitly related_party",
        );
      }
      if (category === "feedback_consent" && consentRef === undefined) {
        collector.add(
          `${path}.consentRef`,
          "consent_gate",
          "feedback evidence requires a private consent reference",
        );
      }
      if (category !== "feedback_consent" && consentRef !== undefined) {
        collector.add(
          `${path}.consentRef`,
          "state_conflict",
          "consentRef is reserved for feedback evidence",
        );
      }

      const startTimestamp =
        periodStart === undefined
          ? undefined
          : parseCanonicalUtcTimestamp(periodStart);
      const endTimestamp =
        periodEnd === undefined
          ? undefined
          : parseCanonicalUtcTimestamp(periodEnd);
      const hasValidPeriodMonth =
        category === "monthly_arms_length_revenue"
          ? periodMonth !== undefined && PERIOD_MONTH_PATTERN.test(periodMonth)
          : periodMonth === undefined;
      if (
        normalizedRelationship !== undefined &&
        startTimestamp !== undefined &&
        endTimestamp !== undefined &&
        endTimestamp >= startTimestamp &&
        hasValidPeriodMonth &&
        (status === "draft" || status === "evidence_linked")
      ) {
        const scopeKey = [
          category,
          normalizedRelationship,
          periodStart,
          periodEnd,
          periodMonth ?? "",
        ].join("\u0000");
        if (claimScopes.has(scopeKey)) {
          collector.add(
            path,
            "duplicate_claim_scope",
            "must not duplicate a category, relationship, and reporting window",
          );
        }
        claimScopes.add(scopeKey);

        if (MONEY_CATEGORIES.has(category)) {
          for (const prior of financialWindows) {
            if (
              prior.category === category &&
              prior.relationship === normalizedRelationship &&
              startTimestamp <= prior.end &&
              prior.start <= endTimestamp
            ) {
              collector.add(
                path,
                "overlapping_claim_window",
                `financial claim window overlaps ${prior.path}`,
              );
              break;
            }
          }
          financialWindows.push({
            category,
            relationship: normalizedRelationship,
            start: startTimestamp,
            end: endTimestamp,
            path,
          });
        }
      }
    }
  });

  const privacy = objectAt(
    root["privacy"],
    "$.privacy",
    [
      "containsPersonalData",
      "containsTranscript",
      "containsPaymentDetails",
    ],
    [
      "containsPersonalData",
      "containsTranscript",
      "containsPaymentDetails",
    ],
    collector,
  );
  if (privacy !== undefined) {
    for (const key of [
      "containsPersonalData",
      "containsTranscript",
      "containsPaymentDetails",
    ] as const) {
      const value = booleanAt(privacy, key, "$.privacy", collector);
      if (value !== false) {
        collector.add(
          `$.privacy.${key}`,
          "privacy_gate",
          "must remain false; raw evidence belongs in the private system of record",
        );
      }
    }
  }

  return finish(input, collector);
}

function prefixIssues(
  issues: readonly ValidationIssue[],
  prefix: string,
): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: `${prefix}${issue.path === "$" ? "" : issue.path.slice(1)}`,
  }));
}

function hasSameOrderedValues(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function grantCoversTerritories(
  granted: readonly string[],
  requested: readonly string[],
): boolean {
  if (granted.includes("worldwide")) {
    return true;
  }
  return requested.every(
    (territory) => territory !== "worldwide" && granted.includes(territory),
  );
}

/**
 * Checks a draft release candidate without authorizing or creating a release.
 *
 * Hash values are checked only for format and reference equality. Authoritative
 * log access, canonical serialization, actual-byte hashing, trusted reviewer
 * registration, grant authentication, and withdrawal checks remain mandatory
 * publisher gates.
 */
export function validateReleaseCandidate(
  input: unknown,
): ValidationResult<StructurallyValidReleaseCandidate> {
  try {
    return validateReleaseCandidateInternal(input);
  } catch {
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "unsafe_input",
          message: "could not be inspected safely as a release candidate",
        },
      ],
    };
  }
}

function validateReleaseCandidateInternal(
  input: unknown,
): ValidationResult<StructurallyValidReleaseCandidate> {
  const collector = new Collector();
  const root = objectAt(
    input,
    "$",
    ["signPack", "reviewEvents", "assetLedger", "releaseRequest"],
    ["signPack", "reviewEvents", "assetLedger", "releaseRequest"],
    collector,
  );
  if (root === undefined) {
    return { ok: false, issues: collector.issues };
  }

  const signPackResult = validateSignPack(root["signPack"]);
  const assetLedgerResult = validateAssetLedger(root["assetLedger"]);
  const releaseRequestResult = validateReleaseRequest(root["releaseRequest"]);
  const reviewEventInputs = root["reviewEvents"];

  if (!signPackResult.ok) {
    collector.issues.push(
      ...prefixIssues(signPackResult.issues, "$.signPack"),
    );
  }
  if (!assetLedgerResult.ok) {
    collector.issues.push(
      ...prefixIssues(assetLedgerResult.issues, "$.assetLedger"),
    );
  }
  if (!releaseRequestResult.ok) {
    collector.issues.push(
      ...prefixIssues(releaseRequestResult.issues, "$.releaseRequest"),
    );
  }
  if (!Array.isArray(reviewEventInputs)) {
    collector.add("$.reviewEvents", "type", "must be an array");
  }

  const reviewEvents: ReviewEvent[] = [];
  if (Array.isArray(reviewEventInputs)) {
    reviewEventInputs.forEach((event, index) => {
      const result = validateReviewEvent(event);
      if (result.ok) {
        reviewEvents.push(result.value);
      } else {
        collector.issues.push(
          ...prefixIssues(result.issues, `$.reviewEvents[${index}]`),
        );
      }
    });
  }

  if (
    !signPackResult.ok ||
    !assetLedgerResult.ok ||
    !releaseRequestResult.ok ||
    collector.issues.length > 0
  ) {
    return { ok: false, issues: collector.issues };
  }

  const signPack = signPackResult.value;
  const assetLedger = assetLedgerResult.value;
  const releaseRequest = releaseRequestResult.value;
  const requestedTimestamp = Date.parse(releaseRequest.requestedAt);
  const requiredReleaseOperations = deriveRequiredReleaseOperations(
    releaseRequest.scope,
  );

  if (
    signPack.releaseStatus !== "draft" ||
    signPack.publication !== undefined
  ) {
    collector.add(
      "$.signPack.releaseStatus",
      "candidate_state",
      "release candidates must remain draft and contain no publication metadata",
    );
  }
  if (signPack.developmentOnly) {
    collector.add(
      "$.signPack.developmentOnly",
      "candidate_state",
      "a development-only pack cannot become a release candidate",
    );
  }
  if (signPack.linguisticReviewStatus !== "human_reviewed") {
    collector.add(
      "$.signPack.linguisticReviewStatus",
      "candidate_state",
      "release candidates require completed human linguistic review",
    );
  }
  if (
    signPack.language.signedLanguage === "zxx" ||
    signPack.language.region === "ZZ" ||
    releaseRequest.scope.territories.includes("ZZ")
  ) {
    collector.add(
      "$.signPack.language",
      "synthetic_sentinel",
      "zxx and ZZ are synthetic-test sentinels and cannot become candidates",
    );
  }
  if (signPack.participants.reviewerRefs.length === 0) {
    collector.add(
      "$.signPack.participants.reviewerRefs",
      "candidate_state",
      "release candidates require a consent-safe reviewer reference",
    );
  }
  signPack.segments.forEach((segment, index) => {
    if (
      segment.reviewStatus !== "approved" ||
      segment.translationStatus === "proposed"
    ) {
      collector.add(
        `$.signPack.segments[${index}]`,
        "candidate_state",
        "every candidate segment must have a final approved decision",
      );
    }
  });

  if (
    assetLedger.packId !== signPack.packId ||
    releaseRequest.packId !== signPack.packId
  ) {
    collector.add(
      "$.releaseRequest.packId",
      "reference_mismatch",
      "request and ledger must reference the candidate SignPack",
    );
  }
  if (assetLedger.developmentOnly) {
    collector.add(
      "$.assetLedger.developmentOnly",
      "candidate_state",
      "a development-only ledger cannot support a release candidate",
    );
  }
  if (Date.parse(assetLedger.generatedAt) > requestedTimestamp) {
    collector.add(
      "$.assetLedger.generatedAt",
      "request_time",
      "asset ledger must be generated no later than the release request",
    );
  }

  const eventsById = new Map(reviewEvents.map((event) => [event.eventId, event]));
  const seenEventIds = new Set<string>();
  const seenSequences = new Set<number>();
  let previousSequence = 0;
  reviewEvents.forEach((event, index) => {
    if (seenEventIds.has(event.eventId)) {
      collector.add(
        `$.reviewEvents[${index}].eventId`,
        "duplicate",
        "review-event identifiers are immutable and must be unique",
      );
    }
    if (seenSequences.has(event.sequence)) {
      collector.add(
        `$.reviewEvents[${index}].sequence`,
        "duplicate",
        "review-event sequence values must be unique",
      );
    }
    if (event.sequence <= previousSequence) {
      collector.add(
        `$.reviewEvents[${index}].sequence`,
        "non_monotonic",
        "review events must be supplied in strictly increasing sequence order",
      );
    }
    if (Date.parse(event.occurredAt) > requestedTimestamp) {
      collector.add(
        `$.reviewEvents[${index}].occurredAt`,
        "request_time",
        "review events must occur no later than the release request",
      );
    }
    seenEventIds.add(event.eventId);
    seenSequences.add(event.sequence);
    previousSequence = event.sequence;
  });

  const selectedIds = new Set(releaseRequest.selectedReviewEventIds);
  for (const selectedId of selectedIds) {
    const event = eventsById.get(selectedId);
    if (event === undefined) {
      collector.add(
        "$.releaseRequest.selectedReviewEventIds",
        "unknown_event",
        `references missing review event ${selectedId}`,
      );
      continue;
    }
    if (
      event.environment !== "production" ||
      event.actor.kind !== "human_reviewer" ||
      event.reviewStatus !== "approved" ||
      (event.action !== "approved" &&
        event.action !== "unsupported_confirmed")
    ) {
      collector.add(
        "$.releaseRequest.selectedReviewEventIds",
        "selected_decision",
        `${selectedId} is not a final production human approval`,
      );
    }
  }

  const consumedSelectedIds = new Set<string>();
  const usedAssetIds = new Set<string>();
  signPack.segments.forEach((segment, index) => {
    segment.assetIds.forEach((assetId) => usedAssetIds.add(assetId));
    const suppliedSegmentEvents = reviewEvents
      .filter(
        (event) =>
          event.packId === signPack.packId &&
          event.segmentId === segment.segmentId,
      )
      .sort((left, right) => left.sequence - right.sequence);
    const latestDecision = suppliedSegmentEvents.at(-1);
    const selectedForSegment = suppliedSegmentEvents.filter((event) =>
      selectedIds.has(event.eventId),
    );

    if (
      latestDecision === undefined ||
      selectedForSegment.length !== 1 ||
      selectedForSegment[0]?.eventId !== latestDecision.eventId
    ) {
      collector.add(
        `$.signPack.segments[${index}]`,
        "latest_decision",
        "must select exactly the latest supplied valid segment event",
      );
      return;
    }

    const selected = selectedForSegment[0];
    if (selected === undefined) {
      return;
    }
    consumedSelectedIds.add(selected.eventId);
    if (
      selected.environment !== "production" ||
      selected.reviewStatus !== "approved" ||
      !signPack.participants.reviewerRefs.includes(selected.actor.actorRef)
    ) {
      collector.add(
        `$.signPack.segments[${index}]`,
        "selected_decision",
        "selected decision must be a declared production reviewer approval",
      );
    }
    const expectedAction =
      segment.translationStatus === "mapped"
        ? "approved"
        : "unsupported_confirmed";
    if (
      selected.action !== expectedAction ||
      selected.decisionHash !== segment.decisionHash ||
      selected.translationStatus !== segment.translationStatus ||
      !hasSameOrderedValues(selected.assetIds, segment.assetIds)
    ) {
      collector.add(
        `$.signPack.segments[${index}]`,
        "selected_decision",
        "selected decision must exactly match segment state and assets",
      );
    }
  });

  for (const selectedId of selectedIds) {
    if (!consumedSelectedIds.has(selectedId)) {
      collector.add(
        "$.releaseRequest.selectedReviewEventIds",
        "selected_decision",
        `${selectedId} does not select one candidate segment`,
      );
    }
  }

  const packAssetsById = new Map(
    signPack.assets.map((asset) => [asset.assetId, asset]),
  );
  const ledgerAssetsById = new Map(
    assetLedger.assets.map((asset) => [asset.assetId, asset]),
  );
  if (ledgerAssetsById.size !== packAssetsById.size) {
    collector.add(
      "$.assetLedger.assets",
      "asset_set",
      "must contain exactly the assets embedded in the candidate SignPack",
    );
  }

  for (const [assetId, packAsset] of packAssetsById) {
    const ledgerAsset = ledgerAssetsById.get(assetId);
    if (ledgerAsset === undefined) {
      collector.add(
        "$.assetLedger.assets",
        "unknown_asset",
        `is missing structural evidence for ${assetId}`,
      );
      continue;
    }
    if (
      ledgerAsset.path !== packAsset.path ||
      ledgerAsset.sha256 !== packAsset.sha256
    ) {
      collector.add(
        "$.assetLedger.assets",
        "asset_mismatch",
        `${assetId} path and hash references must match the SignPack`,
      );
    }
    if (
      ledgerAsset.assetStatus !== "licensed" ||
      ledgerAsset.reviewStatus !== "approved" ||
      ledgerAsset.consent.status !== "granted"
    ) {
      collector.add(
        "$.assetLedger.assets",
        "candidate_rights",
        `${assetId} lacks licensed, consented, human-approved state`,
      );
    }
    for (const signerRef of ledgerAsset.signerRefs) {
      if (!signPack.participants.signerRefs.includes(signerRef)) {
        collector.add(
          "$.signPack.participants.signerRefs",
          "signer_consent",
          `does not declare asset signer ${signerRef}`,
        );
      }
    }

    const missingPurposes = releaseRequest.scope.purposes.filter(
      (purpose) => !ledgerAsset.rights.grantedPurposes.includes(purpose),
    );
    const missingChannels = releaseRequest.scope.channels.filter(
      (channel) => !ledgerAsset.rights.grantedChannels.includes(channel),
    );
    if (missingPurposes.length > 0 || missingChannels.length > 0) {
      collector.add(
        "$.assetLedger.assets",
        "scope_coverage",
        `${assetId} rights do not cover every requested purpose and channel`,
      );
    }
    if (
      !grantCoversTerritories(
        ledgerAsset.rights.territories,
        releaseRequest.scope.territories,
      )
    ) {
      collector.add(
        "$.assetLedger.assets",
        "scope_coverage",
        `${assetId} rights do not cover every requested territory`,
      );
    }
    for (const operation of [
      "modification",
      "hosting",
      "redistribution",
      "sublicensing",
    ] as const) {
      if (
        requiredReleaseOperations[operation] &&
        !ledgerAsset.rights[operation]
      ) {
        collector.add(
          "$.assetLedger.assets",
          "scope_coverage",
          `${assetId} rights do not cover requested ${operation}`,
        );
      }
    }

    const reviewerApproval = ledgerAsset.reviewerApproval;
    if (reviewerApproval === undefined) {
      collector.add(
        "$.assetLedger.assets",
        "asset_approval",
        `${assetId} lacks an exact reviewer approval reference`,
      );
      continue;
    }
    const approvalEvent = eventsById.get(reviewerApproval.eventId);
    if (
      !selectedIds.has(reviewerApproval.eventId) ||
      approvalEvent === undefined ||
      approvalEvent.environment !== "production" ||
      approvalEvent.actor.kind !== "human_reviewer" ||
      approvalEvent.actor.actorRef !== reviewerApproval.reviewerRef ||
      approvalEvent.reviewStatus !== "approved" ||
      approvalEvent.action !== "approved" ||
      !approvalEvent.assetIds.includes(assetId)
    ) {
      collector.add(
        "$.assetLedger.assets",
        "asset_approval",
        `${assetId} must resolve to its selected production reviewer event`,
      );
    }
    if (
      approvalEvent !== undefined &&
      Date.parse(approvalEvent.occurredAt) >
        Date.parse(assetLedger.generatedAt)
    ) {
      collector.add(
        "$.assetLedger.generatedAt",
        "ledger_time",
        `${assetId} reviewer approval occurs after the ledger generation time`,
      );
    }
  }

  for (const assetId of packAssetsById.keys()) {
    if (!usedAssetIds.has(assetId)) {
      collector.add(
        "$.signPack.assets",
        "unused_asset",
        `candidate contains unreferenced asset ${assetId}`,
      );
    }
  }

  if (collector.issues.length > 0) {
    return { ok: false, issues: collector.issues };
  }
  return {
    ok: true,
    value: {
      assurance: "structural_preflight_only",
      signPack: signPack as DraftReleaseCandidateSignPack,
      reviewEvents,
      assetLedger,
      releaseRequest,
    },
  };
}
