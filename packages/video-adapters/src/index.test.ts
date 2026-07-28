import { describe, expect, test, vi } from "vitest";

import type {
  MediaClockSnapshot,
  PlaybackState,
} from "../../sync-engine/src/index";
import { createHtml5VideoAdapter } from "./index";

const SOURCE_FINGERPRINT =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const REPLACEMENT_FINGERPRINT =
  "sha256:2222222222222222222222222222222222222222222222222222222222222222";

const FALLBACK_STATE: PlaybackState = Object.freeze({
  kind: "caption_fallback",
  reason: "gap",
  mediaTimeMs: 0,
  preserveSourceCaptions: true,
});

interface MutableMediaState {
  currentSrc: string;
  currentTime: number;
  paused: boolean;
  seeking: boolean;
  playbackRate: number;
}

function createMedia(): {
  readonly media: HTMLVideoElement;
  readonly state: MutableMediaState;
  readonly enableFrameCallbacks: () => {
    readonly flush: () => void;
    readonly request: ReturnType<typeof vi.fn>;
    readonly cancel: ReturnType<typeof vi.fn>;
  };
} {
  const target = new EventTarget();
  const state: MutableMediaState = {
    currentSrc: "blob:synthetic-source-one",
    currentTime: 0,
    paused: true,
    seeking: false,
    playbackRate: 1,
  };
  Object.defineProperties(target, {
    currentSrc: {
      configurable: true,
      get: (): string => state.currentSrc,
    },
    currentTime: {
      configurable: true,
      get: (): number => state.currentTime,
    },
    paused: {
      configurable: true,
      get: (): boolean => state.paused,
    },
    seeking: {
      configurable: true,
      get: (): boolean => state.seeking,
    },
    playbackRate: {
      configurable: true,
      get: (): number => state.playbackRate,
    },
  });
  const enableFrameCallbacks = (): {
    readonly flush: () => void;
    readonly request: ReturnType<typeof vi.fn>;
    readonly cancel: ReturnType<typeof vi.fn>;
  } => {
    let pendingCallback: VideoFrameRequestCallback | null = null;
    const request = vi.fn((callback: VideoFrameRequestCallback): number => {
      pendingCallback = callback;
      return 1;
    });
    const cancel = vi.fn((_handle: number): void => {
      pendingCallback = null;
    });
    Object.defineProperties(target, {
      requestVideoFrameCallback: {
        configurable: true,
        value: request,
      },
      cancelVideoFrameCallback: {
        configurable: true,
        value: cancel,
      },
    });
    return {
      flush: (): void => {
        const callback = pendingCallback;
        pendingCallback = null;
        callback?.(0, {} as VideoFrameCallbackMetadata);
      },
      request,
      cancel,
    };
  };
  return {
    media: target as HTMLVideoElement,
    state,
    enableFrameCallbacks,
  };
}

