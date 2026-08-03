# Fable handoff — devise the next strategy for every agent

**Prepared:** 2026-08-02

**Audience:** Fable 5, acting first as a read-only strategy coordinator

**Project:** SignBridge Overlay

**Repository:** `/Users/omar/Downloads/Claude/Gemini Hackathon/signbridge-overlay`

**Current checkout at review:** `feat/authoring-integrity-hardening` at `55bee16`

**Decision state:** `NEEDS_FIXES` — no merge, release, or production recommendation

## Fable's assignment

Use this review to devise the next coordinated strategy for every agent. Do not
implement the strategy during the strategy pass, do not approve signing media,
and do not treat a passing unit suite as end-to-end product proof.

Return a plan that:

1. Assigns one exclusive directory scope and one concrete deliverable to each
   of Codex, Gemini/Antigravity, Claude, and Fable.
2. Uses no more than three concurrent write-capable agents.
3. Defines branch and worktree ownership before any edits.
4. Orders work by dependency and release risk rather than visual appeal.
5. Gives every task a command-level verification gate and an independent
   cross-vendor reviewer.
6. Separates engineering work from the human-only reviewer, signer, rights,
   pilot, business-evidence, submission, and production gates.
7. Identifies which existing branches should be superseded, rebased, or
   integrated, but does not merge or close anything without owner approval.
8. Ends with a critical path to a truthful sub-three-minute hackathon demo.

Fable's strategy output should contain:

- a one-page executive decision;
- a dependency graph;
- a wave-by-wave agent allocation table;
- acceptance tests for every workstream;
- a merge order and rollback rule;
- a risk register with owners;
- a human decision queue;
- a contest-readiness checklist;
- a list of claims the demo may and may not make.

The repository's `AGENTS.md` remains authoritative. The existing Fable W5 brief
limits implementation ownership to `apps/reviewer/` and `tests/`. A broader
strategy pass may inspect the repository read-only, but it does not broaden
Fable's write scope.

---

## Executive review verdict

The foundation is promising and unusually well tested, but SignBridge is not
yet a complete end-to-end product. Release-critical gaps remain in:

- cryptographic review binding;
- authoring-service trust boundaries and provenance;
- renderer and extension integration;
- reviewer and publisher applications;
- rights-cleared, qualified-human-reviewed ASL media;
- business and pilot evidence.

The correct verdict is `NEEDS_FIXES`.

Do not describe the product as a universal sign language, automatic
interpreter, production accessibility solution, or source of reviewed ASL.
Gemini may propose or abstain; it may not approve, publish, or generate signing
for the v1 product.

---

## Priority findings

### P1 — release blockers

#### 1. Approval is not bound to the complete review unit

**Evidence:** `services/authoring/src/proposeEngine.ts:100-108`

`decisionHash` covers only `segmentId`, `packId`, `translationStatus`, selected
asset IDs, reason code, and confidence. It omits source text, exact timing,
signed language, region, candidate catalog, asset hashes, and presentation
metadata.

An adversarial probe submitted two materially different requests with the same
pack, segment, and selected output. Their timed-text hashes differed but their
decision hashes were identical.

**Required fix:** introduce a versioned canonical `ReviewUnitV2`. Its hash must
bind the source fingerprint, timed-text hash, exact segment range, signed
language and region, candidate/catalog version, selected asset hashes,
crop/mirror/transformation state, proposal/run ID, and schema version. Human
approval must sign this exact hash. Any material change invalidates approval.

#### 2. The HTTP boundary accepts malformed requests

**Evidence:** `services/authoring/src/server.ts:133-145`

Validation checks little beyond `segmentText` and numeric start/end values.
Missing language or region and duplicate asset identifiers can reach the
engine and produce schema-invalid review artifacts.

**Required fix:** validate a closed request schema before cost or model
invocation. Bound the body size, text length, segment duration, candidate
count, identifiers, language/region values, candidate uniqueness, and catalog
membership.

#### 3. The caller controls authoritative fields

**Evidence:** `services/authoring/src/types.ts` and
`services/authoring/src/proposeEngine.ts`

The caller supplies candidates, `packId`, `segmentId`, event sequence, and
environment. An unauthenticated judge route can therefore inject a catalog,
forge ordering, or select the production/model path.

