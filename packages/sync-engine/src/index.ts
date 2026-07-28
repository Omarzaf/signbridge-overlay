import {
  validateSignPack,
  type CaptionFallback,
  type SignPack,
  type SignPackAsset,
  type SignPackSegment,
} from "../../signpack-schema/src/index";

export type ManifestIntegrity = "verified" | "unverified" | "corrupt";

export type AssetPlaybackState =
  | "ready"
  | "missing"
  | "corrupt"
  | "withdrawn";

export type PreparationBlockReason =
  | "invalid_manifest"
  | "not_published"
  | "unverified_manifest"
  | "corrupt_manifest"
  | "incompatible_runtime";

export type PlaybackFallbackReason =
  | PreparationBlockReason
  | "invalid_clock"
  | "source_mismatch"
  | "gap"
  | "unsupported_segment"
  | "missing_asset"
  | "withdrawn_asset"
  | "corrupt_asset"
  | "incompatible_segment"
  | "unapproved_playback_rate";

export interface PreparePlaybackModelInput {
  readonly manifest: unknown;
  readonly manifestIntegrity: ManifestIntegrity;
  readonly assetStates: Readonly<Record<string, AssetPlaybackState>>;
  readonly runtimeVersion: string;
}

const PLAYBACK_MODEL_BRAND: unique symbol = Symbol("preparedPlaybackModel");

interface ReadyPlaybackModel {
  readonly [PLAYBACK_MODEL_BRAND]: true;
  readonly status: "ready";
  readonly sourceFingerprint: string;
  readonly sourceDurationMs: number;
  readonly segmentIndex: readonly SignPackSegment[];
  readonly assetsById: Readonly<Record<string, SignPackAsset>>;
  readonly assetStates: Readonly<Record<string, AssetPlaybackState>>;
  readonly runtimeVersion: string;
}

interface BlockedPlaybackModel {
  readonly [PLAYBACK_MODEL_BRAND]: true;
  readonly status: "blocked";
  readonly reason: PreparationBlockReason;
}

export type PlaybackModel = ReadyPlaybackModel | BlockedPlaybackModel;

export interface MediaClockSnapshot {
  readonly sourceFingerprint: string;
  readonly currentTimeMs: number;
  readonly paused: boolean;
  readonly seeking: boolean;
  readonly playbackRate: number;
}

export type PlaybackSnapshot = MediaClockSnapshot;

export interface ActiveSignPlaybackState {
  readonly kind: "active_sign";
  readonly segmentId: string;
  readonly asset: SignPackAsset;
  readonly mediaTimeMs: number;
  readonly assetTimeMs: number;
  readonly paused: boolean;
  readonly seeking: boolean;
  readonly shouldPlay: boolean;
  readonly captionFallback: CaptionFallback;
  readonly preserveSourceCaptions: true;
}

export interface CaptionFallbackPlaybackState {
  readonly kind: "caption_fallback";
  readonly reason: PlaybackFallbackReason;
  readonly mediaTimeMs: number | null;
  readonly segmentId?: string;
  readonly captionFallback?: CaptionFallback;
  readonly preserveSourceCaptions: true;
}

export type PlaybackState =
  | ActiveSignPlaybackState
  | CaptionFallbackPlaybackState;

const SEMVER_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

const ASSET_PLAYBACK_STATES = new Set<AssetPlaybackState>([
  "ready",
  "missing",
  "corrupt",
  "withdrawn",
]);

const AUTHENTIC_PLAYBACK_MODELS = new WeakSet<object>();

interface CapturedPreparePlaybackModelInput {
  readonly manifest: unknown;
  readonly manifestIntegrity: ManifestIntegrity;
  readonly assetStates: Readonly<Record<string, AssetPlaybackState>>;
  readonly runtimeVersion: string;
}

interface CapturedMediaClock {
  readonly sourceFingerprint: unknown;
  readonly currentTimeMs: unknown;
  readonly paused: unknown;
  readonly seeking: unknown;
  readonly playbackRate: unknown;
}

