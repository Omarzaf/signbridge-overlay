import { describe, expect, test } from "vitest";

import { describePlaybackState } from "../../apps/pwa/src/accessibleFallbackOverlay";
import type { PlaybackState } from "../../packages/sync-engine/src/index";

describe("describePlaybackState", () => {
  test("makes a blocked synthetic draft explicit", () => {
    const state: PlaybackState = {
      kind: "caption_fallback",
      reason: "not_published",
      mediaTimeMs: 0,
      preserveSourceCaptions: true,
    };

    expect(describePlaybackState(state)).toEqual({
      statusText: "Signing is unavailable for this synthetic draft.",
      fallbackText: "Source captions remain independently available.",
      reason: "not_published",
    });
  });

  test("preserves a reviewed caption fallback when one is supplied", () => {
    const state: PlaybackState = {
      kind: "caption_fallback",
      reason: "unsupported_segment",
      mediaTimeMs: 500,
      segmentId: "seg_synthetic000001",
      captionFallback: {
        language: "en",
        text: "Synthetic caption fallback; no reviewed sign mapping exists.",
      },
      preserveSourceCaptions: true,
    };

    expect(describePlaybackState(state)).toMatchObject({
      statusText: "Signing is unavailable. Source captions remain available.",
      fallbackText:
        "Synthetic caption fallback; no reviewed sign mapping exists.",
      reason: "unsupported_segment",
    });
  });
});
