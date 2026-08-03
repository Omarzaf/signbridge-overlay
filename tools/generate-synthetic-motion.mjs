#!/usr/bin/env node
// Generates the abstract motion clip the playback shell uses to exercise
// synchronisation, seeking, pausing, and the fallback states.
//
// Why this exists: the reviewer and rights gates are closed, so this repository
// contains no reviewed signing media and must not contain anything that could
// be mistaken for it. docs/execution-plan.md §1.2 permits synthetic fixtures
// using "abstract or obviously non-linguistic motion and no cloned human
// likeness" for exactly this purpose. What comes out of this script is moving
// geometry: no figure, no hands, no face, no likeness, and no signed language.
//
// Why SVG rather than a video file: the playback path is dependency-free by
// contract, and there is no honest way to encode VP8 or H.264 from scratch here.
// SVG's SMIL timeline is a better fit anyway — `setCurrentTime()` and
// `pauseAnimations()` let the source media clock drive the clip frame-exactly,
// which is the property the demo is meant to prove. It is written into an
// ignored directory and never committed, as the plan requires.
//
// The media clock the shell synchronises against comes from
// apps/pwa/src/syntheticTimingSource.ts, which builds a silent track in the
// browser at runtime. Deliberately not emitted here: a generated audio file on
// disk is still a media file in the tree, and this repository is better off
// with none at all.
//
// Usage:
//   node tools/generate-synthetic-motion.mjs --out dist/pwa

import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

/**
 * The label that must appear in the filename, the manifest, and on screen, so
 * that a clip separated from its context still says what it is.
 */
const LABEL = "synthetic-test-only";
const BASENAME = `${LABEL}.motion`;
const DURATION_MS = 6000;
const VIEWBOX_WIDTH = 480;
const VIEWBOX_HEIGHT = 270;

function parseOutDirectory(argv) {
  const flagIndex = argv.indexOf("--out");
  if (flagIndex === -1 || argv[flagIndex + 1] === undefined) {
    console.error("usage: node tools/generate-synthetic-motion.mjs --out <dir>");
    process.exit(1);
  }
  return resolve(repositoryRoot, argv[flagIndex + 1]);
}

/**
 * A clip that is never committed is only "never committed" if something checks.
 * Skips silently outside a Git checkout so the script still works from a
 * tarball or a copied tree.
 */
function assertIgnored(path) {
  const insideRepository = spawnSync(
    "git",
    ["rev-parse", "--is-inside-work-tree"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  if (insideRepository.status !== 0) {
    console.log("  (not a Git checkout; skipped the never-committed check)");
    return;
  }

  const ignored = spawnSync("git", ["check-ignore", "-q", path], {
    cwd: repositoryRoot,
  });
  if (ignored.status !== 0) {
    console.error(
      `Refusing to generate into ${relative(repositoryRoot, path)}: the path is not ` +
        "ignored by Git, and generated motion must never be committed.",
    );
    process.exit(1);
  }
}

/**
 * Three independent motions at unrelated periods. Unrelated on purpose: motion
 * that resolves into repeating phrase-shaped units is motion a viewer could
 * start reading as language.
 */
function renderClip() {
  const seconds = `${DURATION_MS / 1000}s`;
  const sweep = `${(DURATION_MS / 1000) * 0.75}s`;
  const pulse = `${(DURATION_MS / 1000) / 3}s`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" role="img" aria-labelledby="clip-title clip-desc" data-label="${LABEL}">
  <title id="clip-title">Abstract synthetic motion, ${LABEL}</title>
  <desc id="clip-desc">Procedurally generated geometric motion used to test playback synchronisation. It is not a signed language, not American Sign Language, and depicts no person.</desc>
  <rect width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" fill="#02060c"/>
  <g fill="none" stroke="#8ed7ff" stroke-width="2" opacity="0.55">
    <circle cx="240" cy="135" r="52">
      <animate attributeName="r" values="52;74;52" dur="${pulse}" repeatCount="indefinite"/>
    </circle>
    <circle cx="240" cy="135" r="86">
      <animate attributeName="r" values="86;68;86" dur="${pulse}" repeatCount="indefinite"/>
    </circle>
  </g>
  <g>
    <rect x="-64" y="0" width="64" height="${VIEWBOX_HEIGHT}" fill="#173f68" opacity="0.7">
      <animate attributeName="x" values="-64;${VIEWBOX_WIDTH}" dur="${sweep}" repeatCount="indefinite"/>
    </rect>
  </g>
  <g transform="translate(240 135)">
    <rect x="-26" y="-26" width="52" height="52" fill="none" stroke="#ffdc8c" stroke-width="3">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${seconds}" repeatCount="indefinite"/>
    </rect>
    <rect x="-14" y="-14" width="28" height="28" fill="#ffdc8c" opacity="0.85">
      <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="${pulse}" repeatCount="indefinite"/>
    </rect>
  </g>
  <g fill="#bce4ff">
    <rect x="24" y="230" width="10" height="16"/>
    <rect x="24" y="230" width="10" height="16">
      <animate attributeName="x" values="24;${VIEWBOX_WIDTH - 34}" dur="${seconds}" repeatCount="indefinite"/>
    </rect>
  </g>
  <text x="24" y="36" fill="#ffdc8c" font-family="monospace" font-size="15">${LABEL}</text>
  <text x="24" y="56" fill="#c8d7ec" font-family="monospace" font-size="12">abstract motion &#183; not a signed language</text>
</svg>
`;
}

function renderManifest(clipBytes) {
  return `${JSON.stringify(
    {
      label: LABEL,
      generatedBy: "tools/generate-synthetic-motion.mjs",
      content: "abstract_geometric_motion",
      isSignedLanguage: false,
      linguisticStatus: "not_a_signed_language",
      depictsPerson: false,
      humanReviewed: false,
      clip: `${BASENAME}.svg`,
      clipBytes,
      durationMs: DURATION_MS,
      viewBox: { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT },
      notice:
        "Procedurally generated geometry for testing playback synchronisation, " +
        "seeking, and caption fallback. It carries no linguistic content and must " +
        "never be presented, labelled, or exported as a signed language.",
    },
    null,
    2,
  )}\n`;
}

const outDirectory = parseOutDirectory(process.argv.slice(2));

await mkdir(outDirectory, { recursive: true });
assertIgnored(outDirectory);

const clip = renderClip();
const clipBytes = Buffer.byteLength(clip, "utf8");
const clipPath = join(outDirectory, `${BASENAME}.svg`);

await writeFile(clipPath, clip, "utf8");
await writeFile(
  join(outDirectory, `${BASENAME}.json`),
  renderManifest(clipBytes),
  "utf8",
);

console.log(
  `Synthetic motion generated: ${relative(repositoryRoot, clipPath)} ` +
    `(${clipBytes} B, ${DURATION_MS} ms, abstract geometry, not a signed language)`,
);