**Required fix:** the server generates IDs and sequence values, derives the
environment from deployment configuration, and retrieves candidates from a
trusted rights-filtered catalog. The public route supplies content and a
catalog query, not authority.

#### 4. Rate limiting is spoofable, process-local, and unbounded

**Evidence:** `services/authoring/src/server.ts:19-33,81-86`

Sixty-one requests sharing one `X-Forwarded-For` value correctly reached 429.
Sixty-one requests rotating that caller-controlled header returned 200. The
map grows indefinitely and resets on every instance or cold start.

**Required fix:** trust only the configured Cloud Run proxy chain. Apply an
authenticated or edge-enforced quota and a bounded TTL store keyed by
principal/project rather than an arbitrary header.

#### 5. Model provenance can report an execution that did not occur

**Evidence:** `services/authoring/src/geminiClient.ts:48-51` and
`services/authoring/src/proposeEngine.ts:139-154`

Deterministic fallback and custom-model execution are still recorded as
Gemini 2.5 Flash.

**Required fix:** persist `executionMode`, the actual model/API/location,
prompt version, catalog version, authentication mode, and fallback reason.
Do not populate model metadata when no model was called. Deterministic logic
needs its own generator identity and version.

#### 6. Failed runs disappear at the HTTP boundary

**Evidence:** `services/authoring/src/proposeEngine.ts:56-92` and
`services/authoring/src/server.ts:155-171`

The engine attaches a schema-valid failed run manifest to the exception, but
the server does not persist or return a durable reference to it.

**Required fix:** write an append-only private run record for success,
abstention, and failure before responding.

#### 7. Request decoding corrupts split UTF-8

**Evidence:** `services/authoring/src/server.ts:44-52`

The server calls `chunk.toString("utf8")` for each network chunk. Splitting the
multibyte character in `café` across chunks returned 200 but changed the
timed-text hash.

**Required fix:** collect buffers and decode once with a fatal UTF-8 decoder,
or use `StringDecoder`. Return 413 cleanly before closing the connection.

#### 8. Authoring, release validation, and playback disagree about assets

**Evidence:**

- `services/authoring/src/geminiClient.ts:224-230`
- release-candidate validator in `packages/contracts/`
- sync-engine fallback in `packages/sync-engine/src/index.ts:554-582`

The authoring path can select multiple matches. Release validation accepts
multiple assets and duration mismatches. Playback then refuses or falls back
when it receives that supposedly valid pack.

**Required fix:** v1 allows at most one asset for a segment and requires exact
duration compatibility. Enforce that invariant in authoring, review,
publisher, release validation, and runtime tests.

#### 9. Contest evidence can claim a future reporting period

**Evidence:** `packages/contracts/src/validator.ts:2246`

`generatedAt` is validated but not compared with the reporting-period end.
The synthetic fixture is generated January 1 while claiming coverage through
January 31, and validation returns success.

**Required fix:** every evidence period must end on or before `generatedAt`.

#### 10. Host-page DOM cannot be the authoritative safety surface

**Evidence:** `apps/extension/content.js:13-51` on the W3 worktree

The extension appends its status UI into the page, where site CSS or scripts
can hide or remove it. The observer rebinds media but does not guarantee that
the safety UI remains visible.

**Required fix:** use browser-controlled UI—a side panel, extension action,
badge, or popup—as the authoritative state. A page overlay may remain as
best-effort UI, preferably isolated with Shadow DOM and removal monitoring.

#### 11. The renderer and YouTube adapter have no production callers

**Evidence:**

- W3 `apps/extension/content.js:73-83`
- W2 `apps/pwa/src/main.ts`

The extension discards media time and source and always shows a static no-pack
message. The PWA never mounts `createSignSurface`. The underlying adapter,
runtime, storage, and renderer modules exist, but the applications do not
connect them.

**Required fix:** build and test the complete call chain:

```text
video adapter -> media sample -> runtime -> verified pack storage
              -> playback state -> renderer -> visible fallback/status
```

#### 12. Synthetic motion is not frame-exact

**Evidence:** W2 `apps/pwa/src/main.ts:156-180`

Motion is updated through sparse lifecycle and `timeupdate` events while the
SVG runs its own timeline. Playback-rate changes are not included.

**Required fix:** drive rendering from actual media-frame callbacks through the
existing adapter/controller. Freeze into a caption-preserving state for any
unsupported rate or media condition.

