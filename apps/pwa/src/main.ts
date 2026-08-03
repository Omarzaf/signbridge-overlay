import syntheticManifest from "../../../fixtures/synthetic-unsupported.signpack.json";
import {
  createIndexedDbCaptionPackStore,
  type VerifiedLocalCaptionPack,
} from "../../../packages/pack-storage/src/index";
import { createRuntimeController } from "../../../packages/runtime/src/index";
import {
  preparePlaybackModel,
  type MediaClockSnapshot,
  type PlaybackModel,
  type PlaybackState,
} from "../../../packages/sync-engine/src/index";
import {
  validateSignPack,
  type SignPack,
} from "../../../packages/signpack-schema/src/index";
import { createHtml5VideoAdapter } from "../../../packages/video-adapters/src/index";
import { createSignSurface } from "../../../packages/sign-renderer/src/index";
import { createAccessibleFallbackOverlay } from "./accessibleFallbackOverlay";
import {
  bindCaptionPackImport,
  captionPackImportMessage,
} from "./captionPackImport";
import {
  createSyntheticMotionSurface,
  type MotionSurfaceState,
} from "./syntheticMotionSurface";
import { createSilentTimingSource } from "./syntheticTimingSource";

const sourceVideo = document.querySelector<HTMLVideoElement>("#source-video");
const overlayRoot =
  document.querySelector<HTMLElement>("#signing-overlay");
const sourceCaption =
  document.querySelector<HTMLElement>("#source-caption");
const captionPackInput =
  document.querySelector<HTMLInputElement>("#caption-pack-input");
const captionPackStatus =
  document.querySelector<HTMLElement>("#caption-pack-status");
const motionRoot = document.querySelector<HTMLElement>("#synthetic-motion");
const signSurfaceRoot =
  document.querySelector<HTMLElement>("#sign-media-surface");
const playerStage = document.querySelector<HTMLElement>("#player-stage");
const integrationTrace =
  document.querySelector<HTMLOListElement>("#integration-trace");
const motionStatus = document.querySelector<HTMLElement>("#motion-status");
const motionDetail = document.querySelector<HTMLElement>("#motion-detail");
const motionToggleVisible = document.querySelector<HTMLButtonElement>(
  "#motion-toggle-visible",
);
const motionToggleMotion = document.querySelector<HTMLButtonElement>(
  "#motion-toggle-motion",
);
const motionToggleSource = document.querySelector<HTMLButtonElement>(
  "#motion-toggle-source",
);

if (
  sourceVideo === null ||
  overlayRoot === null ||
  sourceCaption === null ||
  captionPackInput === null ||
  captionPackStatus === null ||
  motionRoot === null ||
  signSurfaceRoot === null ||
  playerStage === null ||
  integrationTrace === null ||
  motionStatus === null ||
  motionDetail === null ||
  motionToggleVisible === null ||
  motionToggleMotion === null ||
  motionToggleSource === null
) {
  throw new Error("synthetic playback shell is missing required elements");
}

const videoElement = sourceVideo;
const overlayElement = overlayRoot;
const captionElement = sourceCaption;
const importInput = captionPackInput;
const importStatus = captionPackStatus;
const motionElement = motionRoot;
const signSurfaceElement = signSurfaceRoot;
const playerStageElement = playerStage;
const traceElement = integrationTrace;
const motionStatusElement = motionStatus;
const motionDetailElement = motionDetail;
const store = createIndexedDbCaptionPackStore();
let disposeMountedPlayback: (() => void) | null = null;
let sampleMountedPlayback: (() => PlaybackState) | null = null;

const traceStages = new Set<string>();

function recordTrace(stage: string, detail: string): void {
  traceStages.add(stage);
  const item = [...traceElement.children].find(
    (candidate): candidate is HTMLElement =>
      candidate instanceof HTMLElement && candidate.dataset["stage"] === stage,
  ) ?? document.createElement("li");
  item.dataset["stage"] = stage;
  item.textContent = `${stage}: ${detail}`;
  if (!item.isConnected) {
    traceElement.append(item);
  }
  traceElement.dataset["callGraph"] = [
    "storage",
    "adapter",
    "runtime",
    "renderer",
  ]
    .filter((candidate) => traceStages.has(candidate))
    .join(">");
}

