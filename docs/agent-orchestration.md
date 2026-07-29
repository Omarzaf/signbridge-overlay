# Multi-Agent Orchestration Plan

**Written:** 2026-07-28
**Companion to:** `docs/execution-plan.md` (what to build) — this document is
**how to run the agents that build it**.
**Governing contract:** `AGENTS.md` in this repository, and the workspace router
at `/Users/omar/Downloads/Claude/AGENTS.md`. Neither is overridden here.

---

## 1. The honest answer first

You asked whether you need another repo, an open-source orchestrator, or VS Code
to run several coding agents together.

**You need none of them. You already built the orchestrator.**

`Workspace/scripts/ws.mjs` provides exactly the primitives multi-agent work
requires, and they are vendor-neutral:

```
node Workspace/scripts/ws.mjs list
node Workspace/scripts/ws.mjs status <repo-id> | --all
node Workspace/scripts/ws.mjs doctor
node Workspace/scripts/ws.mjs where <repo-id> [--worktree <task-slug>]
node Workspace/scripts/ws.mjs task start <repo-id> <task-slug> [--base <ref>]
node Workspace/scripts/ws.mjs verify <repo-id> [--worktree <task-slug>|--primary]
node Workspace/scripts/ws.mjs task finish <repo-id> <task-slug>
```

`task start` creates an isolated branch and worktree under
`.worktrees/<repo-id>/<task-slug>/`. `verify` runs this repository's own
verification contract inside that worktree. That is the whole coordination
problem solved: **isolation, plus a common definition of done that every vendor
must satisfy identically.**

There is no single application today that runs Claude Code, Codex, and
Antigravity in one pane of glass. Do not spend any of your 20 days looking for
one. **The unifying layer is the git repository, not an IDE.**

### 1.1 What multi-agent actually buys you, and what it costs

Be clear-eyed about this, because the failure mode is expensive.

**Genuine gains:**

1. **Parallelism across independent workstreams.** You have ~10 workstreams and
   one human. Three or four agents working simultaneously in separate worktrees
   is a real multiplier.
2. **Cross-vendor review.** An agent from a different vendor reviewing code
   catches different classes of defect than the one that wrote it. This is the
   most under-used and highest-value benefit.
3. **Vendor-specific currency.** Google's agent will have the most current
   knowledge of the Gemini API surface. That matters for exactly one workstream.

**Real costs:**

1. **You become the bottleneck, not the agents.** Every branch needs your
   review before merge. Past roughly three concurrent write agents, review
   capacity — not agent capacity — is the constraint. Adding a fifth agent makes
   you slower, not faster.
2. **Convention drift.** This repository has an unusually strict style:
   dependency-free playback path, no production dependencies, a specific
   documentation voice, explicit failure states. Different vendors drift from it
   differently, and drift surfaces as review burden.
3. **Merge conflicts** when two agents touch the same package.

**The rule that prevents most of the pain: partition by package boundary, never
by task.** Two agents must never own the same directory in the same window. This
repository's package structure makes that partition clean — use it.

---

## 2. Make every vendor read the same law

This is the highest-leverage thirty minutes of setup you will do.

Each vendor auto-loads a different context file:

| Agent | Auto-loads |
| --- | --- |
| Codex | `AGENTS.md` ✅ already present |
| Claude Code | `CLAUDE.md` ❌ missing in this repo |
| Gemini CLI / Antigravity | `GEMINI.md` ❌ missing in this repo |

**Action:** create `CLAUDE.md` and `GEMINI.md` in the repository root as thin
pointer files — not copies — that say:

> `AGENTS.md` is the authoritative agent contract for this repository. Read it
> in full before writing any code. Then read `docs/execution-plan.md` for the
> current work queue and `docs/agent-orchestration.md` for how tasks are
> assigned and verified. Do not duplicate rules into this file; if this file and
> `AGENTS.md` ever disagree, `AGENTS.md` wins.

Pointers rather than copies, so there is exactly one source of truth and no
possibility of the copies diverging.

**Also add ignore parity.** `.codexignore` already excludes `node_modules/`,
`dist/`, `private/`, `evidence/private/`, `media/local/`, `fixtures/private/`,
and all media extensions. Give Gemini and Antigravity the same exclusions
through whatever ignore mechanism they use. These boundaries protect private
evidence and unreleased media — they are not housekeeping.

### 2.1 Prose invariants are vendor-dependent; test invariants are vendor-neutral

