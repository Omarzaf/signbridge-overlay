import { describe, expect, test } from "vitest";

import assetLedgerSchema from "../../../contracts/asset-ledger.schema.json";
import contestEvidenceSchema from "../../../contracts/contest-evidence.schema.json";
import reviewEventSchema from "../../../contracts/review-event.schema.json";
import runManifestSchema from "../../../contracts/run-manifest.schema.json";
import signPackSchema from "../../../contracts/signpack.schema.json";
import assetLedgerFixture from "../../../fixtures/synthetic-unsupported.asset-ledger.json";
import contestEvidenceFixture from "../../../fixtures/synthetic-unsupported.contest-evidence.json";
import reviewEventFixture from "../../../fixtures/synthetic-unsupported.review-event.json";
import runManifestFixture from "../../../fixtures/synthetic-unsupported.run-manifest.json";
import signPackFixture from "../../../fixtures/synthetic-unsupported.signpack.json";
import {
  CONTEST_EVIDENCE_CATEGORIES,
  validateAssetLedger,
  validateContestEvidence,
  validatePublicationPreflight,
  validateReviewEvent,
  validateRunManifest,
  validateSignPack,
} from "./index";
import type { ValidationResult } from "./types";

type MutableObject = Record<string, unknown>;

function cloneObject(value: unknown): MutableObject {
  return structuredClone(value) as MutableObject;
}

function issueCodes<T>(result: ValidationResult<T>): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

function issuePaths<T>(result: ValidationResult<T>): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.path);
}

function createStructuralPublicationPreflight(): MutableObject {
  // These are test-only structural sentinels, not reviewer or rights evidence.
  const pack = cloneObject(signPackFixture);
  pack["releaseStatus"] = "published";
  pack["developmentOnly"] = false;
  pack["linguisticReviewStatus"] = "human_reviewed";
  pack["language"] = {
    signedLanguage: "ase",
    region: "US",
    dialect: "synthetic-contract-test-only",
    audience: "validator test users",
    educationalContext: "structural preflight test only",
  };
  pack["participants"] = {
    signerRefs: ["signer_synthetic0001"],
    reviewerRefs: ["reviewer_synthetic001"],
  };
  const segment = (pack["segments"] as MutableObject[])[0]!;
  segment["translationStatus"] = "mapped";
  segment["reviewStatus"] = "approved";
  segment["assetIds"] = ["ast_synthetic000001"];
  delete segment["unsupportedReason"];
  pack["assets"] = [
    {
      assetId: "ast_synthetic000001",
      path: "assets/synthetic.webm",
      sha256:
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      mediaType: "video/webm",
      durationMs: 1000,
    },
  ];
  pack["publication"] = {
    releaseId:
      "sha256:6666666666666666666666666666666666666666666666666666666666666666",
    releasedAt: "2026-01-01T00:00:05.000Z",
    publisherId: "publisher_synthetic001",
    assetLedgerHash:
      "sha256:7777777777777777777777777777777777777777777777777777777777777777",
    reviewLogHash:
      "sha256:8888888888888888888888888888888888888888888888888888888888888888",
    humanApprovalEventIds: ["rev_syntheticapproval1"],
  };

  const event: MutableObject = {
    schemaVersion: "1.0.0",
    eventId: "rev_syntheticapproval1",
    sequence: 1,
    occurredAt: "2026-01-01T00:00:04.000Z",
    environment: "production",
    packId: "spk_synthetic000001",
    segmentId: "seg_synthetic000001",
    decisionHash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    actor: {
      kind: "human_reviewer",
      actorRef: "reviewer_synthetic001",
    },
    action: "approved",
    translationStatus: "mapped",
    reviewStatus: "approved",
    assetIds: ["ast_synthetic000001"],
  };

  const ledger = cloneObject(assetLedgerFixture);
  ledger["generatedAt"] = "2026-01-01T00:00:04.500Z";
  ledger["developmentOnly"] = false;
  ledger["assets"] = [
    {
      assetId: "ast_synthetic000001",
      path: "assets/synthetic.webm",
      sha256:
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      ownerRef: "owner_synthetic00001",
      sourceRef: "source_synthetic0001",
      assetStatus: "licensed",
      reviewStatus: "approved",
      consent: {
        status: "granted",
        consentRef: "consent_synthetic001",
      },
      rights: {
        grantRef: "rights_synthetic0001",
        exactHash:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
        termModel: "irrevocable_exact_hash",
        offlinePlayback: true,
        publicDemo: true,
        contestSubmission: true,
        sponsorPublicity: true,
        modification: false,
        territories: ["US"],
      },
      attribution: "Synthetic structural test only",
      reviewerApproval: {
        reviewerRef: "reviewer_synthetic001",
        eventId: "rev_syntheticapproval1",
        approvedHash:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      },
    },
  ];

  return { signPack: pack, reviewEvents: [event], assetLedger: ledger };
}

