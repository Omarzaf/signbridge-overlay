import {
  alignSurfaceToClock,
  applySurfaceGeometry,
  pauseSurface,
  resolveAssetGeometry,
  type TimelineSurface,
} from "../../../packages/sign-renderer/src/index";

/**
 * The abstract motion test surface.
 *
 * This is not the signing layer and must never be presented as one. No reviewed
 * signing media exists in this repository, so there is nothing to sign with.
 * What plays here is geometry emitted by `tools/generate-synthetic-motion.mjs`,
 * and it exists to prove one thing: that a surface can be driven frame-exactly
 * from the source video's media clock, seeking and pausing with it, without
 * cropping or mirroring. Everything the viewer sees says so in words.
 */

const CLIP_BASENAME = "synthetic-test-only.motion";

export type MotionSurfaceStatus =
  | "not_generated"
  | "reduced_motion_held"
  | "hidden"
  | "following_source"
  | "held_with_source";

export interface MotionManifest {
  readonly durationMs: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface SourceClockSample {
  readonly currentTimeMs: number;
  readonly paused: boolean;
  readonly seeking: boolean;
}

export interface MotionSurfaceState {
  readonly status: MotionSurfaceStatus;
  readonly headline: string;
  readonly detail: string;
}

const STATE_TEXT: Record<MotionSurfaceStatus, MotionSurfaceState> = {
  not_generated: {
    status: "not_generated",
    headline: "No motion clip is present.",
    detail:
      "Run the build to generate it. Nothing is drawn here in the meantime — an empty box is more honest than a placeholder.",
  },
  reduced_motion_held: {
    status: "reduced_motion_held",
    headline: "Motion is held still for reduced-motion preferences.",
    detail:
      "Your system asks for reduced motion, so the clip is paused on its first frame. Start it with the control below if you want it.",
  },
  hidden: {
    status: "hidden",
    headline: "The motion surface is hidden.",
    detail: "Nothing is drawn over the video. Restore it with the control below.",
  },
  following_source: {
    status: "following_source",
    headline: "Abstract motion is following the source video's clock.",
    detail:
      "Geometry only. This is not American Sign Language, not any signed language, and depicts no person.",
  },
  held_with_source: {
    status: "held_with_source",
    headline: "Abstract motion is paused with the source video.",
    detail:
      "The surface takes its position from the video's clock, so it stops and seeks exactly where the video does.",
  },
};

export interface SyntheticMotionSurface {
  readonly load: () => Promise<MotionSurfaceState>;
  readonly sync: (sample: SourceClockSample) => MotionSurfaceState;
  readonly setVisible: (visible: boolean) => MotionSurfaceState;
  readonly setMotionAllowed: (allowed: boolean) => MotionSurfaceState;
  readonly isVisible: () => boolean;
  readonly isMotionAllowed: () => boolean;
  readonly dispose: () => void;
}

/**
 * Adapts the SVG document timeline to the renderer's surface contract.
 * `setCurrentTime` and `pauseAnimations` are the reason this clip is SVG rather
 * than an encoded video: they make the clip seekable to the millisecond from
 * whatever the source video reports.
 */
function svgTimelineSurface(svg: SVGSVGElement): TimelineSurface {
  return {
    get currentTime(): number {
      return svg.getCurrentTime();
    },
    set currentTime(seconds: number) {
      svg.setCurrentTime(seconds);
    },
    get paused(): boolean {
      return svg.animationsPaused();
    },
    play: (): void => {
      svg.unpauseAnimations();
    },
    pause: (): void => {
      svg.pauseAnimations();
    },
  };
}

function readManifest(value: unknown): MotionManifest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const durationMs = record["durationMs"];
  const viewBox = record["viewBox"];
  if (typeof durationMs !== "number" || durationMs <= 0) {
    return null;
  }
  if (typeof viewBox !== "object" || viewBox === null) {
    return null;
  }
  const box = viewBox as Record<string, unknown>;
  const widthPx = box["width"];
  const heightPx = box["height"];
  if (
    typeof widthPx !== "number" ||
    typeof heightPx !== "number" ||
    widthPx <= 0 ||
    heightPx <= 0
  ) {
    return null;
  }
  return { durationMs, widthPx, heightPx };
}

