# Task Handoff

## Goal

Complete Goal 3b: add size-limited, structurally validated, digest-verified
IndexedDB import and retrieval for synthetic caption-only SignPacks without
real signing content, cloud access, or public release.

## Decisions already made

- This is an independent product repository, not a modification of an existing
  Claude project.
- “Universal” refers to the integration protocol, not a signed language.
- The first release uses reviewed human signing video rather than a 3D avatar.
- The runtime remains usable without Gemini or cloud access.
- AI proposals require qualified human review before publication.
- The provisional language scope is U.S. American Sign Language (`ase`, `US`).
- Source code uses Apache License 2.0.
- Released sign media will require an irrevocable grant tied to exact hashes.
- The entrant is treated as an individual unless the owner changes that choice.
- TypeScript, Vite, Vitest, and Playwright are approved development-only tools.

## Delivered

- Six versioned JSON Schemas cover SignPacks, review events, asset ledgers,
  release requests, authoring run manifests, and contest evidence.
- Dependency-free TypeScript validators enforce timing, state, provenance,
  exact-hash references, review-event finality, signer/consent relationships,
  rights scope, contest-record integrity, and malformed-input handling.
- `validateReleaseCandidate` accepts only structurally valid draft candidates
  and returns `assurance: structural_preflight_only`; it cannot publish.
- Synthetic `zxx`/`ZZ` fixtures exercise unsupported-content behavior without
  representing a real signed language or including media.
- Every schema identifies its structural-only assurance boundary.
- A dependency-free sync engine prepares immutable, module-issued playback
  models and resolves exact media snapshots through half-open segment
  lookup.
- A framework-free runtime controller stores and publishes immutable playback
  state without owning a DOM, media element, timer, network request, or cloud
  service.
- Runtime notifications remain stable when a subscriber samples reentrantly.
- A dependency-free HTML5 adapter samples exact media time, pause, seek, rate,
  and current source; it observes lifecycle and media-frame callbacks without
  advancing an independent clock.
- The adapter resolves the current source fingerprint on every sample and fails
  hostile or unknown media state visibly through the runtime.
- A local PWA shell connects the draft `zxx`/`ZZ` fixture to an accessible
  overlay that remains blocked as `not_published` while independent captions
  stay visible.
- Keyboard controls hide, resize, and reposition the overlay without adding a
  production dependency or media asset.
- Local imports reject empty, oversized, unreadable, malformed, real-language,
  reviewed, mapped, and asset-bearing content.
- Exact imported bytes are hashed, stored in IndexedDB, read back, rehashed,
  reparsed, and revalidated before the manifest is returned.
- Identical bytes are idempotent, while a conflicting pack ID fails without
  overwrite.
- Reload restores only a locally verified synthetic caption pack and keeps the
  runtime blocked as `not_published`.
- Forged models, malformed or hostile inputs, source replacement, unsupported
  content, unavailable assets, incompatible segments, and unapproved playback
  rates fail visibly to caption-preserving states.
- Synthetic tests cover fractional boundaries, seeks, pauses, rate recovery,
  model and state mutation, changing getters, subscriber ordering, and
  timer-free operation.
- Manifest integrity is decided before a manifest is cloned or parsed, so bytes
  that failed their integrity check are never interpreted.
- A failed active-pack pointer reports `storage_activation_failed` and keeps the
  stored, re-verified pack retrievable instead of claiming a storage failure.
- The foundation checker matches lockfile specifiers by pattern, so a pnpm
  indentation or quoting change cannot silently disable the toolchain check.
- Authoring service (`services/authoring/`) built with pinned `@google/genai` dependency, exposing HTTP `POST /propose`, `GET /health`, and `GET /metrics`.
- Constrained proposal engine restricts sign candidate selections strictly to supplied asset candidate IDs and abstains with `unsupported` and valid reason codes when context/vocabulary cannot be mapped.
- Generated `proposal_created` review events and run manifests strictly conform to versioned JSON Schemas (`review-event.schema.json` and `run-manifest.schema.json`) with enforced privacy flags (`containsTranscript: false`, `containsIdentity: false`, `containsMediaUrl: false`).
- AI-Native Operations metrics tracker records false-supported rate, coverage, top-1 acceptance rate, changes requested, rejections, and reason code breakdown.
- A CI workflow encodes the foundation check, `pnpm verify`, and the Chromium
  suite across the Node 22 and Node 24 lines.

### W2 — renderer and overlay

- `packages/sign-renderer` is dependency-free and imports only `sync-engine`
  types. It maps every playback state to readable text, sizes the signing
  surface, and moves that surface to match one media-clock sample. It runs no
  clock and cannot reach a manifest, so it cannot promote an unapproved segment.
- Every one of the fourteen caption-fallback reason codes renders its own
  explanation. The map is typed `Record<PlaybackFallbackReason, string>`, so a
  new reason code in the sync engine fails the type check rather than rendering
  an empty screen.
