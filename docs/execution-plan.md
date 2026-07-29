# SignBridge Execution Plan — Build-Only, Agent-Native

**Mode:** build-only (Tier 3). All outreach deferred.
**Sequencing:** by dependency, not by calendar. There are no day numbers in this
plan — work unlocks when its blockers clear, and agents take the next unblocked
slice.
**The one external time fact:** the contest submission closes **2026-08-17,
13:00 Pacific Time**. Nothing in this plan may be scheduled against it except
the freeze rule in S4.
**Human role:** the owner reviews and approves. Agents build.
**Companion:** `docs/agent-orchestration.md` — assignment, isolation, briefs.

---

## 0. Mode

The owner deferred all outreach — Deaf reviewer, signer, rights grants,
customers, revenue — until the product is finished. That selects **Tier 3** from
the fallback ladder: *ship the pipeline, not the pack.*

**What it costs.** Business Viability is one of three equally weighted judging
criteria; without users or revenue it scores near zero. No reviewer means no
reviewed ASL content, so the golden pack leaves this plan entirely.

**What it buys.** Zero external dependencies. Nothing blocks on another person's
reply. Fully parallelisable across four agents working continuously.

**The demo this produces:**

> Here is a production authoring system. Gemini drafts segment-to-sign proposals
> live and abstains when it cannot support a segment. Here is the review queue a
> qualified Deaf reviewer would work. Here is the publisher **refusing to emit a
> pack**, because no such reviewer has approved it. Here is the runtime playing
> a pack offline with captions preserved in every failure state.

A system that visibly refuses to fabricate sign language is a credible
accessibility product. Most submissions in this space will fake exactly that.

---

## 1. The integrity rule that gets stricter in this mode

With no reviewed media and a demo to build, there will be pressure to produce
"placeholder signing." **This is the one thing that would make this project
worse than not existing.**

### 1.1 Forbidden, absolutely

- Any video of a human appearing to sign. The reviewer and rights gates are
  closed, so **no such media may exist in this repository**.
- Any fixture, asset, or manifest using `ase` or any real signed-language code.
- Any pack marked `published`, `human_reviewed`, or `approved`.
- Any generated, avatar, or synthesised signing.
- Any framing implying that on-screen motion is American Sign Language.

`tools/verify-baseline.mjs` enforces most of this mechanically, with negative
tests proving each check fires. **Do not weaken those checks.** If one blocks
you, it is working.

### 1.2 Permitted — how the demo gets real visuals

`docs/review-protocol.md` permits synthetic fixtures using **"abstract or
obviously non-linguistic motion and no cloned human likeness"** to test timing,
packaging, fallback, and interface behaviour.

That is the unlock. The renderer is demonstrated with **procedurally generated
abstract motion** — moving geometric forms, unmistakably not a person, labelled
`synthetic-test-only` in filename, manifest, and on-screen UI. This proves
synchronisation, seek/pause/rate recovery, offline playback, and caption
fallback without representing any signed language.

**Constraint:** the foundation check rejects tracked `.mp4`, `.webm`, `.mov`,
`.wav`, `.m4a`. Synthetic clips are **generated at build time into `dist/`**,
never committed. See W2.4.

---

## 2. Contest requirements — eligibility, not scoring

Missing one disqualifies everything else. **S0 outranks all other work.**

| Requirement | Status | Closes in |
| --- | --- | --- |
| At least one Google Cloud product in production use | ❌ | W0.2 |
| At least one Gemini API call in the **deployed** application | ❌ | W0.1 |
| Working project, free and unrestricted for judges | ❌ | W0.3 |
| Public repo with licensing | ✅ | — |
| Demo video < 3 min, public, no third-party marks or music | ❌ | W10.2 |
| Funding disclosure, **required even if zero** | ❌ | W10.4 |
| Pre-existing work disclosed | ✅ | keep current |
| New project (first commit 2026-07-28; period opened 2026-05-19) | ✅ | — |

---

## 3. Ownership map

Exclusive by directory. An agent needing a change outside its paths **reports
it and does not make it.**

| Agent | Owns | Workstreams |
| --- | --- | --- |
| **Claude (Opus 5)** | `tools/`, `packages/sign-renderer/`, `packages/signpack-publisher/`, `apps/pwa/` | W0.3, W0.5, W2, W6, W10.1, W10.3, integration |
| **Codex** | `packages/video-adapters/`, `apps/extension/`, `packages/pack-storage/` | W3, W8 |
| **Gemini / Antigravity** | `services/authoring/` | W0.1, W4 |
| **Fable 5** | `apps/reviewer/`, `tests/` | W5, test hardening |

