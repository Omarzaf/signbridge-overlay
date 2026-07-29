# SignBridge Execution Plan — Build-Only Mode

**Written:** 2026-07-28 · **Revised:** 2026-07-28 (build-only)
**Submission deadline:** 2026-08-17, 13:00 Pacific Time
**Days remaining:** D0 complete; D1 = 2026-07-29, D20 = 2026-08-17
**Companion:** `docs/agent-orchestration.md` — how the agents that execute this
plan are assigned, isolated, and verified.

---

## 0. Mode selection

The owner decided on 2026-07-28 to **defer all outreach** — Deaf reviewer,
signer, rights grants, customers, revenue — until the product is finished.

That decision selects **Tier 3** from the fallback ladder: *ship the pipeline,
not the pack.* This plan is the Tier 3 plan, written out in full.

### 0.1 What this costs, stated once

- **Business Viability** is one of three equally weighted judging criteria.
  Without users or revenue it scores near zero. This is the price of the choice
  and it is not recoverable inside the window once outreach starts late.
- **No qualified Deaf reviewer means no reviewed ASL content**, therefore no
  golden pack. W7 leaves this plan entirely.
- The demonstrable product becomes the **production system**, not a signed
  video.

### 0.2 What it buys

- Every one of the remaining 20 days goes to engineering.
- Zero external dependencies. Nothing blocks on another person's reply.
- Fully parallelisable across three agent vendors working continuously.
- A submission whose every claim is backed by working, tested code.

### 0.3 The demo this produces

Not a weakness — state it confidently:

> Here is a production authoring system. Gemini drafts segment-to-sign
> proposals live and abstains when it cannot support a segment. Here is the
> review queue that a qualified Deaf reviewer would work. Here is the publisher
> **refusing to emit a pack**, because no such reviewer has approved it. Here is
> the runtime playing a pack offline on a low-cost phone with captions preserved
> in every failure state.

A system that visibly refuses to fabricate sign language is a credible
accessibility product. Most submissions in this space will fake exactly that.

---

## 1. The integrity rule that gets *stricter* in this mode

With no reviewed media and a demo to build, there will be pressure — from
agents, from the deadline, from the desire for a good video — to produce
"placeholder signing." **This is the one thing that would make this project
worse than not existing.**

### 1.1 What is forbidden, absolutely

- Any video of a human appearing to sign, unless a rights-cleared signer
  recorded it under an executed grant and a qualified Deaf reviewer approved the
  exact hashes. That gate is closed, so **no such media exists in this mode**.
- Any fixture, asset, or manifest using `ase` or any real signed-language code.
- Any pack marked `published`, `human_reviewed`, or `approved`.
- Any generated, avatar, or synthesised signing of any kind.
- Any demo framing that implies the motion on screen is American Sign Language.

`tools/verify-baseline.mjs` now enforces most of this mechanically, with
negative tests proving each check fires. **Do not weaken those checks.** If one
blocks you, it is working.

### 1.2 What is permitted, and how the demo gets real visuals

`docs/review-protocol.md` explicitly permits synthetic fixtures that use
**"abstract or obviously non-linguistic motion and no cloned human likeness"**
to test timing, packaging, fallback, and interface behaviour.

That is the unlock. The renderer can be demonstrated with **procedurally
generated abstract motion** — moving geometric forms, unmistakably not a person,
labelled `synthetic-test-only` in the file, the manifest, and the on-screen UI.
This proves synchronisation, seek/pause/rate recovery, offline playback, and
caption fallback without representing any signed language.

**Constraint:** `tools/verify-baseline.mjs` fails on any tracked `.mp4`,
`.webm`, `.mov`, `.wav`, or `.m4a`. So synthetic clips are **generated at build
time into `dist/`**, never committed. See W2.4.

---

## 2. Contest requirements — unchanged and still absolute

These are eligibility, not scoring. Missing one disqualifies everything else.

