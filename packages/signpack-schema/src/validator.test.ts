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
  CONTEST_EVIDENCE_METHODS,
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
import type {
  ContestEvidenceCategory,
  ReleaseScope,
  ValidationResult,
} from "./types";
import { deriveRequiredReleaseOperations } from "./validator";

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

function integerSchemaMaximums(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => integerSchemaMaximums(item));
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const object = value as Record<string, unknown>;
  const maxima =
    object["type"] === "integer" ? [object["maximum"]] : [];
  return [
    ...maxima,
    ...Object.values(object).flatMap((item) =>
      integerSchemaMaximums(item),
    ),
  ];
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
        modification: true,
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
    modification: true,
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

function createStructurallyPublishedSignPack(): MutableObject {
  const candidate = createStructuralReleaseCandidate();
  const pack = cloneObject(candidate["signPack"]);
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
  return pack;
}

function createContestEvidenceLedger(): MutableObject {
  const evidence = cloneObject(contestEvidenceFixture);
  evidence["records"] = CONTEST_EVIDENCE_CATEGORIES.map(
    (category, index): MutableObject => {
      const hex = (index % 16).toString(16);
      const base: MutableObject = {
        evidenceId: `evd_category${index.toString().padStart(6, "0")}`,
        category,
        status: "evidence_linked",
        periodStart: "2026-01-01T00:00:00.000Z",
        periodEnd: "2026-01-31T23:59:59.000Z",
        sourceHash: `sha256:${hex.repeat(64)}`,
        metricDefinition: `Synthetic aggregate for ${category}; not claim verification.`,
        evidenceMethod: "public_artifact",
        relationship: "not_applicable",
        measurement: {
          kind: "artifact",
          artifactHash: `sha256:${hex.repeat(64)}`,
        },
      };

      if (category === "monthly_arms_length_revenue") {
        base["periodMonth"] = "2026-01";
      }
      if (category === "gemini_production_call") {
        base["evidenceMethod"] = "runtime_log";
        base["measurement"] = { kind: "count", value: 0, unit: "calls" };
      } else if (category === "user_count") {
        base["evidenceMethod"] = "aggregate_reconciliation";
        base["measurement"] = { kind: "count", value: 0, unit: "users" };
      } else if (category === "pilot_participant_count") {
        base["evidenceMethod"] = "aggregate_reconciliation";
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
        base["evidenceMethod"] = "aggregate_reconciliation";
        base["measurement"] = {
          kind: "money",
          minorUnits: 0,
          currency: "USD",
        };
        if (
          category === "arms_length_revenue" ||
          category === "monthly_arms_length_revenue" ||
          category === "refund"
        ) {
          base["relationship"] = "arms_length";
        } else if (category === "related_party_revenue") {
          base["relationship"] = "related_party";
        }
      }

      if (category === "feedback_consent") {
        base["consentRef"] = "consent_synthetic001";
      }
      return base;
    },
  );
  return evidence;
}

function contestRecord(
  evidence: MutableObject,
  category: ContestEvidenceCategory,
): MutableObject {
  const records = evidence["records"] as MutableObject[];
  const record = records.find((candidate) => candidate["category"] === category);
  if (record === undefined) {
    throw new Error(`missing synthetic contest record for ${category}`);
  }
  return record;
}