interface ValidatedMediaClock {
  readonly sourceFingerprint: unknown;
  readonly currentTimeMs: number;
  readonly paused: boolean;
  readonly seeking: boolean;
  readonly playbackRate: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function capturePrepareInput(
  input: unknown,
): CapturedPreparePlaybackModelInput | null {
  try {
    if (!isRecord(input)) {
      return null;
    }

    const manifest = input["manifest"];
    const manifestIntegrity = input["manifestIntegrity"];
    const assetStates = input["assetStates"];
    const runtimeVersion = input["runtimeVersion"];

    if (
      (manifestIntegrity !== "verified" &&
        manifestIntegrity !== "unverified" &&
        manifestIntegrity !== "corrupt") ||
      !isRecord(assetStates) ||
      typeof runtimeVersion !== "string"
    ) {
      return null;
    }

    return Object.freeze({
      manifest,
      manifestIntegrity,
      assetStates: assetStates as Readonly<
        Record<string, AssetPlaybackState>
      >,
      runtimeVersion,
    });
  } catch {
    return null;
  }
}

function captureMediaClock(snapshot: unknown): CapturedMediaClock | null {
  try {
    if (!isRecord(snapshot)) {
      return null;
    }

    const sourceFingerprint = snapshot["sourceFingerprint"];
    const currentTimeMs = snapshot["currentTimeMs"];
    const paused = snapshot["paused"];
    const seeking = snapshot["seeking"];
    const playbackRate = snapshot["playbackRate"];

    return Object.freeze({
      sourceFingerprint,
      currentTimeMs,
      paused,
      seeking,
      playbackRate,
    });
  } catch {
    return null;
  }
}

function isPublishedForPlayback(manifest: unknown): boolean {
  if (!isRecord(manifest)) {
    return false;
  }

  return (
    manifest["releaseStatus"] === "published" &&
    manifest["developmentOnly"] === false &&
    manifest["linguisticReviewStatus"] === "human_reviewed" &&
    isRecord(manifest["publication"])
  );
}

function claimsPublishedRelease(manifest: unknown): boolean {
  return isRecord(manifest) && manifest["releaseStatus"] === "published";
}

function hasOnlyPublicationGateIssues(
  validation: Exclude<ReturnType<typeof validateSignPack>, { readonly ok: true }>,
): boolean {
  return validation.issues.length > 0 && validation.issues.every((issue) => {
    return (
      issue.code === "publication_gate" ||
      (issue.path === "$.publication" && issue.code === "required")
    );
  });
}

function parseSemver(version: string): readonly [string, string, string] | null {
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) {
    return null;
  }

  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (major === undefined || minor === undefined || patch === undefined) {
    return null;
  }

  return [major, minor, patch];
}

