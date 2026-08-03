import type {
  PlaybackFallbackReason,
  PlaybackState,
} from "../../sync-engine/src/index";

/**
 * What the viewer is actually looking at. `sign_asset` is the only surface
 * permitted to show reviewed signing media; every other outcome is a caption
 * fallback with an explicit reason. There is deliberately no third state, so
 * "blank" is not representable.
 */
export type RendererSurface = "sign_asset" | "caption_fallback";

export interface RendererPresentation {
  readonly surface: RendererSurface;
  readonly reasonCode: string;
  /**
   * One short line for the overlay's live region. The wording is part of the
   * shell's published behaviour and is asserted by the PWA tests.
   */
  readonly summary: string;
  /** Why this state happened, in language a viewer can act on. Never empty. */
  readonly detail: string;
  readonly captionText: string;
  readonly captionsIndependentlyAvailable: true;
}

export const CAPTIONS_ALWAYS_AVAILABLE =
  "Source captions remain independently available.";

/**
 * `Record<PlaybackFallbackReason, string>` rather than a switch: if the sync
 * engine ever adds a reason code, this file stops compiling instead of quietly
 * rendering an empty explanation.
 */
const FALLBACK_DETAIL: Record<PlaybackFallbackReason, string> = {
  invalid_manifest:
    "This pack's manifest could not be read, so no sign segment can be trusted.",
  not_published:
    "This pack is an unpublished draft. Nothing in it has been approved for playback.",
  unverified_manifest:
    "This pack's manifest failed its integrity check and was not interpreted.",
  corrupt_manifest:
    "This pack's manifest is corrupt and was not interpreted.",
  incompatible_runtime:
    "This pack requires a newer viewer than the one you are running.",
  invalid_clock:
    "The source video is not reporting a usable playback time, so nothing can be synchronised to it.",
  source_mismatch:
    "The video playing is not the video this pack was reviewed against.",
  gap: "No sign segment covers this moment of the video.",
  unsupported_segment:
    "The reviewer marked this segment unsupported. No sign has been invented for it.",
  missing_asset: "The reviewed media for this segment is not available offline.",
  withdrawn_asset:
    "The reviewed media for this segment has been withdrawn and must not be shown.",
  corrupt_asset:
    "The reviewed media for this segment failed its integrity check.",
  incompatible_segment:
    "This segment is not in a state that permits playback of reviewed signing.",
  unapproved_playback_rate:
    "Signing is shown at normal speed only. Speed changes have not been reviewed for comprehensibility.",
};

const ACTIVE_SUMMARY = "Reviewed signing media is playing.";
const DRAFT_SUMMARY = "Signing is unavailable for this synthetic draft.";
const GENERAL_SUMMARY = "Signing is unavailable. Source captions remain available.";

export const FALLBACK_REASON_CODES = Object.freeze(
  Object.keys(FALLBACK_DETAIL).sort(),
) as readonly string[];

/**
 * Maps any playback state onto something readable. Every branch produces a
 * non-empty summary, detail, and caption line, which is what "never blank"
 * means in practice: there is no input for which the viewer sees nothing.
 */
export function describeRendererState(
  state: PlaybackState,
): RendererPresentation {
  if (state.kind === "active_sign") {
    return Object.freeze({
      surface: "sign_asset",
      reasonCode: "active_sign",
      summary: ACTIVE_SUMMARY,
      detail:
        "Reviewed signing media for this segment is following the source video's clock.",
      captionText: state.captionFallback.text,
      captionsIndependentlyAvailable: true,
    });
  }

  return Object.freeze({
    surface: "caption_fallback",
    reasonCode: state.reason,
    summary: state.reason === "not_published" ? DRAFT_SUMMARY : GENERAL_SUMMARY,
    detail: FALLBACK_DETAIL[state.reason],
    captionText: state.captionFallback?.text ?? CAPTIONS_ALWAYS_AVAILABLE,
    captionsIndependentlyAvailable: true,
  });
}