**Integrator-only** (Claude): `package.json`, `pnpm-lock.yaml`, `tsconfig.json`,
`contracts/`, `HANDOFF.md`, `docs/`. These are the merge-conflict surface.

**Frozen** — complete, tested, depended on by everything:
`packages/signpack-schema/`, `packages/sync-engine/`, `packages/runtime/`.
Changes require the integrator and a stated reason.

---

## 4. Dependency graph

Work unlocks left to right. Anything with no unmet blocker is available now.

```
S0 ELIGIBILITY ─────────────────────────────────────────────┐
  W0.1 deployed Gemini call ◄── needs: GCP billing, API key  │
  W0.2 Cloud Run deploy     ◄── needs: W0.1, owner approval  │
  W0.3 judge-access path    ◄── needs: W0.2                  │
  W0.5 submission checklist ◄── no blocker                   │
                                                             │
S1 CORE BUILD — all four agents in parallel, no blockers     │
  W2 renderer + overlay + synthetic motion   (Claude)        │
  W4 authoring service, structured output    (Gemini) ◄─ W0.1│
  W3 extension + YouTube adapter             (Codex)         │
  W5 reviewer console                        (Fable)         │
                                                             │
S2 ASSEMBLY                                                  │
  W6 publisher + refusal paths  ◄── needs: W5 decisions      │
  W8 offline media + quota      ◄── needs: W2 renderer       │
                                                             │
S3 HARDENING                                                 │
  W10.1 accessibility evidence  ◄── needs: W2, W5            │
  W10.3 README + disclosures    ◄── needs: S2 complete       │
                                                             │
S4 SUBMISSION ◄── needs: definition of done in §8 ───────────┘
  Freeze. Demo video. Submit.
```

**Available with no blocker right now:** W0.5, W2 (all), W3 (all), W5 (all).
W0.1 blocks on the owner's Google Cloud setup. W4 blocks on W0.1.

---

## 5. The build loop

```
1. DISPATCH   Integrator assigns each agent its next unblocked slice
              from §6, in that agent's own worktree, from current main.

2. BUILD      Agent works the slice until:
                node Workspace/scripts/ws.mjs verify signbridge-overlay \
                  --worktree <slug>
              passes. An agent finishing early takes the next slice in
              its own workstream. It never takes another agent's paths.

3. GATE       Green verify is the only definition of done. No exceptions.

4. REVIEW     Cross-vendor — the agent that wrote it does not review it.
              Codex audits Claude's publisher and renderer.
              Claude audits Codex's extension manifest and storage.
              Reviewers write findings, never fixes.

5. INTEGRATE  Integrator merges green branches into main, re-runs
              pnpm verify on main, updates HANDOFF.md.

6. ROTATE     New main becomes the base for the next dispatch.
```

### 5.1 Loop invariants

- **Integrate per completed slice, not per elapsed period.** A slice that is
  green gets merged; a slice that is not stays on its branch.
- **Never two write agents in one worktree.** The one breach that is genuinely
  hard to unwind.
- **Never merge a red branch**, not even temporarily.
- **Never weaken a test to go green.** Escalate to the integrator.
- **`main` is always green.** A broken integration is reverted first and
  diagnosed second.
- An agent blocked on another agent's output takes its next unblocked slice
  rather than waiting.

---

## 6. Workstreams

### W0 — Eligibility · Claude + Gemini · **outranks everything**

**W0.1 [Gemini]** *Blocked on: GCP billing + API key.* Deployed authoring
service, `services/authoring/src/server.ts`, exposing `POST /propose`. Input:
segment text, timing, declared language metadata, and a **constrained candidate
identifier list**. Output: Gemini structured output against a JSON Schema,
returning either a proposal referencing only supplied candidates, or an explicit
`unsupported` result with a reason code. It **cannot approve or publish**. Never
log transcript contents or identities.
*Done when:* a `curl` against the deployed URL returns a schema-valid proposal
from a real Gemini call, visible in Cloud logs.

**W0.2 [owner approves]** Containerise, push to Artifact Registry, deploy to
Cloud Run in a Gemini-available region.
*Done when:* a public HTTPS URL responds.

