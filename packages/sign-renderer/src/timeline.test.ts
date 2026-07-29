import { describe, expect, test, vi } from "vitest";

import type { PlaybackState } from "../../sync-engine/src/index";
import {
  MAX_DRIFT_MS,
  applyPlaybackToSurface,
  type TimelineSurface,
} from "./timeline";

interface FakeSurface extends TimelineSurface {
  paused: boolean;
}

function fakeSurface(
  overrides: Partial<Pick<FakeSurface, "currentTime" | "paused">> = {},
): FakeSurface {
  const surface: FakeSurface = {
    currentTime: overrides.currentTime ?? 0,
    paused: overrides.paused ?? true,
    play: vi.fn(() => {
      surface.paused = false;
    }),
    pause: vi.fn(() => {
      surface.paused = true;
    }),
  };
  return surface;
}

function activeState(
  overrides: Partial<
    Pick<
      Extract<PlaybackState, { readonly kind: "active_sign" }>,
      "assetTimeMs" | "shouldPlay" | "paused" | "seeking"
    >
  > = {},
): PlaybackState {
  return {
    kind: "active_sign",
    segmentId: "seg_synthetic000001",
    asset: {
      assetId: "ast_synthetic000001",
      path: "assets/synthetic.webm",
      sha256: "a".repeat(64),
      mediaType: "video/webm",
      durationMs: 4_000,
    },
    mediaTimeMs: 5_000,
    assetTimeMs: overrides.assetTimeMs ?? 1_000,
    paused: overrides.paused ?? false,
    seeking: overrides.seeking ?? false,
    shouldPlay: overrides.shouldPlay ?? true,
    captionFallback: {
      language: "en",
      text: "Synthetic caption fallback; no reviewed sign mapping exists.",
    },
    preserveSourceCaptions: true,
  };
}

describe("applyPlaybackToSurface", () => {
  test("takes its position from the media clock, not from its own elapsed time", () => {
    const surface = fakeSurface({ currentTime: 0, paused: false });

    applyPlaybackToSurface(surface, activeState({ assetTimeMs: 2_500 }));

    expect(surface.currentTime).toBeCloseTo(2.5, 9);
  });

  test("leaves small drift alone rather than stuttering the surface", () => {
    const surface = fakeSurface({
      currentTime: (1_000 + MAX_DRIFT_MS - 1) / 1000,
      paused: false,
    });

    const application = applyPlaybackToSurface(
      surface,
      activeState({ assetTimeMs: 1_000 }),
    );

    expect(application.actions).toEqual(["hold"]);
    expect(surface.currentTime).toBeCloseTo((1_000 + MAX_DRIFT_MS - 1) / 1000, 9);
  });

  test("corrects drift once it passes the threshold", () => {
    const surface = fakeSurface({
      currentTime: (1_000 + MAX_DRIFT_MS + 1) / 1000,
      paused: false,
    });

    const application = applyPlaybackToSurface(
      surface,
      activeState({ assetTimeMs: 1_000 }),
    );

    expect(application.actions).toContain("seek");
    expect(surface.currentTime).toBeCloseTo(1, 9);
  });

  test("recovers when the surface reports an unusable time", () => {
    const surface = fakeSurface({ currentTime: Number.NaN, paused: false });

    const application = applyPlaybackToSurface(
      surface,
      activeState({ assetTimeMs: 3_000 }),
    );

    expect(application.actions).toContain("seek");
    expect(application.driftMs).toBeNull();
    expect(surface.currentTime).toBeCloseTo(3, 9);
  });

  test("holds the surface still while the source is seeking", () => {
    const surface = fakeSurface({ currentTime: 1, paused: false });

    applyPlaybackToSurface(
      surface,
      activeState({ assetTimeMs: 1_000, seeking: true, shouldPlay: false }),
    );

    expect(surface.pause).toHaveBeenCalledOnce();
    expect(surface.paused).toBe(true);
  });

  test("starts the surface only when the source is genuinely playing", () => {
    const surface = fakeSurface({ currentTime: 1, paused: true });

    applyPlaybackToSurface(surface, activeState({ assetTimeMs: 1_000 }));

    expect(surface.play).toHaveBeenCalledOnce();
    expect(surface.paused).toBe(false);
  });

  test("pauses on every state that is not approved signing", () => {
    const reasons = ["not_published", "gap", "withdrawn_asset"] as const;

    for (const reason of reasons) {
      const surface = fakeSurface({ currentTime: 1, paused: false });

      const application = applyPlaybackToSurface(surface, {
        kind: "caption_fallback",
        reason,
        mediaTimeMs: 1_000,
        preserveSourceCaptions: true,
      });

      expect(application.actions).toEqual(["pause"]);
      expect(application.targetTimeMs).toBeNull();
      expect(surface.paused).toBe(true);
    }
  });

  test("survives a surface that rejects playback", () => {
    const surface: FakeSurface = {
      currentTime: 1,
      paused: true,
      play: vi.fn(() => Promise.reject(new Error("autoplay blocked"))),
      pause: vi.fn(),
    };

    expect(() =>
      applyPlaybackToSurface(surface, activeState({ assetTimeMs: 1_000 })),
    ).not.toThrow();
  });
});
