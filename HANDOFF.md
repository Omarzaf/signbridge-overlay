# Task Handoff

## Goal

Harden Wave 0 authoring service trust boundary (`services/authoring/`) per `docs/agent-briefs.md` section "Gemini / Antigravity — Wave 0, authoring trust boundary" and `docs/fable-strategy-2026-08-02.md` §4 (A1 gates).

## Decisions already made

- This is an independent product repository, not a modification of an existing Claude project.
- “Universal” refers to the integration protocol, not a signed language.
- The first release uses reviewed human signing video rather than a 3D avatar.
- The runtime remains usable without Gemini or cloud access.
- AI proposals require qualified human review before publication.
- The provisional language scope is U.S. American Sign Language (`ase`, `US`).
- Source code uses Apache License 2.0.
- Released sign media will require an irrevocable grant tied to exact hashes.
- The entrant is treated as an individual unless the owner changes that choice.
- TypeScript, Vite, Vitest, and Playwright are approved development-only tools.
- Gemini / Antigravity owns ONLY `services/authoring/`. All other paths remain untouched.

## Delivered

- **A1.1 Closed Request Schema Pre-Validation**: Built `validateProposeRequest` (`services/authoring/src/validation.ts`) to validate body shape, string/number bounds, candidate uniqueness, candidate identifier formats, language/region codes, and duration limits before any cost or model invocation. Rejects invalid requests with HTTP 400.
- **A1.2 Server-Owned Authority**: Enforced server derivation of `environment` (`synthetic_test`, `development`, `production`) and server generation of authoritative `segmentId`, `packId`, `eventId`, `runId`, and sequence values. Caller cannot inject catalog, forge sequence numbers, or force production path.
- **A1.3 Quota & Spoofing Defense**: Built `BoundedTtlRateLimiter` (`services/authoring/src/rateLimiter.ts`) using proxy-safe client IP resolution (`getTrustedClientIp`). Inspects the rightmost IP of the reverse proxy / Cloud Run chain so prepended spoofed `X-Forwarded-For` headers cannot bypass rate limits. Bounded TTL store prevents memory growth.
- **A1.4 Truthful Provenance**: Updated `GeminiProposalClient` and `AuthoringProposeEngine` to record `executionMode` (`gemini_live`, `deterministic_fallback`, `synthetic_test`), `authMode` (`vertex_ai`, `api_key`, `none`), and generator tool identity (`authoring_service_deterministic` vs `authoring_service`). Uncalled Gemini models do not emit Gemini model metadata.
- **A1.5 Durable Runs**: Created `DurableRunLedger` (`services/authoring/src/runLedger.ts`) to persist an append-only record for success, abstention, AND failure runs. HTTP responses return an `X-Run-ID` header carrying the durable run reference.
- **A1.6 Multibyte UTF-8 Stream Repair**: Updated `parseJsonBody` in `services/authoring/src/server.ts` to collect raw network chunks as `Buffer[]` and decode once using `TextDecoder("utf-8", { fatal: true })`. Multibyte characters split across network chunks (e.g. `café`) decode cleanly without text or timed-text hash corruption. Oversize payloads return HTTP 413; malformed UTF-8 returns HTTP 400.
- **A1.7 ReviewUnitV2 Decision Hash Binding**: Implemented canonical `decisionHash` binding schema version `2.0.0`, `runId`, `segmentId`, `packId`, source text, segment duration, signed language, region, timed-text hash, candidate catalog hash, translation status, asset IDs, reason code, and confidence. Proved via adversarial test probe that requests with different source text or timing produce different decision hashes.
- **A1.8 Container Tagging & SBOM**: Updated `services/authoring/Dockerfile` to pin base image `node:22.14.0-slim` with OCI container provenance and SBOM labels. Updated `services/authoring/cloudbuild.yaml` to use immutable `${COMMIT_SHA}` build tags instead of mutable `latest`.
- **A1.9 Derived Metrics**: Derived `/metrics` dynamically from `globalRunLedger` review events so metrics survive process restarts.

## Current verification

```text
node tools/verify-baseline.mjs
pnpm verify
Passed foundation policy checks, strict typechecking (`tsc -p tsconfig.json`), build, 18/18 foundation tests, and 109/109 Vitest unit tests (including 24 authoring service hardening tests).

Baseline verification requires 62 project files, 2 package manifests, 4 approved root dev tools, 15 playback sources, 7 synthetic fixtures, and 122 repository files checked.
```

Node 22 and Node 24 are the declared targets. `.github/workflows/verify.yml`
encodes the foundation check, `pnpm verify`, and the Chromium browser suite
across both lines. The Git remote is configured (`github.com/Omarzaf/signbridge-overlay`)
and CI executes automatically on pull requests and pushes to `main`.

## Deployed state — W0.2 closed, W0.1 partial

Google Cloud project `gemini-hackathon-0802402`, billing linked to the $300 free-trial account, region `us-central1`.

- Cloud Build builds `services/authoring/Dockerfile` via `services/authoring/cloudbuild.yaml` and pushes to Artifact Registry.
- Cloud Run service `authoring-service` is deployed and public.
- Gemini is reached through Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`).

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

1. Confirm qualified Deaf ASL reviewer.
2. Document community/regional variation and scope.
3. Select signer, source video, and golden-pack topic.
4. Execute rights grants.
5. Private evidence system of record setup.
6. Entrant publicity agreements.

## Explicitly not delivered

- No sign-media renderer, YouTube adapter, media cache, Chrome extension, reviewer console, or publisher implementation in this worktree (owned concurrently by other worktrees/branches).
- No deployment modification (Cloud Run deployment untouched).