function compareNumericIdentifier(left: string, right: string): number {
  if (left.length !== right.length) {
    return left.length < right.length ? -1 : 1;
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function runtimeIsCompatible(
  runtimeVersion: string,
  minimumVersion: string,
): boolean {
  const runtime = parseSemver(runtimeVersion);
  const minimum = parseSemver(minimumVersion);
  if (runtime === null || minimum === null) {
    return false;
  }

  for (let index = 0; index < runtime.length; index += 1) {
    const runtimePart = runtime[index];
    const minimumPart = minimum[index];
    if (runtimePart === undefined || minimumPart === undefined) {
      return false;
    }
    const comparison = compareNumericIdentifier(runtimePart, minimumPart);
    if (comparison !== 0) {
      return comparison > 0;
    }
  }

  return true;
}

function cloneCaptionFallback(
  captionFallback: CaptionFallback,
): CaptionFallback {
  return Object.freeze({
    language: captionFallback.language,
    text: captionFallback.text,
  });
}

function cloneSegment(segment: SignPackSegment): SignPackSegment {
  const clone: SignPackSegment = {
    ...segment,
    captionFallback: cloneCaptionFallback(segment.captionFallback),
    assetIds: Object.freeze([...segment.assetIds]),
  };
  return Object.freeze(clone);
}

function cloneAsset(asset: SignPackAsset): SignPackAsset {
  return Object.freeze({
    assetId: asset.assetId,
    path: asset.path,
    sha256: asset.sha256,
    mediaType: asset.mediaType,
    durationMs: asset.durationMs,
  });
}

function buildAssetsById(
  assets: readonly SignPackAsset[],
): Readonly<Record<string, SignPackAsset>> {
  const assetsById: Record<string, SignPackAsset> = Object.create(null) as Record<
    string,
    SignPackAsset
  >;
  for (const asset of assets) {
    assetsById[asset.assetId] = cloneAsset(asset);
  }
  return Object.freeze(assetsById);
}

function copyAssetStates(
  assetStates: Readonly<Record<string, AssetPlaybackState>>,
): Readonly<Record<string, AssetPlaybackState>> {
  const copy: Record<string, AssetPlaybackState> = Object.create(null) as Record<
    string,
    AssetPlaybackState
  >;
  for (const [assetId, state] of Object.entries(assetStates)) {
    if (!ASSET_PLAYBACK_STATES.has(state)) {
      throw new TypeError("invalid asset playback state");
    }
    copy[assetId] = state;
  }
  return Object.freeze(copy);
}

function readyModel(
  manifest: SignPack,
  assetStates: Readonly<Record<string, AssetPlaybackState>>,
  runtimeVersion: string,
): ReadyPlaybackModel {
  const segmentIndex = Object.freeze(manifest.segments.map(cloneSegment));
  const model = {
    status: "ready",
    sourceFingerprint: manifest.sourceVideo.fingerprint,
    sourceDurationMs: manifest.sourceVideo.durationMs,
    segmentIndex,
    assetsById: buildAssetsById(manifest.assets),
    assetStates: copyAssetStates(assetStates),
    runtimeVersion,
  } as ReadyPlaybackModel;
  Object.defineProperty(model, PLAYBACK_MODEL_BRAND, {
    value: true,
    enumerable: false,
  });
  Object.freeze(model);
  AUTHENTIC_PLAYBACK_MODELS.add(model);
  return model;
}

function blockedModel(
  reason: PreparationBlockReason,
): BlockedPlaybackModel {
  const model = {
    status: "blocked",
    reason,
  } as BlockedPlaybackModel;
  Object.defineProperty(model, PLAYBACK_MODEL_BRAND, {
    value: true,
    enumerable: false,
  });
  Object.freeze(model);
  AUTHENTIC_PLAYBACK_MODELS.add(model);
  return model;
}

export function preparePlaybackModel(
  input: PreparePlaybackModelInput,
): PlaybackModel {
  const captured = capturePrepareInput(input);
  if (captured === null) {
    return blockedModel("invalid_manifest");
  }

  const {
    manifest,
    manifestIntegrity,
    assetStates,
    runtimeVersion,
  } = captured;
  let detachedManifest: unknown;
  let validation: ReturnType<typeof validateSignPack>;
  try {
    detachedManifest = structuredClone(manifest);
    validation = validateSignPack(detachedManifest);
  } catch {
    return blockedModel("invalid_manifest");
  }

  if (manifestIntegrity === "unverified") {
    return blockedModel("unverified_manifest");
  }
  if (manifestIntegrity === "corrupt") {
    return blockedModel("corrupt_manifest");
  }

  if (!validation.ok) {
    if (
      claimsPublishedRelease(detachedManifest) &&
      hasOnlyPublicationGateIssues(validation)
    ) {
      return blockedModel("not_published");
    }
    return blockedModel("invalid_manifest");
  }
  if (!isPublishedForPlayback(detachedManifest)) {
    return blockedModel("not_published");
  }
  if (
    !runtimeIsCompatible(
      runtimeVersion,
      validation.value.runtimeCompatibility.minimumVersion,
    )
  ) {
    return blockedModel("incompatible_runtime");
  }

  try {
    return readyModel(
      validation.value,
      assetStates,
      runtimeVersion,
    );
  } catch {
    return blockedModel("invalid_manifest");
  }
}

function fallback(
  reason: PlaybackFallbackReason,
  mediaTimeMs: number | null,
  segment?: SignPackSegment,
): CaptionFallbackPlaybackState {
  if (segment === undefined) {
    return Object.freeze({
      kind: "caption_fallback",
      reason,
      mediaTimeMs,
      preserveSourceCaptions: true,
    });
  }

  return Object.freeze({
    kind: "caption_fallback",
    reason,
    mediaTimeMs,
    segmentId: segment.segmentId,
    captionFallback: segment.captionFallback,
    preserveSourceCaptions: true,
  });
}

function findSegment(
  segments: readonly SignPackSegment[],
  currentTimeMs: number,
): SignPackSegment | undefined {
  let low = 0;
  let high = segments.length - 1;

  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const segment = segments[middle];
    if (segment === undefined) {
      return undefined;
    }
    if (currentTimeMs < segment.startMs) {
      high = middle - 1;
    } else if (currentTimeMs >= segment.endMs) {
      low = middle + 1;
    } else {
      return segment;
    }
  }

  return undefined;
}

function validMediaTime(
  currentTimeMs: unknown,
  sourceDurationMs: number,
): currentTimeMs is number {
  return (
    typeof currentTimeMs === "number" &&
    Number.isFinite(currentTimeMs) &&
    currentTimeMs >= 0 &&
    currentTimeMs <= sourceDurationMs
  );
}

function isValidClock(
  snapshot: CapturedMediaClock,
  sourceDurationMs: number,
): snapshot is ValidatedMediaClock {
  return (
    validMediaTime(snapshot.currentTimeMs, sourceDurationMs) &&
    typeof snapshot.playbackRate === "number" &&
    Number.isFinite(snapshot.playbackRate) &&
    snapshot.playbackRate > 0 &&
    typeof snapshot.paused === "boolean" &&
    typeof snapshot.seeking === "boolean"
  );
}

function safeMediaTime(snapshot: CapturedMediaClock): number | null {
  return typeof snapshot.currentTimeMs === "number" &&
    Number.isFinite(snapshot.currentTimeMs) &&
    snapshot.currentTimeMs >= 0
    ? snapshot.currentTimeMs
    : null;
}

function resolveReadyPlaybackState(
  model: ReadyPlaybackModel,
  snapshot: CapturedMediaClock,
): PlaybackState {
  if (!isValidClock(snapshot, model.sourceDurationMs)) {
    return fallback("invalid_clock", null);
  }
  if (
    typeof snapshot.sourceFingerprint !== "string" ||
    snapshot.sourceFingerprint !== model.sourceFingerprint
  ) {
    return fallback("source_mismatch", snapshot.currentTimeMs);
  }

  const segment = findSegment(model.segmentIndex, snapshot.currentTimeMs);
  if (segment === undefined) {
    return fallback("gap", snapshot.currentTimeMs);
  }
  if (segment.translationStatus === "unsupported") {
    return fallback("unsupported_segment", snapshot.currentTimeMs, segment);
  }
  if (
    segment.translationStatus !== "mapped" ||
    segment.reviewStatus !== "approved"
  ) {
    return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
  }
  if (snapshot.playbackRate !== 1) {
    return fallback(
      "unapproved_playback_rate",
      snapshot.currentTimeMs,
      segment,
    );
  }
  if (segment.assetIds.length !== 1) {
    return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
  }

  const assetId = segment.assetIds[0];
  if (assetId === undefined) {
    return fallback("missing_asset", snapshot.currentTimeMs, segment);
  }

  const assetState = model.assetStates[assetId];
  if (assetState === undefined || assetState === "missing") {
    return fallback("missing_asset", snapshot.currentTimeMs, segment);
  }
  if (assetState === "withdrawn") {
    return fallback("withdrawn_asset", snapshot.currentTimeMs, segment);
  }
  if (assetState === "corrupt") {
    return fallback("corrupt_asset", snapshot.currentTimeMs, segment);
  }
  if (assetState !== "ready") {
    return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
  }

  const asset = model.assetsById[assetId];
  if (
    asset === undefined ||
    asset.durationMs !== segment.endMs - segment.startMs
  ) {
    return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
  }

  return Object.freeze({
    kind: "active_sign",
    segmentId: segment.segmentId,
    asset,
    mediaTimeMs: snapshot.currentTimeMs,
    assetTimeMs: snapshot.currentTimeMs - segment.startMs,
    paused: snapshot.paused,
    seeking: snapshot.seeking,
    shouldPlay: !snapshot.paused && !snapshot.seeking,
    captionFallback: segment.captionFallback,
    preserveSourceCaptions: true,
  });
}

function isAuthenticPlaybackModel(model: unknown): model is PlaybackModel {
  return (
    typeof model === "object" &&
    model !== null &&
    AUTHENTIC_PLAYBACK_MODELS.has(model)
  );
}

export function resolvePlaybackState(
  model: PlaybackModel,
  snapshot: MediaClockSnapshot,
): PlaybackState {
  try {
    if (!isAuthenticPlaybackModel(model)) {
      return fallback("invalid_manifest", null);
    }

    const capturedSnapshot = captureMediaClock(snapshot);
    if (capturedSnapshot === null) {
      return fallback("invalid_clock", null);
    }

    if (model.status === "blocked") {
      return fallback(model.reason, safeMediaTime(capturedSnapshot));
    }
    return resolveReadyPlaybackState(model, capturedSnapshot);
  } catch {
    return fallback("invalid_clock", null);
  }
}