**W0.3 [Claude]** *Blocked on: W0.2.* Deploy `dist/pwa` publicly. Add a demo
route where a judge with **no account and no API key** triggers a live Gemini
proposal and watches it reach the review queue. Rate-limited, never behind a
login. Write `docs/judging-instructions.md`.
*Done when:* someone handed only the URL exercises the pipeline unaided.

**W0.4 [DONE]** Foundation checker enforces cross-vendor invariants. Four of six
converted with negative tests; two pending at W2.1 and W2.3.

**W0.5 [Claude]** *No blocker.* `docs/submission-checklist.md` tracking §2.

---

### W2 — Renderer and overlay · Claude · **no blocker**
The visible product.

**W2.1** `packages/sign-renderer/`, dependency-free, importing only
`packages/sync-engine` types. Consumes `PlaybackState`, renders the resolved
asset over the source. **Must never crop or mirror** — enforced by test, not
intention. *Closes the second pending invariant from `agent-orchestration.md`
§2.1.* Every caption-fallback reason code renders an explicit readable state.
Never blank, never invented motion presented as signing.

**W2.2** Overlay controls extending `apps/pwa/src/accessibleFallbackOverlay.ts`:
full keyboard operability, programmatic names/roles/states, visible focus, no
traps, 44×44 px targets, operable at 320 px wide and 200% zoom, reduced-motion
and high-contrast support, no state by colour alone. Must not cover captions,
source controls, or essential content.

**W2.3** Build-step size assertion after `build:pwa` against the 200 KB
compressed budget. *Closes the first pending §2.1 invariant. Current bundle:
9.21 kB gzipped — 4% of budget.*

**W2.4** Synthetic motion generator: a build-time script emitting abstract,
obviously non-linguistic clips into `dist/`, **never committed**. Labelled
`synthetic-test-only` in filename, manifest, and UI. Paired with `zxx`/`ZZ`
fixtures.
*Done when:* abstract motion plays in sync, uncropped, unmirrored, captions
visible, keyboard-operable, and the UI states plainly that the motion is
synthetic and not a signed language.

---

### W4 — Authoring service · Gemini · *blocked on W0.1*

**W4.1** Candidates come from deterministic lexical and metadata retrieval over
the approved catalog — never an open vocabulary. Structured output against a
JSON Schema. The model **must be able to abstain**; `unsupported` is a
first-class, encouraged output. The unit is one semantic segment in context,
never one English word.

**W4.2** Run manifests per `contracts/run-manifest.schema.json`;
`proposal_created` events per `contracts/review-event.schema.json`. Events are
**append-only** — corrections supersede rather than erase.

**W4.3** Metrics, the AI-Native Operations evidence: false-supported rate (the
safety metric, always reported beside coverage), unsupported precision and
recall, top-one accepted-without-change, changes-requested, rejected, correction
time per segment. **Never collapse these into one "accuracy" score.**

---

### W3 — Extension and YouTube adapter · Codex · **no blocker**

**W3.1** Manifest V3. **YouTube-only required host access.** Generic sites via
`optional_host_permissions` with explicit per-site grant, explained before
requesting. **No `<all_urls>`, no remote code.** All bundled locally. *The
foundation checker enforces this the moment the manifest exists.*

**W3.2** YouTube adapter in `packages/video-adapters/`, same discipline as
`createHtml5VideoAdapter`: real media clock, fingerprint resolved every sample,
no independent timer, visible failure on source replacement. **Handle SPA
navigation** — a video change without a page load must invalidate the
fingerprint rather than continue over new content.

**W3.3** Permission and CSP release tests.

**Never depend on the Chrome Web Store.** Judges get an unpacked extension with
load instructions. Submit the listing early anyway so its clock runs in
parallel.

---

### W5 — Reviewer console · Fable 5 · **no blocker**
Even with no reviewer appointed, this is the product being demonstrated.

**W5.1** Shows, without hidden information: source context, captions, proposal
status, media, timing, rights state, prior decisions. `approve`,
`changes_requested`, `rejected`, `unsupported_confirmed` distinct and reversible
before publication.

**W5.2** The intended user is Deaf. Full keyboard operation and screen-reader
semantics are correctness, not polish.

**W5.3** Identity, compensation, and conflict data must never reach URLs, client
logs, screenshots, or exports.

---

