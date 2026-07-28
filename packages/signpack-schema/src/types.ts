export const SCHEMA_VERSION = "1.0.0" as const;

export type SchemaVersion = typeof SCHEMA_VERSION;
export type ReleaseStatus = "draft" | "published";
export type LinguisticReviewStatus = "not_reviewed" | "human_reviewed";
export type TranslationStatus = "proposed" | "mapped" | "unsupported";
export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected";
export type AssetStatus = "draft" | "licensed" | "withdrawn";
export type ConsentStatus = "pending" | "granted" | "withdrawn";
export type Environment = "synthetic_test" | "development" | "production";

export const RELEASE_PURPOSES = [
  "product_playback",
  "public_demo",
  "contest_submission",
  "sponsor_publicity",
] as const;

export type ReleasePurpose = (typeof RELEASE_PURPOSES)[number];

export const RELEASE_CHANNELS = [
  "pwa",
  "chrome_extension",
  "offline_signpack",
  "demo_video",
  "contest_platform",
  "sponsor_media",
] as const;

export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

export interface ReleaseScope {
  readonly purposes: readonly ReleasePurpose[];
  readonly channels: readonly ReleaseChannel[];
  readonly territories: readonly string[];
  readonly modification: boolean;
  readonly hosting: boolean;
  readonly redistribution: boolean;
  readonly sublicensing: boolean;
}

export interface ReleaseRequest {
  readonly schemaVersion: SchemaVersion;
  readonly requestId: string;
  readonly packId: string;
  readonly requestedAt: string;
  readonly assurance: "structural_preflight_only";
  readonly selectedReviewEventIds: readonly string[];
  readonly scope: ReleaseScope;
}

export interface CaptionFallback {
  readonly language: string;
  readonly text: string;
}

export interface SignPackSegment {
  readonly segmentId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly translationStatus: TranslationStatus;
  readonly reviewStatus: ReviewStatus;
  readonly decisionHash: string;
  readonly captionFallback: CaptionFallback;
  readonly assetIds: readonly string[];
  readonly unsupportedReason?: string;
  readonly proposalId?: string;
}

export interface SignPackAsset {
  readonly assetId: string;
  readonly path: string;
  readonly sha256: string;
  readonly mediaType: "video/mp4" | "video/webm";
  readonly durationMs: number;
}

export interface SignPackPublication {
  readonly releaseId: string;
  readonly releasedAt: string;
  readonly publisherId: string;
  readonly assetLedgerHash: string;
  readonly reviewLogHash: string;
  readonly humanApprovalEventIds: readonly string[];
}

export interface SignPack {
  readonly schemaVersion: SchemaVersion;
  readonly packId: string;
  readonly releaseStatus: ReleaseStatus;
  readonly developmentOnly: boolean;
  readonly linguisticReviewStatus: LinguisticReviewStatus;
  readonly language: {
    readonly signedLanguage: string;
    readonly region: string;
    readonly dialect: string;
    readonly audience: string;
    readonly educationalContext: string;
  };
  readonly sourceVideo: {
    readonly fingerprint: string;
    readonly durationMs: number;
  };
  readonly runtimeCompatibility: {
    readonly minimumVersion: string;
  };
  readonly participants: {
    readonly signerRefs: readonly string[];
    readonly reviewerRefs: readonly string[];
  };
  readonly segments: readonly SignPackSegment[];
  readonly assets: readonly SignPackAsset[];
  readonly publication?: SignPackPublication;
}

export type ReviewAction =
  | "proposal_created"
  | "approved"
  | "unsupported_confirmed"
  | "changes_requested"
  | "rejected";

export interface ReviewEvent {
  readonly schemaVersion: SchemaVersion;
  readonly eventId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly environment: Environment;
  readonly packId: string;
  readonly segmentId: string;
  readonly decisionHash: string;
  readonly actor: {
    readonly kind: "authoring_service" | "human_reviewer";
    readonly actorRef: string;
  };
  readonly action: ReviewAction;
  readonly translationStatus: TranslationStatus;
  readonly reviewStatus: ReviewStatus;
  readonly assetIds: readonly string[];
  readonly reasonCode?: string;
}

export interface RunManifest {
  readonly schemaVersion: SchemaVersion;
  readonly runId: string;
  readonly environment: Environment;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly status: "succeeded" | "failed";
  readonly tool: {
    readonly name: string;
    readonly version: string;
  };
  readonly model?: {
    readonly provider: "google";
    readonly name: string;
    readonly version: string;
  };
  readonly input: {
    readonly timedTextHash: string;
    readonly segmentCount: number;
    readonly signedLanguage: string;
    readonly region: string;
  };
  readonly output: {
    readonly proposalLogHash: string;
    readonly reviewEventIds: readonly string[];
  };
  readonly privacy: {
    readonly containsTranscript: false;
    readonly containsIdentity: false;
    readonly containsMediaUrl: false;
  };
}