| Requirement | Status | Closes in |
| --- | --- | --- |
| At least one Google Cloud product in production use | ❌ | W0.2 |
| At least one Gemini API call in the **deployed** application | ❌ | W0.1 |
| Working project, free and unrestricted for judges until judging ends | ❌ | W0.3 |
| Public repo with licensing | ✅ remote exists | — |
| Demo video < 3 min, public, no third-party marks or music | ❌ | W10.2 |
| English submission materials | — | W10.4 |
| Funding disclosure, **required even if zero** | ❌ | W10.4 |
| Pre-existing work disclosed | ✅ `PREEXISTING_ASSETS.md` | keep current |
| New project (first commit 2026-07-28, period opened 2026-05-19) | ✅ | — |

**W0 outranks every other workstream.** Complete by D3.

---

## 3. Agent ownership map

Partitioned by directory so no two agents ever contend for the same files.
Ownership is **exclusive** — an agent that needs a change outside its paths
reports it and does not make it.

| Agent | Owns | Workstreams |
| --- | --- | --- |
| **Claude (Opus 5)** | `tools/`, `packages/sign-renderer/`, `packages/signpack-publisher/`, `apps/pwa/`, root docs | W0, W2, W6, W10.1, integration |
| **Codex** | `packages/video-adapters/`, `packages/pack-storage/`, `apps/extension/` | W3, W8 |
| **Gemini / Antigravity** | `services/authoring/` | W0.1 seed, W4 |
| **Fable 5** | `apps/reviewer/`, `tests/` | W5, test hardening |

Shared, integrator-only (Claude): `package.json`, `pnpm-lock.yaml`,
`tsconfig.json`, `contracts/`, `HANDOFF.md`, `docs/`. No other agent edits these
— they are the merge-conflict surface.

`packages/signpack-schema/`, `packages/sync-engine/`, `packages/runtime/` are
**frozen**. They are complete, tested, and every other package depends on them.
Changes require the integrator and a stated reason.

---

## 4. The build loop

Continuous cycles rather than a fixed daily schedule, so agents are never idle
waiting on a clock.

### 4.1 One cycle

```
1. DISPATCH   Integrator assigns each agent its next slice from §6,
              in its own worktree, from current main.

2. BUILD      Each agent works its slice to green:
                node Workspace/scripts/ws.mjs verify signbridge-overlay \
                  --worktree <slug>
              An agent that finishes early takes the next slice in its
              own workstream. It never takes another agent's paths.

3. GATE       Green verify is the only definition of done. No exceptions,
              no "will fix next cycle."

4. REVIEW     Cross-vendor: the agent that wrote it does not review it.
              Codex audits Claude's publisher and renderer.
              Claude audits Codex's extension manifest and storage.
              Reviewers write findings, never fixes.

5. INTEGRATE  Integrator merges green branches into main, re-runs
              pnpm verify on main, updates HANDOFF.md.

6. ROTATE     New main becomes the base for the next cycle.
```

### 4.2 Cycle length

Roughly half a day, or one workstream slice — whichever is shorter. Two
integration points per day is the target. **Never integrate at the end of the
day only**; a broken main discovered at midnight costs a full cycle.

### 4.3 Invariants of the loop

- **Never two write agents in one worktree.** The one rule whose breach is
  genuinely hard to unwind.
- **Never merge a red branch**, not even "temporarily."
- **Never weaken a test to go green.** Escalate to the integrator.
- **`main` is always green.** If an integration breaks it, revert the merge
  first and diagnose second.
- After D18, no new slices dispatch. Freeze.

---

## 5. Day map

| Days | Focus | Owner |
| --- | --- | --- |
| D1–D3 | **W0** eligibility: deployed Gemini call, judge access | Claude + Gemini |
| D2–D7 | **W2** sign renderer, overlay, synthetic motion generator | Claude |
| D4–D9 | **W4** authoring service, structured output, metrics | Gemini |
| D6–D11 | **W3** Chrome extension, YouTube adapter | Codex |
| D8–D12 | **W5** reviewer console | Fable 5 |
| D10–D14 | **W6** publisher, including its refusal paths | Claude |
| D12–D16 | **W8** offline media cache, quota, low-end device proof | Codex |
| D15–D18 | **W10** hardening, accessibility evidence, demo assets | all |
| **D18** | **FREEZE.** Demo video recorded. Submission drafted. | owner |
| D19 | Buffer. Nothing new starts. Submit in the evening. | owner |
| D20 | Deadline 13:00 PT. Do not plan to use this day. | owner |