function isCaptionOnlyBlockedModel(
  model: PlaybackModel,
): model is Extract<PlaybackModel, { readonly status: "blocked" }> {
  return model.status === "blocked" && model.reason === "not_published";
}

function mountPlaybackModel(model: PlaybackModel): void {
  disposeMountedPlayback?.();
  const controller = createRuntimeController(model);
  const overlay = createAccessibleFallbackOverlay(overlayElement);
  const signSurface = createSignSurface(signSurfaceElement);
  let latestSnapshot: MediaClockSnapshot | null = null;
  let sampleCount = 0;

  const render = (state: PlaybackState): void => {
    overlay.render(state);
    const bounds = playerStageElement.getBoundingClientRect();
    signSurface.render(state, {
      widthPx: bounds.width,
      heightPx: bounds.height,
    });
    recordTrace("renderer", state.kind);
    if (latestSnapshot !== null) {
      showMotionState(
        motion.sync({
          currentTimeMs: latestSnapshot.currentTimeMs,
          paused: latestSnapshot.paused,
          seeking: latestSnapshot.seeking,
          playbackRate: latestSnapshot.playbackRate,
        }),
      );
    }
  };
  const unsubscribe = controller.subscribe(render);
  const adapter = createHtml5VideoAdapter({
    media: videoElement,
    controller: {
      sample: (snapshot) => {
        latestSnapshot = snapshot;
        sampleCount += 1;
        traceElement.dataset["sampleCount"] = String(sampleCount);
        traceElement.dataset["sourceSampled"] = String(
          snapshot.sourceFingerprint.length > 0,
        );
        recordTrace("adapter", "media-clock sample");
        recordTrace("runtime", "sample dispatched");
        return controller.sample(snapshot);
      },
    },
    resolveSourceFingerprint: () => null,
  });
  sampleMountedPlayback = adapter.sampleNow;
  adapter.start();

  disposeMountedPlayback = (): void => {
    sampleMountedPlayback = null;
    adapter.dispose();
    unsubscribe();
    controller.dispose();
    signSurface.dispose();
    overlay.dispose();
  };
}

function mountManifest(
  manifest: SignPack,
  storageAssurance: "bundled-structural" | "verified-local",
): boolean {
  const model = preparePlaybackModel({
    manifest,
    manifestIntegrity: "verified",
    assetStates: {},
    runtimeVersion: "0.1.0",
  });
  if (!isCaptionOnlyBlockedModel(model)) {
    return false;
  }

  captionElement.textContent =
    manifest.segments[0]?.captionFallback.text ??
    "Source captions remain independently available.";
  recordTrace("storage", storageAssurance);
  mountPlaybackModel(model);
  return true;
}

function mountIntegrityFailure(): void {
  recordTrace("storage", "integrity mismatch");
  mountPlaybackModel(
    preparePlaybackModel({
      manifest: null,
      manifestIntegrity: "corrupt",
      assetStates: {},
      runtimeVersion: "0.1.0",
    }),
  );
}

/**
 * The shell needs a real media element clock to synchronise against; a
 * JavaScript timer is explicitly not an acceptable substitute, per
 * docs/decisions/0004-media-clock-is-authoritative.md. The source element can
 * be given a silent track built in this browser, so pausing, seeking, and rate
 * changes are genuine media events rather than simulated ones — and no media
 * file exists in the repository or the deployed bundle.
 *
 * Attached on request rather than at load. Nothing is loaded into the source
 * element until someone asks for it, which keeps the default state of this page
 * exactly what it claims to be: a shell with no media in it.
 */
let timingSourceUrl: string | null = null;

