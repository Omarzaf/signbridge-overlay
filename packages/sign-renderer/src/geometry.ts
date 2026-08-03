/**
 * Geometry for the signing surface.
 *
 * `docs/linguistic-safety.md` prohibits cropping or mirroring hands, face,
 * torso, or required nonmanual grammar. Those are not stylistic preferences:
 * a mirrored sign can be a different sign, and a crop can remove the grammar
 * that carries the meaning. This module is the only place that decides how the
 * surface is sized, and it can only produce a letterboxed, unmirrored box.
 */

export interface AssetGeometryInput {
  readonly containerWidthPx: number;
  readonly containerHeightPx: number;
  readonly assetWidthPx: number;
  readonly assetHeightPx: number;
}

export interface AssetGeometry {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly offsetXPx: number;
  readonly offsetYPx: number;
  readonly scale: number;
  readonly cropped: false;
  readonly mirrored: false;
}

/**
 * The exact style the signing surface is allowed to carry. `contain` is the
 * only object-fit that cannot crop; `none` is the only transform that cannot
 * mirror. Exported as a frozen constant so a test can assert the values that
 * are actually applied to the element, not a paraphrase of them.
 */
export const SIGN_SURFACE_STYLE = Object.freeze({
  objectFit: "contain",
  objectPosition: "center",
  transform: "none",
});

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Returns null rather than guessing when the measurements are unusable. A
 * caller that cannot place the surface honestly must fall back to captions;
 * it must never render a box of invented size.
 */
export function resolveAssetGeometry(
  input: AssetGeometryInput,
): AssetGeometry | null {
  const {
    containerWidthPx,
    containerHeightPx,
    assetWidthPx,
    assetHeightPx,
  } = input;

  if (
    !isPositiveFinite(containerWidthPx) ||
    !isPositiveFinite(containerHeightPx) ||
    !isPositiveFinite(assetWidthPx) ||
    !isPositiveFinite(assetHeightPx)
  ) {
    return null;
  }

  // min(), never max(): max() is the "cover" strategy, which fills the
  // container by pushing the rest of the frame outside it. That is a crop.
  const scale = Math.min(
    containerWidthPx / assetWidthPx,
    containerHeightPx / assetHeightPx,
  );
  if (!isPositiveFinite(scale)) {
    return null;
  }

  const widthPx = assetWidthPx * scale;
  const heightPx = assetHeightPx * scale;

  return Object.freeze({
    widthPx,
    heightPx,
    // Non-negative by construction: the scaled box is never larger than the
    // container on either axis, so centring it can only produce letterboxing.
    offsetXPx: (containerWidthPx - widthPx) / 2,
    offsetYPx: (containerHeightPx - heightPx) / 2,
    scale,
    cropped: false,
    mirrored: false,
  });
}

/**
 * True when any part of the scaled asset would fall outside the container.
 * Used by tests to state the invariant directly rather than restating the
 * arithmetic above.
 */
export function overflowsContainer(
  geometry: AssetGeometry,
  containerWidthPx: number,
  containerHeightPx: number,
): boolean {
  const tolerancePx = 1e-9;
  return (
    geometry.offsetXPx < -tolerancePx ||
    geometry.offsetYPx < -tolerancePx ||
    geometry.widthPx - containerWidthPx > tolerancePx ||
    geometry.heightPx - containerHeightPx > tolerancePx
  );
}
