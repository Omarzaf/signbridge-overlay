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
  validateAssetLedger,
  validateContestEvidence,
  validatePublicationBundle,
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

    const result = validatePublicationBundle({
      signPack: pack,
      reviewEvents: [],
      assetLedger: ledger,
    });
    expect(issueCodes(result)).toContain("unknown_event");
    expect(issueCodes(result)).toContain("human_approval");
    expect(issueCodes(result)).toContain("publication_gate");
  });
});
