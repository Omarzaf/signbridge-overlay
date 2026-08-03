# Task Handoff

## Goal

Complete the Codex Wave 0 integration gate: mount the renderer, route PWA
motion through the media-clock adapter/runtime path, make extension status
browser-controlled, and prove both applications in Chromium without real
signing content, cloud access, or public release.

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
- Gemini transport failures raise `GeminiApiError` instead of returning a
  fabricated `unsupported` result, so an infrastructure fault can never be
  recorded as a deliberate model abstention.
- Absent model confidence is treated as `0.0` and rejected as `low_confidence`
  rather than defaulted to a synthesised `0.9`.
- A proposal citing any asset identifier outside the supplied candidate list is
  rejected in full as `unsupported_vocabulary`, rather than silently filtered
  down to whichever subset happened to be valid.
- Review events carry a per-pack incrementing `sequence` and a stable service
  `actorRef`, preserving append-only ordering and consistent authoring-service
  identity across calls.
- A failed run attaches a schema-valid `failed` run manifest to the raised
  error, so an aborted authoring run still leaves reproducible metadata.
- The authoring server enforces a 1 MB request-body cap and a 60-request-per-
  minute per-client rate limit, and reads its CORS origin from `ALLOWED_ORIGIN`
  (still defaulting to `*` until the judge-facing origin is fixed at W0.3).
- Multi-stage Dockerfile (`services/authoring/Dockerfile`) and container build configuration (`services/authoring/tsconfig.json`) enabling container builds to `dist/` and non-root execution (`USER node`) on port 8080.
- Complete Google Cloud Run deployment guide and GCP Secret Manager setup documented in `services/authoring/README.md`.
- A CI workflow encodes the foundation check, `pnpm verify`, and the Chromium
  suite across the Node 22 and Node 24 lines.
- The PWA mounts `createSignSurface`; verified local storage, adapter samples,
  runtime resolution, renderer output, and visible fallback are exercised by
  the actual application call chain.
- Abstract synthetic motion has no direct lifecycle or `timeupdate` listener.
  It is sampled through the adapter/controller path and freezes at unsupported
  playback rates while captions remain visible.
- Stored-byte corruption restores as an explicit `corrupt_manifest` state, and
  an unexpected import failure restores the file input in a `finally` block.
- Renderer geometry re-runs after sign-media metadata and container resize,
  retaining the no-crop/no-mirror geometry contract.
- The extension service worker owns local pack reads and the authoritative
  action badge. The page overlay is best-effort Shadow DOM with removal repair.
- The extension content bundle connects primary-player selection, the YouTube
  adapter, runtime, and renderer. SPA navigation emits a visible invalidation
  before rebinding.
- Generic-site permissions remain exact-origin and optional; approved grants
  are reused by the service worker across reload and navigation. Required host
  access remains limited to YouTube and `<all_urls>` is absent.
- Passing Playwright coverage now includes seek/pause/rate behavior, storage
  integrity failure, a mounted sign surface, primary-player selection, browser
  badge state, Shadow DOM repair, and SPA invalidation. Successful traces are
  retained as local test artifacts.
- `validateProposeRequest` checks body shape, string and number bounds,
  candidate uniqueness, identifier formats, language and region codes, and
  duration limits before any model call, so a malformed request costs nothing
  and returns 400 (A1.1).
- The server derives `environment` and generates `segmentId`, `packId`,
  `eventId`, `runId`, and sequence values itself. A caller cannot inject a
  catalog, forge a sequence number, or force the production path (A1.2).
- `BoundedTtlRateLimiter` resolves the client through the rightmost address in
  the trusted proxy chain, so a prepended `X-Forwarded-For` cannot buy extra
  quota. The store is bounded and TTL'd against memory growth (A1.3).
- Provenance records `executionMode`, `authMode`, and the generating tool's own
  identity. A model that was never called emits no Gemini metadata (A1.4).
- `DurableRunLedger` appends a record for success, abstention, and failure
  alike, and the response carries an `X-Run-ID` reference, so a failed run no
  longer disappears (A1.5).
- Request bodies are collected as buffers and decoded once through a fatal
  `TextDecoder`, so a multibyte character split across network chunks does not
  corrupt the text or its hash. Oversize returns 413; malformed UTF-8 returns
  400 (A1.6).
- The authoring `decisionHash` binds schema version 2.0.0, run, segment and
  pack identity, source text, segment duration, language and region, timed-text
  hash, candidate catalog hash, translation status, asset IDs, reason code, and
  confidence, with an adversarial probe proving divergent text or timing
  produces a different hash (A1.7).
- The container pins `node:22.14.0-slim` with OCI provenance and SBOM labels,
  and Cloud Build tags images by immutable `${COMMIT_SHA}` rather than the
  mutable `latest` (A1.8).
- `/metrics` is derived from the run ledger's review events, so the numbers
  survive a process restart (A1.9).

## Current verification

