import type { PlaybackState } from "../../sync-engine/src/index";
import {
  SIGN_SURFACE_STYLE,
  resolveAssetGeometry,
  type AssetGeometry,
} from "./geometry";
import { describeRendererState, type RendererPresentation } from "./presentation";
import { applyPlaybackToSurface, type TimelineApplication } from "./timeline";

export interface ContainerBox {
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface SignSurfaceFrame {
  readonly presentation: RendererPresentation;
  readonly geometry: AssetGeometry | null;
  readonly timeline: TimelineApplication;
  /** True whenever reviewed media is on screen. False means captions carry it. */
  readonly showingSignMedia: boolean;
}

export interface SignSurface {
  readonly element: HTMLVideoElement;
  readonly render: (state: PlaybackState, container: ContainerBox) => SignSurfaceFrame;
  readonly dispose: () => void;
}

/**
 * Structural subset of an element with inline styles. Deliberately narrow: the
 * signing layer is an HTML `<video>` and the synthetic motion surface is an
 * inline `<svg>`, and both must be placed by the same code so neither can
 * acquire a geometry the other is forbidden.
 */
export interface StyledElement {
  readonly style: {
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => string;
  };
}

/**
 * Writes the one permitted geometry onto an element. Nothing else in the
 * codebase sets these properties on a signing surface, so the no-crop and
 * no-mirror guarantees hold for whatever the element turns out to be.
 */
export function applySurfaceGeometry(
  element: StyledElement,
  geometry: AssetGeometry | null,
): void {
  const style = element.style;
  style.setProperty("object-fit", SIGN_SURFACE_STYLE.objectFit);
  style.setProperty("object-position", SIGN_SURFACE_STYLE.objectPosition);
  style.setProperty("transform", SIGN_SURFACE_STYLE.transform);

  if (geometry === null) {
    // `display` rather than the `hidden` attribute: `hidden` is an HTML concept
    // and does nothing on an SVG element.
    style.setProperty("display", "none");
    style.removeProperty("width");
    style.removeProperty("height");
    style.removeProperty("left");
    style.removeProperty("top");
    return;
  }

  style.setProperty("display", "block");
  style.setProperty("width", `${geometry.widthPx}px`);
  style.setProperty("height", `${geometry.heightPx}px`);
  style.setProperty("left", `${geometry.offsetXPx}px`);
  style.setProperty("top", `${geometry.offsetYPx}px`);
}

/**
 * The signing layer for reviewed media.
 *
 * It does not choose what to show. It is handed a `PlaybackState` resolved from
 * the source media clock and reflects exactly that: reviewed media when the
 * sync engine says a segment is approved and ready, and nothing at all
 * otherwise. The caption fallback is the overlay's responsibility, so a failure
 * here can never be silent — the surface goes away and the caption stays.
 */
export function createSignSurface(root: HTMLElement): SignSurface {
  const element = root.ownerDocument.createElement("video");
  element.setAttribute("playsinline", "");
  element.preload = "auto";
  element.controls = false;
  element.muted = true;
  // The signing layer is decoration for assistive purposes; the overlay carries
  // the accessible name and live status for the whole region.
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("position", "absolute");
  applySurfaceGeometry(element, null);
  root.append(element);

  let mountedAssetId: string | null = null;

  const render = (
    state: PlaybackState,
    container: ContainerBox,
  ): SignSurfaceFrame => {
    const presentation = describeRendererState(state);

    if (state.kind !== "active_sign") {
      mountedAssetId = null;
      element.removeAttribute("src");
      const timeline = applyPlaybackToSurface(element, state);
      applySurfaceGeometry(element, null);
      return Object.freeze({
        presentation,
        geometry: null,
        timeline,
        showingSignMedia: false,
      });
    }

    if (mountedAssetId !== state.asset.assetId) {
      mountedAssetId = state.asset.assetId;
      element.src = state.asset.path;
    }

    const geometry = resolveAssetGeometry({
      containerWidthPx: container.widthPx,
      containerHeightPx: container.heightPx,
      assetWidthPx: element.videoWidth,
      assetHeightPx: element.videoHeight,
    });
    const timeline = applyPlaybackToSurface(element, state);
    applySurfaceGeometry(element, geometry);

    return Object.freeze({
      presentation,
      geometry,
      timeline,
      showingSignMedia: geometry !== null,
    });
  };

  return Object.freeze({
    element,
    render,
    dispose: (): void => {
      element.removeAttribute("src");
      element.remove();
    },
  });
}