function releaseTimingSource(): void {
  if (timingSourceUrl === null) {
    return;
  }
  videoElement.removeAttribute("src");
  videoElement.load();
  URL.revokeObjectURL(timingSourceUrl);
  timingSourceUrl = null;
}

function attachTimingSource(): boolean {
  try {
    releaseTimingSource();
    timingSourceUrl = URL.createObjectURL(createSilentTimingSource());
    videoElement.src = timingSourceUrl;
    return true;
  } catch {
    return false;
  }
}

const motion = createSyntheticMotionSurface(motionElement);

function showMotionState(state: MotionSurfaceState): void {
  motionStatusElement.textContent = state.headline;
  motionDetailElement.textContent = state.detail;
  motionElement.dataset["motionState"] = state.status;
}

function resampleMountedPlayback(): void {
  if (sampleMountedPlayback === null) {
    motion.resize();
    return;
  }
  sampleMountedPlayback();
}

globalThis.addEventListener("resize", resampleMountedPlayback);

motionToggleVisible.addEventListener("click", () => {
  const nextVisible = !motion.isVisible();
  showMotionState(motion.setVisible(nextVisible));
  motionToggleVisible.textContent = nextVisible
    ? "Hide motion surface"
    : "Show motion surface";
  motionToggleVisible.setAttribute("aria-pressed", String(nextVisible));
  resampleMountedPlayback();
});

motionToggleMotion.addEventListener("click", () => {
  const nextAllowed = !motion.isMotionAllowed();
  showMotionState(motion.setMotionAllowed(nextAllowed));
  motionToggleMotion.textContent = nextAllowed
    ? "Hold motion still"
    : "Start abstract motion";
  motionToggleMotion.setAttribute("aria-pressed", String(nextAllowed));
  resampleMountedPlayback();
});

motionToggleSource.addEventListener("click", () => {
  if (timingSourceUrl === null) {
    if (!attachTimingSource()) {
      motionDetailElement.textContent =
        "This browser would not accept a synthetic timing source, so there is no media clock to follow.";
      return;
    }
    motionToggleSource.textContent = "Unload timing source";
    motionToggleSource.setAttribute("aria-pressed", "true");
    motionDetailElement.textContent =
      "A silent track is loaded. Use the video's own controls to play, pause, and seek; the surface follows that clock.";
    return;
  }

  releaseTimingSource();
  motionToggleSource.textContent = "Load synthetic timing source";
  motionToggleSource.setAttribute("aria-pressed", "false");
  resampleMountedPlayback();
});

showMotionState(await motion.load());
motionToggleMotion.textContent = motion.isMotionAllowed()
  ? "Hold motion still"
  : "Start abstract motion";
motionToggleMotion.setAttribute(
  "aria-pressed",
  String(motion.isMotionAllowed()),
);
motion.resize();

const bundledValidation = validateSignPack(syntheticManifest);
if (
  !bundledValidation.ok ||
  !mountManifest(bundledValidation.value, "bundled-structural")
) {
  throw new Error("bundled synthetic fixture crossed the playback boundary");
}

const restored = await store.getActiveVerified();
if (restored.ok) {
  if (mountManifest(restored.value.manifest, "verified-local")) {
    importStatus.textContent =
      "Verified local synthetic caption pack restored. This draft remains unpublished.";
  }
} else if (restored.code !== "not_found") {
  importStatus.textContent = captionPackImportMessage(restored.code);
  if (restored.code === "integrity_mismatch") {
    mountIntegrityFailure();
  }
}

const importBinding = bindCaptionPackImport({
  input: importInput,
  status: importStatus,
  store,
  onVerified: (pack: VerifiedLocalCaptionPack) =>
    mountManifest(pack.manifest, "verified-local"),
});

globalThis.addEventListener(
  "pagehide",
  () => {
    importBinding.dispose();
    disposeMountedPlayback?.();
    globalThis.removeEventListener("resize", resampleMountedPlayback);
    motion.dispose();
    releaseTimingSource();
    store.close();
  },
  { once: true },
);
