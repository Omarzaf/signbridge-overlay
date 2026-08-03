import { describe, expect, test } from "vitest";

import reviewUnitSchema from "../../../contracts/review-unit.schema.json";
import {
  REVIEW_UNIT_SCHEMA_VERSION,
  canonicalizeReviewUnit,
  computeReviewUnitHash,
  validateReviewUnit,
} from "./index";
import type { ReviewUnitV2 } from "./types";

type MutableObject = Record<string, unknown>;

const HASH_A =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const HASH_B =
  "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const HASH_C =
  "sha256:3333333333333333333333333333333333333333333333333333333333333333";

/**
 * A structurally complete synthetic review unit. It uses the reserved zxx/ZZ
 * markers and carries no reviewer identity, consent record, or rights grant.
 */
function createReviewUnit(): ReviewUnitV2 {
  return {
    schemaVersion: REVIEW_UNIT_SCHEMA_VERSION,
    reviewUnitId: "runit_synthetic00001",
    proposalId: "proposal_synthetic001",
    runId: "run_synthetic000001",
    packId: "spk_synthetic000001",
    segmentId: "seg_synthetic000001",
    source: {
      fingerprint: HASH_A,
      timedTextHash: HASH_B,
      startMs: 0,
      endMs: 10000,
    },
    language: {
      signedLanguage: "zxx",
      region: "ZZ",
    },
    catalog: {
      catalogVersion: "0.1.0",
      candidateSetHash: HASH_C,
    },
    selection: {
      translationStatus: "unsupported",
      assetHashes: [],
      reasonCode: "unsupported_vocabulary",
    },
    presentation: {
      cropped: false,
      mirrored: false,
      transformed: false,
    },
  };
}

function cloneUnit(unit: ReviewUnitV2): MutableObject {
  return structuredClone(unit) as unknown as MutableObject;
}

describe("review unit v2 canonical form", () => {
  test("accepts a structurally complete synthetic review unit", () => {
    expect(validateReviewUnit(createReviewUnit())).toMatchObject({ ok: true });
  });

  test("binds material differences the v1 decision hash ignored", async () => {
    // The audit's adversarial probe: two requests sharing pack, segment, and
    // selected output differed only in source text and timing, yet produced
    // identical v1 decision hashes. Each variation below must now change the
    // hash.
    const base = createReviewUnit();
    const baseHash = await computeReviewUnitHash(base);

    const variations: ReadonlyArray<readonly [string, ReviewUnitV2]> = [
      [
        "timed text",
        { ...base, source: { ...base.source, timedTextHash: HASH_C } },
      ],
      [
        "source fingerprint",
        { ...base, source: { ...base.source, fingerprint: HASH_C } },
      ],
      ["segment end", { ...base, source: { ...base.source, endMs: 9000 } }],
      ["segment start", { ...base, source: { ...base.source, startMs: 1 } }],
      [
        "signed language",
        { ...base, language: { ...base.language, signedLanguage: "zxy" } },
      ],
      [
        "region",
        { ...base, language: { ...base.language, region: "ZY" } },
      ],
      [
        "catalog version",
        { ...base, catalog: { ...base.catalog, catalogVersion: "0.2.0" } },
      ],
      [
        "candidate set",
        { ...base, catalog: { ...base.catalog, candidateSetHash: HASH_A } },
      ],
      [
        "selected asset",
        {
          ...base,
          selection: {
            translationStatus: "mapped",
            assetHashes: [HASH_A],
          },
        },
      ],
      ["run identity", { ...base, runId: "run_synthetic000002" }],
      [
        "proposal identity",
        { ...base, proposalId: "proposal_synthetic002" },
      ],
    ];

    for (const [label, variation] of variations) {
      const hash = await computeReviewUnitHash(variation);
      expect(hash, `${label} must change the review unit hash`).not.toBe(
        baseHash,
      );
    }
  });

  test("is independent of key order and stable across repeated hashing", async () => {
    const unit = createReviewUnit();
    const reordered = {
      presentation: unit.presentation,
      selection: unit.selection,
      catalog: unit.catalog,
      language: unit.language,
      source: unit.source,
      segmentId: unit.segmentId,
      packId: unit.packId,
      runId: unit.runId,
      proposalId: unit.proposalId,
      reviewUnitId: unit.reviewUnitId,
      schemaVersion: unit.schemaVersion,
    } as ReviewUnitV2;

    expect(canonicalizeReviewUnit(reordered)).toBe(
      canonicalizeReviewUnit(unit),
    );
    expect(await computeReviewUnitHash(reordered)).toBe(
      await computeReviewUnitHash(unit),
    );
    expect(await computeReviewUnitHash(unit)).toBe(
      await computeReviewUnitHash(unit),
    );
  });

  test("produces a hash in the repository's exact-hash form", async () => {
    expect(await computeReviewUnitHash(createReviewUnit())).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
  });

  test("refuses to canonicalize an invalid unit rather than hashing a guess", () => {
    const invalid = cloneUnit(createReviewUnit());
    delete invalid["source"];
    expect(() =>
      canonicalizeReviewUnit(invalid as unknown as ReviewUnitV2),
    ).toThrow();
  });
});