---

## 6. Workstreams

### W0 — Eligibility and deployment · D1–D3 · Claude + Gemini
**Absolute priority. Nothing outranks this.**

**W0.1 [AGENT · Gemini]** Deployed authoring service with a live Gemini call.
`services/authoring/src/server.ts`, exposing `POST /propose`. Input: segment
text, timing, declared language metadata, and a **constrained candidate
identifier list**. Output: Gemini structured output conforming to a JSON Schema,
returning either a proposal referencing only supplied candidates, or an explicit
`unsupported` result with a reason code. The service **cannot approve or
publish**. Never log transcript contents or identities.
*Acceptance:* `curl` against the deployed URL returns a schema-valid proposal
from a real Gemini call, visible in Cloud logs.

**W0.2 [GATED · owner approves]** Containerise, push to Artifact Registry,
deploy to Cloud Run in a Gemini-available region.
*Acceptance:* public HTTPS URL responds. Google Cloud requirement met.

**W0.3 [AGENT · Claude]** Judge-testable public path. Deploy `dist/pwa` to a
public URL. Add a demo route where a judge with **no account and no API key**
can trigger a live Gemini proposal and watch it flow into the review queue.
Rate-limit it; never require login. Write `docs/judging-instructions.md`.
*Acceptance:* someone handed only the URL exercises the full pipeline in under
three minutes, unaided.

**W0.4 [DONE]** Foundation checker enforces the cross-vendor invariants. Four of
six converted, with negative tests. Two remain pending — see W2.3 and W2.1.

**W0.5 [AGENT · Claude]** `docs/submission-checklist.md` tracking every §2 row.

---

### W2 — Sign renderer and overlay · D2–D7 · Claude
This is what a judge looks at. Highest visible-value workstream.

**W2.1** `packages/sign-renderer/`, dependency-free, importing only
`packages/sync-engine` types. Consumes `PlaybackState`, renders the resolved
asset over the source video. **Must never crop or mirror** — enforce aspect
ratio and full-frame visibility as a *test*, not an intention. This is the
second pending invariant from `docs/agent-orchestration.md` §2.1; close it here.
Every caption-fallback reason code renders an explicit readable state. Never
blank, never invented motion presented as signing.

**W2.2** Overlay controls extending `apps/pwa/src/accessibleFallbackOverlay.ts`:
full keyboard operability, programmatic names/roles/states, visible focus, no
traps, 44×44 px targets, operable at 320 px wide and 200% zoom, reduced-motion
and high-contrast support, no state by colour alone. Must not cover captions,
source controls, or essential content.

**W2.3** Build-step size assertion after `build:pwa` against the 200 KB
compressed budget in `docs/architecture.md`. This is the first pending invariant
from §2.1. *Current bundle: 9.21 kB gzipped — ~4% of budget, so this is cheap
insurance, not a constraint.*

**W2.4** Synthetic motion generator. A build-time script emitting abstract,
obviously non-linguistic motion clips into `dist/` — **never committed**, since
the foundation check rejects tracked media. Output is labelled
`synthetic-test-only` in filename, manifest, and on-screen UI. Paired with
`zxx`/`ZZ` fixtures. *This is what makes a visual demo possible without
misrepresenting any signed language.*
*Acceptance:* abstract motion plays in sync, uncropped, unmirrored, captions
visible, fully keyboard-operable, and the UI states plainly that the motion is
synthetic and not a signed language.

---

### W4 — Authoring service · D4–D9 · Gemini
**W4.1** Harden W0.1: candidates come from deterministic lexical and metadata
retrieval over the approved catalog — never an open vocabulary. Structured
output against a JSON Schema. The model **must be able to abstain**;
`unsupported` is a first-class, encouraged output. The unit is one semantic
segment in context, never one English word.

