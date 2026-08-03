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

## Current verification

```text
pnpm verify
Passed the dependency/media foundation policy, strict type checking, build,
20/20 foundation tests, and 117/117 Vitest tests: 38 contract, 12 review unit,
4 append-only ledger, 35 Goal 2 sync/runtime, 7 Goal 3a adapter/overlay,
9 Goal 3b storage/import tests, and 12 W4 authoring service tests.
Baseline verification requires 67 project files and scans 19 playback sources.
```

Measured on `claude/w0-reviewunit-v2-20260802`. The playback-source count rose
from 15 to 19 because the foundation scan now opens `.tsx`, `.js`, and `.mjs`
as well as `.ts`; four files in the playback path were previously never read.

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

## Wave 0 contract repair — `claude/w0-reviewunit-v2-20260802`

Closes audit findings P1 #1, #8, #9 and P2 #3 from
`docs/fable-agent-strategy-handoff.md`. Nothing here is merged.

- **ReviewUnitV2** (`contracts/review-unit.schema.json`,
  `packages/signpack-schema/src/reviewUnit.ts`). Human approval now binds the
  source fingerprint, timed-text hash, exact segment range, signed language and
  region, catalog version and candidate-set hash, selected asset hashes,
  presentation state, and proposal/run identity. Versioned `2.0.0`,
  independently of the pack schema. Canonicalisation is fixed by the function
  and documented in ADR 0005; an invalid unit throws rather than producing an
  authoritative-looking hash. Hashing uses WebCrypto, so the package stays
  dependency-free.
- **The audit's adversarial probe is now a permanent regression test.** Eleven
  single-field variations must each change the hash. Under the old
  `decisionHash` they did not.
- **v1 single-asset invariant.** A segment resolves to at most one asset whose
  duration equals the segment exactly, enforced in the review unit and in
  release-candidate preflight (`multi_asset_violation`, `asset_duration`). Two
  fixtures that embodied the defect were corrected: the release-candidate
  helper paired a 1000 ms asset with a 10000 ms segment.
- **Evidence periods** must end on or before `generatedAt`
  (`evidence_period`). The contest-evidence fixture claimed coverage through
  31 January while being generated on 1 January; its `generatedAt` moved to
  1 February so the fixture is truthful.
- **Append-only ledger interfaces** (`packages/signpack-schema/src/ledger.ts`)
  for the durable run/decision records the authoring service must write for
  success, abstention, and failure, with `checkLedgerAppend` centralising the
  monotonic no-rewrite rule.
- **Foundation scan widened** to `.tsx`, `.js`, and `.mjs`, with a negative
  test per extension, and its success message no longer claims more than it
  checked.
- `docs/publisher-refusal-matrix.md` specifies the ten refusal paths for the
  Wave 1 publisher. It is a specification; no publisher code exists.

Still open on this branch: the authoring service continues to emit the old
`decisionHash`. Adoption of the review-unit hash is Gemini's A1.7.

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
