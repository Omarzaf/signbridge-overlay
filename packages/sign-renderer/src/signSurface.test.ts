import { describe, expect, test } from "vitest";

import { resolveAssetGeometry } from "./geometry";
import { applySurfaceGeometry, type StyledElement } from "./signSurface";

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
