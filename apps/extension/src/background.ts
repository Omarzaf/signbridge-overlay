import { createIndexedDbCaptionPackStore } from "../../../packages/pack-storage/src/index";

const MESSAGE_PREFIX = "signbridge:";
const YOUTUBE_HOSTS = new Set(["www.youtube.com", "m.youtube.com"]);
const STATUS_CODES = new Set(["fallback", "integrity_failure", "waiting"]);
const store = createIndexedDbCaptionPackStore({
  databaseName: "signbridge-extension-caption-packs",
});

interface StatusMessage {
  readonly type: string;
  readonly code?: unknown;
  readonly reasonCode?: unknown;
  readonly tabId?: unknown;
}

interface MessageSender {
  readonly tab?: { readonly id?: number };
}

interface ChromeApi {
  readonly action: {
    readonly getBadgeText: (details: { readonly tabId: number }) => Promise<string>;
    readonly setBadgeBackgroundColor: (details: {
      readonly color: string;
      readonly tabId: number;
    }) => Promise<void>;
    readonly setBadgeText: (details: {
      readonly tabId: number;
      readonly text: string;
    }) => Promise<void>;
    readonly setTitle: (details: {
      readonly tabId: number;
      readonly title: string;
    }) => Promise<void>;
  };
  readonly permissions: {
    readonly contains: (details: { readonly origins: readonly string[] }) => Promise<boolean>;
  };
  readonly runtime: {
    readonly onMessage: {
      readonly addListener: (
        listener: (
          message: StatusMessage,
          sender: MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
  };
  readonly scripting: {
    readonly executeScript: (details: {
      readonly files: readonly string[];
      readonly target: { readonly tabId: number };
    }) => Promise<unknown>;
  };
  readonly tabs: {
    readonly onRemoved: {
      readonly addListener: (listener: (tabId: number) => void) => void;
    };
    readonly onUpdated: {
      readonly addListener: (
        listener: (
          tabId: number,
          changeInfo: { readonly status?: string; readonly url?: string },
          tab: { readonly url?: string },
        ) => void,
      ) => void;
    };
  };
}

const chromeApi = (globalThis as typeof globalThis & {
  readonly chrome: ChromeApi;
}).chrome;
const statusByTab = new Map<number, { readonly code: string; readonly reasonCode: string }>();

function badgeFor(code: string): { readonly color: string; readonly text: string } {
  if (code === "waiting") {
    return { color: "#92400e", text: "WAIT" };
  }
  if (code === "integrity_failure") {
    return { color: "#991b1b", text: "ERR" };
  }
  return { color: "#1e3a8a", text: "CAP" };
}

async function setStatus(
  tabId: number,
  code: string,
  reasonCode: string,
): Promise<void> {
  const badge = badgeFor(code);
  statusByTab.set(tabId, { code, reasonCode });
  await Promise.all([
    chromeApi.action.setBadgeText({ tabId, text: badge.text }),
    chromeApi.action.setBadgeBackgroundColor({ tabId, color: badge.color }),
    chromeApi.action.setTitle({
      tabId,
      title: `SignBridge: ${reasonCode}. Source captions remain available.`,
    }),
  ]);
}

async function readPackState(): Promise<unknown> {
  const result = await store.getActiveVerified();
  return result.ok
    ? { ok: true, manifest: result.value.manifest }
    : { ok: false, code: result.code };
}

interface PageTarget {
  readonly isYouTube: boolean;
  readonly originPattern: string;
}

function parsePageTarget(pageUrl: string | undefined): PageTarget | null {
  if (pageUrl === undefined) {
    return null;
  }
  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return {
      isYouTube: YOUTUBE_HOSTS.has(url.hostname),
      originPattern: `${url.origin}/*`,
    };
  } catch {
    return null;
  }
}

async function targetHasAccess(target: PageTarget): Promise<boolean> {
  return (
    target.isYouTube ||
    (await chromeApi.permissions.contains({
      origins: [target.originPattern],
    }))
  );
}

chromeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === `${MESSAGE_PREFIX}pack-state:get`) {
    void readPackState().then(sendResponse, () => {
      sendResponse({ ok: false, code: "storage_unavailable" });
    });
    return true;
  }

  if (message.type === `${MESSAGE_PREFIX}status:set`) {
    const tabId = sender.tab?.id;
    const code = message.code;
    const reasonCode = message.reasonCode;
    if (
      typeof tabId === "number" &&
      typeof code === "string" &&
      STATUS_CODES.has(code) &&
      typeof reasonCode === "string" &&
      reasonCode.length <= 80
    ) {
      void setStatus(tabId, code, reasonCode);
    }
    return;
  }

  if (message.type === `${MESSAGE_PREFIX}status:get`) {
    const tabId = message.tabId;
    if (typeof tabId !== "number") {
      sendResponse({ code: "waiting", reasonCode: "no_active_tab" });
      return;
    }
    const known = statusByTab.get(tabId);
    if (known !== undefined) {
      sendResponse(known);
      return;
    }
    void chromeApi.action.getBadgeText({ tabId }).then((text) => {
      sendResponse({
        code: text === "ERR" ? "integrity_failure" : text === "CAP" ? "fallback" : "waiting",
        reasonCode: text.length === 0 ? "not_sampled" : "browser_badge_state",
      });
    });
    return true;
  }
  return undefined;
});

chromeApi.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const target = parsePageTarget(changeInfo.url ?? tab.url);
  if (target === null) {
    return;
  }
  if (changeInfo.status === "loading") {
    void targetHasAccess(target)
      .then((hasAccess) =>
        hasAccess
          ? setStatus(tabId, "waiting", "navigation_started")
          : undefined,
      )
      .catch(() => undefined);
    return;
  }
  if (changeInfo.status !== "complete") {
    return;
  }
  if (target.isYouTube) {
    return;
  }
  void chromeApi.permissions
    .contains({ origins: [target.originPattern] })
    .then((granted) =>
      granted
        ? chromeApi.scripting.executeScript({
            target: { tabId },
            files: ["content.js"],
          })
        : undefined,
    )
    .catch(() => undefined);
});

chromeApi.tabs.onRemoved.addListener((tabId) => {
  statusByTab.delete(tabId);
});