describe("machine-readable contracts", () => {
  test("use draft 2020-12 and reject unknown top-level properties", () => {
    for (const schema of [
      signPackSchema,
      reviewEventSchema,
      runManifestSchema,
      assetLedgerSchema,
      contestEvidenceSchema,
    ]) {
      expect(schema.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
      expect(schema.additionalProperties).toBe(false);
    }
  });

  test("keeps contest categories and JSON Schema enum in exact parity", () => {
    expect(
      contestEvidenceSchema.$defs.record.properties.category.enum,
    ).toEqual(CONTEST_EVIDENCE_CATEGORIES);
  });

  test("encodes core authority and publication conditions in JSON Schema", () => {
    const reviewRules = JSON.stringify(reviewEventSchema.allOf);
    expect(reviewRules).toContain('"authoring_service"');
    expect(reviewRules).toContain('"proposal_created"');
    expect(reviewRules).toContain('"human_reviewer"');

    const publicationRules = JSON.stringify(signPackSchema.allOf);
    expect(publicationRules).toContain('"reviewStatus":{"const":"approved"}');
    expect(publicationRules).toContain(
      '"translationStatus":{"const":"proposed"}',
    );
  });
});

describe("synthetic unsupported fixtures", () => {
  test("accepts only the unreviewed zxx draft and privacy-minimized ledgers", () => {
    expect(validateSignPack(signPackFixture)).toMatchObject({ ok: true });
    expect(validateReviewEvent(reviewEventFixture)).toMatchObject({ ok: true });
    expect(validateRunManifest(runManifestFixture)).toMatchObject({ ok: true });
    expect(validateAssetLedger(assetLedgerFixture)).toMatchObject({ ok: true });
    expect(validateContestEvidence(contestEvidenceFixture)).toMatchObject({
      ok: true,
    });
  });

  test("rejects unknown data and an unsafe attempt to publish the draft", () => {
    const unknown = cloneObject(signPackFixture);
    unknown["inventedMapping"] = { meaning: "must not pass" };
    const unknownResult = validateSignPack(unknown);
    expect(issueCodes(unknownResult)).toContain("unknown_property");

    const published = cloneObject(signPackFixture);
    published["releaseStatus"] = "published";
    published["developmentOnly"] = false;
    const publishResult = validateSignPack(published);
    expect(issueCodes(publishResult)).toContain("publication_gate");
    expect(issuePaths(publishResult)).toContain("$.publication");
  });

  test("rejects overlapping timing and remote or traversing asset paths", () => {
    const pack = cloneObject(signPackFixture);
    const segments = pack["segments"] as MutableObject[];
    const overlappingSegment = cloneObject(segments[0]);
    overlappingSegment["segmentId"] = "seg_synthetic000002";
    overlappingSegment["startMs"] = 9000;
    overlappingSegment["endMs"] = 10000;
    segments.push(overlappingSegment);

    const assets = pack["assets"] as MutableObject[];
    assets.push({
      assetId: "ast_synthetic000001",
      path: "https://example.invalid/synthetic.webm",
      sha256:
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      mediaType: "video/webm",
      durationMs: 1000,
      remoteUrl: "https://example.invalid",
    });

    const result = validateSignPack(pack);
    expect(issueCodes(result)).toContain("non_monotonic");
    expect(issueCodes(result)).toContain("relative_asset_path");
    expect(issueCodes(result)).toContain("unknown_property");

    assets[0]!["path"] = "assets/../synthetic.webm";
    const traversalResult = validateSignPack(pack);
    expect(issueCodes(traversalResult)).toContain("relative_asset_path");
  });

  test("prevents an authoring service from inventing human approval", () => {
    const event = cloneObject(reviewEventFixture);
    event["action"] = "approved";
    event["translationStatus"] = "mapped";
    event["reviewStatus"] = "approved";
    event["assetIds"] = ["ast_synthetic000001"];

    const result = validateReviewEvent(event);
    expect(issueCodes(result)).toContain("authority");
  });

  test("blocks publication without exact human approval and licensed assets", () => {
    const pack = cloneObject(signPackFixture);
    pack["releaseStatus"] = "published";
    pack["developmentOnly"] = false;
    pack["linguisticReviewStatus"] = "human_reviewed";
    pack["participants"] = {
      signerRefs: ["signer_synthetic0001"],
      reviewerRefs: ["reviewer_synthetic001"],
    };
    const segment = (pack["segments"] as MutableObject[])[0]!;
    segment["translationStatus"] = "mapped";
    segment["reviewStatus"] = "approved";
    segment["assetIds"] = ["ast_synthetic000001"];
    delete segment["unsupportedReason"];
    pack["assets"] = [
      {
        assetId: "ast_synthetic000001",
        path: "assets/synthetic.webm",
        sha256:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
        mediaType: "video/webm",
        durationMs: 1000,
      },
    ];
    pack["publication"] = {
      releaseId:
        "sha256:6666666666666666666666666666666666666666666666666666666666666666",
      releasedAt: "2026-01-01T00:00:05.000Z",
      publisherId: "publisher_synthetic001",
      assetLedgerHash:
        "sha256:7777777777777777777777777777777777777777777777777777777777777777",
      reviewLogHash:
        "sha256:8888888888888888888888888888888888888888888888888888888888888888",
      humanApprovalEventIds: ["rev_syntheticapproval1"],
    };

    const ledger = cloneObject(assetLedgerFixture);
    ledger["developmentOnly"] = false;
    ledger["assets"] = [
      {
        assetId: "ast_synthetic000001",
        path: "assets/synthetic.webm",
        sha256:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
        ownerRef: "owner_synthetic00001",
        sourceRef: "source_synthetic0001",
        assetStatus: "draft",
        reviewStatus: "pending",
        consent: { status: "pending" },
        rights: {
          offlinePlayback: false,
          publicDemo: false,
          contestSubmission: false,
          sponsorPublicity: false,
          modification: false,
          territories: ["ZZ"],
        },
        attribution: "",
      },
    ];

    const result = validatePublicationPreflight({
      signPack: pack,
      reviewEvents: [],
      assetLedger: ledger,
    });
    expect(issueCodes(result)).toContain("unknown_event");
    expect(issueCodes(result)).toContain("human_approval");
    expect(issueCodes(result)).toContain("publication_gate");
  });
});

describe("structural publication preflight", () => {
  test("returns issues for malformed or hostile unknown input without throwing", () => {
    for (const value of [
      null,
      "not-a-bundle",
      {},
      { signPack: null, reviewEvents: "invalid", assetLedger: 42 },
    ]) {
      const result = validatePublicationPreflight(value);
      expect(result.ok).toBe(false);
    }

    const hostile = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("synthetic proxy trap");
        },
      },
    );
    const hostileResult = validatePublicationPreflight(hostile);
    expect(issueCodes(hostileResult)).toContain("unsafe_input");
  });

  test("accepts a complete structural candidate without authorizing release", () => {
    expect(
      validatePublicationPreflight(createStructuralPublicationPreflight()),
    ).toMatchObject({ ok: true });
  });

  test("rejects synthetic language sentinels and non-production approvals", () => {
    const sentinel = createStructuralPublicationPreflight();
    const language = (sentinel["signPack"] as MutableObject)[
      "language"
    ] as MutableObject;
    language["signedLanguage"] = "zxx";
    language["region"] = "ZZ";
    expect(issueCodes(validatePublicationPreflight(sentinel))).toContain(
      "synthetic_sentinel",
    );

    const development = createStructuralPublicationPreflight();
    const event = (development["reviewEvents"] as MutableObject[])[0]!;
    event["environment"] = "development";
    expect(issueCodes(validatePublicationPreflight(development))).toContain(
      "production_approval",
    );
  });

  test("rejects approvals and ledgers created after release", () => {
    const lateApproval = createStructuralPublicationPreflight();
    const event = (lateApproval["reviewEvents"] as MutableObject[])[0]!;
    event["occurredAt"] = "2026-01-01T00:00:06.000Z";
    expect(issueCodes(validatePublicationPreflight(lateApproval))).toContain(
      "release_time",
    );

    const lateLedger = createStructuralPublicationPreflight();
    const ledger = lateLedger["assetLedger"] as MutableObject;
    ledger["generatedAt"] = "2026-01-01T00:00:06.000Z";
    expect(issueCodes(validatePublicationPreflight(lateLedger))).toContain(
      "release_time",
    );
  });

  test("requires an exact declared asset reviewer event", () => {
    const unresolved = createStructuralPublicationPreflight();
    const unresolvedAsset = (
      (unresolved["assetLedger"] as MutableObject)["assets"] as MutableObject[]
    )[0]!;
    const unresolvedApproval =
      unresolvedAsset["reviewerApproval"] as MutableObject;
    unresolvedApproval["eventId"] = "rev_missingapproval001";
    expect(issueCodes(validatePublicationPreflight(unresolved))).toContain(
      "asset_approval",
    );

    const mismatch = createStructuralPublicationPreflight();
    const mismatchAsset = (
      (mismatch["assetLedger"] as MutableObject)["assets"] as MutableObject[]
    )[0]!;
    const mismatchApproval = mismatchAsset["reviewerApproval"] as MutableObject;
    mismatchApproval["reviewerRef"] = "reviewer_synthetic002";
    expect(issueCodes(validatePublicationPreflight(mismatch))).toContain(
      "asset_approval",
    );

    const omittedAsset = createStructuralPublicationPreflight();
    const approvalEvent = (
      omittedAsset["reviewEvents"] as MutableObject[]
    )[0]!;
    approvalEvent["assetIds"] = ["ast_synthetic000002"];
    expect(issueCodes(validatePublicationPreflight(omittedAsset))).toContain(
      "asset_approval",
    );
  });

  test("rejects an approval superseded by a later human rejection", () => {
    const candidate = createStructuralPublicationPreflight();
    const approval = (candidate["reviewEvents"] as MutableObject[])[0]!;
    const rejection = cloneObject(approval);
    rejection["eventId"] = "rev_syntheticrejected1";
    rejection["sequence"] = 2;
    rejection["occurredAt"] = "2026-01-01T00:00:04.750Z";
    rejection["action"] = "rejected";
    rejection["reviewStatus"] = "rejected";
    rejection["reasonCode"] = "human_reviewer_rejected";
    (candidate["reviewEvents"] as MutableObject[]).push(rejection);

    expect(issueCodes(validatePublicationPreflight(candidate))).toContain(
      "superseded_approval",
    );
  });
});

