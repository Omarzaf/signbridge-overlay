import { createRuntimeController } from "../../../packages/runtime/src/index";
import {
  createSignSurface,
  describeRendererState,
} from "../../../packages/sign-renderer/src/index";
import {
  preparePlaybackModel,
  type MediaClockSnapshot,
  type PlaybackState,
} from "../../../packages/sync-engine/src/index";
import type { SignPack } from "../../../packages/signpack-schema/src/index";
import { createYouTubeVideoAdapter } from "../../../packages/video-adapters/src/index";

const ROOT_ID = "signbridge-local-overlay";
const MESSAGE_PREFIX = "signbridge:";

type BrowserStatusCode = "fallback" | "integrity_failure" | "waiting";

interface PackStateResponse {
  readonly ok: boolean;
  readonly code?: string;
  readonly manifest?: SignPack;
}

interface ExtensionRuntime {
  readonly sendMessage: (message: unknown) => Promise<unknown>;
}

function extensionRuntime(): ExtensionRuntime | null {
  const value = (globalThis as typeof globalThis & {
    readonly chrome?: { readonly runtime?: ExtensionRuntime };
  }).chrome?.runtime;
  return value ?? null;
}

async function sendMessage(message: unknown): Promise<unknown> {
  try {
    return await extensionRuntime()?.sendMessage(message);
  } catch {
    return null;
  }
}

function isPackStateResponse(value: unknown): value is PackStateResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record["ok"] === true
    ? typeof record["manifest"] === "object" && record["manifest"] !== null
    : record["ok"] === false && typeof record["code"] === "string";
}

function createBlockedModel(packState: PackStateResponse) {
  if (packState.ok && packState.manifest !== undefined) {
    return preparePlaybackModel({
      manifest: packState.manifest,
      manifestIntegrity: "verified",
      assetStates: {},
      runtimeVersion: "0.1.0",
    });
  }
  return preparePlaybackModel({
    manifest: null,
    manifestIntegrity:
      packState.code === "integrity_mismatch" ? "corrupt" : "unverified",
    assetStates: {},
    runtimeVersion: "0.1.0",
  });
}