**W4.2** Run manifests per `contracts/run-manifest.schema.json` and
`proposal_created` events per `contracts/review-event.schema.json`. Events are
**append-only**; corrections supersede rather than erase.

**W4.3** Metrics — these are the AI-Native Operations evidence:
false-supported rate (the safety metric, always reported beside coverage),
unsupported precision and recall, top-one accepted-without-change, changes
requested, rejected, and correction time per segment. **Never collapse these
into one "accuracy" score.**

---

### W3 — Chrome extension and YouTube adapter · D6–D11 · Codex
**W3.1** Manifest V3. **YouTube-only required host access.** Generic sites via
`optional_host_permissions` with explicit per-site grant, explained before
requesting. **No `<all_urls>`, no remote code.** All bundled locally. *The
foundation checker already enforces this the moment the manifest exists.*

**W3.2** YouTube adapter in `packages/video-adapters/`, same discipline as
`createHtml5VideoAdapter`: real media clock, fingerprint resolved on every
sample, no independent timer, visible failure on source replacement. **Handle
SPA navigation** — a video change without a page load must invalidate the
fingerprint rather than continue over new content.

**W3.3** Permission and CSP release tests.

**Do not depend on the Chrome Web Store.** Review latency can exceed the window.
Judges get an unpacked extension with load instructions. Submit the listing
early anyway so the clock runs in parallel.

---

### W5 — Reviewer console · D8–D12 · Fable 5
Even with no reviewer appointed, this is the product being demonstrated. Build
it as if someone depends on it, because in the demo narrative they do.

**W5.1** Shows, without hidden information: source context, captions, proposal
status, media, timing, rights state, prior decisions. `approve`,
`changes_requested`, `rejected`, `unsupported_confirmed` distinct and reversible
before publication.

**W5.2** The intended user is Deaf. Full keyboard operation and screen-reader
semantics are correctness, not polish.

**W5.3** Identity, compensation, and conflict data must never reach URLs, client
logs, screenshots, or exports.

---

### W6 — Publisher · D10–D14 · Claude
**The most important workstream in build-only mode**, because *refusing to
publish* is the demo's central claim. The refusal paths are the feature.

**W6.1** Implement in `packages/signpack-publisher/`: retrieve the authoritative
review log; hash actual media bytes and canonical contract bytes; recompute
decision, review-log, asset-ledger, and release hashes; check withdrawal state
atomically; bind to a human release certificate; emit a content-addressed pack
or a structured failure. **It may never infer a sign, approve a proposal, repair
missing rights evidence, or silently downgrade unsupported content.**

**W6.2** Prove every refusal with a test: incomplete review, withdrawn asset,
hash mismatch, rights grant not covering the requested purpose, absent reviewer.
*In this mode the last one is the live path — the system's honest answer.*

---

### W8 — Offline and constrained devices · D12–D16 · Codex
The differentiator. Prove it, do not assert it.

**W8.1** Extend `packages/pack-storage/` to Cache Storage for media bytes.
Current `MAX_CAPTION_PACK_BYTES` is 262,144 — media needs a separate,
quota-aware path. Preserve the discipline: hash on write, rehash and revalidate
on read, idempotent identical bytes, no silent overwrite on conflict.

**W8.2** Quota, eviction, interrupted import, corrupt pack, and insufficient
space all produce recoverable, understandable outcomes.

**W8.3** Airplane-mode proof: playback, imports, controls, captions, and failure
messages all work with networking disabled. Loss of Gemini or cloud never blocks
a valid local pack. **[HUMAN]** Test on a real low-cost Android phone and record
it — that footage is the impact story.

---

### W10 — Hardening and submission · D15–D19 · all
**W10.1 [Claude]** Accessibility evidence per
`docs/accessibility-acceptance.md`. Produce what is achievable and report status
honestly. **Until human and device evidence exists the status is
`not_evaluated`, never `passed`.** No agent may upgrade it.