This is the most important idea in this document.

A rule written in `AGENTS.md` is obeyed only insofar as each agent reads and
respects prose. A rule encoded in `tools/verify-baseline.mjs` is obeyed by every
vendor equally, because it fails the build.

So: **convert the safety-critical invariants into tests.** Prioritise the ones a
naive agent is most likely to violate:

| Invariant | Prose source | Mechanical enforcement | Status |
| --- | --- | --- | --- |
| No production dependency outside `services/authoring`, exactly pinned | `AGENTS.md` | `tools/verify-baseline.mjs` allowlist | ✅ enforced |
| Playback path imports nothing but relative paths and `node:` builtins | `architecture.md` | `tools/verify-baseline.mjs` import scan | ✅ enforced |
| Playback never imports `services/` or `apps/reviewer/` | `architecture.md` | `tools/verify-baseline.mjs` import scan | ✅ enforced |
| Synthetic fixtures never use `ase` or a real language code | `review-protocol.md` | `tools/verify-baseline.mjs` fixture walk | ✅ enforced |
| Fixtures never claim review, publication, or production status | `review-protocol.md` | `tools/verify-baseline.mjs` fixture walk | ✅ enforced |
| Extension manifest has no `<all_urls>`, no remote code, YouTube-only hosts | `AGENTS.md` | `tools/verify-baseline.mjs`, fires once the manifest exists | ✅ enforced |
| Overlay stays under the 200 KB compressed budget | `architecture.md` | Build-step assertion after `build:pwa` | ⬜ pending (W2.3) |
| Signing media is never cropped or mirrored | `linguistic-safety.md` | Renderer unit test | ⬜ pending (W2.1), needs the renderer to exist |

Each enforced rule has a matching negative test in
`tests/baseline/verify-baseline.test.mjs` that proves the check actually fails
when violated. A guard that has only ever been observed passing is not a guard.

The two pending rows cannot be foundation checks: the size budget must run
*after* the build, and the crop/mirror guarantee needs a renderer that does not
exist yet. Do not let either be forgotten — they are the two invariants a
renderer agent is most likely to breach.

Every one of these converted is a rule you no longer have to enforce by reading
diffs at 2am across four vendors. Do this early — the payoff compounds over the
remaining 20 days.

---

## 3. Agent assignment

Partitioned by package so no two agents ever contend for the same files.

| Workstream | Owns these paths | Agent | Rationale |
| --- | --- | --- | --- |
| **W0** compliance, deploy, foundation checker | `tools/`, `.github/`, `docs/submission-checklist.md` | **Claude Code (Opus 5)** | Touches repo-wide invariants and the checker that binds every other agent. Highest blast radius — give it to the agent enforcing the rules |
| **W2** sign renderer + overlay | `packages/sign-renderer/` (new), `apps/pwa/` | **Claude Code (Opus 5)** | Invariant-dense: crop/mirror prohibition, accessibility contract, size budget. Correctness here is a safety property, not a polish item |
| **W3** extension + YouTube adapter | `apps/extension/`, `packages/video-adapters/` | **Codex** | Bounded, spec-driven, heavily testable. Codex authored the existing HTML5 adapter — this is continuity, not a handover |
| **W4** authoring service, Gemini integration | `services/authoring/` | **Antigravity / Gemini** | Most current knowledge of the Gemini API surface and structured output. Also the right narrative for a Gemini hackathon |
| **W5** reviewer console | `apps/reviewer/` | **Fable 5** or **Codex** | Self-contained UI with a clear spec and no cross-package coupling |
| **W6** publisher | `packages/signpack-publisher/` | **Claude Code (Opus 5)** | Highest-stakes correctness in the codebase. Eight hard gates, hash binding, atomic withdrawal checks. This is where a subtle error ships unreviewed signing |
| **W8** offline media + quota | `packages/pack-storage/` | **Codex** | Extends Codex-authored storage code with the same integrity discipline |
| **Review passes** | read-only, no writes | **cross-vendor**, see §5 | Different eyes catch different defects |

Notes on the assignment:

- **Codex gets continuity work.** Every existing branch is `codex/*` — Codex
  wrote `packages/video-adapters` and `packages/pack-storage`. Extending its own
  code is where it will be fastest and most consistent.
- **Claude Code gets the invariant-enforcement points**: the foundation checker,
  the publisher, and the renderer's crop/mirror guarantees. These are the places
  where "looks right" and "is right" diverge.
