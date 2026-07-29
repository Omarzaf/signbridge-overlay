# Agent Briefs

Paste-ready task briefs, one per vendor. Open each agent **in its own worktree
path** and paste the matching block. Do not paste two briefs into one agent, and
never run two write-capable agents in the same worktree.

Worktrees are branched from `docs/planning-and-agent-orchestration`, which
carries the enforced foundation checks. `ws.mjs` names every branch with a
`codex/` prefix regardless of vendor — that is a naming quirk of the tool, not a
statement about which agent owns the branch.

| Agent | Worktree | Branch |
| --- | --- | --- |
| Codex | `.worktrees/signbridge-overlay/w3-extension` | `codex/w3-extension-20260729` |
| Gemini / Antigravity | `.worktrees/signbridge-overlay/w0-authoring` | `codex/w0-authoring-20260729` |
| Fable 5 | `.worktrees/signbridge-overlay/w5-reviewer` | `codex/w5-reviewer-20260729` |
| Claude | `.worktrees/signbridge-overlay/w2-renderer` | `codex/w2-renderer-20260729` |

---

## Codex — W3, extension and YouTube adapter

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w3-extension

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/execution-plan.md §1 and §6 W3 — your deliverable and done criteria.
  3. docs/architecture.md — dependency direction and the extension permission
     contract.
  4. packages/video-adapters/README.md and its existing source.

You own ONLY: packages/video-adapters/, apps/extension/
Anything outside those paths: report it, do not change it.

Build W3:
  W3.1 Manifest V3 extension. YouTube-only required host access. Generic sites
       use optional_host_permissions with an explicit per-site grant, explained
       before it is requested. No <all_urls>. No remotely executed code. All
       code bundled locally.
  W3.2 YouTube adapter alongside createHtml5VideoAdapter, same discipline:
       sample the real media clock, resolve the source fingerprint on EVERY
       sample, never advance an independent timer, fail visibly on source
       replacement. Handle SPA navigation — a video change without a page load
       must invalidate the fingerprint rather than keep signing over new
       content.
  W3.3 Permission and CSP release tests.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w3-extension
  passes, and the W3 acceptance criteria in the execution plan are met.
  Update HANDOFF.md with what landed and what remains.

Hard rules:
  - Do not add a production dependency. Only services/authoring may have one,
    and it is not yours.
  - Do not weaken or delete a test to go green. Escalate instead.
  - Do not create fixtures using "ase" or any real signed-language code.
    Synthetic fixtures use the reserved zxx/ZZ markers only.
  - Do not fabricate a reviewer identity, consent record, rights grant, review
    event, or approval — not even as a placeholder.
  - Do not produce or reference any video of a human appearing to sign.
  - Do not mark any owner-only item complete.
  - Do not push to main, deploy, or send anything outward.
  - tools/verify-baseline.mjs already enforces the manifest rules. If it blocks
    you, it is working — fix the manifest, not the check.
```

---

## Gemini / Antigravity — W0.1, deployed authoring service

**Blocked until the owner confirms Google Cloud billing, a Gemini API key, and
approves `@google/genai`.** Do not start before that.

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w0-authoring

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. GEMINI.md — your scope note.
  3. docs/execution-plan.md §1 and §6 W0.1 — your deliverable and done criteria.
  4. docs/data-and-model-strategy.md — the model recommendation and what is
     explicitly out of scope.
  5. contracts/review-event.schema.json and contracts/run-manifest.schema.json.

You own ONLY: services/authoring/
Anything outside that path: report it, do not change it.

Build W0.1:
  An HTTP service, services/authoring/src/server.ts, exposing POST /propose.
  Input: segment text, timing, declared language metadata, and a CONSTRAINED
  candidate asset identifier list.
  Output: Gemini structured output conforming to a JSON Schema, returning
  either a proposal referencing ONLY supplied candidate identifiers, or an
  explicit "unsupported" result with a reason code.

  The model MUST be able to abstain. "unsupported" is a first-class, encouraged
  output — not a failure. Never guess to fill a segment.

  The service cannot approve or publish. Publication belongs exclusively to
  packages/signpack-publisher, which is not yours.

Done when:
  curl against the running service returns a schema-valid proposal produced by
  a real Gemini call, and
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w0-authoring
  passes. Update HANDOFF.md.

Hard rules:
  - @google/genai is the ONLY production dependency you may add, in
    services/authoring/package.json, pinned to an exact version. No ranges, no
    ^ or ~. tools/verify-baseline.mjs enforces this.
  - services/authoring must never become a dependency of the playback path.
  - Never log transcript contents, reviewer identities, or student identities.
  - Never commit an API key or a .env file. Use environment variables.
  - Do not create fixtures using "ase" or any real signed-language code.
  - Do not fabricate a reviewer identity, consent record, rights grant, review
    event, or approval.
  - Do not produce, generate, or reference any signing video, avatar, or
    synthesised sign language. Text-to-sign generation is out of scope.
  - Do not deploy. Deployment needs the owner's explicit approval.
```

