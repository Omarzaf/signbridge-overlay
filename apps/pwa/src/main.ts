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

const sourceVideo = document.querySelector<HTMLVideoElement>("#source-video");
const overlayRoot =
  document.querySelector<HTMLElement>("#signing-overlay");
const sourceCaption =
  document.querySelector<HTMLElement>("#source-caption");
const captionPackInput =
  document.querySelector<HTMLInputElement>("#caption-pack-input");
const captionPackStatus =
  document.querySelector<HTMLElement>("#caption-pack-status");

if (
  sourceVideo === null ||
  overlayRoot === null ||
  sourceCaption === null ||
  captionPackInput === null ||
  captionPackStatus === null
) {
  throw new Error("synthetic playback shell is missing required elements");
}

const videoElement = sourceVideo;
const overlayElement = overlayRoot;
const captionElement = sourceCaption;
const importInput = captionPackInput;
const importStatus = captionPackStatus;
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
    store.close();
  },
  { once: true },
);