#### 13. Reviewer and publisher applications are unimplemented

The W5 branch contains planning/documentation but no reviewer application.
`apps/reviewer/` and `packages/signpack-publisher/` have no completed product
path. The demo's claimed review queue and refusal publisher therefore do not
exist end to end.

**Required fix:** implement an honest empty/blocked reviewer queue and a strict
publisher whose central behavior is refusal when approval, rights, hashes, or
reviewer authority are incomplete.

#### 14. The private personal vault can be released accidentally

**Evidence:**

`/Users/omar/Downloads/Claude/Gemini Hackathon/personal-monorepo-template/.github/workflows/package.yml:64-105`

The release workflow archives most of a repository intended to contain people,
emails, sources, and project state.

**Required fix:** separate the reusable template from the private populated
vault, disable releases in private clones, and package from an explicit
allowlist with a privacy scanner.

#### 15. Personal-vault generators permit path traversal

**Evidence:**

- `.codex/skills/new-person/scripts/new_person.py:35-46`
- corresponding new-project script

An explicit slug can contain `../../` and escape the vault; `--force` can then
overwrite a target.

**Required fix:** normalize explicit and generated slugs, resolve the target,
and require `target.is_relative_to(allowed_root)` before writing. Test absolute,
parent-traversal, symlink, and overwrite cases.

#### 16. The untracked dataset memo is unsafe as operational guidance

**Evidence:** `docs/DATASET_ASL.md`

The memo labels datasets too broadly as open source, includes an unverified
WLASL loading example, and promotes generation/translation beyond what the
sources safely support.

**Required fix:** keep `docs/data-and-model-strategy.md` authoritative. Rewrite
or remove the memo only after dataset-by-dataset verification of license,
consent, intended task, redistribution rights, and deployment rights. The file
was user-owned and untracked during this review and was not modified.

#### 17. Business viability is a scored requirement, not an optional deferral

**Evidence:** `docs/current-state-brief.md:248-250`

The current brief describes near-zero business viability as a deliberate
non-defect. The local hackathon overview makes business viability approximately
one-third of the judging score.

**Required fix:** the human owner must gather real, consented pilot evidence;
document monthly revenue or a defensible zero-revenue path, expenses, customer
and marketing strategy, and production proof. Agents must not fabricate users,
testimonials, outreach, or sales.

### P2 — important hardening

1. Re-render sign-surface geometry after `loadedmetadata` and resize. W2
   `packages/renderer/src/signSurface.ts:117-129` reads dimensions too early.
2. Make generic-site permission durable across navigation and reload, and
   select the primary YouTube player rather than the first `<video>` element.
3. Expand `tools/verify-baseline.mjs` dependency scanning beyond `.ts` to
   `.tsx`, `.js`, and `.mjs`, and make its success wording accurate.
4. Replace mutable `latest` container tags and unpinned bases with commit or
   digest references, provenance, and an SBOM.
5. Derive metrics from durable review events. `recordReviewOutcome` has no
   application caller, while `/metrics` resets with each process.
6. Restore the PWA file input in a `finally` block if verified import throws.
7. Reduce the personal-template workflow's default permissions, run its tests,
   replace the remaining Jason-specific identity, and recreate its malformed
   virtual environment.

---

## Product-state matrix

| Surface | Current assessment | Strategy implication |
| --- | --- | --- |
| Contracts, sync, runtime, storage | Strong prototype and heavily tested | Preserve APIs where possible; redesign release binding explicitly |
| Authoring service | Implemented and documented; unsafe public boundary | Harden before exposing a judge route |
| Renderer | Implemented on W2; not mounted by the PWA | Integration and browser evidence required |
| YouTube adapter and extension | Implemented on W3; content script is static | Complete call chain and host-safety UI required |
| Reviewer console | Not implemented | Fable's bounded implementation workstream |
| SignPack publisher | Not implemented | Claude-owned refusal-first workstream |
| Real ASL and reviewer evidence | Absent by design | Hard human gate; no synthetic substitute |
| Business evidence | Absent/open | Human owner lane, started immediately |
| Personal vault | Separate functional skeleton | Privacy hardening before population or release |

Do not confuse any of these states:

- implemented in a feature worktree;
- integrated into a temporary merged tree;
- merged into `main`;
- pushed to a remote branch;
- covered by an open pull request;
- deployed;
- verified live;
- approved for public claims.