describe("contest evidence coverage", () => {
  test("accepts a privacy-safe record for every claims-ledger family", () => {
    const evidence = cloneObject(contestEvidenceFixture);
    evidence["records"] = CONTEST_EVIDENCE_CATEGORIES.map(
      (category, index): MutableObject => {
        const hex = (index % 16).toString(16);
        const base: MutableObject = {
          evidenceId: `evd_category${index.toString().padStart(6, "0")}`,
          category,
          status: "draft",
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.000Z",
          sourceHash: `sha256:${hex.repeat(64)}`,
          relationship: "not_applicable",
          measurement: {
            kind: "artifact",
            artifactHash: `sha256:${hex.repeat(64)}`,
          },
        };

        if (category === "gemini_production_call") {
          base["measurement"] = { kind: "count", value: 0, unit: "calls" };
        } else if (category === "user_count") {
          base["measurement"] = { kind: "count", value: 0, unit: "users" };
        } else if (category === "pilot_participant_count") {
          base["measurement"] = {
            kind: "count",
            value: 0,
            unit: "participants",
          };
        } else if (
          [
            "arms_length_revenue",
            "monthly_arms_length_revenue",
            "related_party_revenue",
            "expense",
            "marketing_spend",
            "refund",
          ].includes(category)
        ) {
          base["measurement"] = {
            kind: "money",
            minorUnits: 0,
            currency: "USD",
          };
          base["relationship"] =
            category === "related_party_revenue"
              ? "related_party"
              : "arms_length";
        }

        if (category === "feedback_consent") {
          base["consentRef"] = "consent_synthetic001";
        }
        return base;
      },
    );

    expect(validateContestEvidence(evidence)).toMatchObject({ ok: true });
  });

  test("rejects unknown categories and private data without throwing", () => {
    const evidence = cloneObject(contestEvidenceFixture);
    evidence["records"] = [
      {
        evidenceId: "evd_unknowncategory1",
        category: "invented_claim",
        status: "draft",
        periodStart: "2026-01-01T00:00:00.000Z",
        periodEnd: "2026-01-01T00:00:01.000Z",
        sourceHash:
          "sha256:9999999999999999999999999999999999999999999999999999999999999999",
        relationship: "not_applicable",
        measurement: {
          kind: "artifact",
          artifactHash:
            "sha256:9999999999999999999999999999999999999999999999999999999999999999",
        },
      },
    ];
    const privacy = evidence["privacy"] as MutableObject;
    privacy["containsPersonalData"] = true;

    const result = validateContestEvidence(evidence);
    expect(issueCodes(result)).toContain("enum");
    expect(issueCodes(result)).toContain("privacy_gate");
  });
});
