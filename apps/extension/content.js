(() => {
  "use strict";

  const ROOT_ID = "signbridge-local-overlay";
  if (document.getElementById(ROOT_ID) !== null) {
    return;
  }

  let media = null;
  let disposed = false;
  let lastPageUrl = location.href;

  const root = document.createElement("aside");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "SignBridge status");
  root.style.position = "fixed";
  root.style.insetBlockStart = "16px";
  root.style.insetInlineEnd = "16px";
  root.style.zIndex = "2147483647";
  root.style.boxSizing = "border-box";
  root.style.maxWidth = "min(360px, calc(100vw - 32px))";
  root.style.border = "2px solid currentColor";
  root.style.borderRadius = "10px";
  root.style.padding = "12px";
  root.style.color = "#ffffff";
  root.style.background = "#111827";
  root.style.font = "600 14px/1.4 system-ui, sans-serif";
  root.style.boxShadow = "0 6px 24px rgb(0 0 0 / 35%)";

  const message = document.createElement("p");
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.style.margin = "0";
  message.textContent =
    "No reviewed SignPack is loaded for this video. Source captions remain available.";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Dismiss SignBridge status";
  closeButton.style.minHeight = "44px";
  closeButton.style.marginBlockStart = "10px";
  closeButton.style.border = "2px solid currentColor";
  closeButton.style.borderRadius = "8px";
  closeButton.style.padding = "8px 10px";
  closeButton.style.color = "#111827";
  closeButton.style.background = "#ffffff";
  closeButton.style.font = "inherit";
  closeButton.style.cursor = "pointer";

  root.append(message, closeButton);
  document.documentElement.append(root);

  const mediaEvents = [
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
  ];

  function setMessage(text) {
    if (message.textContent !== text) {
      message.textContent = text;
    }
  }

  function renderMediaState() {
    if (disposed || media === null) {
      return;
    }

    try {
      void media.currentTime;
      void media.currentSrc;
      setMessage(
        "No reviewed SignPack is loaded for this video. Source captions remain available.",
      );
    } catch {
      setMessage(
        "The current video state is unavailable. Source captions remain available.",
      );
    }
  }

  function detachMedia() {
    if (media === null) {
      return;
    }
    for (const eventName of mediaEvents) {
      media.removeEventListener(eventName, renderMediaState);
    }
    media = null;
  }

  function bindCurrentMedia() {
    if (disposed) {
      return;
    }
    const nextMedia = document.querySelector("video");
    if (nextMedia === media) {
      renderMediaState();
      return;
    }

    detachMedia();
    if (nextMedia instanceof HTMLVideoElement) {
      media = nextMedia;
      for (const eventName of mediaEvents) {
        media.addEventListener(eventName, renderMediaState);
      }
      renderMediaState();
      return;
    }

    setMessage(
      "No video element is available. Source captions remain available.",
    );
  }

  function invalidateForNavigation() {
    detachMedia();
    setMessage(
      "The video changed. SignBridge is waiting for the new media source; source captions remain available.",
    );
  }

  function refreshPageState() {
    if (location.href !== lastPageUrl) {
      invalidateForNavigation();
      lastPageUrl = location.href;
    }
    bindCurrentMedia();
  }

  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;
    detachMedia();
    observer.disconnect();
    document.removeEventListener("yt-navigate-start", invalidateForNavigation);
    document.removeEventListener("yt-navigate-finish", refreshPageState);
    window.removeEventListener("popstate", refreshPageState);
    root.remove();
  }

  const observer = new MutationObserver(refreshPageState);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("yt-navigate-start", invalidateForNavigation);
  document.addEventListener("yt-navigate-finish", refreshPageState);
  window.addEventListener("popstate", refreshPageState);
  closeButton.addEventListener("click", dispose);
  bindCurrentMedia();
})();
