import { describe, expect, test } from "vitest";

import type {
  PlaybackFallbackReason,
  PlaybackState,
} from "../../sync-engine/src/index";
import {
  CAPTIONS_ALWAYS_AVAILABLE,
  describeRendererState,
} from "./presentation";

/**
 * Written out rather than derived, so adding a reason code to the sync engine
 * fails here as well as in the type checker. A list generated from the
 * implementation would agree with any mistake the implementation made.
 */
const EVERY_FALLBACK_REASON: readonly PlaybackFallbackReason[] = [
  "invalid_manifest",
  "not_published",
  "unverified_manifest",
  "corrupt_manifest",
  "incompatible_runtime",
  "invalid_clock",
  "source_mismatch",
  "gap",
  "unsupported_segment",
  "missing_asset",
  "withdrawn_asset",
  "corrupt_asset",
  "incompatible_segment",
  "unapproved_playback_rate",
];

function fallbackState(reason: PlaybackFallbackReason): PlaybackState {
  return {
    kind: "caption_fallback",
    reason,
    mediaTimeMs: 1_000,
    preserveSourceCaptions: true,
  };
}

describe("describeRendererState", () => {
  test("renders an explicit readable state for every fallback reason", () => {
    for (const reason of EVERY_FALLBACK_REASON) {
      const presentation = describeRendererState(fallbackState(reason));

      expect(presentation.surface).toBe("caption_fallback");
      expect(presentation.reasonCode).toBe(reason);
      expect(presentation.summary.trim().length).toBeGreaterThan(0);
      expect(presentation.detail.trim().length).toBeGreaterThan(0);
      expect(presentation.captionText.trim().length).toBeGreaterThan(0);
      expect(presentation.captionsIndependentlyAvailable).toBe(true);
    }
  });

  test("gives each reason its own explanation rather than one generic line", () => {
    const details = EVERY_FALLBACK_REASON.map(
      (reason) => describeRendererState(fallbackState(reason)).detail,
    );

    expect(new Set(details).size).toBe(EVERY_FALLBACK_REASON.length);
  });

  test("keeps the summary wording the playback shell publishes", () => {
    expect(describeRendererState(fallbackState("not_published")).summary).toBe(
      "Signing is unavailable for this synthetic draft.",
    );
    expect(
      describeRendererState(fallbackState("unsupported_segment")).summary,
    ).toBe("Signing is unavailable. Source captions remain available.");
  });

  test("falls back to the standing caption promise when a segment carries none", () => {
    expect(describeRendererState(fallbackState("gap")).captionText).toBe(
      CAPTIONS_ALWAYS_AVAILABLE,
    );
  });

  test("prefers the segment's own caption when the pack supplies one", () => {
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

    expect(describeRendererState(state).captionText).toBe(
      "Synthetic caption fallback; no reviewed sign mapping exists.",
    );
  });

  test("keeps captions available even while reviewed signing plays", () => {
    const state: PlaybackState = {
      kind: "active_sign",
      segmentId: "seg_synthetic000001",
      asset: {
        assetId: "ast_synthetic000001",
        path: "assets/synthetic.webm",
        sha256: "a".repeat(64),
        mediaType: "video/webm",
        durationMs: 2_000,
      },
      mediaTimeMs: 1_000,
      assetTimeMs: 0,
      paused: false,
      seeking: false,
      shouldPlay: true,
      captionFallback: {
        language: "en",
        text: "Synthetic caption fallback; no reviewed sign mapping exists.",
      },
      preserveSourceCaptions: true,
    };

    const presentation = describeRendererState(state);

    expect(presentation.surface).toBe("sign_asset");
    expect(presentation.captionsIndependentlyAvailable).toBe(true);
    expect(presentation.captionText.trim().length).toBeGreaterThan(0);
  });
});