**W10.2 [HUMAN]** Demo video, under 3 minutes:
1. The problem — captions assume written-language literacy that many deaf
   students schooled in a signed language do not have.
2. The system — Gemini drafts and abstains; the review queue; the publisher.
3. **The refusal** — the publisher declining because no qualified Deaf reviewer
   has approved. Say plainly that this is deliberate.
4. Offline proof on a real low-cost phone.
5. The limits, stated out loud: one language scoped, no reviewed content yet,
   what would be needed to ship.

State clearly that on-screen motion is synthetic and not a signed language.

**W10.3 [Claude]** README states plainly what is real, what is scoped out, and
what is unreviewed. Keep `PREEXISTING_ASSETS.md` current.

**W10.4 [HUMAN]** Complete `docs/submission-checklist.md`. **Submit D19
evening.** Funding disclosure required even if zero.

---

## 7. Deferred, not deleted

These leave the critical path but remain the requirements for a real product.
Nothing here may be quietly reinterpreted as unnecessary.

| Deferred | Reactivate when |
| --- | --- |
| **W1** Deaf reviewer, signer, rights grants | Any real signed-language content is contemplated. **Non-negotiable before any ASL media ships** |
| **W7** Golden pack | W1 closes |
| **W9** Revenue, customers, pilots | The owner resumes outreach |

`docs/language-scope.md` and `docs/review-protocol.md` stay in force. The
reviewer gate is **open**, and every surface must keep saying so.

---

## 8. Risk register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| W0 slips → **disqualification** | Fatal | Medium | W0 outranks all; done by D3 |
| An agent fabricates signing media to fill the demo | **Worse than not shipping** | **High in this mode** | §1 rules; foundation checks; renderer test; explicit UI labelling |
| Business Viability scores zero | Loses 1 of 3 criteria | **Certain** | Accepted consequence of the mode |
| Gemini quota or billing limits | Blocks W4 and judge demo | Medium | Confirm quota D1; budget alert; rate-limit demo route |
| Broken `main` discovered late | Costs a full cycle | Medium | Two integration points daily; revert-first policy |
| Two agents in one worktree | Hard to unwind | Low | Exclusive ownership map §3 |
| Chrome Web Store latency | Loses extension demo | Medium | Never depend on the listing |
| Overlay exceeds 200 KB | Breaks low-cost-device claim | Low | W2.3; currently at 4% |
| Submitting D20 morning | Fatal | Medium | Freeze D18, submit D19 evening |

---

## 9. Definition of done

- [ ] Deployed app, publicly reachable, free and unrestricted for judges
- [ ] At least one Google Cloud product in production use
- [ ] Live Gemini call in the deployed app, judge-triggerable without an account
- [ ] Public repo with licensing; pre-existing work disclosed
- [ ] Demo video < 3 min, public, no third-party marks or music
- [ ] Funding disclosed, even if zero
- [ ] `pnpm verify` green on `main`; Playwright suite green
- [ ] Overlay within the 200 KB budget, asserted at build time
- [ ] Renderer proven never to crop or mirror, by test
- [ ] Offline playback proven on a real low-cost device, on video
- [ ] Publisher refusal paths proven by test, including the absent-reviewer path
- [ ] No `ase`, no real language code, no `published`/`human_reviewed` anywhere
- [ ] Every surface states that synthetic motion is not a signed language
- [ ] Accessibility reported honestly; `not_evaluated` where unproven
- [ ] Submitted D19 evening

---

## 10. Start here, D1

1. **[HUMAN]** Confirm Gemini API quota on the trial project; set the budget
   alert. Two minutes, prevents a silent mid-judging failure.
2. **[GATED]** Approve `@google/genai` for `services/authoring` only. The
   foundation checker already enforces the boundary and exact pinning.
3. **[AGENT · Gemini]** Start W0.1 in worktree `w0-authoring`.
4. **[AGENT · Claude]** Start W2.1 and W2.4 in worktree `w2-renderer`.
5. **[AGENT · Claude]** W0.3 judge-access path in worktree `w0-compliance`.

First integration point: end of D1. `main` must be green before anyone sleeps.