export interface AssetLedgerRecord {
  readonly assetId: string;
  readonly path: string;
  readonly sha256: string;
  readonly ownerRef: string;
  readonly sourceRef: string;
  readonly signerRefs: readonly string[];
  readonly assetStatus: AssetStatus;
  readonly reviewStatus: ReviewStatus;
  readonly consent: {
    readonly status: ConsentStatus;
    readonly consentRef?: string;
    readonly subjectSignerRefs: readonly string[];
    readonly exactHash?: string;
  };
  readonly rights: {
    readonly grantRef?: string;
    readonly exactHash?: string;
    readonly termModel?: "irrevocable_exact_hash";
    readonly grantedPurposes: readonly ReleasePurpose[];
    readonly grantedChannels: readonly ReleaseChannel[];
    readonly territories: readonly string[];
    readonly modification: boolean;
    readonly hosting: boolean;
    readonly redistribution: boolean;
    readonly sublicensing: boolean;
  };
  readonly attribution: string;
  readonly reviewerApproval?: {
    readonly reviewerRef: string;
    readonly eventId: string;
    readonly approvedHash: string;
  };
}

export interface AssetLedger {
  readonly schemaVersion: SchemaVersion;
  readonly ledgerId: string;
  readonly packId: string;
  readonly generatedAt: string;
  readonly developmentOnly: boolean;
  readonly assets: readonly AssetLedgerRecord[];
}

export const CONTEST_EVIDENCE_CATEGORIES = [
  "education_category_relevance",
  "google_cloud_product",
  "gemini_production_call",
  "reused_work_disclosure",
  "repository_access_license",
  "demo",
  "demo_media_rights",
  "free_test_surface",
  "arms_length_revenue",
  "monthly_arms_length_revenue",
  "related_party_revenue",
  "expense",
  "marketing_spend",
  "user_count",
  "user_breakdown",
  "pilot_participant_count",
  "feedback_consent",
  "production_evidence",
  "entrant_declaration",
  "organizer_readiness",
  "refund",
  "language_accuracy",
  "synchronization",
  "offline_operation",
  "small_phone_access",
  "accessibility",
] as const;

export type ContestEvidenceCategory =
  (typeof CONTEST_EVIDENCE_CATEGORIES)[number];

export type ContestMeasurement =
  | {
      readonly kind: "count";
      readonly value: number;
      readonly unit: "users" | "participants" | "calls";
    }
  | {
      readonly kind: "money";
      readonly minorUnits: number;
      readonly currency: string;
    }
  | {
      readonly kind: "artifact";
      readonly artifactHash: string;
    };

export interface ContestEvidenceRecord {
  readonly evidenceId: string;
  readonly category: ContestEvidenceCategory;
  readonly status: "draft" | "verified" | "withdrawn";
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly sourceHash: string;
  readonly relationship: "arms_length" | "related_party" | "not_applicable";
  readonly measurement: ContestMeasurement;
  readonly consentRef?: string;
}

export interface ContestEvidence {
  readonly schemaVersion: SchemaVersion;
  readonly ledgerId: string;
  readonly generatedAt: string;
  readonly entrant: {
    readonly type: "individual" | "team" | "organization";
    readonly entrantRef: string;
  };
  readonly records: readonly ContestEvidenceRecord[];
  readonly privacy: {
    readonly containsPersonalData: false;
    readonly containsTranscript: false;
    readonly containsPaymentDetails: false;
  };
}

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly issues: readonly ValidationIssue[];
    };

export interface ReleaseCandidateInput {
  readonly signPack: unknown;
  readonly reviewEvents: unknown;
  readonly assetLedger: unknown;
  readonly releaseRequest: unknown;
}

export type DraftReleaseCandidateSignPack = Omit<
  SignPack,
  | "releaseStatus"
  | "developmentOnly"
  | "linguisticReviewStatus"
  | "publication"
> & {
  readonly releaseStatus: "draft";
  readonly developmentOnly: false;
  readonly linguisticReviewStatus: "human_reviewed";
  readonly publication?: never;
};

export interface StructurallyValidReleaseCandidate {
  readonly assurance: "structural_preflight_only";
  readonly signPack: DraftReleaseCandidateSignPack;
  readonly reviewEvents: readonly ReviewEvent[];
  readonly assetLedger: AssetLedger;
  readonly releaseRequest: ReleaseRequest;
}
