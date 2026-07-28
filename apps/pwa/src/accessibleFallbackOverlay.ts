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

export function describePlaybackState(
  state: PlaybackState,
): OverlayPresentation {
  if (state.kind === "active_sign") {
    return {
      statusText:
        "Signing media rendering is not implemented in this synthetic shell.",
      fallbackText: state.captionFallback.text,
      reason: "active_sign",
    };
  }

  return {
    statusText:
      state.reason === "not_published"
        ? "Signing is unavailable for this synthetic draft."
        : "Signing is unavailable. Source captions remain available.",
    fallbackText:
      state.captionFallback?.text ??
      "Source captions remain independently available.",
    reason: state.reason,
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
  const fallback = document.createElement("p");
  const reason = document.createElement("code");
  const controls = document.createElement("div");
  const toggleVisibility = document.createElement("button");
  const toggleSize = document.createElement("button");
  const togglePosition = document.createElement("button");

  section.className = "signbridge-overlay";
  section.setAttribute("aria-label", "Signing overlay");
  label.className = "signbridge-overlay__label";
  label.textContent = "SYNTHETIC TEST ONLY";
  heading.textContent = "Signing overlay";
  status.className = "signbridge-overlay__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
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

  content.append(label, heading, status, fallback, reason);
  controls.append(toggleVisibility, toggleSize, togglePosition);
  section.append(content, controls);
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

  const render = (state: PlaybackState): void => {
    const presentation = describePlaybackState(state);
    section.dataset["state"] = state.kind;
    section.dataset["reason"] = presentation.reason;
    status.textContent = presentation.statusText;
    fallback.textContent = presentation.fallbackText;
    reason.textContent = `State: ${presentation.reason}`;
  };

  return Object.freeze({
    render,
    dispose: (): void => {
      root.replaceChildren();
    },
  });
}
