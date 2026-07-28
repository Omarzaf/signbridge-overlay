# Task Handoff

## Goal

Complete Goal 3a: fix reentrant runtime notifications and connect a
dependency-free HTML5 media-clock adapter to an accessible, synthetic-only
caption-fallback shell without real signing content, cloud access, or public
release.

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
- Forged models, malformed or hostile inputs, source replacement, unsupported
  content, unavailable assets, incompatible segments, and unapproved playback
  rates fail visibly to caption-preserving states.
- Synthetic tests cover fractional boundaries, seeks, pauses, rate recovery,
  model and state mutation, changing getters, subscriber ordering, and
  timer-free operation.

## Current verification

```text
pnpm verify
Passed the dependency/media foundation policy, strict type checking, build,
5/5 foundation tests, and 76/76 Vitest tests: 34 contract, 35 Goal 2
sync/runtime, and 7 Goal 3a adapter/overlay tests. Baseline verification
requires 52 project files.

The PWA production build passes at 21.88 kB JavaScript and 2.85 kB CSS before
compression. Four Playwright cases are discovered across desktop and small
phone, but Playwright Chromium has not been downloaded, so the CLI E2E run is
blocked before page execution. Separate in-app browser inspection passed the
desktop and 320 px layouts, keyboard controls, explicit `not_published` state,
caption visibility, zero horizontal overflow, and zero page console errors.

Workspace control-plane tests
Passed 12/12. SignBridge resolves through the registry. Workspace doctor reports
0 errors and 14 warnings: 13 pre-existing workspace warnings plus one expected
task-local warning for the three retained SignBridge worktrees.
```

Node 22 remains the declared target and must be verified in the approved
toolchain/CI gate.

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
7. Verify the declared Node 22/pnpm toolchain in CI.

## Explicitly not delivered

- No sign-media renderer, YouTube adapter, offline pack storage, Chrome
  extension, reviewer console, Gemini authoring service, or publisher
  implementation.
- No real ASL mapping, signer video, source video, participant record, consent
  grant, rights grant, cloud resource, or contest submission.
- No push, merge, deployment, browser download, outreach, or production action.

The next slice may add offline pack import and verified local storage while
remaining caption-only. Any active signing path, real-language pack, public
demo, or accessibility claim remains blocked on the reviewer, final language
scope, rights-cleared golden content, exact-hash grants, and private evidence
system.