describe("review unit v2 validation", () => {
  test("rejects more than one selected asset", () => {
    const multi = cloneUnit(createReviewUnit());
    multi["selection"] = {
      translationStatus: "mapped",
      assetHashes: [HASH_A, HASH_B],
    };
    const result = validateReviewUnit(multi);
    expect(result.ok).toBe(false);
    expect(
      result.ok ? [] : result.issues.map((issue) => issue.code),
    ).toContain("multi_asset_violation");
  });

  test("rejects cropped, mirrored, or otherwise transformed presentation", () => {
    for (const field of ["cropped", "mirrored", "transformed"] as const) {
      const transformed = cloneUnit(createReviewUnit());
      transformed["presentation"] = {
        cropped: false,
        mirrored: false,
        transformed: false,
        [field]: true,
      };
      const result = validateReviewUnit(transformed);
      expect(result.ok, `${field} must be rejected`).toBe(false);
      expect(
        result.ok ? [] : result.issues.map((issue) => issue.code),
      ).toContain("presentation_transform");
    }
  });

  test("requires a mapped selection to carry exactly one asset hash", () => {
    const emptyMapped = cloneUnit(createReviewUnit());
    emptyMapped["selection"] = {
      translationStatus: "mapped",
      assetHashes: [],
    };
    expect(validateReviewUnit(emptyMapped).ok).toBe(false);

    const unsupportedWithAsset = cloneUnit(createReviewUnit());
    unsupportedWithAsset["selection"] = {
      translationStatus: "unsupported",
      assetHashes: [HASH_A],
      reasonCode: "unsupported_vocabulary",
    };
    expect(validateReviewUnit(unsupportedWithAsset).ok).toBe(false);
  });

  test("rejects a non-positive or reversed segment range", () => {
    const reversed = cloneUnit(createReviewUnit());
    reversed["source"] = {
      fingerprint: HASH_A,
      timedTextHash: HASH_B,
      startMs: 5000,
      endMs: 1000,
    };
    expect(validateReviewUnit(reversed).ok).toBe(false);
  });

  test("rejects an unknown schema version rather than hashing it anyway", () => {
    const stale = cloneUnit(createReviewUnit());
    stale["schemaVersion"] = "1.0.0";
    const result = validateReviewUnit(stale);
    expect(result.ok).toBe(false);
    expect(
      result.ok ? [] : result.issues.map((issue) => issue.code),
    ).toContain("schema_version");
  });

  test("returns issues for malformed and hostile input without throwing", () => {
    for (const value of [null, "not-a-unit", 42, [], {}]) {
      expect(validateReviewUnit(value).ok).toBe(false);
    }
  });
});

describe("review unit contract document", () => {
  test("declares the same version and required fields as the implementation", () => {
    const schema = reviewUnitSchema as MutableObject;
    expect(schema["$id"]).toContain("review-unit");
    const properties = schema["properties"] as MutableObject;
    const schemaVersion = properties["schemaVersion"] as MutableObject;
    expect(schemaVersion["const"]).toBe(REVIEW_UNIT_SCHEMA_VERSION);
    expect(schema["required"]).toEqual(
      expect.arrayContaining([
        "schemaVersion",
        "reviewUnitId",
        "proposalId",
        "runId",
        "packId",
        "segmentId",
        "source",
        "language",
        "catalog",
        "selection",
        "presentation",
      ]),
    );
  });
});
