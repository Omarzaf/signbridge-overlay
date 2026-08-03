import type { PlaybackState } from "../../sync-engine/src/index";

/**
 * The renderer never runs a clock. It is told what the source media clock says
 * and moves the signing surface to match — see
 * `docs/decisions/0004-media-clock-is-authoritative.md`. Every function here is
 * a single correction applied to a single sample; there is no interval, no
 * requestAnimationFrame loop, and no accumulated elapsed time.
 */

/** Structural subset of HTMLVideoElement, so the DOM is not a test dependency. */
export interface TimelineSurface {
  currentTime: number;
  readonly paused: boolean;
  play: () => void | Promise<void>;
  pause: () => void;
}

/**
 * Below this, correcting the surface costs more than it buys: a seek restarts
 * decoding and shows as a visible stutter, which is worse for comprehension
 * than a few frames of offset.
 */
export const MAX_DRIFT_MS = 120;

export type TimelineAction = "seek" | "play" | "pause" | "hold";

export interface TimelineApplication {
  readonly actions: readonly TimelineAction[];
  readonly targetTimeMs: number | null;
  readonly driftMs: number | null;
}

function currentTimeMs(surface: TimelineSurface): number | null {
  const seconds = surface.currentTime;
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

function safePause(surface: TimelineSurface): void {
  try {
    if (!surface.paused) {
      surface.pause();
    }
  } catch {
    // A surface that refuses to pause must not take the overlay down with it.
  }
}

function safePlay(surface: TimelineSurface): void {
  try {
    const result = surface.play();
    // Autoplay rejection is expected and is not an error the viewer can act on.
    void Promise.resolve(result).catch(() => undefined);
  } catch {
    // Same reasoning as safePause.
  }
}

export interface ClockAlignment {
  /** Where the surface should be, in its own timeline. */
  readonly targetTimeMs: number;
  readonly shouldPlay: boolean;
}

export function pauseSurface(surface: TimelineSurface): TimelineApplication {
  safePause(surface);
  return Object.freeze({
    actions: Object.freeze<TimelineAction[]>(["pause"]),
    targetTimeMs: null,
    driftMs: null,
  });
}

/**
 * Moves any timeline-bearing surface to where one clock sample says it should
 * be. Shared by the signing layer and the synthetic motion surface so both obey
 * the same seek-and-hold rules; neither has a loop of its own to drift with.
 */
export function alignSurfaceToClock(
  surface: TimelineSurface,
  alignment: ClockAlignment,
): TimelineApplication {
  const targetTimeMs = alignment.targetTimeMs;
  if (!Number.isFinite(targetTimeMs) || targetTimeMs < 0) {
    return pauseSurface(surface);
  }

  const observedMs = currentTimeMs(surface);
  const actions: TimelineAction[] = [];

  if (observedMs === null) {
    surface.currentTime = targetTimeMs / 1000;
    actions.push("seek");
  } else if (Math.abs(observedMs - targetTimeMs) > MAX_DRIFT_MS) {
    surface.currentTime = targetTimeMs / 1000;
    actions.push("seek");
  }

  if (alignment.shouldPlay) {
    if (surface.paused) {
      safePlay(surface);
      actions.push("play");
    }
  } else if (!surface.paused) {
    safePause(surface);
    actions.push("pause");
  }

  if (actions.length === 0) {
    actions.push("hold");
  }

  return Object.freeze({
    actions: Object.freeze(actions),
    targetTimeMs,
    driftMs: observedMs === null ? null : observedMs - targetTimeMs,
  });
}

/**
 * Aligns the signing surface with one media-clock sample.
 *
 * Any state other than `active_sign` pauses the surface: if there is no
 * approved segment for this moment, motion on the signing layer would be
 * motion the viewer could mistake for signing.
 */
export function applyPlaybackToSurface(
  surface: TimelineSurface,
  state: PlaybackState,
): TimelineApplication {
  if (state.kind !== "active_sign") {
    return pauseSurface(surface);
  }

  return alignSurfaceToClock(surface, {
    targetTimeMs: state.assetTimeMs,
    shouldPlay: state.shouldPlay,
  });
}
