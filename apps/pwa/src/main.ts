import syntheticManifest from "../../../fixtures/synthetic-unsupported.signpack.json";
import { createRuntimeController } from "../../../packages/runtime/src/index";
import { preparePlaybackModel } from "../../../packages/sync-engine/src/index";
import { createHtml5VideoAdapter } from "../../../packages/video-adapters/src/index";
import { createAccessibleFallbackOverlay } from "./accessibleFallbackOverlay";

const sourceVideo = document.querySelector<HTMLVideoElement>("#source-video");
const overlayRoot =
  document.querySelector<HTMLElement>("#signing-overlay");
const sourceCaption =
  document.querySelector<HTMLElement>("#source-caption");

if (
  sourceVideo === null ||
  overlayRoot === null ||
  sourceCaption === null
) {
  throw new Error("synthetic playback shell is missing required elements");
}

sourceCaption.textContent =
  syntheticManifest.segments[0]?.captionFallback.text ??
  "Source captions remain independently available.";

const model = preparePlaybackModel({
  manifest: syntheticManifest,
  manifestIntegrity: "verified",
  assetStates: {},
  runtimeVersion: "0.1.0",
});
const controller = createRuntimeController(model);
const overlay = createAccessibleFallbackOverlay(overlayRoot);
const unsubscribe = controller.subscribe(overlay.render);
const adapter = createHtml5VideoAdapter({
  media: sourceVideo,
  controller,
  resolveSourceFingerprint: () => null,
});

overlay.render(adapter.start());

globalThis.addEventListener(
  "pagehide",
  () => {
    adapter.dispose();
    unsubscribe();
    controller.dispose();
    overlay.dispose();
  },
  { once: true },
);
