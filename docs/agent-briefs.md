# Agent Briefs

**Updated 2026-08-02 after the NEEDS_FIXES audit.** These briefs implement
`docs/fable-strategy-2026-08-02.md`, which refines
`docs/fable-agent-strategy-handoff.md`. The previous W0/W2/W3/W5 briefs are
superseded: W2 (renderer) and W3 (extension) were delivered on their branches
and now enter integration; W0 authoring shifts from build to hardening; W5
starts in Wave 1.

Paste-ready task briefs, one per vendor. Open each agent **in its own worktree
path** and paste the matching block. Do not paste two briefs into one agent,
and never run two write-capable agents in the same worktree. **No agent starts
until the owner approves Wave 0** (strategy §11, decision 1).

## Wave 0 — at most three concurrent writers

| Agent | Worktree | Branch | Base |
| --- | --- | --- | --- |
| Claude (architect) | `.worktrees/signbridge-overlay/w0-contracts` (new) | `claude/w0-reviewunit-v2-20260802` | `feat/authoring-integrity-hardening` |
| Gemini / Antigravity | `.worktrees/signbridge-overlay/w0-authoring` | `gemini/w0-authoring-hardening-20260802` (new) | `feat/authoring-integrity-hardening` |
| Codex | `.worktrees/signbridge-overlay/w0-integration` (new) | `codex/w0-integration-20260802` | `integration/wave0-base` (integrator-cut) |
| Fable 5 | — read-only this wave — | — | — |

Fable moderates the Wave 0 gate, reviews Codex's UX/accessibility, and
arbitrates contract questions. Fable writes nothing in Wave 0.

## Wave 1 — starts only after the Wave 0 gate passes

| Agent | Worktree | Branch | Scope |
| --- | --- | --- | --- |
| Fable 5 | `.worktrees/signbridge-overlay/w5-reviewer` (new branch) | `fable/w5-reviewer-<YYYYMMDD>` | `apps/reviewer/`, `tests/reviewer/` |
| Claude | `.worktrees/signbridge-overlay/w6-publisher` (new) | `claude/w6-publisher-<YYYYMMDD>` | `packages/signpack-publisher/` |
| Codex | `.worktrees/signbridge-overlay/w8-storage` (new) | `codex/w8-storage-<YYYYMMDD>` | `packages/pack-storage/` |

---