- **Antigravity gets exactly one workstream.** Resist spreading it wider. Its
  advantage is Gemini API currency, which applies to `services/authoring` and
  nowhere else.
- **Fable 5** is available as a subagent model inside Claude Code, which makes it
  convenient for bounded parallel work — fixtures, tests, documentation, the
  reviewer console — dispatched from a session that already holds repo context.
  Calibrate against your own experience rather than my assignment; if it
  outperforms on a given task class, move work to it.

### 3.1 Concurrency cap

**Three concurrent write agents. One review agent. That is the ceiling.**

Not because more agents cannot run, but because you cannot review more than
three branches a day and still do the human work in W1 and W9 — the reviewer
outreach and the revenue motion — which nothing can do for you and which
determine two of the three judging criteria.

---

## 4. Setup

### 4.1 One-time, today

```bash
node Workspace/scripts/ws.mjs doctor
```

Expect the known 13 pre-existing workspace warnings plus worktree-local ones.
Investigate anything new.

Then retire the three stale Codex worktrees from the completed gate work, so the
board is clean before you add four more:

```bash
node Workspace/scripts/ws.mjs status signbridge-overlay --all
```

Confirm `gate1-governance`, `goal2-playback-core`, and `signpack-contracts` are
merged into `main`, then remove those worktrees and branches. Do this before
starting new tasks — stale worktrees make `doctor` output noisy, and noisy
output gets ignored exactly when it matters.

### 4.2 Per workstream

```bash
node Workspace/scripts/ws.mjs task start signbridge-overlay w0-compliance --base main
node Workspace/scripts/ws.mjs where signbridge-overlay --worktree w0-compliance
```

Point one agent — and only one — at the printed path. With pnpm, each worktree
needs its own install; the shared store at `/Users/omar/Downloads/Claude/.pnpm-store`
keeps that cheap.

Suggested slugs, matching the execution plan: `w0-compliance`, `w2-renderer`,
`w3-extension`, `w4-authoring`, `w5-reviewer`, `w6-publisher`, `w8-offline`.

### 4.3 Environment

- **Claude Code and Codex**: terminal per worktree. VS Code with one window per
  worktree works well and gives you a diff view per agent.
- **Antigravity**: open it directly on the `w4-authoring` worktree path. It is
  its own IDE — do not try to run it inside a window another agent is editing.
- **Never run two write-capable agents in the same worktree.** This is the one
  rule that, if broken, produces damage that is genuinely hard to unwind.

---

## 5. The task brief

Every agent, regardless of vendor, gets the same brief shape. Vary nothing but
the workstream.

```
Repository: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/<slug>
Branch: <slug>

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/execution-plan.md, section <W-N> — your deliverable and acceptance criteria.
  3. docs/architecture.md — dependency direction and the playback boundary.
  4. The README of each package you will touch.

You own ONLY these paths: <exact list>
Touching anything outside them is out of scope. Report it, do not fix it.

Definition of done:
  - `node Workspace/scripts/ws.mjs verify signbridge-overlay --worktree <slug>` passes.
  - The acceptance criteria in execution-plan §<W-N> are met.
  - HANDOFF.md updated with what landed and what remains.

Hard rules:
  - Do not add a production dependency. Only services/authoring may use
    @google/genai, and only if you are the W4 agent.
  - Do not weaken or delete a test to make your change pass. Escalate instead.
  - Do not create fixtures using `ase` or any real signed-language code.
    Synthetic fixtures use the reserved `zxx`/`ZZ` markers only.
  - Do not fabricate a reviewer identity, consent record, rights grant, review
    event, or approval — not even as a placeholder.
  - Do not mark any [HUMAN] item complete.
  - Do not push to main. Do not deploy. Do not send anything outward.
  - If a gate blocks you, stop and report. Do not work around it.
```

The hard rules are not boilerplate. Every one of them describes something a
capable agent will otherwise do, in good faith, to be helpful — most dangerously
the fabricated ASL fixture, which looks like reasonable test scaffolding and is
the single worst thing this project could ship.

---

## 6. Cross-vendor review

The most valuable and least obvious use of having multiple vendors.

**Rule: the agent that wrote the code does not review it. A different vendor
does.** Review agents run read-only, in the same worktree, and write findings —
never fixes.

Prioritise cross-review on the three places where a subtle defect is a harm
rather than a bug:

