import { createHash, randomBytes } from "node:crypto";
import { GeminiProposalClient } from "./geminiClient.js";
import { globalMetricsTracker } from "./metrics.js";
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
    const env = request.environment ?? "synthetic_test";

    const segmentId = request.segmentId ?? generatePrefixedId("seg");
    const packId = request.packId ?? generatePrefixedId("spk");
    const eventId = generatePrefixedId("rev");
    const runId = generatePrefixedId("run");

    const currentSeq = (this.sequenceMap.get(packId) ?? 0) + 1;
    this.sequenceMap.set(packId, currentSeq);
    const sequence = request.sequence ?? currentSeq;

    let proposalOutput;
    try {
      proposalOutput = await this.client.propose(request);
    } catch (err: unknown) {
      const completedAt = new Date().toISOString();
      const timedTextContent = `${request.segmentText}|${request.startTime}|${request.endTime}`;
      const timedTextHash = sha256(timedTextContent);

      const failedManifest: RunManifest = {
        schemaVersion: "1.0.0",
        runId,
        environment: env,
        startedAt,
        completedAt,
        status: "failed",
        tool: {
          name: "authoring_service",
          version: "0.1.0",
        },
        model: {
          provider: "google",
          name: "gemini-2.5-flash",
          version: "2.5",
        },
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

      if (err && typeof err === "object") {
        (err as Record<string, unknown>)["failedRunManifest"] = failedManifest;
      }
      throw err;
    }

    const completedAt = new Date().toISOString();

    const timedTextContent = `${request.segmentText}|${request.startTime}|${request.endTime}`;
    const timedTextHash = sha256(timedTextContent);

    const decisionPayload = JSON.stringify({
      segmentId,
      packId,
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
      environment: env,
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

    const runManifest: RunManifest = {
      schemaVersion: "1.0.0",
      runId,
      environment: env,
      startedAt,
      completedAt,
      status: "succeeded",
      tool: {
        name: "authoring_service",
        version: "0.1.0",
      },
      model: {
        provider: "google",
        name: "gemini-2.5-flash",
        version: "2.5",
      },
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

    globalMetricsTracker.recordProposal(
      proposalOutput.translationStatus,
      proposalOutput.reasonCode,
    );

    return {
      segmentId,
      packId,
      translationStatus: proposalOutput.translationStatus,
      assetIds: proposalOutput.assetIds,
      confidence: proposalOutput.confidence,
      ...(proposalOutput.reasonCode ? { reasonCode: proposalOutput.reasonCode } : {}),
      reviewEvent,
      runManifest,
    };
  }
}