## Claude — Wave 0, ReviewUnitV2 and the release contract

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w0-contracts
Branch: claude/w0-reviewunit-v2-20260802, based on feat/authoring-integrity-hardening

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/fable-agent-strategy-handoff.md — P1 findings #1, #8, #9.
  3. docs/fable-strategy-2026-08-02.md §4 (C1 gates) and §7.
  4. contracts/*.schema.json and packages/signpack-schema/src/validator.ts.

You own ONLY: contracts/, packages/signpack-schema/, docs/decisions/, and
tools/verify-baseline.mjs (for item C1.6 only).
Anything outside those paths: report it, do not change it.

Build:
  C1.1 ReviewUnitV2: contracts/review-unit.schema.json plus canonical hashing
       in packages/signpack-schema/. The versioned hash binds: schema version,
       proposal/run ID, source fingerprint, timed-text hash, exact segment
       range, signed language and region, candidate-catalog version, selected
       asset hashes, crop/mirror/transformation state (required false), and
       presentation metadata. Specify canonicalisation (field order, encoding,
       number representation) in the schema. Human approval signs exactly this
       hash; any material change invalidates it. Record the decision as an ADR
       in docs/decisions/.
  C1.2 Single-asset v1 invariant: at most one asset per segment, exact
       duration compatibility, enforced in structural preflight so authoring,
       review, publisher, release validation, and runtime finally agree
       (audit P1 #8).
  C1.3 Evidence-period fix: every contest-evidence period must end on or
       before generatedAt (audit P1 #9; validator.ts near line 2246 today).
  C1.4 Durable-ledger interfaces: types for the append-only run/decision
       ledger that authoring (Wave 0) and reviewer/publisher (Wave 1) will
       persist into.
  C1.5 Refusal-test matrix spec for the Wave 1 publisher — the ten rows in
       strategy §9, as a reviewed document, not code.
  C1.6 (audit P2 #3) Extend tools/verify-baseline.mjs dependency scanning
       beyond .ts to .tsx, .js, and .mjs, and make its success wording
       accurate.
  Publish a draft of C1.1/C1.2 to the other agents as soon as it is stable
  enough to build against; do not make them wait for polish.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w0-contracts
  passes, and these regression tests exist and pass:
  - two materially different requests (same pack/segment/selected output,
    different source text or timing) produce DIFFERENT ReviewUnitV2 hashes —
    the audit's adversarial probe, made permanent;
  - a two-asset or duration-mismatched release candidate fails preflight;
  - an evidence fixture whose period ends after generatedAt fails validation.
  Update HANDOFF.md with what landed and what remains.

Hard rules:
  - Do not add a production dependency.
  - Do not weaken or delete a test to go green. Escalate instead.
  - Synthetic fixtures use the reserved zxx/ZZ markers only; never "ase" or
    any real signed-language code.
  - Do not fabricate a reviewer identity, consent record, rights grant,
    review event, or approval — not even as test scaffolding.
  - Do not push to main, deploy, or send anything outward.
  - Cross-vendor review: Codex audits this branch. You do not review your own
    contract work.
```

---

## Gemini / Antigravity — Wave 0, authoring trust boundary

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w0-authoring
Branch: gemini/w0-authoring-hardening-20260802 (new), based on
feat/authoring-integrity-hardening. Your previous branch
gemini/w0-authoring-20260802 is an ancestor of that base and is superseded.

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. GEMINI.md — your scope note.
  3. docs/fable-agent-strategy-handoff.md — P1 findings #2 through #7 are
     your list, with file-and-line evidence for each.
  4. docs/fable-strategy-2026-08-02.md §4 (A1 gates).
  5. Claude's ReviewUnitV2 draft when it lands (adopt its hash; do not invent
     your own binding).

You own ONLY: services/authoring/
Anything outside that path: report it, do not change it.

Harden, in this order (each maps to an audit P1 finding):
  A1.1 (#2) Closed request schema validated before any cost or model call:
       bound body size, text length, segment duration, candidate count,
       identifier shape, language/region values, candidate uniqueness,
       catalog membership. Reject everything else with 400.
  A1.2 (#3) Server-owned authority: the server generates IDs and sequence
       values, derives the environment from deployment configuration, and
       retrieves candidates from a trusted rights-filtered catalog. The
       public route supplies content and a catalog query, never authority.
  A1.3 (#4) Quota that survives spoofing: trust only the configured Cloud Run
       proxy chain for client identity; bounded TTL store keyed by
       principal/project, not by an arbitrary header. Rotating
       X-Forwarded-For across 61 requests must still hit 429.
  A1.4 (#5) Truthful provenance: persist executionMode, actual
       model/API/location, prompt version, catalog version, auth mode, and
       fallback reason. Deterministic fallback gets its own generator
       identity; never record Gemini metadata for a call that did not happen.
  A1.5 (#6) Durable runs: write an append-only run record for success,
       abstention, AND failure before responding; the HTTP response carries a
       durable reference. Use the ledger interfaces from Claude's C1.4.
  A1.6 (#7) UTF-8 repair: collect buffers and decode once with a fatal
       decoder (or StringDecoder); a multibyte character split across chunks
       must not change the timed-text hash; return 413 cleanly.
  A1.7 (#1, adoption) When ReviewUnitV2 stabilises, emit its hash in place of
       the current under-binding decisionHash.
  A1.8 (P2 #4) Replace mutable "latest" container tags and unpinned base
       images with commit or digest references; add provenance and an SBOM to
       the build. Do not redeploy — build config only.
  A1.9 (P2 #5) Derive /metrics from durable review events: wire
       recordReviewOutcome to the append-only run ledger (A1.5) so metrics
       survive restarts instead of resetting per process.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w0-authoring
  passes, and each probe in strategy §4 (A1) exists as a test and passes.
  Update HANDOFF.md.

Hard rules:
  - @google/genai stays the ONLY production dependency, pinned exact.
  - Do NOT redeploy Cloud Run. The deployed judge route is eligibility
    evidence; it changes only from a green merged tree with owner approval.
  - The model must still be able to abstain; "unsupported" is a first-class
    output. The service cannot approve or publish.
  - Never log transcript contents, reviewer identities, or student
    identities. Never commit a key or .env.
  - Synthetic fixtures use zxx/ZZ only. No signing video, avatar, or
    text-to-sign anything.
  - Cross-vendor review: Claude audits this branch.
```

---

## Codex — Wave 0, make the renderer and extension real

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w0-integration
Branch: codex/w0-integration-20260802, based on integration/wave0-base — an
integrator-cut, owner-approved merge of feat/authoring-integrity-hardening +
codex/w2-renderer-20260729 + codex/w3-extension-20260729. Do not start until
that base exists. Your W2/W3 source branches are frozen once it is cut.

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/fable-agent-strategy-handoff.md — P1 findings #10, #11, #12 and
     P2 items 1–2 are your list.
  3. docs/fable-strategy-2026-08-02.md §4 (I1/I2 gates).
  4. packages/renderer/, packages/video-adapters/, packages/runtime/ READMEs
     and source on the integration base.

You own ONLY: apps/pwa/, apps/extension/, packages/video-adapters/,
tests/e2e/, and packages/renderer/ strictly for integration-necessary fixes
(the loadedmetadata/resize geometry re-render is pre-approved; anything more,
report first).
Anything outside those paths: report it, do not change it.

Build:
  I1.1 (#11) Mount the renderer: apps/pwa wires
       video adapter -> media sample -> runtime -> verified pack storage
       -> playback state -> renderer -> visible fallback/status.
       createSignSurface actually mounts. No module in that chain may remain
       import-only.
  I1.2 (#12) Frame-exact motion: drive rendering from media-frame callbacks
       through the existing adapter/controller — never sparse timeupdate
       events beside an independent SVG timeline. Playback-rate changes are
       handled; unsupported rates freeze into a caption-preserving state.
  I1.3 (P2 #6) Restore the PWA file input in a finally block when a verified
       import throws.
  I2.1 (#10) Host-safe status: authoritative extension state lives in
       browser-controlled UI (action badge/popup/side panel). The page
       overlay is best-effort only, isolated in Shadow DOM with removal
       monitoring.
  I2.2 (#11) Wire the extension: stop discarding media time and source;
       connect the YouTube adapter through runtime and storage to real
       status. SPA navigation invalidates the fingerprint. Select the primary
       player, not the first <video>. Keep the optional-permission grant
       durable across navigation (P2 #2).
  I3   Browser E2E in tests/e2e/ (Playwright): the scenarios in strategy §4
       I1/I2, including seek/pause/rate, integrity-failure fallback, and
       fingerprint invalidation. This suite is the Wave 0 gate evidence.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w0-integration
  passes, the E2E suite passes with a trace showing the call graph crossing
  adapter, runtime, storage, and renderer, and the bundle budget still holds.
  Update HANDOFF.md.

Hard rules:
  - No production dependencies. No <all_urls>. No remote code. All bundled.
  - Synthetic motion stays labelled synthetic-test-only in filename,
    manifest, and on-screen UI; never described as signing. zxx/ZZ only.
  - Never crop or mirror. Never advance an independent timer.
  - Do not weaken or delete a test to go green. Escalate instead.
  - Do not push to main, deploy, or send anything outward.
  - Cross-vendor review: Fable audits UX/accessibility; Claude audits code.
```

---

## Fable 5 — Wave 0 moderation now; Wave 1 reviewer console after the gate

```text
WAVE 0 (now): read-only. No worktree, no writes.
  - Moderate the Wave 0 gate defined in docs/fable-strategy-2026-08-02.md §6:
    contracts merge first, authoring second, integration third; the merged
    base must pass baseline, pnpm verify, bundle budget, and the E2E suite
    before any main proposal.
  - Review Codex's integration branch for UX and accessibility findings.
    Write findings, never fixes.
  - Arbitrate ReviewUnitV2 questions between Claude and Gemini.

WAVE 1 (only after the owner confirms the Wave 0 gate passed):

Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w5-reviewer
Branch: fable/w5-reviewer-<YYYYMMDD> (new), based on the post-Wave-0
integration branch. The old codex/w5-reviewer-20260729 branch is contained in
main and superseded.

Read first, in order:
  1. AGENTS.md — the authoritative contract.
  2. docs/fable-strategy-2026-08-02.md §8 — the state model you are building.
  3. docs/review-protocol.md and docs/accessibility-acceptance.md
     ("Reviewer application").
  4. contracts/review-unit.schema.json — decisions sign this hash exactly.

You own ONLY: apps/reviewer/, tests/reviewer/
Anything outside those paths: report it, do not change it.

Build:
  R1.1 The four-state queue from strategy §8: empty, blocked_no_reviewer
       (the demo state — actions disabled with the reason displayed),
       in_review (nothing hidden: source context, captions, proposal status,
       media slot, timing, rights state, prior decisions, the ReviewUnitV2
       hash), decided (four decisions, visually distinct, reversible before
       publication, never colour-only).
  R1.2 The intended user is Deaf: full keyboard operation and screen-reader
       semantics are correctness, not polish. No audio cues. 44x44 targets,
       320px/200% zoom, reduced motion, high contrast.
  R1.3 Identity, compensation, and conflict data never reach URLs, client
       logs, screenshots, or exports — proven by test.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w5-reviewer
  passes, every state is keyboard-traversable with name/role/state assertions,
  and the privacy test passes. Update HANDOFF.md.

Hard rules:
  - No production dependency; framework-free unless the owner approves.
  - An empty queue is the truthful state. Never fabricate a reviewer,
    decision, or approval to populate the UI. zxx/ZZ fixtures only.
  - Do not weaken or delete a test to go green. Escalate instead.
  - Do not push to main, deploy, or send anything outward.
  - Cross-vendor review: Codex runs the accessibility and security pass.
```

---

## Wave 1 — Claude publisher and Codex storage (cut branches after the gate)

**Claude — `packages/signpack-publisher/`** (`claude/w6-publisher-<YYYYMMDD>`,
worktree `w6-publisher`): refusal-first publisher per strategy §9. Retrieve
the authoritative review log; hash actual media bytes and canonical contract
bytes; recompute decision, review-log, asset-ledger, and release hashes;
check withdrawal atomically; bind to a human release certificate; emit a
content-addressed pack or a structured refusal. All ten refusal-matrix rows
proven by test; `absent_reviewer` is the live demo path. It may never infer a
sign, approve a proposal, repair rights evidence, or downgrade unsupported
content. Reviewer: Codex.

**Codex — `packages/pack-storage/`** (`codex/w8-storage-<YYYYMMDD>`, worktree
`w8-storage`): Cache Storage path for media bytes with a separate quota-aware
budget; hash on write, rehash and revalidate on read, idempotent identical
bytes, no silent overwrite; quota, eviction, interrupted import, corrupt
pack, and insufficient space all produce recoverable outcomes; verified
deletion. Reviewer: Claude.

Gemini opens no new scope in Wave 1; it is on call for authoring defects
surfaced in review.

---

## Integration

The integrator (Claude) cuts `integration/wave0-base`, resolves `HANDOFF.md`
centrally, and merges in the order fixed by
`docs/fable-strategy-2026-08-02.md` §6: contracts → authoring → integration,
gate on the merged tree, then Wave 1 reviewer → publisher → storage. A red
branch stays on its branch; a red `main` is reverted first and diagnosed
second. Never merge to `main` from an agent worktree; every merge gets an
independent moderator pass; no deployment without owner approval in the
current session.

Cross-vendor review: the agent that wrote the code never reviews it. Codex
audits Claude's contracts and publisher; Claude audits Gemini's authoring and
Codex's integration and storage; Fable audits UX and accessibility
throughout and owns no review of its own reviewer console — that goes to
Codex.
