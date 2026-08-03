# Fable strategy — coordinated agent plan after the NEEDS_FIXES audit

**Prepared:** 2026-08-02 by Fable 5, read-only strategy coordinator
**Last updated:** 2026-08-03 — Wave 0 contract workstream delivered
**Input:** `docs/fable-agent-strategy-handoff.md` (audit at `55bee16`,
verdict `NEEDS_FIXES`)
**Status:** in progress. One of three Wave 0 workstreams is complete on its
own branch. Nothing is merged, no branch is deleted, and no deployment has
changed. Every remaining write-capable task starts only on the owner's "go".
**Companion:** `docs/agent-briefs.md` carries the paste-ready per-agent briefs
that implement this strategy.

---

## 0. Status — 2026-08-03

| Workstream | Agent | State | Evidence |
| --- | --- | --- | --- |
| C1 contract repair | Claude | **Delivered**, unmerged | `claude/w0-reviewunit-v2-20260802` at `2ae87fb` |
| A1 authoring boundary | Gemini | Not started — unblocked | branch not yet cut |
| I1/I2 integration | Codex | Not started — needs base | `integration/wave0-base` not yet cut |
| R1 reviewer console | Fable | Wave 1, correctly blocked | — |
| P1 refusal publisher | Claude | Wave 1, correctly blocked | spec written |
| Vault privacy fixes | Claude | Not started | separate repository |
| Human-owner lane | Owner | Open | §11 |

**C1 verification, measured on its branch:** foundation baseline passed
(67 required files, 19 playback sources, 124 tracked files), lint, strict
typecheck, 20/20 foundation tests, 117/117 Vitest tests, build green at
9.21 kB gzipped. No browser or deployment claim is made or implied.

