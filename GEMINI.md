# Gemini Entry Point

`AGENTS.md` is the authoritative agent contract for this repository. Read it in
full before writing any code.

Then read, in order:

1. `PROJECT_CONTEXT.md` — the approved product boundary.
2. `docs/execution-plan.md` — the current work queue, workstreams, and the
   submission deadline.
3. `docs/agent-orchestration.md` — how tasks are assigned, isolated, and
   verified across agent vendors.
4. `docs/architecture.md` — dependency direction and the playback boundary.
5. The README of each package you will touch.

Do not duplicate rules into this file. If this file and `AGENTS.md` ever
disagree, `AGENTS.md` wins.

## Scope note for Gemini-based agents

Per `docs/agent-orchestration.md` §3, Gemini and Antigravity own **one**
workstream: `services/authoring/` (execution plan W4). Do not edit
`packages/`, `apps/`, `tools/`, or `contracts/` — other agents own those paths
concurrently, and overlapping edits produce merge damage.

`services/authoring/` is the only place in this repository permitted to depend
on `@google/genai`, and it must never become a dependency of the playback path.

## Non-negotiable, restated only because violating them causes real harm

- Gemini output is always a **proposal**. It cannot approve, publish, or
  silently fill an unsupported segment. `unsupported` is a first-class,
  encouraged output — the model must be able to abstain.
- Never fabricate a signed-language mapping, reviewer identity, consent record,
  rights grant, review event, or approval — not even as test scaffolding.
- Synthetic fixtures use the reserved `zxx`/`ZZ` markers. Never `ase` or any
  other real signed-language code.
- Never log transcript contents, reviewer identities, or student identities.
- Never mark a `[HUMAN]` item in `docs/execution-plan.md` complete.

`node tools/verify-baseline.mjs` and `pnpm verify` enforce much of this
mechanically. If a check blocks you, the check is probably right.
