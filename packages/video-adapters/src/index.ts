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

export interface YouTubeSourceDescriptor {
  readonly currentSrc: string;
  readonly pageUrl: string;
  readonly videoId: string | null;
}

export interface MutationSubscription {
  readonly disconnect: () => void;
}

export interface YouTubePage
  extends Pick<
    Document,
    "addEventListener" | "querySelector" | "removeEventListener"
  > {
  readonly documentElement: HTMLElement;
}

export interface YouTubeVideoAdapterOptions {
  readonly page: YouTubePage;
  readonly controller: PlaybackStateSampler;
  readonly resolveSourceFingerprint: (
    source: YouTubeSourceDescriptor,
  ) => string | null;
  readonly getPageUrl?: () => string;
  readonly navigationTarget?: EventTarget;
  readonly observeMutations?: (
    callback: () => void,
    root: HTMLElement,
  ) => MutationSubscription;
}

export interface YouTubeVideoAdapter {
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

function defaultPageUrl(): string {
  try {
    return globalThis.location.href;
  } catch {
    return "";
  }
}

function defaultMutationObserver(
  callback: () => void,
  root: HTMLElement,
): MutationSubscription {
  const observer = new MutationObserver(callback);
  observer.observe(root, {
    childList: true,
    subtree: true,
  });
  return observer;
}

function safePageUrl(getPageUrl: () => string): string {
  try {
    const pageUrl = getPageUrl();
    return typeof pageUrl === "string" ? pageUrl : "";
  } catch {
    return "";
  }
}

function findYouTubeMedia(page: YouTubePage): HTMLVideoElement | null {
  try {
    return page.querySelector("video");
  } catch {
    return null;
  }
}

export function extractYouTubeVideoId(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (
      url.protocol !== "https:" ||
      !/(?:^|\.)youtube\.com$/u.test(url.hostname)
    ) {
      return null;
    }

    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      return videoId === null || videoId.length === 0 ? null : videoId;
    }

    const pathMatch =
      /^\/(?:embed|live|shorts)\/([^/?#]+)/u.exec(url.pathname);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export function createYouTubeVideoAdapter({
  page,
  controller,
  resolveSourceFingerprint,
  getPageUrl = defaultPageUrl,
  navigationTarget = globalThis,
  observeMutations = defaultMutationObserver,
}: YouTubeVideoAdapterOptions): YouTubeVideoAdapter {
  let started = false;
  let disposed = false;
  let activeMedia: HTMLVideoElement | null = null;
  let activeAdapter: Html5VideoAdapter | null = null;
  let mutationSubscription: MutationSubscription | null = null;
  let lastPageUrl = safePageUrl(getPageUrl);
  let navigationInvalidated = false;
  let lastSourceIdentity: string | null = null;

  const invalidate = (): PlaybackState => {
    activeAdapter?.dispose();
    activeAdapter = null;
    activeMedia = null;
    navigationInvalidated = true;
    lastSourceIdentity = null;
    return controller.sample(invalidSnapshot());
  };

  const bindCurrentMedia = (): PlaybackState => {
    const media = findYouTubeMedia(page);
    if (media === null) {
      return invalidate();
    }

    if (media !== activeMedia || activeAdapter === null) {
      activeAdapter?.dispose();
      activeMedia = media;
      activeAdapter = createHtml5VideoAdapter({
        media,
        controller,
        resolveSourceFingerprint: (currentSrc) => {
          const pageUrl = safePageUrl(getPageUrl);
          const source = {
            currentSrc,
            pageUrl,
            videoId: extractYouTubeVideoId(pageUrl),
          };
          const sourceIdentity = JSON.stringify(source);
          if (
            lastSourceIdentity !== null &&
            sourceIdentity !== lastSourceIdentity
          ) {
            controller.sample(invalidSnapshot());
          }
          lastSourceIdentity = sourceIdentity;
          return resolveSourceFingerprint(source);
        },
      });
    }

    const state = activeAdapter.start();
    navigationInvalidated = false;
    return state;
  };

  const refreshAfterNavigation = (): PlaybackState => {
    if (!navigationInvalidated) {
      invalidate();
    }
    lastPageUrl = safePageUrl(getPageUrl);
    return bindCurrentMedia();
  };

  const handleNavigationStart = (): void => {
    invalidate();
  };

  const handleNavigationFinish = (): void => {
    refreshAfterNavigation();
  };

  const handleMutation = (): void => {
    const pageUrl = safePageUrl(getPageUrl);
    const media = findYouTubeMedia(page);
    if (pageUrl !== lastPageUrl || media !== activeMedia) {
      refreshAfterNavigation();
    }
  };

  const sampleNow = (): PlaybackState => {
    if (disposed) {
      return controller.sample(invalidSnapshot());
    }
    return activeAdapter?.sampleNow() ?? bindCurrentMedia();
  };

  const start = (): PlaybackState => {
    if (disposed) {
      return controller.sample(invalidSnapshot());
    }

    if (!started) {
      page.addEventListener("yt-navigate-start", handleNavigationStart);
      page.addEventListener("yt-navigate-finish", handleNavigationFinish);
      navigationTarget.addEventListener("popstate", handleNavigationFinish);
      try {
        mutationSubscription = observeMutations(
          handleMutation,
          page.documentElement,
        );
      } catch {
        mutationSubscription = null;
      }
      started = true;
    }

    lastPageUrl = safePageUrl(getPageUrl);
    return bindCurrentMedia();
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    if (started) {
      page.removeEventListener("yt-navigate-start", handleNavigationStart);
      page.removeEventListener("yt-navigate-finish", handleNavigationFinish);
      navigationTarget.removeEventListener("popstate", handleNavigationFinish);
      mutationSubscription?.disconnect();
      mutationSubscription = null;
      started = false;
    }
    activeAdapter?.dispose();
    activeAdapter = null;
    activeMedia = null;
  };

  return Object.freeze({
    sampleNow,
    start,
    dispose,
  });
}
