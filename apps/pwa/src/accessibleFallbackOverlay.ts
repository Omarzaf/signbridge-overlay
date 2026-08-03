import { describeRendererState } from "../../../packages/sign-renderer/src/index";
import type { PlaybackState } from "../../../packages/sync-engine/src/index";

export interface OverlayPresentation {
  readonly statusText: string;
  readonly fallbackText: string;
  readonly reason: string;
}

export interface AccessibleFallbackOverlay {
  readonly render: (state: PlaybackState) => void;
  readonly dispose: () => void;
}

/**
 * The overlay's summary line. Thin adapter over the renderer so the shell and
 * the renderer cannot drift into describing the same state two different ways.
 */
export function describePlaybackState(
  state: PlaybackState,
): OverlayPresentation {
  const presentation = describeRendererState(state);
  return {
    statusText: presentation.summary,
    fallbackText: presentation.captionText,
    reason: presentation.reasonCode,
  };
}

export function createAccessibleFallbackOverlay(
  root: HTMLElement,
): AccessibleFallbackOverlay {
  const document = root.ownerDocument;
  const section = document.createElement("section");
  const content = document.createElement("div");
  const label = document.createElement("strong");
  const heading = document.createElement("h2");
  const status = document.createElement("p");
  const detail = document.createElement("p");
  const fallback = document.createElement("p");
  const reason = document.createElement("code");
  const controls = document.createElement("div");
  const toggleVisibility = document.createElement("button");
  const toggleSize = document.createElement("button");
  const togglePosition = document.createElement("button");
  const toggleDock = document.createElement("button");

  section.className = "signbridge-overlay";
  section.setAttribute("aria-label", "Signing overlay");
  label.className = "signbridge-overlay__label";
  label.textContent = "SYNTHETIC TEST ONLY";
  heading.textContent = "Signing overlay";
  status.className = "signbridge-overlay__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  detail.className = "signbridge-overlay__detail";
  fallback.className = "signbridge-overlay__fallback";
  reason.className = "signbridge-overlay__reason";

  controls.className = "signbridge-overlay__controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Overlay controls");
  toggleVisibility.type = "button";
  toggleVisibility.textContent = "Hide overlay";
  toggleVisibility.setAttribute("aria-expanded", "true");
  toggleSize.type = "button";
  toggleSize.textContent = "Large overlay";
  toggleSize.setAttribute("aria-pressed", "false");
  togglePosition.type = "button";
  togglePosition.textContent = "Move overlay to top";
  togglePosition.setAttribute("aria-pressed", "false");
  toggleDock.type = "button";
  // Docked is the default. docs/accessibility-acceptance.md requires the
  // signing layer not to cover captions or the source video's own controls,
  // and the browser's controls sit exactly where a bottom overlay would.
  // Floating it over the video stays available, as an explicit choice.
  toggleDock.textContent = "Float overlay over video";
  toggleDock.setAttribute("aria-pressed", "false");

  content.append(label, heading, status, detail, fallback, reason);
  controls.append(toggleVisibility, toggleSize, togglePosition, toggleDock);
  section.append(content, controls);
  root.classList.add("signbridge-overlay-root");
  root.replaceChildren(section);

  toggleVisibility.addEventListener("click", () => {
    const willShow = content.hidden;
    content.hidden = !willShow;
    toggleVisibility.textContent = willShow
      ? "Hide overlay"
      : "Restore overlay";
    toggleVisibility.setAttribute("aria-expanded", String(willShow));
  });
  toggleSize.addEventListener("click", () => {
    const isLarge = section.classList.toggle("signbridge-overlay--large");
    toggleSize.textContent = isLarge ? "Standard overlay" : "Large overlay";
    toggleSize.setAttribute("aria-pressed", String(isLarge));
  });
  togglePosition.addEventListener("click", () => {
    const isTop = section.classList.toggle("signbridge-overlay--top");
    togglePosition.textContent = isTop
      ? "Move overlay to bottom"
      : "Move overlay to top";
    togglePosition.setAttribute("aria-pressed", String(isTop));
  });
  toggleDock.addEventListener("click", () => {
    const isFloating = root.classList.toggle("signbridge-overlay-root--float");
    toggleDock.textContent = isFloating
      ? "Dock overlay below video"
      : "Float overlay over video";
    toggleDock.setAttribute("aria-pressed", String(isFloating));
  });

  const render = (state: PlaybackState): void => {
    const presentation = describeRendererState(state);
    section.dataset["state"] = state.kind;
    section.dataset["reason"] = presentation.reasonCode;
    section.dataset["surface"] = presentation.surface;
    status.textContent = presentation.summary;
    detail.textContent = presentation.detail;
    fallback.textContent = presentation.captionText;
    // Spelled out rather than shown as a colour or an icon: the reason code is
    // what a viewer quotes when reporting that signing did not appear.
    reason.textContent = `State: ${presentation.reasonCode}`;
  };

  return Object.freeze({
    render,
    dispose: (): void => {
      root.classList.remove("signbridge-overlay-root");
      root.classList.remove("signbridge-overlay-root--float");
      root.replaceChildren();
    },
  });
}