async function boot(): Promise<void> {
  if (document.getElementById(ROOT_ID) !== null) {
    return;
  }

  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.dataset["contentBoundary"] = "synthetic-test-only";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    aside { position: fixed; inset: 16px 16px auto auto; z-index: 2147483647;
      box-sizing: border-box; max-width: min(380px, calc(100vw - 32px));
      border: 2px solid #f8fafc; border-radius: 10px; padding: 12px;
      color: #f8fafc; background: #111827; box-shadow: 0 6px 24px rgb(0 0 0 / 35%);
      font: 600 14px/1.45 system-ui, sans-serif; }
    strong { color: #fde68a; font-size: 11px; letter-spacing: .08em; }
    p { margin: 8px 0 0; }
    code { color: #bae6fd; }
    button { min-width: 44px; min-height: 44px; margin-top: 10px; border: 2px solid currentColor;
      border-radius: 8px; padding: 8px 10px; color: #111827; background: #fff;
      font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #fde68a; outline-offset: 3px; }
    .surface { position: absolute; inset: 0; pointer-events: none; }
  `;
  const aside = document.createElement("aside");
  aside.setAttribute("aria-label", "SignBridge status");
  const label = document.createElement("strong");
  label.textContent = "SYNTHETIC TEST ONLY";
  const summary = document.createElement("p");
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-live", "polite");
  summary.setAttribute("aria-atomic", "true");
  summary.textContent = "Checking extension-controlled local pack storage.";
  const detail = document.createElement("p");
  detail.textContent = "Source captions remain independently available.";
  const reason = document.createElement("code");
  reason.textContent = "State: checking_storage";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Dismiss page overlay";
  const surfaceRoot = document.createElement("div");
  surfaceRoot.className = "surface";
  aside.append(label, summary, detail, reason, dismiss, surfaceRoot);
  shadow.append(style, aside);

  let dismissed = false;
  const ensureAttached = (): void => {
    if (!dismissed && !host.isConnected) {
      document.documentElement.append(host);
    }
  };
  ensureAttached();
  const removalObserver = new MutationObserver(ensureAttached);
  removalObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  dismiss.addEventListener("click", () => {
    dismissed = true;
    host.remove();
  });

  const rawPackState = await sendMessage({
    type: `${MESSAGE_PREFIX}pack-state:get`,
  });
  const packState = isPackStateResponse(rawPackState)
    ? rawPackState
    : { ok: false, code: "storage_unavailable" };
  host.dataset["storage"] = packState.ok
    ? "verified-local"
    : (packState.code ?? "storage_unavailable");
  const controller = createRuntimeController(createBlockedModel(packState));
  const signSurface = createSignSurface(surfaceRoot);
  let sampleCount = 0;
  let lastPublishedStatus = "";
  let lastPresentation = "";

  const publishBrowserStatus = (
    code: BrowserStatusCode,
    reasonCode: string,
  ): void => {
    const statusKey = `${code}:${reasonCode}`;
    if (statusKey === lastPublishedStatus) {
      return;
    }
    lastPublishedStatus = statusKey;
    void sendMessage({
      type: `${MESSAGE_PREFIX}status:set`,
      code,
      reasonCode,
    });
  };

  const render = (state: PlaybackState): void => {
    const presentation = describeRendererState(state);
    const bounds = aside.getBoundingClientRect();
    signSurface.render(state, {
      widthPx: bounds.width,
      heightPx: bounds.height,
    });
    const presentationKey = `${state.kind}:${presentation.reasonCode}`;
    if (presentationKey === lastPresentation) {
      return;
    }
    lastPresentation = presentationKey;
    host.dataset["reason"] = presentation.reasonCode;
    host.dataset["callGraph"] = "storage>adapter>runtime>renderer";
    summary.textContent = presentation.summary;
    detail.textContent = presentation.detail;
    reason.textContent = `State: ${presentation.reasonCode}`;
    publishBrowserStatus(
      presentation.reasonCode === "corrupt_manifest"
        ? "integrity_failure"
        : "fallback",
      presentation.reasonCode,
    );
  };
  const unsubscribe = controller.subscribe(render);
  const adapter = createYouTubeVideoAdapter({
    page: document,
    controller: {
      sample: (snapshot: MediaClockSnapshot) => {
        sampleCount += 1;
        host.dataset["sampleCount"] = String(sampleCount);
        host.dataset["clockSampled"] = String(
          Number.isFinite(snapshot.currentTimeMs),
        );
        host.dataset["sourceSampled"] = String(
          snapshot.sourceFingerprint.length > 0,
        );
        const invalidated =
          snapshot.sourceFingerprint.length === 0 &&
          !Number.isFinite(snapshot.currentTimeMs);
        const state = controller.sample(snapshot);
        if (invalidated) {
          lastPresentation = "source_invalidated";
          host.dataset["mediaState"] = "invalidated";
          summary.textContent = "The video changed. Waiting for the new media source.";
          detail.textContent = "Source captions remain independently available.";
          reason.textContent = "State: source_invalidated";
          publishBrowserStatus("waiting", "source_invalidated");
        } else {
          host.dataset["mediaState"] = "sampled";
        }
        return state;
      },
    },
    resolveSourceFingerprint: ({ currentSrc }) => {
      host.dataset["sourceDescriptorSampled"] = String(currentSrc.length > 0);
      // YouTube exposes a page/blob locator, not authenticated source bytes.
      // Until the pack contract binds a trusted platform locator, returning no
      // fingerprint is the only safe choice and keeps signing disabled.
      return null;
    },
  });
  adapter.start();

  globalThis.addEventListener(
    "pagehide",
    () => {
      adapter.dispose();
      unsubscribe();
      controller.dispose();
      signSurface.dispose();
      removalObserver.disconnect();
      host.remove();
    },
    { once: true },
  );
}

void boot();