1. **`packages/signpack-publisher/`** — a publisher that emits when it should
   refuse ships unreviewed signing to deaf students.
2. **`packages/sign-renderer/`** — a crop or mirror silently destroys the
   grammar carried by face, body, and signing space.
3. **`apps/extension/` manifest and CSP** — a permission or remote-code error is
   a security defect in software people install.

You have `codex:rescue` installed for exactly this, and Claude Code has
`pr-review-toolkit` with `code-reviewer` and `silent-failure-hunter`. Use Codex
to review Claude's publisher; use Claude to review Codex's extension manifest.

---

## 7. Daily loop

**Morning (you, 20 minutes):**

```bash
node Workspace/scripts/ws.mjs doctor
node Workspace/scripts/ws.mjs status signbridge-overlay --all
```

Pick the day's workstreams from `docs/execution-plan.md` §5 critical path. Start
at most three. Then — before you touch anything technical — spend the first hour
on W1 and W9: reviewer outreach and revenue. Those are the two criteria no agent
can move, and they decay if deferred.

**During the day (agents):** each agent works its worktree to green verify.

**Evening (you):** review each branch, merge what passes, redirect what does not.
Update `HANDOFF.md`. Note any invariant an agent tried to violate — that is a
signal to convert it into a test per §2.1.

**Cadence discipline:** no new workstream starts after D18. D19 is buffer and
submission. The plan freezes on D18 whether or not everything landed.

---

## 8. Google Cloud — from your console screenshot

You have a project (`project-6f0669f1-493e-41bb-9dd`) on the $300 free trial
with zero credits used, expiring 2026-10-27. That is comfortably past the
2026-09-15 end of judging, and $300 is ample for this project's Cloud Run,
Artifact Registry, Cloud Storage, and Gemini usage.

Four things to handle:

1. **Verify Gemini API quota on the trial before D3**, not on D18. Trial
   accounts can carry quota restrictions that only surface under load. The
   public judge-demo route in W0.3 will take unpredictable traffic.
2. **Set a budget alert now** — the console is already offering it. If credits
   exhaust or the project is suspended, your judge-testable URL dies mid-judging,
   and that is a silent failure you would discover far too late.
3. **The API key never enters the repository.** Use Secret Manager or Cloud Run
   environment variables. Note that `.codexignore` does not exclude a stray
   `.env` — if you create one, add it to `.gitignore` first.
4. **Trial ends 2026-10-27.** Diarise an upgrade decision before then if the
   project continues past judging.

---

## 9. Anti-patterns

| Anti-pattern | Why it fails here |
| --- | --- |
| Hunting for an open-source multi-agent orchestrator | Learning cost exceeds the benefit inside 20 days, and `ws.mjs` already does the essential part |
| Running five agents because you have five | Your review capacity caps at ~3 branches/day. The fifth agent makes you slower |
| Two agents in one worktree | Interleaved edits produce damage that is genuinely hard to unwind |
| Assigning by task instead of by package | Guarantees merge conflicts. Partition by directory |
| Letting a non-Claude agent skip `AGENTS.md` | It will not know that fabricating an ASL fixture is catastrophic rather than helpful |
| Keeping invariants only in prose | Prose binds one vendor at a time; a failing test binds all of them |
| Agents doing W1 or W9 | Reviewer outreach and revenue are human acts. An agent cannot secure a Deaf reviewer or take a payment |
| Deferring the human workstreams to "after the code" | Two of three judging criteria live there, and they have the longest lead times |
| Debating governance relaxations on D15 | `execution-plan.md` §7 settled them. Reopening mid-window costs days |

---

## 10. Do this today

1. **[HUMAN]** Reviewer and vendor outreach — execution plan W1.1. Before any of
   the below. It is the only irreversible clock in the project.
2. **[HUMAN]** Budget alert on the GCP project; confirm Gemini quota.
3. **[AGENT]** Create `CLAUDE.md` and `GEMINI.md` pointer files (§2).
4. **[HUMAN]** Retire the three stale Codex worktrees (§4.1).
5. **[AGENT]** `task start` for `w0-compliance` (Claude Code) and `w2-renderer`
   (Claude Code), and `w4-authoring` (Antigravity) once dependency approval in
   execution plan §4.1 is granted.
6. **[AGENT]** Convert the §2.1 invariants into foundation-checker assertions.
   Do this before the agent count grows, not after.