describe("machine-readable contracts", () => {
  test("marks every closed contract as structural-only draft 2020-12", () => {
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
      expect(schema.$comment).toBe(
        "Structural validation only; this schema cannot authorize release or establish claim truth.",
      );
      expect(schema.additionalProperties).toBe(false);
    }
  });

  test("keeps contest categories and JSON Schema enum in exact parity", () => {
    expect(
      contestEvidenceSchema.$defs.record.properties.category.enum,
    ).toEqual(CONTEST_EVIDENCE_CATEGORIES);
    expect(
      contestEvidenceSchema.$defs.record.properties.evidenceMethod.enum,
    ).toEqual(CONTEST_EVIDENCE_METHODS);
    expect(
      contestEvidenceSchema.$defs.record.properties.status.enum,
    ).toEqual(["draft", "evidence_linked", "withdrawn"]);
    expect(
      JSON.stringify(contestEvidenceSchema.$defs.record.allOf),
    ).toContain('"required":["periodMonth"]');
  });

  test("caps every schema integer at the JavaScript safe maximum", () => {
    const maxima = [
      signPackSchema,
      reviewEventSchema,
      runManifestSchema,
      assetLedgerSchema,
      releaseRequestSchema,
      contestEvidenceSchema,
    ].flatMap((schema) => integerSchemaMaximums(schema));
    expect(maxima).toHaveLength(8);
    expect(maxima).toEqual(
      Array.from({ length: maxima.length }, () => Number.MAX_SAFE_INTEGER),
    );
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
    expect(
      releaseRequestSchema.$defs.releaseScope.properties.redistribution.const,
    ).toBe(true);
    const releaseImplications = JSON.stringify(
      releaseRequestSchema.$defs.releaseScope.allOf,
    );
    expect(releaseImplications).toContain('"hosting":{"const":true}');
    expect(releaseImplications).toContain('"modification":{"const":true}');
    expect(releaseImplications).toContain('"sublicensing":{"const":true}');

    const licensedRules = JSON.stringify(
      assetLedgerSchema.$defs.assetRecord.allOf,
    );
    expect(licensedRules).toContain('"grantedPurposes":{"minItems":1}');
    expect(licensedRules).toContain('"grantedChannels":{"minItems":1}');
  });

  test("encodes core authority and publication conditions in JSON Schema", () => {
    const reviewRules = JSON.stringify(reviewEventSchema.allOf);
    expect(reviewRules).toContain('"authoring_service"');
    expect(reviewRules).toContain('"proposal_created"');
    expect(reviewRules).toContain('"human_reviewer"');
    expect(
      JSON.stringify(reviewEventSchema.properties.actor.allOf),
    ).toContain('"pattern":"^service_[a-z0-9]{12,64}$"');
    expect(
      JSON.stringify(reviewEventSchema.properties.actor.allOf),
    ).toContain('"pattern":"^reviewer_[a-z0-9]{12,64}$"');
    expect(JSON.stringify(reviewEventSchema.allOf[1]?.then)).toContain(
      '"kind":{"const":"authoring_service"}',
    );
    expect(JSON.stringify(reviewEventSchema.allOf[4]?.then)).toContain(
      '"reviewStatus":{"const":"changes_requested"}',
    );
    expect(JSON.stringify(reviewEventSchema.allOf[5]?.then)).toContain(
      '"reviewStatus":{"const":"rejected"}',
    );

    const publicationRules = JSON.stringify(signPackSchema.allOf);
    expect(publicationRules).toContain('"reviewStatus":{"const":"approved"}');
    expect(publicationRules).toContain(
      '"translationStatus":{"const":"proposed"}',
    );
    expect(publicationRules).toContain(
      '"signedLanguage":{"not":{"const":"zxx"}}',
    );
    expect(publicationRules).toContain('"region":{"not":{"const":"ZZ"}}');
    expect(publicationRules).toContain('"reviewerRefs":{"minItems":1}');
    expect(publicationRules).toContain('"assets":{"minItems":1}');
    expect(publicationRules).toContain('"signerRefs":{"minItems":1}');
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

  test("enforces published language and participant minima", () => {
    expect(validateSignPack(createStructurallyPublishedSignPack())).toMatchObject(
      { ok: true },
    );

    const noReviewer = createStructurallyPublishedSignPack();
    const reviewerParticipants = noReviewer["participants"] as MutableObject;
    reviewerParticipants["reviewerRefs"] = [];
    expect(issueCodes(validateSignPack(noReviewer))).toContain(
      "publication_gate",
    );

    const syntheticLanguage = createStructurallyPublishedSignPack();
    const language = syntheticLanguage["language"] as MutableObject;
    language["signedLanguage"] = "zxx";
    language["region"] = "ZZ";
    expect(issueCodes(validateSignPack(syntheticLanguage))).toContain(
      "publication_gate",
    );

    const noSigner = createStructurallyPublishedSignPack();
    const signerParticipants = noSigner["participants"] as MutableObject;
    signerParticipants["signerRefs"] = [];
    expect(issueCodes(validateSignPack(noSigner))).toContain(
      "publication_gate",
    );
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

  test("rejects rollover UTC timestamps, hour 24, and unsafe integers", () => {
    const rollover = cloneObject(reviewEventFixture);
    rollover["occurredAt"] = "2026-02-30T12:00:00.000Z";
    expect(issueCodes(validateReviewEvent(rollover))).toContain("date_time");

    const hourTwentyFour = cloneObject(reviewEventFixture);
    hourTwentyFour["occurredAt"] = "2026-01-01T24:00:00.000Z";
    expect(issueCodes(validateReviewEvent(hourTwentyFour))).toContain(
      "date_time",
    );

    const unsafeSequence = cloneObject(reviewEventFixture);
    unsafeSequence["sequence"] = Number.MAX_SAFE_INTEGER + 1;
    expect(issueCodes(validateReviewEvent(unsafeSequence))).toContain(
      "safe_integer",
    );
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

  test("keeps proposal and decision authority states exact", () => {
    const humanProposal = cloneObject(reviewEventFixture);
    humanProposal["actor"] = {
      kind: "human_reviewer",
      actorRef: "reviewer_synthetic001",
    };
    expect(issueCodes(validateReviewEvent(humanProposal))).toContain(
      "authority",
    );

    const wrongServiceRef = cloneObject(reviewEventFixture);
    wrongServiceRef["actor"] = {
      kind: "authoring_service",
      actorRef: "reviewer_synthetic001",
    };
    expect(issueCodes(validateReviewEvent(wrongServiceRef))).toContain(
      "actor_ref",
    );

    const candidate = createStructuralReleaseCandidate();
    const approval = cloneObject(
      (candidate["reviewEvents"] as MutableObject[])[0],
    );
    approval["actor"] = {
      kind: "human_reviewer",
      actorRef: "service_synthetic0001",
    };
    expect(issueCodes(validateReviewEvent(approval))).toContain("actor_ref");

    const changesRequested = cloneObject(approval);
    changesRequested["actor"] = {
      kind: "human_reviewer",
      actorRef: "reviewer_synthetic001",
    };
    changesRequested["action"] = "changes_requested";
    changesRequested["reviewStatus"] = "pending";
    changesRequested["reasonCode"] = "mapping_needs_revision";
    expect(issueCodes(validateReviewEvent(changesRequested))).toContain(
      "state_conflict",
    );

    const rejected = cloneObject(changesRequested);
    rejected["action"] = "rejected";
    rejected["reviewStatus"] = "changes_requested";
    expect(issueCodes(validateReviewEvent(rejected))).toContain(
      "state_conflict",
    );
  });

  test("requires licensed assets to grant at least one purpose and channel", () => {
    const emptyPurposes = createStructuralReleaseCandidate();
    const purposeAsset = (
      (emptyPurposes["assetLedger"] as MutableObject)[
        "assets"
      ] as MutableObject[]
    )[0]!;
    (purposeAsset["rights"] as MutableObject)["grantedPurposes"] = [];
    expect(
      issueCodes(validateAssetLedger(emptyPurposes["assetLedger"])),
    ).toContain("license_gate");

    const emptyChannels = createStructuralReleaseCandidate();
    const channelAsset = (
      (emptyChannels["assetLedger"] as MutableObject)[
        "assets"
      ] as MutableObject[]
    )[0]!;
    (channelAsset["rights"] as MutableObject)["grantedChannels"] = [];
    expect(
      issueCodes(validateAssetLedger(emptyChannels["assetLedger"])),
    ).toContain("license_gate");
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

  test("rejects operation flags that understate inherent release scope", () => {
    const understated: ReleaseScope = {
      purposes: ["sponsor_publicity"],
      channels: ["pwa", "demo_video"],
      territories: ["US"],
      modification: false,
      hosting: false,
      redistribution: false,
      sublicensing: false,
    };
    expect(deriveRequiredReleaseOperations(understated)).toEqual({
      modification: true,
      hosting: true,
      redistribution: true,
      sublicensing: true,
    });

    const offline = cloneObject(releaseRequestFixture);
    const offlineScope = offline["scope"] as MutableObject;
    offlineScope["redistribution"] = false;
    expect(issueCodes(validateReleaseRequest(offline))).toContain(
      "scope_implication",
    );

    const hosted = cloneObject(releaseRequestFixture);
    const hostedScope = hosted["scope"] as MutableObject;
    hostedScope["channels"] = ["pwa"];
    hostedScope["hosting"] = false;
    expect(issueCodes(validateReleaseRequest(hosted))).toContain(
      "scope_implication",
    );
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

    const futureApprovalClaim = createStructuralReleaseCandidate();
    const earlyLedger = futureApprovalClaim["assetLedger"] as MutableObject;
    earlyLedger["generatedAt"] = "2026-01-01T00:00:03.500Z";
    expect(
      issueCodes(validateReleaseCandidate(futureApprovalClaim)),
    ).toContain("ledger_time");
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

  test("treats a later authoring proposal as the latest segment event", () => {
    const candidate = createStructuralReleaseCandidate();
    const approval = (candidate["reviewEvents"] as MutableObject[])[0]!;
    const proposal = cloneObject(approval);
    proposal["eventId"] = "rev_syntheticproposal2";
    proposal["sequence"] = 2;
    proposal["occurredAt"] = "2026-01-01T00:00:04.750Z";
    proposal["actor"] = {
      kind: "authoring_service",
      actorRef: "service_synthetic0001",
    };
    proposal["action"] = "proposal_created";
    proposal["reviewStatus"] = "pending";
    (candidate["reviewEvents"] as MutableObject[]).push(proposal);

    expect(issueCodes(validateReviewEvent(proposal))).toEqual([]);
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

    const inherentRedistribution = createStructuralReleaseCandidate();
    const redistributionRequest = inherentRedistribution[
      "releaseRequest"
    ] as MutableObject;
    redistributionRequest["scope"] = {
      purposes: ["product_playback"],
      channels: ["offline_signpack"],
      territories: ["US"],
      modification: false,
      hosting: false,
      redistribution: true,
      sublicensing: false,
    };
    const redistributionRights = (
      (
        (inherentRedistribution["assetLedger"] as MutableObject)[
          "assets"
        ] as MutableObject[]
      )[0]!["rights"] as MutableObject
    );
    redistributionRights["grantedPurposes"] = ["product_playback"];
    redistributionRights["grantedChannels"] = ["offline_signpack"];
    redistributionRights["redistribution"] = false;
    expect(
      issueCodes(validateReleaseCandidate(inherentRedistribution)),
    ).toContain("scope_coverage");
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
    expect(validateContestEvidence(createContestEvidenceLedger())).toMatchObject(
      { ok: true },
    );
  });

  test("rejects self-asserted verification and incomplete evidence context", () => {
    const selfAsserted = createContestEvidenceLedger();
    contestRecord(selfAsserted, "education_category_relevance")["status"] =
      "verified";
    expect(issueCodes(validateContestEvidence(selfAsserted))).toContain("enum");

    const incomplete = createContestEvidenceLedger();
    const record = contestRecord(incomplete, "education_category_relevance");
    delete record["metricDefinition"];
    record["evidenceMethod"] = "truth_verified";
    const result = validateContestEvidence(incomplete);
    expect(issueCodes(result)).toContain("required");
    expect(issueCodes(result)).toContain("enum");
  });

  test("requires periodMonth only for its matching monthly UTC window", () => {
    const missing = createContestEvidenceLedger();
    delete contestRecord(missing, "monthly_arms_length_revenue")[
      "periodMonth"
    ];
    expect(issueCodes(validateContestEvidence(missing))).toContain(
      "period_month",
    );

    const forbidden = createContestEvidenceLedger();
    contestRecord(forbidden, "arms_length_revenue")["periodMonth"] = "2026-01";
    expect(issueCodes(validateContestEvidence(forbidden))).toContain(
      "period_month",
    );

    const mismatch = createContestEvidenceLedger();
    contestRecord(mismatch, "monthly_arms_length_revenue")["periodMonth"] =
      "2026-02";
    expect(issueCodes(validateContestEvidence(mismatch))).toContain(
      "period_month",
    );
  });

  test("rejects duplicate scopes and overlapping financial windows", () => {
    const duplicate = createContestEvidenceLedger();
    const duplicateRecord = cloneObject(
      contestRecord(duplicate, "arms_length_revenue"),
    );
    duplicateRecord["evidenceId"] = "evd_duplicatescope01";
    duplicateRecord["sourceHash"] =
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    (duplicate["records"] as MutableObject[]).push(duplicateRecord);
    expect(issueCodes(validateContestEvidence(duplicate))).toContain(
      "duplicate_claim_scope",
    );

    const overlapping = createContestEvidenceLedger();
    const overlapRecord = cloneObject(
      contestRecord(overlapping, "arms_length_revenue"),
    );
    overlapRecord["evidenceId"] = "evd_overlapwindow01";
    overlapRecord["periodStart"] = "2026-01-15T00:00:00.000Z";
    overlapRecord["periodEnd"] = "2026-02-15T23:59:59.000Z";
    overlapRecord["sourceHash"] =
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    (overlapping["records"] as MutableObject[]).push(overlapRecord);
    expect(issueCodes(validateContestEvidence(overlapping))).toContain(
      "overlapping_claim_window",
    );
  });

  test("allows an active record to replace a withdrawn claim scope", () => {
    const evidence = createContestEvidenceLedger();
    const withdrawn = contestRecord(evidence, "arms_length_revenue");
    withdrawn["status"] = "withdrawn";
    const replacement = cloneObject(withdrawn);
    replacement["evidenceId"] = "evd_replacement0001";
    replacement["status"] = "evidence_linked";
    replacement["sourceHash"] =
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    (evidence["records"] as MutableObject[]).push(replacement);

    expect(validateContestEvidence(evidence)).toMatchObject({ ok: true });
  });

  test("keeps ordinary spend outside revenue relationship classification", () => {
    const evidence = createContestEvidenceLedger();
    contestRecord(evidence, "expense")["relationship"] = "arms_length";
    contestRecord(evidence, "marketing_spend")["relationship"] =
      "related_party";
    const result = validateContestEvidence(evidence);
    expect(issueCodes(result)).toContain("relationship");
  });

  test("rejects unsafe aggregate integers", () => {
    const evidence = createContestEvidenceLedger();
    const measurement = contestRecord(evidence, "user_count")[
      "measurement"
    ] as MutableObject;
    measurement["value"] = Number.MAX_SAFE_INTEGER + 1;
    expect(issueCodes(validateContestEvidence(evidence))).toContain(
      "safe_integer",
    );
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
        metricDefinition: "An intentionally invalid synthetic claim category.",
        evidenceMethod: "human_declaration",
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