describe("createHtml5VideoAdapter", () => {
  test("samples the exact HTML media clock without rounding", () => {
    const { media, state } = createMedia();
    state.currentTime = 0.12525;
    state.paused = false;
    state.seeking = true;
    state.playbackRate = 1.25;
    const sample = vi.fn((_snapshot: MediaClockSnapshot) => FALLBACK_STATE);
    const adapter = createHtml5VideoAdapter({
      media,
      controller: { sample },
      resolveSourceFingerprint: () => SOURCE_FINGERPRINT,
    });

    expect(adapter.sampleNow()).toBe(FALLBACK_STATE);
    expect(sample).toHaveBeenCalledWith({
      sourceFingerprint: SOURCE_FINGERPRINT,
      currentTimeMs: 125.25,
      paused: false,
      seeking: true,
      playbackRate: 1.25,
    });
  });

  test("resamples lifecycle events with the current source fingerprint", () => {
    const { media, state } = createMedia();
    let sourceFingerprint = SOURCE_FINGERPRINT;
    const sourceUrls: string[] = [];
    const snapshots: MediaClockSnapshot[] = [];
    const adapter = createHtml5VideoAdapter({
      media,
      controller: {
        sample: (snapshot) => {
          snapshots.push(snapshot);
          return FALLBACK_STATE;
        },
      },
      resolveSourceFingerprint: (currentSrc) => {
        sourceUrls.push(currentSrc);
        return sourceFingerprint;
      },
    });

    adapter.start();
    state.currentTime = 1.75;
    state.paused = false;
    media.dispatchEvent(new Event("timeupdate"));
    sourceFingerprint = REPLACEMENT_FINGERPRINT;
    state.currentSrc = "blob:synthetic-source-two";
    state.currentTime = 0;
    state.paused = true;
    media.dispatchEvent(new Event("emptied"));

    expect(snapshots).toEqual([
      {
        sourceFingerprint: SOURCE_FINGERPRINT,
        currentTimeMs: 0,
        paused: true,
        seeking: false,
        playbackRate: 1,
      },
      {
        sourceFingerprint: SOURCE_FINGERPRINT,
        currentTimeMs: 1750,
        paused: false,
        seeking: false,
        playbackRate: 1,
      },
      {
        sourceFingerprint: REPLACEMENT_FINGERPRINT,
        currentTimeMs: 0,
        paused: true,
        seeking: false,
        playbackRate: 1,
      },
    ]);
    expect(sourceUrls).toEqual([
      "blob:synthetic-source-one",
      "blob:synthetic-source-one",
      "blob:synthetic-source-two",
    ]);
  });

  test("starts and disposes idempotently without an independent clock", () => {
    const { media } = createMedia();
    const sample = vi.fn((_snapshot: MediaClockSnapshot) => FALLBACK_STATE);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const intervalSpy = vi.spyOn(globalThis, "setInterval");
    const adapter = createHtml5VideoAdapter({
      media,
      controller: { sample },
      resolveSourceFingerprint: () => SOURCE_FINGERPRINT,
    });

    adapter.start();
    adapter.start();
    sample.mockClear();
    media.dispatchEvent(new Event("play"));
    expect(sample).toHaveBeenCalledTimes(1);

    adapter.dispose();
    adapter.dispose();
    media.dispatchEvent(new Event("pause"));
    expect(sample).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();

    timeoutSpy.mockRestore();
    intervalSpy.mockRestore();
  });

  test("uses and cancels media-driven frame callbacks", () => {
    const { media, state, enableFrameCallbacks } = createMedia();
    const frameCallbacks = enableFrameCallbacks();
    state.paused = false;
    const sample = vi.fn((_snapshot: MediaClockSnapshot) => FALLBACK_STATE);
    const adapter = createHtml5VideoAdapter({
      media,
      controller: { sample },
      resolveSourceFingerprint: () => SOURCE_FINGERPRINT,
    });

    adapter.start();
    expect(frameCallbacks.request).toHaveBeenCalledTimes(1);
    sample.mockClear();
    state.currentTime = 0.5;
    frameCallbacks.flush();
    expect(sample).toHaveBeenCalledTimes(1);
    expect(frameCallbacks.request).toHaveBeenCalledTimes(2);

    adapter.dispose();
    expect(frameCallbacks.cancel).toHaveBeenCalledWith(1);
  });

  test("turns hostile media reads into an invalid clock sample", () => {
    const media = new EventTarget();
    Object.defineProperty(media, "currentTime", {
      get(): never {
        throw new Error("hostile currentTime getter");
      },
    });
    const sample = vi.fn((_snapshot: MediaClockSnapshot) => FALLBACK_STATE);
    const adapter = createHtml5VideoAdapter({
      media: media as HTMLVideoElement,
      controller: { sample },
      resolveSourceFingerprint: () => SOURCE_FINGERPRINT,
    });

    expect(() => adapter.start()).not.toThrow();
    expect(sample).toHaveBeenCalledWith({
      sourceFingerprint: "",
      currentTimeMs: Number.NaN,
      paused: true,
      seeking: true,
      playbackRate: Number.NaN,
    });
    expect(() => adapter.dispose()).not.toThrow();
  });
});
