import { describe, expect, test } from "vitest";

import {
  SIGN_SURFACE_STYLE,
  overflowsContainer,
  resolveAssetGeometry,
} from "./geometry";

/**
 * Closes the second pending invariant in docs/agent-orchestration.md §2.1:
 * "Signing media is never cropped or mirrored", enforced by test rather than by
 * prose. Cropping can remove nonmanual grammar; mirroring can change which sign
 * is being produced. Neither is a rendering preference.
 */

const CONTAINER_SIZES = [
  [320, 180],
  [320, 568],
  [375, 812],
  [768, 1024],
  [1280, 720],
  [1920, 1080],
  [200, 2000],
  [2000, 200],
  [44, 44],
] as const;

const ASSET_SIZES = [
  [1920, 1080],
  [1080, 1920],
  [1280, 720],
  [720, 720],
  [640, 480],
  [480, 854],
  [3840, 2160],
  [101, 397],
] as const;

describe("resolveAssetGeometry", () => {
  test("never places any part of the asset outside the container", () => {
    for (const [containerWidthPx, containerHeightPx] of CONTAINER_SIZES) {
      for (const [assetWidthPx, assetHeightPx] of ASSET_SIZES) {
        const geometry = resolveAssetGeometry({
          containerWidthPx,
          containerHeightPx,
          assetWidthPx,
          assetHeightPx,
        });

        expect(geometry).not.toBeNull();
        expect(
          overflowsContainer(geometry!, containerWidthPx, containerHeightPx),
        ).toBe(false);
      }
    }
  });

  test("preserves the asset's aspect ratio at every container size", () => {
    for (const [containerWidthPx, containerHeightPx] of CONTAINER_SIZES) {
      for (const [assetWidthPx, assetHeightPx] of ASSET_SIZES) {
        const geometry = resolveAssetGeometry({
          containerWidthPx,
          containerHeightPx,
          assetWidthPx,
          assetHeightPx,
        })!;

        expect(geometry.widthPx / geometry.heightPx).toBeCloseTo(
          assetWidthPx / assetHeightPx,
          9,
        );
      }
    }
  });

  test("never mirrors: the scale factor is positive and shared by both axes", () => {
    for (const [containerWidthPx, containerHeightPx] of CONTAINER_SIZES) {
      for (const [assetWidthPx, assetHeightPx] of ASSET_SIZES) {
        const geometry = resolveAssetGeometry({
          containerWidthPx,
          containerHeightPx,
          assetWidthPx,
          assetHeightPx,
        })!;

        expect(geometry.scale).toBeGreaterThan(0);
        expect(geometry.widthPx / assetWidthPx).toBeCloseTo(geometry.scale, 9);
        expect(geometry.heightPx / assetHeightPx).toBeCloseTo(geometry.scale, 9);
        expect(geometry.mirrored).toBe(false);
        expect(geometry.cropped).toBe(false);
      }
    }
  });

  test("letterboxes rather than filling when the aspect ratios disagree", () => {
    // A 16:9 asset in a square container: "cover" would fill the square by
    // pushing the left and right of the frame — where the hands are — outside
    // it. Letterboxing is the only honest option.
    const geometry = resolveAssetGeometry({
      containerWidthPx: 600,
      containerHeightPx: 600,
      assetWidthPx: 1920,
      assetHeightPx: 1080,
    })!;

    expect(geometry.widthPx).toBeCloseTo(600, 9);
    expect(geometry.heightPx).toBeCloseTo(337.5, 9);
    expect(geometry.offsetXPx).toBeCloseTo(0, 9);
    expect(geometry.offsetYPx).toBeCloseTo(131.25, 9);
  });

  test("centres the asset so no single edge is favoured", () => {
    const geometry = resolveAssetGeometry({
      containerWidthPx: 1000,
      containerHeightPx: 400,
      assetWidthPx: 400,
      assetHeightPx: 400,
    })!;

    expect(geometry.offsetXPx).toBeCloseTo(300, 9);
    expect(geometry.offsetYPx).toBeCloseTo(0, 9);
  });

  test("refuses to guess when a measurement is missing or nonsensical", () => {
    const unusable = [
      { containerWidthPx: 0, containerHeightPx: 100, assetWidthPx: 10, assetHeightPx: 10 },
      { containerWidthPx: 100, containerHeightPx: 0, assetWidthPx: 10, assetHeightPx: 10 },
      { containerWidthPx: 100, containerHeightPx: 100, assetWidthPx: 0, assetHeightPx: 10 },
      { containerWidthPx: 100, containerHeightPx: 100, assetWidthPx: 10, assetHeightPx: 0 },
      { containerWidthPx: -100, containerHeightPx: 100, assetWidthPx: 10, assetHeightPx: 10 },
      {
        containerWidthPx: Number.NaN,
        containerHeightPx: 100,
        assetWidthPx: 10,
        assetHeightPx: 10,
      },
      {
        containerWidthPx: Number.POSITIVE_INFINITY,
        containerHeightPx: 100,
        assetWidthPx: 10,
        assetHeightPx: 10,
      },
    ];

    for (const input of unusable) {
      expect(resolveAssetGeometry(input)).toBeNull();
    }
  });
});

describe("SIGN_SURFACE_STYLE", () => {
  test("is the only style the signing surface can carry, and it cannot crop or mirror", () => {
    expect(SIGN_SURFACE_STYLE.objectFit).toBe("contain");
    expect(SIGN_SURFACE_STYLE.objectPosition).toBe("center");
    expect(SIGN_SURFACE_STYLE.transform).toBe("none");
    expect(Object.isFrozen(SIGN_SURFACE_STYLE)).toBe(true);
  });
});

describe("overflowsContainer", () => {
  test("reports the crop it exists to catch", () => {
    // The "cover" geometry this module refuses to produce, asserted directly so
    // the invariant test above is known to be capable of failing.
    const cropped = {
      widthPx: 1066.67,
      heightPx: 600,
      offsetXPx: -233.33,
      offsetYPx: 0,
      scale: 0.5555,
      cropped: false,
      mirrored: false,
    } as const;

    expect(overflowsContainer(cropped, 600, 600)).toBe(true);
  });
});