---

## Verification evidence from the review

No repository files were changed during the audit.

### SignBridge primary checkout

- `node tools/verify-baseline.mjs`: passed.
- Required files: 62.
- Package manifests: 2.
- Approved development tools: 4.
- Playback sources checked: 15.
- Controlled fixtures: 7.
- Repository files included by the check: 116.
- `pnpm typecheck`: passed.
- Targeted contract, synchronization, runtime, and storage tests: 76/76 passed.

### Additional branch evidence

- Authoring branch: baseline, typecheck, build, 18/18 foundation tests, and
  97/97 Vitest tests passed during the review.
- W2 renderer: generated motion, baseline, typecheck, build, 110/110 applicable
  unit tests, 18/18 foundation tests, and the 16.04 kB compressed budget check
  passed.
- W3 extension: baseline, typecheck, build, and 92/92 applicable tests passed.
- Isolated authoring + W2 + W3 merge: only `HANDOFF.md` conflicted; baseline,
  typecheck, build, bundle budget, and 117/117 applicable tests passed after a
  review-only conflict resolution.
- Personal vault: `.venv/bin/python -m pytest -q` passed 3/3 tests. The direct
  `.venv/bin/pytest` launcher is malformed because its interpreter path contains
  an extra space.

### Unverified external or visual state

The review did not verify current:

- GitHub pull-request or CI state;
- Cloud Run behavior or deployment revision;
- Workspace Agent API channels;
- a merged browser end-to-end flow;
- screenshot-based UI, responsive, or accessibility behavior;
- real YouTube interaction;
- reviewer, signer, consent, rights, pilot, or revenue evidence.

These items are `not inspected` or `not established`, not failed and not
confirmed. Obtain explicit permission before any outbound check, browser
listener, external call, deployment, merge, or agent-channel mutation.

---

## Recommended v1 architecture

```text
Educational source video
        |
        v
Trusted gateway
  - authenticates or quotas the caller
  - generates IDs and sequence values
  - derives the deployment environment
        |
        v
Server-owned catalog retrieval
  - signed language and region
  - rights and consent status
  - exact media hashes
  - timing and presentation compatibility
        |
        v
Gemini constrained reranker / abstention
  - selects only from the trusted catalog
  - cannot approve or publish
  - records truthful execution provenance
        |
        v
Durable proposal and run ledger
        |
        v
Qualified Deaf reviewer
  - sees full source and proposal context
  - signs the exact ReviewUnitV2 hash
        |
        v
Strict publisher
  - revalidates hashes, rights, reviewer authority, and compatibility
  - refuses on every mismatch or missing gate
        |
        v
Content-addressed SignPack
        |
        v
Offline PWA and browser extension
  - media-clock synchronized
  - captions always preserved
  - visible unsupported and integrity-failure states
```

Gemini is a constrained reranker over a known, rights-cleared catalog. It is
not a translator, sign generator, reviewer, or publisher.

---

## Model and data strategy

### V1 recommendation

Train no model for v1.

Commission a small golden pack:

- one source lesson lasting roughly three to five minutes;
- about 30–60 semantic segments;
- about 20–40 reusable signing clips;
- one rights-cleared signer;
- one qualified Deaf reviewer;
- explicit unsupported/fallback segments;
- exact consent, rights, and file-hash records kept outside the public repo.

### Dataset boundaries

- **ASL Citizen:** optional dictionary-retrieval research only. It contains
  isolated fixed-vocabulary signs and is not evidence for continuous
  translation, coarticulation, spatial grammar, or nonmanual behavior.
- **ASL STEM Wiki:** useful as workflow or evaluation evidence, subject to its
  restrictive/non-commercial terms; do not place its media in SignPacks without
  a compatible grant.
- **PopSign:** potentially useful research material only after rights and
  consent verification.
- **WLASL, MS-ASL, How2Sign, OpenASL, and YouTube-derived ASL:** recognition or
  translation research inputs, not automatically deployable media.
- **Non-ASL corpora such as RWTH German Sign Language:** not substitutes for
  ASL and not appropriate for the v1 language path.
- **Generated avatars, pose animation, or text-to-sign video:** out of scope for
  v1.

### Later learned model

Only after accumulating thousands of append-only adjudicated decisions,
consider a calibrated reranker with a strong abstention policy.

Training records should distinguish:

- accepted top-one;
- accepted from top-k;
- changes requested;
- rejected;
- false-supported;
- unsupported confirmed;
- reviewer disagreement.

Evaluation must group-split by source lesson/video, signer, and recording
session to prevent leakage. Track:

1. false-supported rate as the primary safety metric;
2. top-k recall;
3. calibration error;
4. coverage versus risk;
5. reviewer disagreement;
6. language, region, topic, signer, session, and device slices.

Record the model, prompt, catalog/index, and schema versions. Introduce any new
model in shadow mode as a challenger; never auto-publish its output.

---

## Proposed strategy skeleton for Fable to refine

### Wave 0 — freeze and repair the release contract

Run at most these three workstreams concurrently in fresh isolated worktrees.

| Agent | Exclusive scope | Deliverable | Independent review |
| --- | --- | --- | --- |
| Claude acting as architect | New contract/design branch; exact paths chosen before work | `ReviewUnitV2`, canonical hashing, compatibility rules, durable-ledger interfaces, refusal-test matrix | Codex |
| Gemini / Antigravity | `services/authoring/` only | Closed input schema, server-owned authority, truthful provenance, durable runs, UTF-8 repair, production-grade quota boundary | Claude |
| Codex | W2/W3 integration paths assigned without overlap | Mounted PWA renderer, wired extension adapter/runtime/storage, media-frame timing, host-safe status surface, browser E2E | Fable for UX; Claude for code |

**Wave 0 gate:** no merge proposal until a temporary merged tree passes the
full native suite and a browser test proves the application call graph crosses
the new modules. Unit tests that import an otherwise unused module are not
integration evidence.

### Wave 1 — build the human and release surfaces

Start only after Wave 0's contracts stabilize.

| Agent | Exclusive scope | Deliverable | Independent review |
| --- | --- | --- | --- |
| Fable | `apps/reviewer/`, bounded reviewer tests | Accessible read-only queue, full context, exact-hash decisions, truthful empty/blocked state, no fabricated identity | Codex accessibility and security pass |
| Claude | `packages/signpack-publisher/` and publisher tests | Refusal-first publisher covering absent reviewer, incomplete review, hash mismatch, withdrawn asset, incompatible rights, invalid timing, and language mismatch | Codex |
| Codex | Storage/cache paths assigned before work | Offline media cache, quota UX, corruption recovery, verified deletion, content-address enforcement | Claude |

### Human-owner lane — begins immediately and never delegates authority

The owner must:

1. Appoint and compensate a qualified Deaf ASL reviewer.
2. Select a signer and establish consent and media rights.
3. Define the exact ASL community, regional, and educational scope.
4. Choose the short source lesson and golden-pack topic.
5. Establish a private evidence system for rights, compensation, conflicts,
   pilot records, and identities.
6. Run a consented user pilot.
7. Document funding, monthly revenue or zero-revenue status, expenses,
   customer need, and marketing route.
8. Approve every public claim, demo, deployment, and submission.

Agents must not send email, direct messages, forms, reviewer outreach, sales
messages, or contest submissions.

### Merge policy

Fable should propose a concrete merge order based on dependencies, but retain
these rules:

1. Never merge directly to `main` from an agent worktree.
2. Recheck current remote and PR state before relying on the dated snapshot.
3. Resolve `HANDOFF.md` centrally; do not let a branch restore stale claims.
4. Verify the merged tree, not only each source branch.
5. Every merge needs an independent moderator pass.
6. A red branch remains isolated.
7. No production deployment without explicit approval in the current session.

---

## Workspace Agent API trigger strategy

Do not create or call a Workspace Agent API channel during the strategy pass.
If the owner later authorizes agent automation:

1. Resolve the coordinator agent ID and inspect its active published channels.
2. Use the exact returned `agtch_...` channel ID; never invent one.
3. Start with one coordinator channel, not a reviewer or publisher channel.
4. Keep bearer tokens outside the repository, prompts, artifacts, and logs.
5. POST the required `input`, an optional stable `conversation_key`, and an
   `Idempotency-Key`.
6. Maintain a separate durable controller ledger containing event ID, payload
   hash, status, attempts, timestamps, checkpoint commit, and artifact URL.
7. Treat HTTP 202 as accepted ingress only. It is not task completion and does
   not by itself provide a run ID or output-retrieval contract.
