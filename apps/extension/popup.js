(() => {
  "use strict";

  const YOUTUBE_HOSTS = new Set(["www.youtube.com", "m.youtube.com"]);
  const summary = document.querySelector("#site-summary");
  const grantPanel = document.querySelector("#grant-panel");
  const originLabel = document.querySelector("#site-origin");
  const grantButton = document.querySelector("#grant-site");
  const status = document.querySelector("#status");

  let activeTabId = null;
  let requestedOrigin = null;

  function setStatus(message) {
    if (status instanceof HTMLElement) {
      status.textContent = message;
    }
  }

  function parseGrantTarget(tab) {
    if (
      typeof tab.id !== "number" ||
      typeof tab.url !== "string" ||
      tab.url.length === 0
    ) {
      return null;
    }

    try {
      const url = new URL(tab.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
      return {
        tabId: tab.id,
        hostname: url.hostname,
        origin: url.origin,
        originPattern: `${url.origin}/*`,
      };
    } catch {
      return null;
    }
  }

  async function showCurrentSite() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab === undefined) {
      setStatus("No active browser tab is available.");
      return;
    }

    const target = parseGrantTarget(tab);
    if (target === null) {
      setStatus("This browser page cannot receive extension access.");
      return;
    }

    if (YOUTUBE_HOSTS.has(target.hostname)) {
      if (summary instanceof HTMLElement) {
        summary.textContent =
          "The local overlay is enabled on this supported YouTube page.";
      }
      setStatus("No additional site permission is needed.");
      return;
    }

    activeTabId = target.tabId;
    requestedOrigin = target.originPattern;
    if (originLabel instanceof HTMLElement) {
      originLabel.textContent = target.origin;
    }
    if (grantPanel instanceof HTMLElement) {
      grantPanel.hidden = false;
    }

    const alreadyGranted = await chrome.permissions.contains({
      origins: [target.originPattern],
    });
    if (alreadyGranted) {
      setStatus("This site is already allowed.");
    }
  }

  async function requestCurrentSite() {
    if (activeTabId === null || requestedOrigin === null) {
      setStatus("No eligible site is selected.");
      return;
    }

    if (grantButton instanceof HTMLButtonElement) {
      grantButton.disabled = true;
    }

    try {
      const granted = await chrome.permissions.request({
        origins: [requestedOrigin],
      });
      if (!granted) {
        setStatus("Site access was not granted. Nothing was injected.");
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ["content.js"],
      });
      setStatus("Site access granted and the local overlay loaded.");
    } catch {
      setStatus("Chrome could not grant access to this site.");
    } finally {
      if (grantButton instanceof HTMLButtonElement) {
        grantButton.disabled = false;
      }
    }
  }

  grantButton?.addEventListener("click", () => {
    void requestCurrentSite();
  });

  void showCurrentSite().catch(() => {
    setStatus("The current site could not be inspected.");
  });
})();