### W6 — Publisher · Claude · *blocked on W5 decision shapes*
**The most important workstream in this mode** — refusing to publish is the
demo's central claim, so the refusal paths are the feature.

**W6.1** In `packages/signpack-publisher/`: retrieve the authoritative review
log; hash actual media bytes and canonical contract bytes; recompute decision,
review-log, asset-ledger, and release hashes; check withdrawal state atomically;
bind to a human release certificate; emit a content-addressed pack or a
structured failure. **It may never infer a sign, approve a proposal, repair
missing rights evidence, or silently downgrade unsupported content.**

**W6.2** Prove every refusal by test: incomplete review, withdrawn asset, hash
mismatch, rights grant not covering the requested purpose, **absent reviewer**.
*The last is the live path in this mode — the system's honest answer.*

---

### W8 — Offline and constrained devices · Codex · *blocked on W2*

**W8.1** Extend `packages/pack-storage/` to Cache Storage for media bytes.
`MAX_CAPTION_PACK_BYTES` is 262,144 — media needs a separate quota-aware path.
Preserve the discipline: hash on write, rehash and revalidate on read,
idempotent identical bytes, no silent overwrite on conflict.

**W8.2** Quota, eviction, interrupted import, corrupt pack, and insufficient
space all produce recoverable, understandable outcomes.

**W8.3** Airplane-mode proof: playback, imports, controls, captions, and failure
messages all work with networking disabled. Loss of Gemini or cloud never blocks
a valid local pack. **[owner]** Test on a real low-cost Android phone and record
it.

---

### W10 — Hardening and submission

**W10.1 [Claude]** Accessibility evidence per
`docs/accessibility-acceptance.md`. Produce what is achievable; report honestly.
**Until human and device evidence exists the status is `not_evaluated`, never
`passed`.** No agent may upgrade it.

**W10.2 [owner]** Demo video, under 3 minutes: the problem (captions assume
written-language literacy many deaf students schooled in a signed language do
not have); the system; **the refusal**, stated as deliberate; offline proof; and
the limits said out loud. State clearly that on-screen motion is synthetic and
not a signed language.

**W10.3 [Claude]** README states plainly what is real, what is scoped out, what
is unreviewed. Keep `PREEXISTING_ASSETS.md` current.

**W10.4 [owner]** Complete `docs/submission-checklist.md` and submit. Funding
disclosure required even if zero.

---

## 7. Deferred, not deleted

Nothing here may be quietly reinterpreted as unnecessary.

| Deferred | Reactivate when |
| --- | --- |
| **W1** Deaf reviewer, signer, rights grants | Any real signed-language content is contemplated. **Non-negotiable before any ASL media ships** |
| **W7** Golden pack | W1 closes |
| **W9** Revenue, customers, pilots | The owner resumes outreach |

`docs/language-scope.md` and `docs/review-protocol.md` stay in force. The
reviewer gate is **open**, and every surface must keep saying so.

---

## 8. Definition of done

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

---

## 9. S4 freeze rule

The only place the external deadline enters planning.

**Submit once §8 is met, and never later than the evening before 2026-08-17.**
The deadline is 13:00 PT — early in the day — so a submission depending on that
morning is a submission that fails. When §8 is met, freeze and submit; do not
keep building because time appears to remain.

If §8 is not fully met as the deadline approaches, submit what is green with the
gaps stated honestly in the README and video. A submission with stated limits
scores; an unsubmitted perfect one does not.

---

## 10. Risk register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| W0 never closes → **disqualification** | Fatal | Medium | Outranks all work; blocked only on owner's GCP setup |
| An agent fabricates signing media for the demo | **Worse than not shipping** | **High in this mode** | §1; foundation checks; renderer test; UI labelling |
| Business Viability scores zero | Loses 1 of 3 criteria | **Certain** | Accepted consequence of the mode |
| Gemini quota or billing limits | Blocks W4 and judge demo | Medium | Confirm quota early; budget alert; rate-limit demo route |
| Broken `main` | Blocks every agent at once | Medium | Integrate per slice; revert-first policy |
| Two agents in one worktree | Hard to unwind | Low | Exclusive ownership §3 |
| Agents idle waiting on a blocker | Lost throughput | Medium | Take the next unblocked slice; never wait |
| Chrome Web Store latency | Loses extension demo | Medium | Never depend on the listing |
| Building past §8 instead of submitting | Fatal | Medium | S4 freeze rule |