- **Crop and mirror are enforced, not intended** — the second pending invariant
  in `docs/agent-orchestration.md` §2.1. Three layers: `resolveAssetGeometry`
  scales by `min(...)` and can only letterbox; `SIGN_SURFACE_STYLE` pins
  `object-fit: contain` and `transform: none` as the only style written to the
  surface; and `tools/verify-baseline.mjs` scans every `.ts`, `.css`, and
  `.html` file in the playback path for negative scales, out-of-plane rotations,
  `object-fit: cover`, `preserveAspectRatio` slice, and negative matrix scales.
- **The 200 KB compressed budget is a build step** — the first pending §2.1
  invariant. `tools/assert-bundle-budget.mjs` runs after `build:pwa` and gzips
  every shipped file.
- `tools/generate-synthetic-motion.mjs` emits abstract geometric motion —
  concentric rings, a sweep bar, counter-rotating squares — labelled
  `synthetic-test-only` in the filename, the manifest, and on screen. It writes
  to an ignored directory and refuses to run if `git check-ignore` says the
  target is not ignored, so it cannot be committed by accident.
- The motion clip is SVG rather than an encoded video. There is no honest way to
  encode VP8 or H.264 without a production dependency, and the SVG document
  timeline is the better fit anyway: `setCurrentTime` and `pauseAnimations` let
  the source clock drive the clip to the millisecond.
- The source element plays a silent PCM track built in the browser
  (`apps/pwa/src/syntheticTimingSource.ts`), attached only when the operator
  asks for it. This gives the shell a genuine `HTMLMediaElement` clock while
  leaving no media file in the repository or in the shipped bundle.
- Overlay controls hide, resize, reposition, and dock the signing layer. It
  docks below the video by default, because a bottom overlay covers exactly
  where the browser puts the source video's own controls. Below 34rem it docks
  regardless, which is the explicit alternate layout the accessibility contract
  asks for when space is insufficient.
- All controls are 44×44 px or larger, keyboard operable with visible focus, and
  carry programmatic names, roles, and pressed/expanded state. State is spelled
  out in text — never colour, icon, or motion alone. Reduced motion holds the
  clip on a still frame with a control to start it deliberately; forced-colors
  keeps every border.

Browser inspection, desktop Chromium, 1280x900, 2026-07-28: with the timing
source loaded and the video playing, the motion surface read 614 ms against a
617 ms media clock. Seeking to 20.6 s moved the surface to 2700 ms against an
expected 2646 ms, inside the 120 ms hold threshold. Pausing the video paused the
surface. The surface measured 273.05 x 153.59 px inside a 273.05 x 153.59 px
container at aspect ratio 1.7777 against the clip's 1.7778, with computed
transform `none` and object-fit `contain`: fully contained, correct ratio,
unmirrored. At 320 px there was no horizontal overflow and no control smaller
than 44 x 44 px. No console errors.

## Current verification

```text
pnpm verify
Passed the dependency/media foundation policy, strict type checking, build,
18/18 foundation tests, and 119/119 Vitest tests across 12 files: the previous
94 plus 25 renderer tests (8 geometry, 6 presentation, 8 timeline, 3
surface-style).
Baseline verification requires 72 project files and additionally scans 28
presentation sources for crop and mirror constructs.
Bundle budget met: 16.04 kB compressed across 5 files, 8.0% of the 200 kB
budget.
```

Measured on the merge of `codex/w2-renderer-20260729` into `main`, not on either
branch alone.

Node 22 and Node 24 are the declared targets. `.github/workflows/verify.yml`
encodes the foundation check, `pnpm verify`, and the Chromium browser suite
across both lines. The Git remote is configured
(`github.com/Omarzaf/signbridge-overlay`) and CI executes on pull requests and
pushes to `main`.

## Remaining human gates

1. Confirm a qualified Deaf ASL reviewer, basis of qualification, authority,
   compensation, conflicts, and consent-safe public identifier.
2. Have that reviewer document the relevant ASL community/regional variation
   and final educational scope.
3. Select the signer, source video, and rights-cleared golden-pack topic.
4. Execute grants covering playback, demo, contest submission, sponsor
   publicity, territory, term, editing, attribution, hosting, and withdrawal.
5. Select the private system of record, access controls, retention, and
   organizer-disclosure process for consent, payments, pilot notes, customer
   evidence, and identities.
6. Confirm whether individual entrant status requires any contributor or
   publicity agreement.
7. Configure a Git remote so the branch/pull-request rule in `AGENTS.md` is
   enforceable, the work is backed up off this machine, and the committed CI
   workflow can actually run.

## Explicitly not delivered

- No sign-media renderer, YouTube adapter, media cache, Chrome
  extension, reviewer console, or publisher implementation.
- No real ASL mapping, signer video, source video, participant record, consent
  grant, rights grant, cloud resource, or contest submission.
- No remote, push, deployment, outreach, or production action. The reviewed
  branch is fast-forwarded into local `main` only.

The next engineering slice may add quota reporting and explicit user-controlled
removal for local caption packs. Any active signing path, real-language pack,
public demo, or accessibility claim remains blocked on the reviewer, final
language scope, rights-cleared golden content, exact-hash grants, and private
evidence system.
