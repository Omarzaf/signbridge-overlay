import type {
  MediaClockSnapshot,
  PlaybackState,
} from "../../sync-engine/src/index";

const MEDIA_LIFECYCLE_EVENTS = [
  "timeupdate",
  "play",
  "pause",
  "seeking",
  "seeked",
  "ratechange",
  "loadedmetadata",
  "durationchange",
  "emptied",
  "ended",
  "error",
] as const;

export interface PlaybackStateSampler {
  readonly sample: (snapshot: MediaClockSnapshot) => PlaybackState;
}

export interface Html5VideoAdapterOptions {
  readonly media: HTMLVideoElement;
  readonly controller: PlaybackStateSampler;
  readonly resolveSourceFingerprint: (currentSrc: string) => string | null;
}

export interface Html5VideoAdapter {
  readonly sampleNow: () => PlaybackState;
  readonly start: () => PlaybackState;
  readonly dispose: () => void;
}

function invalidSnapshot(): MediaClockSnapshot {
  return {
    sourceFingerprint: "",
    currentTimeMs: Number.NaN,
    paused: true,
    seeking: true,
    playbackRate: Number.NaN,
  };
}

function captureSnapshot(
  media: HTMLVideoElement,
  resolveSourceFingerprint: (currentSrc: string) => string | null,
): MediaClockSnapshot {
  try {
    const currentSrc = media.currentSrc;
    const sourceFingerprint = resolveSourceFingerprint(currentSrc);
    const currentTime = media.currentTime;
    const paused = media.paused;
    const seeking = media.seeking;
    const playbackRate = media.playbackRate;

    return {
      sourceFingerprint:
        typeof sourceFingerprint === "string" ? sourceFingerprint : "",
      currentTimeMs: currentTime * 1000,
      paused,
      seeking,
      playbackRate,
    };
  } catch {
    return invalidSnapshot();
  }
}

export function createHtml5VideoAdapter({
  media,
  controller,
  resolveSourceFingerprint,
}: Html5VideoAdapterOptions): Html5VideoAdapter {
  let started = false;
  let frameCallbackId: number | null = null;

  const sampleNow = (): PlaybackState =>
    controller.sample(captureSnapshot(media, resolveSourceFingerprint));

  const cancelFrameCallback = (): void => {
    if (frameCallbackId === null) {
      return;
    }
    const callbackId = frameCallbackId;
    frameCallbackId = null;
    try {
      if (typeof media.cancelVideoFrameCallback === "function") {
        media.cancelVideoFrameCallback(callbackId);
      }
    } catch {
      // Hostile page state cannot prevent adapter disposal.
    }
  };

  const handleVideoFrame = (): void => {
    frameCallbackId = null;
    sampleNow();
    scheduleFrameCallback();
  };

  const scheduleFrameCallback = (): void => {
    try {
      const requestVideoFrameCallback = media.requestVideoFrameCallback;
      if (
        !started ||
        media.paused ||
        frameCallbackId !== null ||
        typeof requestVideoFrameCallback !== "function"
      ) {
        return;
      }
      frameCallbackId = requestVideoFrameCallback.call(
        media,
        handleVideoFrame,
      );
    } catch {
      frameCallbackId = null;
    }
  };

  const handleLifecycleEvent = (event: Event): void => {
    sampleNow();
    if (
      event.type === "pause" ||
      event.type === "ended" ||
      event.type === "emptied" ||
      event.type === "error"
    ) {
      cancelFrameCallback();
      return;
    }
    scheduleFrameCallback();
  };

  const start = (): PlaybackState => {
    if (!started) {
      for (const eventName of MEDIA_LIFECYCLE_EVENTS) {
        media.addEventListener(eventName, handleLifecycleEvent);
      }
      started = true;
    }
    const state = sampleNow();
    scheduleFrameCallback();
    return state;
  };

  const dispose = (): void => {
    if (!started) {
      return;
    }
    for (const eventName of MEDIA_LIFECYCLE_EVENTS) {
      media.removeEventListener(eventName, handleLifecycleEvent);
    }
    cancelFrameCallback();
    started = false;
  };

  return Object.freeze({
    sampleNow,
    start,
    dispose,
  });
}