---

## Fable 5 — W5, reviewer console

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w5-reviewer

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/execution-plan.md §1 and §6 W5 — your deliverable and done criteria.
  3. docs/review-protocol.md — the workflow you are building a surface for.
  4. docs/accessibility-acceptance.md, especially "Reviewer application".

You own ONLY: apps/reviewer/, tests/
Anything outside those paths: report it, do not change it.

Build W5:
  W5.1 A review surface showing, with NOTHING hidden: source context, captions,
       proposal status, signing media, timing, rights state, and prior
       decisions. The actions approve / changes_requested / rejected /
       unsupported_confirmed must be visually distinct and reversible before
       publication.
  W5.2 The intended user is Deaf. Full keyboard operation and screen-reader
       semantics are correctness, not polish. No audio cues. No state conveyed
       by colour alone.
  W5.3 Identity, compensation, and conflict data must never appear in URLs,
       client logs, screenshots, or exports.

Note: no reviewer is appointed and no reviewed content exists. Build against
the synthetic zxx/ZZ fixtures. The console must show the queue in its real
empty and blocked states — that is the demo, not a limitation to hide.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w5-reviewer
  passes, and the W5 criteria in the execution plan are met. Update HANDOFF.md.

Hard rules:
  - Do not add a production dependency. The console is framework-free unless
    the owner approves otherwise.
  - Do not weaken or delete a test to go green. Escalate instead.
  - Do not create fixtures using "ase" or any real signed-language code.
    Synthetic fixtures use the reserved zxx/ZZ markers only.
  - Do not fabricate a reviewer identity, consent record, rights grant, review
    event, or approval — not even to populate the UI. An empty queue is the
    truthful state.
  - Do not produce or reference any video of a human appearing to sign.
  - Do not push to main, deploy, or send anything outward.
```

---

## Claude — W2, renderer and overlay

```text
Work in: /Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/w2-renderer

Read first, in order:
  1. AGENTS.md — the authoritative contract. Follow every invariant.
  2. docs/execution-plan.md §1 and §6 W2 — your deliverable and done criteria.
  3. docs/linguistic-safety.md — the crop and mirror prohibition.
  4. docs/accessibility-acceptance.md — overlay acceptance.
  5. packages/sync-engine/src/index.ts — the PlaybackState you consume.

You own ONLY: packages/sign-renderer/, apps/pwa/, tools/
Anything outside those paths: report it, do not change it.

Build W2:
  W2.1 packages/sign-renderer/, dependency-free, importing only sync-engine
       types. Consumes PlaybackState and renders the resolved asset over the
       source video. MUST NEVER crop or mirror — prove it with a test, which
       closes the second pending invariant in agent-orchestration.md §2.1.
       Every caption-fallback reason code renders an explicit readable state.
       Never blank.
  W2.2 Overlay controls extending apps/pwa/src/accessibleFallbackOverlay.ts:
       full keyboard operability, programmatic names/roles/states, visible
       focus, no traps, 44x44px targets, operable at 320px wide and 200% zoom,
       reduced-motion and high-contrast support, no state by colour alone.
  W2.3 Build-step size assertion after build:pwa against the 200 KB compressed
       budget. Closes the first pending §2.1 invariant.
  W2.4 Synthetic motion generator: a build-time script emitting abstract,
       obviously non-linguistic motion into dist/, NEVER committed — the
       foundation check rejects tracked media. Labelled synthetic-test-only in
       filename, manifest, and on-screen UI.

Done when:
  node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \
    signbridge-overlay --worktree w2-renderer
  passes, abstract motion plays in sync uncropped and unmirrored with captions
  visible, and the UI states plainly that the motion is synthetic and not a
  signed language. Update HANDOFF.md.

Hard rules:
  - Do not add a production dependency. The renderer is dependency-free.
  - The generated motion must be unmistakably non-human. No likeness, no hands,
    no figure. Abstract geometry only.
  - Never label generated motion as a signed language anywhere: filename,
    manifest, UI, alt text, or commit message.
  - Do not create fixtures using "ase" or any real signed-language code.
  - Do not weaken or delete a test to go green.
  - Do not push to main, deploy, or send anything outward.
```

---

## Integration

When a branch goes green, the owner reviews the diff and the integrator merges
it into the base branch, re-runs `pnpm verify`, and updates `HANDOFF.md`. A red
branch stays on its branch. `main` is never merged into while red.

Cross-vendor review, per `docs/agent-orchestration.md` §6: the agent that wrote
the code does not review it. Codex audits Claude's renderer and publisher;
Claude audits Codex's extension manifest and storage.