```text
Wave 0 integration, measured on codex/w0-integration-20260802:
workspace verify: PASS (baseline, lint/typecheck, tests, build)
Foundation tests: 18/18 passed
Vitest: 132/132 passed across 13 files
Playwright: 15/15 executed cases passed; one intentional small-phone extension
case skipped because the unpacked MV3 extension gate is desktop-only
Headed Chromium: 2/2 Wave 0 integration cases passed
PWA bundle: 17.17 kB gzip, 8.6% of the 200 kB budget
Extension bundles: 21.47 kB gzip combined
Baseline verification requires 72 project files.

A1 authoring hardening, measured on gemini/w0-authoring-hardening-20260802
before this merge:
Passed foundation policy, strict typechecking, build, 18/18 foundation tests,
and 109/109 Vitest tests, including 24 authoring-service hardening tests.
Baseline verification required 62 project files and scanned 15 playback
sources on that pre-merge tree.
```

The two blocks above were measured on separate branches and do not describe
one tree. The A1 counts are lower because that branch predates the renderer,
extension, and integration work; the merged-tree numbers are in this merge's
commit message.

## Wave 0 integration review — 2026-08-03

- Branch: `codex/w0-integration-20260802` at committed base `d9a9a1c`.
- Integration history: W2 merged at `0fbdfab`; W3 merged at `d9a9a1c`.
- Working tree: 26 scoped files (18 modified, 8 new) remain local and
  uncommitted for independent review.
- Coordinator Moderator verdict: **PASS**, with no blocking findings.
- Remaining review warnings: live YouTube behavior and trusted source-
  fingerprint validation are separate external gates. The requested Fable UX/
  accessibility and Claude code reviews have not been represented as complete.
- Local Playwright traces cover the storage -> adapter -> runtime -> renderer
  call graph but are test artifacts, not release evidence or signing media.
- Retrospective: a stale W2 Vite listener initially served the wrong worktree;
  future browser gates should verify listener ownership before testing.

This review did not commit, push, open a pull request, merge into `main`, or
deploy the Wave 0 integration changes.

Node 22 and Node 24 are the declared targets. `.github/workflows/verify.yml`
encodes the foundation check, `pnpm verify`, and the Chromium browser suite
across both lines. The Git remote is configured (`github.com/Omarzaf/signbridge-overlay`)
and CI executes automatically on pull requests and pushes to `main`.

## Deployed state — W0.2 closed, W0.1 partial

Google Cloud project `gemini-hackathon-0802402`, billing linked to the $300
free-trial account, region `us-central1`.

- Cloud Build builds `services/authoring/Dockerfile` via
  `services/authoring/cloudbuild.yaml` and pushes to Artifact Registry
  (`signbridge-repo/authoring-service:latest`).
- Cloud Run service `authoring-service` is deployed, public and
  unauthenticated, capped at three instances:
  `https://authoring-service-37750553255.us-central1.run.app`
- `GET /health` and `GET /metrics` return 200. `POST /propose` returns a
  schema-valid `proposal_created` review event and run manifest; its first
  production call correctly abstained with `unsupported_vocabulary` rather
  than selecting an unrelated candidate.
- **Gemini is reached through Vertex AI, not the Developer API.** Revision
  `authoring-service-00004-94h` runs with `GOOGLE_GENAI_USE_VERTEXAI=true`,
  `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`. Authentication is
  Application Default Credentials via the Cloud Run runtime service account, so
  no long-lived key is stored, and the default account already carried
  sufficient permission — no extra IAM binding was required.

### Why not the Gemini Developer API

An API key was configured first and every live call returned
`429 RESOURCE_EXHAUSTED`, "Your prepayment credits are depleted". The Gemini
Developer API bills against AI Studio's prepaid pool, which **Google Cloud
trial credits cannot fund**. Vertex AI bills the Cloud project instead, so the
hackathon's $300 covers it. A direct probe of `gemini-2.5-flash` through Vertex
returned 200 before the code was changed. The `GEMINI_API_KEY` secret still
exists but is now unused; API-key mode remains the code fallback.

### Live-call evidence

A `production` request returned HTTP 200 with `startedAt 00:35:24.310Z` and
`completedAt 00:35:28.426Z` — 4.1 seconds of real round trip. The deterministic
fallback completes within the same millisecond, so the elapsed time is itself
the proof that a model was called. The model abstained with
`unsupported_vocabulary` rather than selecting an unrelated candidate.

Contest requirement two — a live Gemini call in the deployed application — is
therefore **met**.

## Remaining human gates

The linguistic and rights gates below remain deferred under the Tier 3
build-only mode described in `docs/execution-plan.md`:

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
7. [COMPLETED] Git remote configured (`github.com/Omarzaf/signbridge-overlay`), backing up work off-machine and executing CI workflows.

## Explicitly not delivered

- No rights-cleared sign media, media cache, reviewer console, or publisher
  implementation.
- No real ASL mapping, signer video, source video, participant record, consent
  grant, rights grant, or contest submission. This integration slice created
  no cloud resource and made no change to the separately documented authoring
  service deployment above.
- No remote, push, deployment, outreach, production action, or local `main`
  integration occurred for this Wave 0 integration slice. These changes remain
  on `codex/w0-integration-20260802` for independent review.

The next engineering slice may add quota reporting and explicit user-controlled
removal for local caption packs. Live YouTube behavior, an active signing path,
real-language packs, public demos, and accessibility claims remain separately
blocked on live-site evidence, the reviewer, final language scope,
rights-cleared golden content, exact-hash grants, and the private evidence
system.
