export type ReasonCode =
  | "unsupported_vocabulary"
  | "ambiguous_context"
  | "unsupported_grammar"
  | "low_confidence"
  | "no_candidate_match"
  | "no_reviewed_mapping";

export interface CandidateAsset {
  assetId: string;
  gloss?: string;
  description?: string;
  signedLanguage?: string;
  region?: string;
}

export interface ProposeRequest {
  segmentId?: string;
  segmentText: string;
  startTime: number;
  endTime: number;
  signedLanguage: string;
  region: string;
  candidates: CandidateAsset[];
  packId?: string;
  contextText?: string;
  environment?: "synthetic_test" | "development" | "production";
}

export interface ReviewEventActor {
  kind: "authoring_service" | "human_reviewer";
  actorRef: string;
}

export interface ReviewEvent {
  schemaVersion: "1.0.0";
  eventId: string;
  sequence: number;
  occurredAt: string;
  environment: "synthetic_test" | "development" | "production";
  packId: string;
  segmentId: string;
  decisionHash: string;
  actor: ReviewEventActor;
  action: "proposal_created" | "approved" | "unsupported_confirmed" | "changes_requested" | "rejected";
  translationStatus: "proposed" | "mapped" | "unsupported";
  reviewStatus: "pending" | "approved" | "changes_requested" | "rejected";
  assetIds: string[];
  reasonCode?: ReasonCode;
}

export interface RunManifestTool {
  name: string;
  version: string;
}

export interface RunManifestModel {
  provider: "google";
  name: string;
  version: string;
}

export interface RunManifestInput {
  timedTextHash: string;
  segmentCount: number;
  signedLanguage: string;
  region: string;
}

export interface RunManifestOutput {
  proposalLogHash: string;
  reviewEventIds: string[];
}

export interface RunManifestPrivacy {
  containsTranscript: false;
  containsIdentity: false;
  containsMediaUrl: false;
}

export interface RunManifest {
  schemaVersion: "1.0.0";
  runId: string;
  environment: "synthetic_test" | "development" | "production";
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed";
  tool: RunManifestTool;
  model?: RunManifestModel;
  input: RunManifestInput;
  output: RunManifestOutput;
  privacy: RunManifestPrivacy;
}

export interface ProposeResult {
  segmentId: string;
  packId: string;
  translationStatus: "proposed" | "unsupported";
  assetIds: string[];
  confidence: number;
  reasonCode?: ReasonCode;
  reviewEvent: ReviewEvent;
  runManifest: RunManifest;
}

export interface AuthoringMetrics {
  totalProposals: number;
  proposedCount: number;
  unsupportedCount: number;
  coverageRate: number;
  falseSupportedRate: number;
  topOneAcceptanceRate: number;
  changesRequestedCount: number;
  rejectedCount: number;
  reasonCodeBreakdown: Record<string, number>;
}
