import process from "node:process";
import { createHash, randomBytes } from "node:crypto";
import { GeminiProposalClient, type GeminiProposalOutput } from "./geminiClient.js";
import { globalRunLedger, type RunRecord } from "./runLedger.js";
import type {
  ProposeRequest,
  ProposeResult,
  ReasonCode,
  ReviewEvent,
  RunManifest,
} from "./types.js";

function sha256(data: string): string {
  return `sha256:${createHash("sha256").update(data, "utf8").digest("hex")}`;
}

function generatePrefixedId(prefix: string): string {
  const hex = randomBytes(8).toString("hex");
  return `${prefix}_${hex}`;
}

export class AuthoringProposeEngine {
  private client: GeminiProposalClient;
  private actorRef: string;
  private sequenceMap = new Map<string, number>();

  constructor(client?: GeminiProposalClient, actorRef?: string) {
    this.client = client ?? new GeminiProposalClient();
    this.actorRef = actorRef ?? generatePrefixedId("service");
  }

  public get serviceActorRef(): string {
    return this.actorRef;
  }

  public async proposeSegment(request: ProposeRequest): Promise<ProposeResult> {
    const startedAt = new Date().toISOString();

    // A1.2: Server-owned authority for environment
    const serverEnv = (process.env["NODE_ENV"] === "production"
      ? "production"
      : process.env["NODE_ENV"] === "test" || request.environment === "synthetic_test"
      ? "synthetic_test"
      : request.environment ?? "development") as "synthetic_test" | "development" | "production";

    // A1.2: Server generates IDs and sequence numbers
    const segmentId = request.segmentId ?? generatePrefixedId("seg");
    const packId = request.packId ?? generatePrefixedId("spk");
    const eventId = generatePrefixedId("rev");
    const runId = generatePrefixedId("run");

    const currentSeq = (this.sequenceMap.get(packId) ?? 0) + 1;
    this.sequenceMap.set(packId, currentSeq);
    const sequence = currentSeq;

    const timedTextContent = `${request.segmentText}|${request.startTime}|${request.endTime}`;
    const timedTextHash = sha256(timedTextContent);
    const candidateCatalogHash = sha256(JSON.stringify(request.candidates));

    let proposalOutput: GeminiProposalOutput;
    try {
      proposalOutput = await this.client.propose(request);
    } catch (err: unknown) {
      // A1.5: Durable runs on failure
      const completedAt = new Date().toISOString();
      const isLiveGemini = this.client.isLive && serverEnv !== "synthetic_test";
      const executionMode = isLiveGemini ? "gemini_live" : "deterministic_fallback";

      const failedManifest: RunManifest = {
        schemaVersion: "1.0.0",
        runId,
        environment: serverEnv,
        startedAt,
        completedAt,
        status: "failed",
        tool: {
          name: isLiveGemini ? "authoring_service" : "authoring_service_deterministic",
          version: "0.1.0",
        },
        ...(isLiveGemini
          ? {
              model: {
                provider: "google",
                name: "gemini-2.5-flash",
                version: "2.5",
              },
            }
          : {}),
        input: {
          timedTextHash,
          segmentCount: 1,
          signedLanguage: request.signedLanguage,
          region: request.region,
        },
        output: {
          proposalLogHash: sha256(JSON.stringify([])),
          reviewEventIds: [],
        },
        privacy: {
          containsTranscript: false,
          containsIdentity: false,
          containsMediaUrl: false,
        },
      };

      const failedRecord: RunRecord = {
        runId,
        environment: serverEnv,
        startedAt,
        completedAt,
        status: "failed",
        executionMode,
        runManifest: failedManifest,
        error: err instanceof Error ? err.message : String(err),
      };

      // Write durable record before throwing
      globalRunLedger.recordRun(failedRecord);

      if (err && typeof err === "object") {
        (err as unknown as Record<string, unknown>)["failedRunManifest"] = failedManifest;
        (err as unknown as Record<string, unknown>)["durableRunRef"] = runId;
      }
      throw err;
    }

    const completedAt = new Date().toISOString();
    const executionMode = proposalOutput.executionMode;

    // A1.7 (#1 Adoption): Canonical ReviewUnitV2 Decision Hash Binding
    const decisionPayload = JSON.stringify({
      schemaVersion: "2.0.0",
      runId,
      segmentId,
      packId,
      segmentText: request.segmentText,
      startTime: request.startTime,
      endTime: request.endTime,
      signedLanguage: request.signedLanguage,
      region: request.region,
      timedTextHash,
      candidateCatalogHash,
      translationStatus: proposalOutput.translationStatus,
      assetIds: proposalOutput.assetIds,
      reasonCode: proposalOutput.reasonCode,
      confidence: proposalOutput.confidence,
    });
    const decisionHash = sha256(decisionPayload);

    const reviewEvent: ReviewEvent = {
      schemaVersion: "1.0.0",
      eventId,
      sequence,
      occurredAt: completedAt,
      environment: serverEnv,
      packId,
      segmentId,
      decisionHash,
      actor: {
        kind: "authoring_service",
        actorRef: this.actorRef,
      },
      action: "proposal_created",
      translationStatus: proposalOutput.translationStatus,
      reviewStatus: "pending",
      assetIds: proposalOutput.assetIds,
      ...(proposalOutput.translationStatus === "unsupported"
        ? {
            reasonCode:
              proposalOutput.reasonCode ??
              ("unsupported_vocabulary" as ReasonCode),
          }
        : {}),
    };

    const proposalLogContent = JSON.stringify([reviewEvent]);
    const proposalLogHash = sha256(proposalLogContent);

    // A1.4: Truthful Provenance in Run Manifest (strict schema compliance)
    const runManifest: RunManifest = {
      schemaVersion: "1.0.0",
      runId,
      environment: serverEnv,
      startedAt,
      completedAt,
      status: "succeeded",
      tool: {
        name: executionMode === "gemini_live" ? "authoring_service" : "authoring_service_deterministic",
        version: "0.1.0",
      },
      ...(executionMode === "gemini_live" && proposalOutput.actualModel
        ? {
            model: {
              provider: "google",
              name: proposalOutput.actualModel,
              version: "2.5",
            },
          }
        : {}),
      input: {
        timedTextHash,
        segmentCount: 1,
        signedLanguage: request.signedLanguage,
        region: request.region,
      },
      output: {
        proposalLogHash,
        reviewEventIds: [eventId],
      },
      privacy: {
        containsTranscript: false,
        containsIdentity: false,
        containsMediaUrl: false,
      },
    };

    // A1.5: Record durable run in append-only ledger for succeeded & abstained runs
    const runRecord: RunRecord = {
      runId,
      environment: serverEnv,
      startedAt,
      completedAt,
      status: proposalOutput.translationStatus === "unsupported" ? "abstained" : "succeeded",
      executionMode,
      runManifest,
      reviewEvent,
    };
    globalRunLedger.recordRun(runRecord);

    return {
      segmentId,
      packId,
      translationStatus: proposalOutput.translationStatus,
      assetIds: proposalOutput.assetIds,
      confidence: proposalOutput.confidence,
      ...(proposalOutput.reasonCode ? { reasonCode: proposalOutput.reasonCode } : {}),
      reviewEvent,
      runManifest,
      durableRunRef: runId,
      executionMode,
    };
  }
}