8. Retry 429 and 503 according to `Retry-After` with the same idempotency key.
   Bound retries for 500. Surface 401, 403, 404, and 409 distinctly.
9. Never automate qualified-human approval, rights authorization, publishing,
   public deployment, or contest submission.

---

## Hackathon critical path

The local contest overview states a submission deadline of **2026-08-17 at
13:00 Pacific**, with judging from August 18 through September 15. Reverify the
current official rules before submission or public claims.

The strategy should optimize for this truthful demo:

1. A judge opens a public, rate-limited route with no secret or account.
2. A short source segment enters the trusted authoring boundary.
3. Gemini reranks a constrained synthetic or approved candidate set and may
   visibly abstain.
4. The proposal appears in an honest reviewer queue.
5. The publisher visibly refuses because the qualified-human/rights gates are
   absent, or publishes only an actually approved golden pack.
6. The PWA or extension follows the real media clock and preserves captions.
7. All abstract motion is clearly labelled synthetic test material and never
   described as signing.
8. The demo explains production infrastructure, real costs, user need, pilot
   evidence, and business path without fabricating evidence.

The submission also needs a public repository, licensing and pre-existing-work
disclosure, a demo under three minutes, funding disclosure, revenue/month,
expenses, marketing strategy, real user evidence with consent, and production
proof. Fable must distinguish what engineering can deliver from what only the
owner can establish.

---

## Moderator review inherited from the audit

```text
╔════════════════════════════════════════════════════════════╗
║ MODERATOR REVIEW                                           ║
╠════════════════════════════════════════════════════════════╣
║ [BLOCK] Incomplete decision binding and unsafe API trust   ║
║ [BLOCK] Incompatible multi-asset authoring/runtime contract║
║ [BLOCK] Renderer and extension are not integrated          ║
║ [BLOCK] Reviewer, publisher, rights, and ASL review absent ║
║ [BLOCK] Private vault packaging and traversal risks        ║
║ [WARN] Rate limits, provenance, evidence time, mutable tags║
║ [WARN] Business evidence and live verification incomplete ║
║ [NIT]  Stale identity/docs and broken venv launcher        ║
║ [IDEA] Calibrated reranker after adjudicated data exists   ║
╠════════════════════════════════════════════════════════════╣
║ Verdict: NEEDS_FIXES                                       ║
╚════════════════════════════════════════════════════════════╝
```

---

## Non-negotiable claims boundary

### Safe to say after re-verification

- SignBridge is a language-specific overlay protocol and offline playback
  architecture.
- The prototype preserves captions and explicit fallback states.
- Gemini proposes from constrained candidates and can abstain.
- Synthetic abstract motion can demonstrate synchronization without pretending
  to be signing.
- Human review, rights, and exact-hash publication are intended release gates.

### Do not say without new evidence

- The product translates arbitrary video into ASL.
- The product supports universal sign language.
- Any current asset is approved ASL.
- A qualified Deaf reviewer has approved the system or content.
- The browser extension is end-to-end functional on live YouTube.
- The reviewer console or strict publisher is complete.
- A passing unit suite proves production behavior.
- HTTP 202 proves a Workspace Agent completed a task.
- A deployment, PR, CI run, user pilot, testimonial, revenue figure, or dataset
  right is current unless it is separately verified.

---

## Retrospective rule to carry into the strategy

**Worked:** contract-to-runtime adversarial probes exposed defects that isolated
unit tests missed.

**Did not work:** permission boundaries prevented screenshot-based browser QA
and current cloud, GitHub, and agent-channel inspection.

**Rule:** do not recommend a merge until the application call graph proves each
new module is used and an end-to-end test crosses it.

---

## First response requested from Fable

Before any implementation, Fable should return:

1. The proposed critical path and the one highest-risk assumption.
2. A maximum-three-agent Wave 0 table with exact worktree, branch, directory
   scope, deliverable, verification commands, and moderator.
3. The contract decision for `ReviewUnitV2` and who owns it.
4. The end-to-end acceptance scenario that proves the renderer and extension
   are no longer dead code.
5. The reviewer-console state model and accessibility acceptance criteria.
6. The publisher refusal matrix.
7. The human-owner decisions required in the next 48 hours.
8. The items that must remain blocked even if the deadline approaches.

Fable should then wait for owner approval before starting or routing any
write-capable implementation.
