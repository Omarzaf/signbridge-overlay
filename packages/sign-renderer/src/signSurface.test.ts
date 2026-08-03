import { describe, expect, test } from "vitest";

import type { PlaybackState } from "../../sync-engine/src/index";
import { resolveAssetGeometry } from "./geometry";
import {
  applySurfaceGeometry,
  createSignSurface,
  type StyledElement,
} from "./signSurface";

interface RecordedElement extends StyledElement {
  readonly properties: Map<string, string>;
}

function recordingElement(): RecordedElement {
  const properties = new Map<string, string>();
  return {
    properties,
    style: {
      setProperty: (name: string, value: string): void => {
        properties.set(name, value);
      },
      removeProperty: (name: string): string => {
        const previous = properties.get(name) ?? "";
        properties.delete(name);
        return previous;
      },
    },
  };
}

describe("applySurfaceGeometry", () => {
  test("writes only the non-cropping, non-mirroring style onto the element", () => {
    const element = recordingElement();
    const geometry = resolveAssetGeometry({
      containerWidthPx: 600,
      containerHeightPx: 600,
      assetWidthPx: 1920,
      assetHeightPx: 1080,
    });

    applySurfaceGeometry(element, geometry);

    // Asserted on what is actually written to the element, not on the helper
    // that computed it: this is the last point before the browser sees it.
    expect(element.properties.get("object-fit")).toBe("contain");
    expect(element.properties.get("object-position")).toBe("center");
    expect(element.properties.get("transform")).toBe("none");
    expect(element.properties.get("width")).toBe("600px");
    expect(element.properties.get("height")).toBe("337.5px");
    expect(element.properties.get("top")).toBe("131.25px");
    expect(element.properties.get("left")).toBe("0px");
  });

  test("never emits a negative offset, which would place the frame off-container", () => {
    const element = recordingElement();

    applySurfaceGeometry(
      element,
      resolveAssetGeometry({
        containerWidthPx: 320,
        containerHeightPx: 900,
        assetWidthPx: 1920,
        assetHeightPx: 1080,
      }),
    );

    for (const property of ["width", "height", "top", "left"]) {
      expect(element.properties.get(property)).not.toMatch(/^-/u);
    }
  });

  test("removes the surface rather than sizing it when geometry is unavailable", () => {
    const element = recordingElement();

    applySurfaceGeometry(element, null);

    expect(element.properties.get("display")).toBe("none");
    expect(element.properties.has("width")).toBe(false);
    expect(element.properties.has("height")).toBe(false);
    // Even hidden, the surface keeps the style that cannot crop or mirror, so
    // no code path can leave a mirrored surface behind to be shown later.
    expect(element.properties.get("transform")).toBe("none");
    expect(element.properties.get("object-fit")).toBe("contain");
  });
});

describe("createSignSurface geometry lifecycle", () => {
  test("re-renders after media metadata and container resize", () => {
    const target = new EventTarget();
    const properties = new Map<string, string>();
    let videoWidth = 0;
    let videoHeight = 0;
    let containerWidth = 600;
    let containerHeight = 400;
    let resizeCallback: (() => void) | null = null;
    const element = Object.assign(target, {
      style: {
        setProperty: (name: string, value: string): void => {
          properties.set(name, value);
        },
        removeProperty: (name: string): string => {
          const previous = properties.get(name) ?? "";
          properties.delete(name);
          return previous;
        },
      },
      setAttribute: (): void => {},
      removeAttribute: (): void => {},
      remove: (): void => {},
      pause: (): void => {},
      play: async (): Promise<void> => {},
      paused: true,
      currentTime: 0,
      src: "",
      preload: "",
      controls: false,
      muted: true,
    });
    Object.defineProperties(element, {
      videoWidth: { get: () => videoWidth },
      videoHeight: { get: () => videoHeight },
    });
    class TestResizeObserver {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe(): void {}
      disconnect(): void {}
    }
    const view = new EventTarget() as EventTarget & {
      ResizeObserver: typeof ResizeObserver;
    };
    view.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
    const root = {
      ownerDocument: {
        createElement: () => element,
        defaultView: view,
      },
      append: (): void => {},
      getBoundingClientRect: () => ({
        width: containerWidth,
        height: containerHeight,
      }),
    } as unknown as HTMLElement;
    const surface = createSignSurface(root);
    const activeState: PlaybackState = {
      kind: "active_sign",
      segmentId: "seg_synthetic000001",
      asset: {
        assetId: "ast_synthetic000001",
        path: "synthetic-test-only.webm",
        sha256:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        mediaType: "video/webm",
        durationMs: 1000,
      },
      mediaTimeMs: 0,
      assetTimeMs: 0,
      paused: true,
      seeking: false,
      shouldPlay: false,
      captionFallback: { language: "en", text: "Synthetic caption." },
      preserveSourceCaptions: true,
    };

    expect(
      surface.render(activeState, { widthPx: 600, heightPx: 400 }).geometry,
    ).toBeNull();
    videoWidth = 1920;
    videoHeight = 1080;
    target.dispatchEvent(new Event("loadedmetadata"));
    expect(properties.get("width")).toBe("600px");
    expect(properties.get("height")).toBe("337.5px");

    containerWidth = 320;
    containerHeight = 320;
    const notifyResize = resizeCallback as (() => void) | null;
    notifyResize?.();
    expect(properties.get("width")).toBe("320px");
    expect(properties.get("height")).toBe("180px");
    surface.dispose();
  });
});
