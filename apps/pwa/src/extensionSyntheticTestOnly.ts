import { createSilentTimingSource } from "./syntheticTimingSource";

function attachSource(video: HTMLVideoElement, seconds: number): void {
  video.src = URL.createObjectURL(createSilentTimingSource(seconds));
  video.load();
}

const incidental = document.querySelector<HTMLVideoElement>(
  "#incidental-player",
);
let primary = document.querySelector<HTMLVideoElement>(
  "#movie_player .html5-main-video",
);
const player = document.querySelector<HTMLElement>("#movie_player");
const navigationStart = document.querySelector<HTMLButtonElement>(
  "#navigation-start",
);
const navigationFinish = document.querySelector<HTMLButtonElement>(
  "#navigation-finish",
);

if (
  incidental === null ||
  primary === null ||
  player === null ||
  navigationStart === null ||
  navigationFinish === null
) {
  throw new Error("synthetic extension fixture is missing required elements");
}

attachSource(incidental, 2);
attachSource(primary, 10);
let activePrimary: HTMLVideoElement = primary;

navigationStart.addEventListener("click", () => {
  document.dispatchEvent(new Event("yt-navigate-start"));
});

navigationFinish.addEventListener("click", () => {
  const replacement = document.createElement("video");
  replacement.className = "html5-main-video";
  replacement.setAttribute(
    "aria-label",
    "Replacement primary synthetic video",
  );
  replacement.controls = true;
  replacement.style.width = "640px";
  replacement.style.height = "360px";
  activePrimary.replaceWith(replacement);
  activePrimary = replacement;
  attachSource(replacement, 10);
  history.pushState({}, "", "?synthetic=two");
  document.dispatchEvent(new Event("yt-navigate-finish"));
});
