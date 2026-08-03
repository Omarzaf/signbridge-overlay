import syntheticManifest from "../../../fixtures/synthetic-unsupported.signpack.json";
import {
  createIndexedDbCaptionPackStore,
  type VerifiedLocalCaptionPack,
} from "../../../packages/pack-storage/src/index";
import { createRuntimeController } from "../../../packages/runtime/src/index";
import {
  preparePlaybackModel,
  type PlaybackModel,
} from "../../../packages/sync-engine/src/index";
import {
  validateSignPack,
  type SignPack,
} from "../../../packages/signpack-schema/src/index";
import { createHtml5VideoAdapter } from "../../../packages/video-adapters/src/index";
import { createAccessibleFallbackOverlay } from "./accessibleFallbackOverlay";
import { bindCaptionPackImport } from "./captionPackImport";
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
const motionStatusElement = motionStatus;
const motionDetailElement = motionDetail;
const store = createIndexedDbCaptionPackStore();
let disposeMountedPlayback: (() => void) | null = null;

function isCaptionOnlyBlockedModel(
  model: PlaybackModel,
): model is Extract<PlaybackModel, { readonly status: "blocked" }> {
  return model.status === "blocked" && model.reason === "not_published";
}

function mountManifest(manifest: SignPack): boolean {
  const model = preparePlaybackModel({
    manifest,
    manifestIntegrity: "verified",
    assetStates: {},
    runtimeVersion: "0.1.0",
  });
  if (!isCaptionOnlyBlockedModel(model)) {
    return false;
  }

  disposeMountedPlayback?.();
  captionElement.textContent =
    manifest.segments[0]?.captionFallback.text ??
    "Source captions remain independently available.";
  const controller = createRuntimeController(model);
  const overlay = createAccessibleFallbackOverlay(overlayElement);
  const unsubscribe = controller.subscribe(overlay.render);
  const adapter = createHtml5VideoAdapter({
    media: videoElement,
    controller,
    resolveSourceFingerprint: () => null,
  });
  overlay.render(adapter.start());

  disposeMountedPlayback = (): void => {
    adapter.dispose();
    unsubscribe();
    controller.dispose();
    overlay.dispose();
  };
  return true;
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

function syncMotion(): void {
  showMotionState(
    motion.sync({
      currentTimeMs: videoElement.currentTime * 1000,
      paused: videoElement.paused,
      seeking: videoElement.seeking,
    }),
  );
}

const MOTION_SOURCE_EVENTS = [
  "timeupdate",
  "play",
  "pause",
  "seeking",
  "seeked",
  "ratechange",
  "loadedmetadata",
  "emptied",
  "ended",
] as const;

for (const eventName of MOTION_SOURCE_EVENTS) {
  videoElement.addEventListener(eventName, syncMotion);
}
globalThis.addEventListener("resize", syncMotion);

motionToggleVisible.addEventListener("click", () => {
  const nextVisible = !motion.isVisible();
  showMotionState(motion.setVisible(nextVisible));
  motionToggleVisible.textContent = nextVisible
    ? "Hide motion surface"
    : "Show motion surface";
  motionToggleVisible.setAttribute("aria-pressed", String(nextVisible));
  syncMotion();
});

motionToggleMotion.addEventListener("click", () => {
  const nextAllowed = !motion.isMotionAllowed();
  showMotionState(motion.setMotionAllowed(nextAllowed));
  motionToggleMotion.textContent = nextAllowed
    ? "Hold motion still"
    : "Start abstract motion";
  motionToggleMotion.setAttribute("aria-pressed", String(nextAllowed));
  syncMotion();
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
  syncMotion();
});

showMotionState(await motion.load());
motionToggleMotion.textContent = motion.isMotionAllowed()
  ? "Hold motion still"
  : "Start abstract motion";
motionToggleMotion.setAttribute(
  "aria-pressed",
  String(motion.isMotionAllowed()),
);
syncMotion();

const bundledValidation = validateSignPack(syntheticManifest);
if (!bundledValidation.ok || !mountManifest(bundledValidation.value)) {
  throw new Error("bundled synthetic fixture crossed the playback boundary");
}

const restored = await store.getActiveVerified();
if (restored.ok && mountManifest(restored.value.manifest)) {
  importStatus.textContent =
    "Verified local synthetic caption pack restored. This draft remains unpublished.";
}

const importBinding = bindCaptionPackImport({
  input: importInput,
  status: importStatus,
  store,
  onVerified: (pack: VerifiedLocalCaptionPack) =>
    mountManifest(pack.manifest),
});

globalThis.addEventListener(
  "pagehide",
  () => {
    importBinding.dispose();
    disposeMountedPlayback?.();
    for (const eventName of MOTION_SOURCE_EVENTS) {
      videoElement.removeEventListener(eventName, syncMotion);
    }
    globalThis.removeEventListener("resize", syncMotion);
    motion.dispose();
    releaseTimingSource();
    store.close();
  },
  { once: true },
);
