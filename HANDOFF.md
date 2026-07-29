# Task Handoff

## Goal

Complete W3: add a dependency-free YouTube adapter, narrowly permissioned
Manifest V3 extension, and permission/CSP release tests without real signing
content, cloud access, or public release.

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
- A CI workflow encodes the foundation check, `pnpm verify`, and the Chromium
  suite across the Node 22 and Node 24 lines.
- A dependency-free YouTube adapter wraps the exact HTML5 media clock and
  resolves the current source, page URL, and YouTube video ID on every sample.
- YouTube SPA navigation, source-identity changes, and video-element replacement
  emit an invalid snapshot before rebinding, without an independent timer.
- The build-free Manifest V3 extension requires only `www.youtube.com` and
  `m.youtube.com`; generic HTTP(S) sites remain optional, exact-origin grants.
- The popup explains optional access before the user initiates Chrome's prompt.
  Executable code is local and extension-page CSP permits only self-hosted code.
- The local content overlay preserves captions and states honestly that no
  reviewed SignPack is loaded.

## Current verification

```text
corepack pnpm verify
Passed the dependency/media foundation policy, strict type checking, build,
18/18 foundation tests, and 92/92 Vitest tests. Baseline verification requires
62 project files and checked 106 repository files.

corepack pnpm test:e2e
Passed 8/8 across desktop and small-phone Chromium, including IndexedDB
persistence across reload and invalid-import preservation.

Workspace verification
Passed all 4 required commands for the w3-extension worktree.

Local unpacked-extension smoke test
Chromium loaded "SignBridge Local Overlay" as enabled with zero runtime
warnings, and rendered the local popup. No live YouTube navigation occurred.

Committed as e0a380c on codex/w3-extension-20260729.

Checksum-verified Node 22.23.1 passed the complete verification suite when the
Goal 3b slice landed. Node 24.14.1 passes the complete suite as of the review
follow-up on 2026-07-28. The declared minimum is Node 22.13 because pinned pnpm
11.10.0 rejects Node 22.12; the range admits the 22 and 24 LTS lines and
excludes the unverified, end-of-life Node 23 line.

Workspace control-plane tests
Passed 12/12. SignBridge resolves through the registry. Workspace doctor reports
0 errors and 14 warnings: 13 pre-existing workspace warnings plus one expected
task-local warning for the three retained SignBridge worktrees.
```

Node 22 and Node 24 are the declared targets. `.github/workflows/verify.yml`
encodes the foundation check, `pnpm verify`, and the Chromium browser suite
across both lines. That workflow has never executed: this repository has no Git
remote, so CI remains unproven until one is configured.

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

- No sign-media renderer, media cache, reviewer console, Gemini authoring
  service, publisher implementation, Chrome Web Store listing, or live
  YouTube-network validation.
- No real ASL mapping, signer video, source video, participant record, consent
  grant, rights grant, cloud resource, or contest submission.
- No push, merge into local `main`, deployment, outreach, or production action.

The next W3 action is integrator review of `e0a380c`. The future Codex W8 slice
is sequenced after W2 under `docs/execution-plan.md`. Any active signing path,
real-language pack, public demo, or accessibility claim remains blocked on
the reviewer, final language scope, rights-cleared golden content, exact-hash
grants, and private evidence system.
