# Codex Skills (project-scoped)

Skills placed here are available to Codex agents working in this repository.
They were copied from `personal-monorepo-template/.codex/skills/` on 2026-07-28.
The template remains the canonical source; update it there and re-copy rather
than editing divergent copies.

## What is here, and why

| Skill | Why it is in this project |
| --- | --- |
| `ultragoal` | Codex-native durable goals with verifiers and completion proof. Fits the long-running, verifier-gated workstreams in `docs/execution-plan.md`, where `pnpm verify` is a real pass/fail signal Codex can iterate against |
| `audit-ai-code` | Serves the cross-vendor review pass in `docs/agent-orchestration.md` §6 — Codex auditing code written by another vendor's agent, preserving behaviour and the repository's local idiom |

## What was deliberately not copied

- **`loop`** — name-collides with an unrelated active `loop` skill in the Claude
  Code environment, and its description hard-codes another person's name. A
  collision like this is exactly the failure mode worth avoiding.
- **`yeet`** — stages with `git add -A`, then pushes and opens a PR in one flow.
  That conflicts with this repository's requirement to preserve user changes in
  dirty checkouts, and with the workspace rule that merge, push, and deployment
  stay separate human-reviewed actions.
- **`gh-commit`, `gh-fix-ci`, `gh-address-comments`** — overlap existing tooling
  and CI that has not yet run in this repository.
- The remaining template skills are unrelated to this project.

## Boundary

A skill cannot authorise anything `AGENTS.md` forbids. If a skill's workflow
would push to `main`, deploy, add a production dependency, send outreach, or
mark a `[HUMAN]` gate complete, the contract wins and the agent stops.
