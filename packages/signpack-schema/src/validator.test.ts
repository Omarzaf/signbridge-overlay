import { describe, expect, test } from "vitest";

import assetLedgerSchema from "../../../contracts/asset-ledger.schema.json";
import contestEvidenceSchema from "../../../contracts/contest-evidence.schema.json";
import releaseRequestSchema from "../../../contracts/release-request.schema.json";
import reviewEventSchema from "../../../contracts/review-event.schema.json";
import runManifestSchema from "../../../contracts/run-manifest.schema.json";
import signPackSchema from "../../../contracts/signpack.schema.json";
import assetLedgerFixture from "../../../fixtures/synthetic-unsupported.asset-ledger.json";
import contestEvidenceFixture from "../../../fixtures/synthetic-unsupported.contest-evidence.json";
import releaseRequestFixture from "../../../fixtures/synthetic-unsupported.release-request.json";
import reviewEventFixture from "../../../fixtures/synthetic-unsupported.review-event.json";
import runManifestFixture from "../../../fixtures/synthetic-unsupported.run-manifest.json";
import signPackFixture from "../../../fixtures/synthetic-unsupported.signpack.json";
import {
  CONTEST_EVIDENCE_CATEGORIES,
  RELEASE_CHANNELS,
  RELEASE_PURPOSES,
  validateAssetLedger,
  validateContestEvidence,
  validateReleaseCandidate,
  validateReleaseRequest,
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

function createStructuralReleaseCandidate(): MutableObject {
  // These are test-only structural sentinels, not reviewer or rights evidence.
  const pack = cloneObject(signPackFixture);
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
      signerRefs: ["signer_synthetic0001"],
      assetStatus: "licensed",
      reviewStatus: "approved",
      consent: {
        status: "granted",
        consentRef: "consent_synthetic001",
        subjectSignerRefs: ["signer_synthetic0001"],
        exactHash:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      },
      rights: {
        grantRef: "rights_synthetic0001",
        exactHash:
          "sha256:5555555555555555555555555555555555555555555555555555555555555555",
        termModel: "irrevocable_exact_hash",
        grantedPurposes: [...RELEASE_PURPOSES],
        grantedChannels: [...RELEASE_CHANNELS],
        territories: ["US"],
        modification: false,
        hosting: true,
        redistribution: true,
        sublicensing: true,
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

  const releaseRequest = cloneObject(releaseRequestFixture);
  releaseRequest["requestedAt"] = "2026-01-01T00:00:05.000Z";
  releaseRequest["selectedReviewEventIds"] = ["rev_syntheticapproval1"];
  releaseRequest["scope"] = {
    purposes: [...RELEASE_PURPOSES],
    channels: [...RELEASE_CHANNELS],
    territories: ["US"],
    modification: false,
    hosting: true,
    redistribution: true,
    sublicensing: true,
  };

  return {
    signPack: pack,
    reviewEvents: [event],
    assetLedger: ledger,
    releaseRequest,
  };
}

describe("machine-readable contracts", () => {
  test("use draft 2020-12 and reject unknown top-level properties", () => {
    for (const schema of [
      signPackSchema,
      reviewEventSchema,
      runManifestSchema,
      assetLedgerSchema,
      releaseRequestSchema,
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

  test("keeps release scope enums and JSON Schema in exact parity", () => {
    expect(
      releaseRequestSchema.$defs.releaseScope.properties.purposes.items.enum,
    ).toEqual(RELEASE_PURPOSES);
    expect(
      releaseRequestSchema.$defs.releaseScope.properties.channels.items.enum,
    ).toEqual(RELEASE_CHANNELS);
    expect(
      assetLedgerSchema.$defs.rights.properties.grantedPurposes.items.enum,
    ).toEqual(RELEASE_PURPOSES);
    expect(
      assetLedgerSchema.$defs.rights.properties.grantedChannels.items.enum,
    ).toEqual(RELEASE_CHANNELS);
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
    expect(validateReleaseRequest(releaseRequestFixture)).toMatchObject({
      ok: true,
    });
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

  test("rejects empty scope and any claim of release assurance", () => {
    const request = cloneObject(releaseRequestFixture);
    request["assurance"] = "release_authorized";
    const scope = request["scope"] as MutableObject;
    scope["purposes"] = [];

    const result = validateReleaseRequest(request);
    expect(issueCodes(result)).toContain("enum");
    expect(issueCodes(result)).toContain("min_items");
  });
});

describe("draft release candidate", () => {
  test("returns issues for malformed or hostile unknown input without throwing", () => {
    for (const value of [
      null,
      "not-a-bundle",
      {},
      { signPack: null, reviewEvents: "invalid", assetLedger: 42 },
    ]) {
      const result = validateReleaseCandidate(value);
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
    const hostileResult = validateReleaseCandidate(hostile);
    expect(issueCodes(hostileResult)).toContain("unsafe_input");
  });

  test("accepts a complete structural candidate without authorizing release", () => {
    expect(
      validateReleaseCandidate(createStructuralReleaseCandidate()),
    ).toMatchObject({
      ok: true,
      value: { assurance: "structural_preflight_only" },
    });
  });

  test("rejects synthetic language sentinels and non-production approvals", () => {
    const sentinel = createStructuralReleaseCandidate();
    const language = (sentinel["signPack"] as MutableObject)[
      "language"
    ] as MutableObject;
    language["signedLanguage"] = "zxx";
    language["region"] = "ZZ";
    expect(issueCodes(validateReleaseCandidate(sentinel))).toContain(
      "synthetic_sentinel",
    );

    const development = createStructuralReleaseCandidate();
    const event = (development["reviewEvents"] as MutableObject[])[0]!;
    event["environment"] = "development";
    expect(issueCodes(validateReleaseCandidate(development))).toContain(
      "selected_decision",
    );
  });

  test("rejects approvals and ledgers created after the request", () => {
    const lateApproval = createStructuralReleaseCandidate();
    const event = (lateApproval["reviewEvents"] as MutableObject[])[0]!;
    event["occurredAt"] = "2026-01-01T00:00:06.000Z";
    expect(issueCodes(validateReleaseCandidate(lateApproval))).toContain(
      "request_time",
    );

    const lateLedger = createStructuralReleaseCandidate();
    const ledger = lateLedger["assetLedger"] as MutableObject;
    ledger["generatedAt"] = "2026-01-01T00:00:06.000Z";
    expect(issueCodes(validateReleaseCandidate(lateLedger))).toContain(
      "request_time",
    );
  });

  test("requires an exact declared asset reviewer event", () => {
    const unresolved = createStructuralReleaseCandidate();
    const unresolvedAsset = (
      (unresolved["assetLedger"] as MutableObject)["assets"] as MutableObject[]
    )[0]!;
    const unresolvedApproval =
      unresolvedAsset["reviewerApproval"] as MutableObject;
    unresolvedApproval["eventId"] = "rev_missingapproval001";
    expect(issueCodes(validateReleaseCandidate(unresolved))).toContain(
      "asset_approval",
    );

    const mismatch = createStructuralReleaseCandidate();
    const mismatchAsset = (
      (mismatch["assetLedger"] as MutableObject)["assets"] as MutableObject[]
    )[0]!;
    const mismatchApproval = mismatchAsset["reviewerApproval"] as MutableObject;
    mismatchApproval["reviewerRef"] = "reviewer_synthetic002";
    expect(issueCodes(validateReleaseCandidate(mismatch))).toContain(
      "asset_approval",
    );

    const omittedAsset = createStructuralReleaseCandidate();
    const approvalEvent = (
      omittedAsset["reviewEvents"] as MutableObject[]
    )[0]!;
    approvalEvent["assetIds"] = ["ast_synthetic000002"];
    expect(issueCodes(validateReleaseCandidate(omittedAsset))).toContain(
      "asset_approval",
    );
  });

  test("rejects an approval superseded by a later human rejection", () => {
    const candidate = createStructuralReleaseCandidate();
    const approval = (candidate["reviewEvents"] as MutableObject[])[0]!;
    const rejection = cloneObject(approval);
    rejection["eventId"] = "rev_syntheticrejected1";
    rejection["sequence"] = 2;
    rejection["occurredAt"] = "2026-01-01T00:00:04.750Z";
    rejection["action"] = "rejected";
    rejection["reviewStatus"] = "rejected";
    rejection["reasonCode"] = "human_reviewer_rejected";
    (candidate["reviewEvents"] as MutableObject[]).push(rejection);

    expect(issueCodes(validateReleaseCandidate(candidate))).toContain(
      "latest_decision",
    );
  });

  test("rejects a published pack because only the publisher may publish", () => {
    const candidate = createStructuralReleaseCandidate();
    const pack = candidate["signPack"] as MutableObject;
    pack["releaseStatus"] = "published";
    pack["publication"] = {
      releaseId:
        "sha256:6666666666666666666666666666666666666666666666666666666666666666",
      releasedAt: "2026-01-01T00:00:06.000Z",
      publisherId: "publisher_synthetic001",
      assetLedgerHash:
        "sha256:7777777777777777777777777777777777777777777777777777777777777777",
      reviewLogHash:
        "sha256:8888888888888888888888888888888888888888888888888888888888888888",
      humanApprovalEventIds: ["rev_syntheticapproval1"],
    };

    expect(issueCodes(validateReleaseCandidate(candidate))).toContain(
      "candidate_state",
    );
  });

  test("rejects each requested scope dimension absent from a grant", () => {
    const missingPurpose = createStructuralReleaseCandidate();
    const purposeRights = (
      (
        (missingPurpose["assetLedger"] as MutableObject)[
          "assets"
        ] as MutableObject[]
      )[0]!["rights"] as MutableObject
    );
    purposeRights["grantedPurposes"] = ["product_playback"];
    expect(issueCodes(validateReleaseCandidate(missingPurpose))).toContain(
      "scope_coverage",
    );

    const missingChannel = createStructuralReleaseCandidate();
    const channelRights = (
      (
        (missingChannel["assetLedger"] as MutableObject)[
          "assets"
        ] as MutableObject[]
      )[0]!["rights"] as MutableObject
    );
    channelRights["grantedChannels"] = ["pwa"];
    expect(issueCodes(validateReleaseCandidate(missingChannel))).toContain(
      "scope_coverage",
    );

    const missingTerritory = createStructuralReleaseCandidate();
    const territoryRights = (
      (
        (missingTerritory["assetLedger"] as MutableObject)[
          "assets"
        ] as MutableObject[]
      )[0]!["rights"] as MutableObject
    );
    territoryRights["territories"] = ["CA"];
    expect(issueCodes(validateReleaseCandidate(missingTerritory))).toContain(
      "scope_coverage",
    );

    const missingOperation = createStructuralReleaseCandidate();
    const operationRights = (
      (
        (missingOperation["assetLedger"] as MutableObject)[
          "assets"
        ] as MutableObject[]
      )[0]!["rights"] as MutableObject
    );
    operationRights["hosting"] = false;
    expect(issueCodes(validateReleaseCandidate(missingOperation))).toContain(
      "scope_coverage",
    );
  });

  test("rejects signer, consent, and exact-hash mismatches", () => {
    const signerMismatch = createStructuralReleaseCandidate();
    const asset = (
      (signerMismatch["assetLedger"] as MutableObject)[
        "assets"
      ] as MutableObject[]
    )[0]!;
    const consent = asset["consent"] as MutableObject;
    consent["subjectSignerRefs"] = ["signer_synthetic0002"];
    expect(issueCodes(validateReleaseCandidate(signerMismatch))).toContain(
      "signer_consent",
    );

    const hashMismatch = createStructuralReleaseCandidate();
    const hashAsset = (
      (hashMismatch["assetLedger"] as MutableObject)[
        "assets"
      ] as MutableObject[]
    )[0]!;
    const hashConsent = hashAsset["consent"] as MutableObject;
    hashConsent["exactHash"] =
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(issueCodes(validateReleaseCandidate(hashMismatch))).toContain(
      "hash_mismatch",
    );
  });

  test("treats a later different-hash human decision as superseding", () => {
    const candidate = createStructuralReleaseCandidate();
    const approval = (candidate["reviewEvents"] as MutableObject[])[0]!;
    const laterDecision = cloneObject(approval);
    laterDecision["eventId"] = "rev_syntheticnewhash01";
    laterDecision["sequence"] = 2;
    laterDecision["occurredAt"] = "2026-01-01T00:00:04.750Z";
    laterDecision["decisionHash"] =
      "sha256:9999999999999999999999999999999999999999999999999999999999999999";
    (candidate["reviewEvents"] as MutableObject[]).push(laterDecision);

    expect(issueCodes(validateReleaseCandidate(candidate))).toContain(
      "latest_decision",
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