**What C1 changed in this plan's assumptions.** Two of the audit's fixtures
turned out to encode the very defects under repair — a 1000 ms asset paired
with a 10000 ms segment, and a January evidence period generated before it
ended — so they were corrected rather than exempted. Widening the foundation
dependency scan (P2 #3) proved larger than a wording tidy: the playback-source
count rose from 15 to 19, meaning four files in the dependency-free playback
path had never been read by the check at all. Treat any earlier "playback
imports are clean" statement as covering only the 15 files then scanned.

**One thing the owner did not ask for and should know about.** Commit
`15b95c9`, which carried this plan into the repository, also placed
`docs/DATASET_ASL.md` under version control. The audit recorded that file as
user-owned, untracked, and unsafe as operational guidance until each dataset's
licence, consent, intended task, redistribution rights, and deployment rights
are verified one by one. It is now tracked on
`feat/authoring-integrity-hardening` and inherited by every branch cut from it.
`git rm --cached docs/DATASET_ASL.md` reverses that. No agent has modified the
file's contents.

---

## 1. Executive decision (one page)

The audit verdict stands: `NEEDS_FIXES`. The prototype layers (contracts,
sync, runtime, storage, authoring service, renderer, adapter) are strong, but
the product is three integrations and one contract short of being truthful:

1. **The release contract is too weak.** `decisionHash` does not bind the full
   review unit, authoring/release/playback disagree about multi-asset packs,
   and evidence periods can claim the future. Everything downstream signs a
   hash that does not mean what it must mean. **This is fixed first.**
2. **The trust boundary is open.** The public authoring route accepts
   malformed input, caller-supplied authority, spoofable rate limits, corrupt
   UTF-8, false provenance, and vanishing failed runs.
3. **The visible product is dead code.** The renderer is not mounted by the
   PWA; the extension discards media time and shows a static message. No
   browser test crosses the call chain.
4. **The human surfaces do not exist.** `apps/reviewer/` and
   `packages/signpack-publisher/` are README stubs, yet they are the demo's
   central honest claim.

**Decision:** run two waves, at most three concurrent write agents each.
Wave 0 repairs the contract, the boundary, and the integration — in that
dependency order. Wave 1 builds the reviewer console and the refusal-first
publisher on top of the repaired contract. Fable writes nothing in Wave 0
(moderation and UX review only) and implements `apps/reviewer/` in Wave 1.
The human-owner lane starts immediately and is never delegated.

**The one highest-risk assumption:** that the W2 renderer, W3 extension, and
the authoring line actually compose into a working browser call chain. The
audit's temporary merge passed unit suites, but **no browser end-to-end test
has ever crossed these modules**. If integration fails late, the demo has no
visible product. That is why Codex's integration workstream runs in Wave 0,
not after the human surfaces.

**Critical path:** ReviewUnitV2 contract → authoring hardening + W2/W3
integration (parallel) → reviewer console + publisher (parallel) → merged-tree
verification → owner-recorded demo. Business evidence and rights are on the
owner's clock from day one and gate claims, not code.

---

## 2. Dependency graph

```
CONTRACT                    BOUNDARY & INTEGRATION          HUMAN SURFACES
────────                    ──────────────────────          ──────────────
C1 ReviewUnitV2 ──────┬──► A1 authoring hardening ────┐
   canonical hash     │      (adopts C1 hash)         │
   single-asset v1    │                               ├──► R1 reviewer console
   evidence-period    ├──► I1 PWA renderer mount      │      (signs C1 hash)
   fix                │      media-frame timing       │
                      └──► I2 extension call chain ───┤──► P1 refusal publisher
                             host-safe status UI      │      (revalidates C1)
                             browser E2E              │
                                                      └──► S1 offline media
                                                             cache (Wave 1)
HUMAN-OWNER LANE (starts now, gates claims, never blocks code):
  H1 reviewer appointment · H2 signer + rights · H3 business evidence
  H4 pilot · H5 submission — owner only, agents never touch these.
```

C1 blocks A1's hash adoption and both Wave 1 streams. I1/I2 need only the
single-asset invariant from C1 and can start against its draft. Nothing in
Wave 1 starts until the Wave 0 gate (§6) passes on a merged tree.

---

## 3. Wave allocation

### Wave 0 — freeze and repair the release contract (3 writers)

| Agent | Worktree | Branch | Exclusive scope | Deliverable | Moderator |
| --- | --- | --- | --- | --- | --- |
| **Claude** (architect + integrator) | `.worktrees/signbridge-overlay/w0-contracts` (new) | `claude/w0-reviewunit-v2-20260802`, base `feat/authoring-integrity-hardening` | `contracts/`, `packages/signpack-schema/`, `docs/decisions/` | ReviewUnitV2 schema + canonical hashing, single-asset v1 invariant, evidence-period fix, durable-ledger interfaces, refusal-test matrix (spec) | Codex |
| **Gemini / Antigravity** | `.worktrees/signbridge-overlay/w0-authoring` (existing) | `gemini/w0-authoring-hardening-20260802` (new), base `feat/authoring-integrity-hardening` | `services/authoring/` only | Closed input schema, server-owned authority, trusted-proxy quota, truthful provenance, durable run records, UTF-8 repair; adopt ReviewUnitV2 hash when C1 stabilises | Claude |
| **Codex** | `.worktrees/signbridge-overlay/w0-integration` (new) | `codex/w0-integration-20260802`, base `integration/wave0-base` (integrator-cut merge of authoring line + W2 + W3, owner-approved) | `apps/pwa/`, `apps/extension/`, `packages/video-adapters/`, `packages/renderer/` (integration-necessary fixes only), `tests/e2e/` | Mounted PWA renderer on media-frame callbacks, wired extension adapter→runtime→storage→renderer chain, browser-controlled status UI, Playwright E2E proof | Fable (UX) + Claude (code) |

**Fable in Wave 0: read-only.** Moderates gates, reviews Codex's UX and
accessibility, arbitrates contract questions. No worktree, no writes.

### Wave 1 — build the human and release surfaces (3 writers)

Starts only after the Wave 0 gate passes. Branch dates are set on the day the
branch is cut.

| Agent | Worktree | Branch | Exclusive scope | Deliverable | Moderator |
| --- | --- | --- | --- | --- | --- |
| **Fable 5** | `.worktrees/signbridge-overlay/w5-reviewer` (existing, new branch) | `fable/w5-reviewer-<YYYYMMDD>`, base = post-Wave-0 integration branch | `apps/reviewer/`, `tests/reviewer/` | Accessible read-only queue with truthful `empty` / `blocked_no_reviewer` states, full context display, exact ReviewUnitV2-hash decisions, no fabricated identity | Codex (accessibility + security) |
| **Claude** | `.worktrees/signbridge-overlay/w6-publisher` (new) | `claude/w6-publisher-<YYYYMMDD>` | `packages/signpack-publisher/` + its tests | Refusal-first publisher; every row of the refusal matrix (§9) proven by test; refusal is the live demo path | Codex |
| **Codex** | `.worktrees/signbridge-overlay/w8-storage` (new) | `codex/w8-storage-<YYYYMMDD>` | `packages/pack-storage/` | Offline media cache, quota UX, corruption recovery, verified deletion, content-address enforcement | Claude |

Gemini is on call in Wave 1 for authoring defects surfaced by review; it opens
no new scope.

---

## 4. Verification gates (command-level, every workstream)

Universal, run inside the agent's own worktree:

```bash
node tools/verify-baseline.mjs
node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
  signbridge-overlay --worktree <slug>
```

Workstream-specific acceptance tests:

**C1 — contracts (Claude). All gates met on `2ae87fb`.**
- Adversarial hash probe: eleven single-field variations — timed text, source
  fingerprint, segment start, segment end, signed language, region, catalog
  version, candidate set, selected asset, run identity, proposal identity —
  each change the ReviewUnitV2 hash. Kept permanently in
  `packages/signpack-schema/src/reviewUnit.test.ts`, alongside key-order
  independence, hash stability, and refusal to canonicalise an invalid unit.
- Evidence-period regression: a period ending after `generatedAt` fails with
  `evidence_period`; a period ending exactly at it passes.
- Single-asset invariant: two assets for one segment fails with
  `multi_asset_violation`; a duration mismatch fails with `asset_duration`.
- Foundation scan: a non-relative import from a `.js`, `.mjs`, or `.tsx` file
  in the playback path now fails the check, proven per extension.

**A1 — authoring (Gemini).** `curl`-level probes against a locally running
service, each encoded as a test:
- Missing language/region, duplicate candidate IDs, oversized body → 400
  before any model or cost is invoked.
- 61 requests rotating `X-Forwarded-For` → still 429 (only the configured
  proxy chain is trusted); the quota store is bounded and TTL'd.
- A request body splitting a multibyte UTF-8 character across chunks → decoded
  correctly (identical timed-text hash to the unsplit request) or rejected;
  oversize → clean 413.
- Deterministic-fallback run → provenance records its own generator identity
  and `executionMode`; no Gemini model metadata is populated.
- A forced engine failure → the HTTP response carries a durable reference to
  an append-only run record; success, abstention, and failure all persist.
- Caller-supplied `packId`/`segmentId`/sequence/environment/catalog →
  ignored or rejected; the server generates IDs and derives environment.

**I1/I2 — integration (Codex).** Playwright, run headed at least once:
- PWA: fixture video + synthetic `zxx`/`ZZ` pack → `createSignSurface` is
  mounted; motion follows the real media clock through seek, pause, and rate
  change (media-frame callbacks, not `timeupdate`); an unsupported rate
  freezes into a caption-preserving state; corrupting the pack yields a
  visible integrity-failure state, never a blank.
- Extension: loaded unpacked in Chromium against a fixture page; the adapter
  samples real media time and source fingerprint; authoritative status lives
  in browser-controlled UI (action badge/popup/side panel), with the page
  overlay best-effort in Shadow DOM; SPA-style source replacement invalidates
  the fingerprint and the status visibly changes.
- The Wave 0 gate test: the E2E trace demonstrates the application call graph
  crossing adapter → runtime → storage → renderer. A unit test importing an
  otherwise-unused module is not integration evidence.

**R1 — reviewer (Fable).** State model in §8; keyboard-only traversal of every
state; screen-reader name/role/state assertions; a test proving identity,
compensation, and conflict data never reach URLs, logs, or exports; decisions
reference the exact ReviewUnitV2 hash and nothing weaker.

**P1 — publisher (Claude).** Every refusal-matrix row (§9) has a test that
fails if the publisher emits a pack; the only success-path test uses a fully
approved synthetic fixture and verifies content addressing.

**S1 — storage (Codex).** Hash on write, rehash on read, idempotent identical
bytes, no silent overwrite, quota exhaustion and interrupted import produce
recoverable states, deletion is verified.

---

## 5. Branch disposition (proposal — owner approves before anything is deleted)

| Branch | State (verified 2026-08-02) | Disposition |
| --- | --- | --- |
| `claude/w0-reviewunit-v2-20260802` | **New 2026-08-03.** C1 delivered at `2ae87fb`; full local gate green | **Merge #1** into `integration/wave0-base`, after Codex's review |
| `feat/authoring-integrity-hardening` | 8 ahead of `main` at audit; +1 docs commit `15b95c9` since; most current line | **Wave 0 base** for C1 and A1 |
| `gemini/w0-authoring-20260802` | Ancestor of `feat/authoring-integrity-hardening` | **Superseded**; retire once the new Gemini branch exists |
| `codex/w2-renderer-20260729` | +2,404 lines vs current tree; renderer + synthetic motion | **Integrate** into `integration/wave0-base`; frozen (no new commits) once the base is cut |
| `codex/w3-extension-20260729` | +1,070 lines vs current tree; MV3 extension + YouTube adapter | **Integrate** into `integration/wave0-base`; frozen once the base is cut |
| `codex/signpack-contracts-20260728` | Stale snapshot ~10k lines behind current tree | **Superseded**; archive |
| `codex/gate1-governance-20260728` | 1 docs commit ahead of `main` | Integrator inspects; fold into docs or archive |
| `chore/gate0-hardening`, `codex/goal2-playback-core-20260728`, `codex/w0-authoring-20260729`, `codex/w5-reviewer-20260729`, `docs/planning-and-agent-orchestration`, `feat/goal2-playback-core` | Already contained in `main` | **Delete after owner approval** |

The audit resolved the `integration/wave0-base` merge once already: only
`HANDOFF.md` conflicted, and the merged tree passed baseline, typecheck,
build, bundle budget, and 117/117 applicable tests. The integrator resolves
`HANDOFF.md` centrally; no branch may restore stale claims.

Note: the local branch snapshot is dated. **Recheck remote and PR state on
GitHub before acting on this table** — the audit did not verify current CI or
PR status.

---

## 6. Merge order and rollback rule

1. `claude/w0-reviewunit-v2-20260802` → `integration/wave0-base` (contract
   first; everything downstream consumes it). **Ready as of 2026-08-03**,
   pending the base cut and Codex's independent review.
2. `gemini/w0-authoring-hardening-*` → same base (adopts the C1 hash).
3. `codex/w0-integration-*` → same base (its E2E suite must pass against 1+2).
4. **Wave 0 gate:** on the merged base — `verify-baseline`, `pnpm verify`,
   bundle budget, and the Playwright E2E crossing the new modules, all green.
   Then, with owner approval, base → `main` via reviewed PR.
5. Wave 1 branches merge in dependency order: reviewer → publisher → storage,
   each gated the same way.

Rules retained from the handoff, verbatim in force: never merge to `main`
from an agent worktree; verify the merged tree, not only each branch; every
merge needs an independent moderator pass; a red branch stays isolated; no
production deployment without explicit approval in the current session.

**Rollback rule:** if `main` (or the integration base) goes red, revert the
merge first and diagnose second. The reverted branch returns to its worktree
and re-enters the queue behind whatever exposed it.

---

## 7. ReviewUnitV2 — contract decision and owner

**Owner: Claude**, as architect and integrator. **Delivered 2026-08-03** in
`contracts/review-unit.schema.json` and
`packages/signpack-schema/src/reviewUnit.ts`, recorded as ADR 0005. Gemini and
Fable consume; they do not define.

The versioned canonical hash binds: schema version; proposal and run ID; pack
and segment ID; source fingerprint; timed-text hash; exact segment range;
signed language and region; catalog version and candidate-set hash; selected
asset hashes (at most one per segment in v1, exact duration equality); and
presentation state, with `cropped`, `mirrored`, and `transformed` all required
false. Human approval signs exactly this hash, and any material change
invalidates it.

Two decisions worth carrying forward. The review unit is versioned `2.0.0`
**independently of the SignPack schema**, because what approval binds and how
packs are formatted are different kinds of change. And canonicalisation is
fixed by the implementation and documented in the ADR — explicit field order,
base-ten integers, `JSON.stringify` string escaping with no normalisation, and
absent optional fields emitted as `null` rather than omitted — so "absent" and
"present but empty" cannot collide. `canonicalizeReviewUnit` validates first
and throws on an invalid unit rather than returning an authoritative-looking
hash. Hashing uses WebCrypto, keeping the package dependency-free on both the
Node targets and the browser.

---

## 8. Reviewer-console state model (Wave 1, Fable)

States, all truthful, all reachable by keyboard, all announced to screen
readers:

- `empty` — no proposals exist. Says so plainly.
- `blocked_no_reviewer` — proposals exist but no qualified reviewer is
  appointed. All decision actions disabled, with the reason displayed. **This
  is the demo state.**
- `in_review` — a proposal is open, showing with nothing hidden: source
  context, captions, proposal status, signing-media slot, timing, rights
  state, prior decisions, and the ReviewUnitV2 hash being decided.
- `decided` — approve / changes_requested / rejected / unsupported_confirmed,
  visually distinct, not conveyed by colour alone, reversible before
  publication.

Accessibility acceptance: full keyboard operation; programmatic names, roles,
states; visible focus; no traps; 44×44 px targets; operable at 320 px width
and 200 % zoom; reduced-motion and high-contrast support; no audio cues.
Identity, compensation, and conflict data never appear in URLs, client logs,
screenshots, or exports — proven by test.

---

## 9. Publisher refusal matrix (Wave 1, Claude)

Each row is a distinct structured refusal code with a test proving refusal:

| # | Condition | Refusal |
| --- | --- | --- |
| 1 | No appointed reviewer / no reviewer authority record | `absent_reviewer` — the live demo path |
| 2 | Review unit incomplete or hash unsigned | `incomplete_review` |
| 3 | Any hash mismatch: media bytes, decision, review log, asset ledger | `hash_mismatch` |
| 4 | Asset withdrawn at publish time (checked atomically) | `withdrawn_asset` |
| 5 | Rights grant absent or not covering the requested purpose | `incompatible_rights` |
| 6 | Timing invalid or asset/segment duration mismatch | `invalid_timing` |
| 7 | Signed language or region mismatch between pack and review unit | `language_mismatch` |
| 8 | More than one asset per segment (v1 invariant) | `multi_asset_violation` |
| 9 | Evidence period ending after `generatedAt` | `invalid_evidence_period` |
| 10 | Unknown or superseded schema version | `schema_version_mismatch` |

The publisher may never infer a sign, approve a proposal, repair missing
rights evidence, or silently downgrade unsupported content.

---

## 10. Risk register

| Risk | Impact | Owner | Mitigation |
| --- | --- | --- | --- |
| W2/W3/authoring do not compose in a real browser | Demo has no visible product | Codex (build), Fable (gate) | Integration runs in Wave 0; E2E is the gate, not a follow-up |
| ~~ReviewUnitV2 lands late and forces rework~~ | — | Claude | **Retired 2026-08-03**: contract delivered before either dependent stream began |
| Delivered-but-unmerged work is mistaken for integrated work | False confidence in status reports | Fable | §0 states branch and commit for every claim; "delivered" never means merged, deployed, or browser-verified |
| Authoring hardening breaks the deployed Cloud Run judge route | Eligibility evidence regresses | Gemini + owner | No redeploy without owner approval; deployed revision untouched until merged tree is green |
| An agent fabricates signing media or review evidence under deadline pressure | Worse than not shipping | Every moderator | §12 blocked list; foundation checks; cross-vendor review |
| Business viability scores near zero | Loses ~⅓ of judging score | **Owner only** | H3 lane starts now; agents must not fabricate evidence |
| Branch snapshot is stale vs GitHub | Wrong supersession action | Claude (integrator) | Recheck remote/PR/CI state before executing §5 |
| Two writers touch one path | Hard to unwind | All | Exclusive scopes in §3; report-don't-change rule |
| Building past done instead of freezing | Missed submission | Owner | Execution-plan §9 freeze rule stands |

---

## 11. Human decision queue (owner, next 48 hours)

1. **Cut `integration/wave0-base`** and release Gemini and Codex. C1 is
   delivered and no longer blocks anyone; the two remaining Wave 0 streams are
   waiting only on this.
2. Approve the branch dispositions in §5 (nothing is deleted before this).
3. Recheck GitHub PR/CI state so the integrator acts on current facts. Still
   unverified: no PR, CI, or remote state has been inspected in any session.
4. Decide the fate of `docs/DATASET_ASL.md`, which is **now tracked** (§0):
   leave it, remove it from version control, or rewrite it after
   dataset-by-dataset rights verification. Owner-owned; agents will not touch
   its contents.
5. Decide the reviewer-appointment path — or confirm the Tier-3 refusal demo
   as the submitted story (this decides Wave 1 claims).
6. Start the business-evidence file: funding disclosure (even if zero),
   expenses, customer need, marketing route; decide pilot vs. honest
   zero-user statement.
7. Schedule the personal-vault privacy fixes (release-workflow allowlist,
   path-traversal guard) — separate repository, outside every SignBridge
   agent's scope. Not started.

## 12. Blocked even if the deadline approaches

- Any video of a human appearing to sign; any generated/avatar signing.
- Any `ase` or real signed-language code in fixtures; any pack marked
  `published`, `human_reviewed`, or `approved`.
- Fabricated users, testimonials, pilots, revenue, outreach, or reviewer
  identities.
- Marking any `[HUMAN]` item complete; automating reviewer approval, rights,
  publishing, deployment, or contest submission.
- Weakening or deleting a test to go green.
- Creating or calling Workspace Agent API channels without owner
  authorization in the current session.
- Describing the product as universal sign language, an automatic
  interpreter, or a source of reviewed ASL.

## 13. Contest-readiness checklist

- [ ] Wave 0 gate green on merged tree (contract + boundary + E2E)
- [ ] Wave 1 gate green (reviewer console + refusal publisher + storage)
- [ ] Deployed judge route re-verified live after the merged tree ships
- [ ] `docs/judging-instructions.md` lets a judge exercise the pipeline unaided
- [ ] Demo < 3 min, recorded by owner, script checked against §14
- [ ] Funding disclosure complete (required even if zero)
- [ ] Business evidence stated honestly; nothing fabricated
- [ ] `PREEXISTING_ASSETS.md` and licensing disclosures current
- [ ] Accessibility status reported honestly (`not_evaluated` where unproven)
- [ ] Every surface states synthetic motion is not a signed language
- [ ] Submission by the evening of 2026-08-16 (deadline 2026-08-17 13:00 PT —
      reverify official rules first)

## 14. Claims boundary for the demo

**May say (after re-verification on the merged tree):** SignBridge is a
language-specific overlay protocol with offline playback; captions and
explicit fallback states are preserved; Gemini proposes from constrained
candidates and can abstain; the publisher visibly refuses because the human
gates are honestly open; synthetic abstract motion demonstrates
synchronization and is never described as signing.

**May not say without new evidence:** translates arbitrary video into ASL;
supports universal sign language; any asset is approved ASL; a qualified Deaf
reviewer approved anything; the extension is end-to-end functional on live
YouTube; a passing unit suite proves production behavior; any deployment, CI
run, pilot, testimonial, or revenue figure is current unless separately
verified.

---

## 15. Fix-to-agent assignment matrix

Every audit finding, assigned. Brief item IDs refer to `docs/agent-briefs.md`.
Status is as of 2026-08-03. "Delivered" means green on its own branch and
unmerged — never that it is integrated, deployed, or verified in a browser.

| Audit finding | Agent | Wave | Brief item | Status |
| --- | --- | --- | --- | --- |
| P1 #1 decision hash under-binds | Claude | 0 | C1.1 | **Delivered**; Gemini still to adopt via A1.7 |
| P1 #2 malformed requests accepted | Gemini | 0 | A1.1 | Not started |
| P1 #3 caller controls authority | Gemini | 0 | A1.2 | Not started |
| P1 #4 spoofable rate limiting | Gemini | 0 | A1.3 | Not started |
| P1 #5 false model provenance | Gemini | 0 | A1.4 | Not started |
| P1 #6 failed runs disappear | Gemini | 0 | A1.5 | Not started; ledger interface ready |
| P1 #7 split UTF-8 corruption | Gemini | 0 | A1.6 | Not started |
| P1 #8 multi-asset disagreement | Claude | 0 | C1.2 | **Delivered** in contract and preflight; Gemini/Codex still enforce downstream |
| P1 #9 future evidence period | Claude | 0 | C1.3 | **Delivered** |
| P1 #10 host-page DOM safety surface | Codex | 0 | I2.1 | Not started |
| P1 #11 renderer/adapter dead code | Codex | 0 | I1.1, I2.2 | Not started |
| P1 #12 motion not frame-exact | Codex | 0 | I1.2 | Not started |
| P1 #13 reviewer unimplemented | Fable | 1 | R1.1–R1.3 | Blocked on Wave 0 gate |
| P1 #13 publisher unimplemented | Claude | 1 | W6 | Spec delivered (`docs/publisher-refusal-matrix.md`); no code |
| P1 #14 vault release workflow | Claude, separate session in `personal-monorepo-template` | owner-scheduled | — | Not started |
| P1 #15 vault path traversal | Claude, same vault session | owner-scheduled | — | Not started |
| P1 #16 DATASET_ASL.md memo | **Owner only** | — | — | Open, and now tracked in git (§0) |
| P1 #17 business viability evidence | **Owner only** (human lane H3) | — | — | Open |
| P2 #1 geometry re-render | Codex | 0 | pre-approved renderer fix | Not started |
| P2 #2 durable permission / primary player | Codex | 0 | I2.2 | Not started |
| P2 #3 verify-baseline scan breadth | Claude | 0 | C1.6 | **Delivered**; found 4 previously unscanned playback files |
| P2 #4 mutable container tags / SBOM | Gemini | 0 | A1.8 | Not started |
| P2 #5 metrics not durable | Gemini | 0 | A1.9 | Not started |
| P2 #6 PWA file input restore | Codex | 0 | I1.3 | Not started |
| P2 #7 vault workflow perms / identity / venv | Claude, same vault session | owner-scheduled | — | Not started |

Also delivered in Wave 0 but not itself an audit finding: the append-only
run/decision ledger interfaces (C1.4), which A1.5, A1.9, and both Wave 1
surfaces build on, and ADR 0005 recording the review-unit decision.