function prefersReducedMotion(view: Window): boolean {
  try {
    return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function createSyntheticMotionSurface(
  root: HTMLElement,
): SyntheticMotionSurface {
  const ownerDocument = root.ownerDocument;
  const view = ownerDocument.defaultView;

  let manifest: MotionManifest | null = null;
  let svg: SVGSVGElement | null = null;
  let surface: TimelineSurface | null = null;
  let visible = true;
  let motionAllowed = view === null ? true : !prefersReducedMotion(view);

  const currentState = (status: MotionSurfaceStatus): MotionSurfaceState =>
    STATE_TEXT[status];

  const resize = (): void => {
    if (svg === null || manifest === null) {
      return;
    }
    // getBoundingClientRect, not clientWidth/clientHeight: the latter are
    // rounded to whole pixels, and rounding *up* hands the geometry a container
    // slightly larger than the real one, which puts a sliver of the surface
    // outside it. A fraction of a pixel is not a meaningful crop here, but the
    // signing layer must not be built on a measurement that can overflow at all.
    const bounds = root.getBoundingClientRect();
    const geometry = resolveAssetGeometry({
      containerWidthPx: bounds.width,
      containerHeightPx: bounds.height,
      assetWidthPx: manifest.widthPx,
      assetHeightPx: manifest.heightPx,
    });
    // Same letterboxing rule as the signing layer. The clip is abstract, but
    // the surface must not learn a habit the signing layer cannot have.
    applySurfaceGeometry(svg, visible ? geometry : null);
  };

  const load = async (): Promise<MotionSurfaceState> => {
    try {
      const base = ownerDocument.baseURI;
      const [manifestResponse, clipResponse] = await Promise.all([
        fetch(new URL(`${CLIP_BASENAME}.json`, base)),
        fetch(new URL(`${CLIP_BASENAME}.svg`, base)),
      ]);
      if (!manifestResponse.ok || !clipResponse.ok) {
        return currentState("not_generated");
      }

      const parsedManifest = readManifest(await manifestResponse.json());
      if (parsedManifest === null) {
        return currentState("not_generated");
      }

      const parsed = new DOMParser().parseFromString(
        await clipResponse.text(),
        "image/svg+xml",
      );
      // A parse failure yields a document rooted at <parsererror>, so the
      // instanceof check is the whole validation: anything that is not an SVG
      // root is treated as "no clip" rather than injected.
      const imported: unknown = ownerDocument.importNode(
        parsed.documentElement,
        true,
      );
      if (!(imported instanceof SVGSVGElement)) {
        return currentState("not_generated");
      }

      manifest = parsedManifest;
      svg = imported;
      svg.setAttribute("aria-hidden", "true");
      svg.style.setProperty("position", "absolute");
      root.append(svg);
      surface = svgTimelineSurface(svg);
      pauseSurface(surface);
      resize();
      return currentState(motionAllowed ? "held_with_source" : "reduced_motion_held");
    } catch {
      return currentState("not_generated");
    }
  };

  const sync = (sample: SourceClockSample): MotionSurfaceState => {
    if (surface === null || manifest === null) {
      return currentState("not_generated");
    }
    if (!visible) {
      pauseSurface(surface);
      return currentState("hidden");
    }
    if (!motionAllowed) {
      pauseSurface(surface);
      return currentState("reduced_motion_held");
    }

    resize();
    const shouldPlay = !sample.paused && !sample.seeking;
    // The clip is shorter than the video, so it repeats. Taking the modulus of
    // the source clock rather than counting laps keeps the surface derived from
    // the video's time and nothing else.
    const targetTimeMs = Number.isFinite(sample.currentTimeMs)
      ? ((sample.currentTimeMs % manifest.durationMs) + manifest.durationMs) %
        manifest.durationMs
      : Number.NaN;

    alignSurfaceToClock(surface, { targetTimeMs, shouldPlay });
    return currentState(shouldPlay ? "following_source" : "held_with_source");
  };

  const setVisible = (next: boolean): MotionSurfaceState => {
    visible = next;
    if (surface !== null && !next) {
      pauseSurface(surface);
    }
    resize();
    if (surface === null) {
      return currentState("not_generated");
    }
    return currentState(next ? "held_with_source" : "hidden");
  };

  const setMotionAllowed = (next: boolean): MotionSurfaceState => {
    motionAllowed = next;
    if (surface !== null && !next) {
      pauseSurface(surface);
    }
    if (surface === null) {
      return currentState("not_generated");
    }
    if (!visible) {
      return currentState("hidden");
    }
    return currentState(next ? "held_with_source" : "reduced_motion_held");
  };

  return Object.freeze({
    load,
    sync,
    setVisible,
    setMotionAllowed,
    isVisible: (): boolean => visible,
    isMotionAllowed: (): boolean => motionAllowed,
    dispose: (): void => {
      svg?.remove();
      svg = null;
      surface = null;
      manifest = null;
    },
  });
}
