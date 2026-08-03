# Current state brief — 2026-08-02

Written for whoever picks this up next, human or agent, with no prior context.
Read this before `HANDOFF.md` if you are new; read `HANDOFF.md` after, for the
commit-level detail.

Submission closes **2026-08-17, 13:00 Pacific**. That is 15 days from this
brief.

Revised later the same day, after reviewing all five open pull requests. The
first draft said the YouTube adapter and Chrome extension did not exist. That
was true of `main` and wrong about the project: both are written and waiting in
PR #3. §3 now separates what is on `main` from what is in an unmerged branch,
because the difference decides whether a demo is possible this week.

---

## 1. What the product is

Deaf and hard-of-hearing students often watch educational video with captions
they cannot read comfortably, because captions assume fluency in a written
language many people schooled in a signed language do not have. SignBridge
attaches a small signing layer to existing video, and works offline on cheap
devices.

The reusable part is the **overlay protocol**, not the signing. Signing itself
is language-, dialect-, and community-specific, and stays under human control.

---

## 2. The single most important thing to understand

**There is no sign-language content in this repository, and there deliberately
cannot be any yet.**

If you are looking for a demo showing American Sign Language over a YouTube
video, it does not exist. That is a decision, not a missing feature.

Producing something that *looks* like signing — a generated avatar, a stock
clip of a person's hands, motion captioned as ASL — would be worse than
shipping nothing. It would misinform the exact people the product claims to
serve, and it cannot be corrected after the fact by a disclaimer. A wrong sign
is not a typo; it can invert meaning.

So the project refuses, and the refusal is enforced by machine:
`tools/verify-baseline.mjs` fails the build if a real signed-language code, a
`published` or `human_reviewed` marker, or tracked video media appears. Do not
weaken those checks. If one blocks you, it is working.

Real signing may ship only after a **qualified Deaf ASL reviewer** is appointed
and rights-cleared signer video is licensed against exact file hashes. Neither
has happened. Both are deliberately deferred (see §7).

### What the demo therefore is

The demo is the **pipeline and the refusal**, not a signed video:

> Gemini drafts segment-to-sign proposals live and abstains when it cannot
> support a segment. Here is the review queue a Deaf reviewer would work. Here
> is the publisher refusing to emit a pack, because no such reviewer has
> approved one. Here is the runtime playing offline with captions preserved in
> every failure state.

Most submissions in this space will fake exactly what this one refuses to fake.
That is the pitch.

For visual proof of synchronisation, the renderer uses **procedurally generated
abstract motion** — plain geometric shapes, obviously not a person, labelled
`synthetic-test-only` in the filename, the manifest, and on screen.

Once PR #3 and PR #5 merge, the overlay can attach to a real YouTube video and
track its clock through seeking, pausing, and SPA navigation. **What appears
over that video is still abstract geometry, never signing.** If you are asked to
show the product on a YouTube video, that is the honest demo: the overlay
attaches, follows the clock exactly, keeps captions visible, and states on
screen that no reviewed SignPack is loaded. Do not let the presence of a real
video invite a signing-shaped placeholder over it.

---

## 3. What actually exists today

Verified by inspection on 2026-08-02. **Read the middle column carefully** —
several surfaces exist in an unmerged pull request but not on `main`, and
checking out `main` alone will make them look absent.

| Surface | On `main` | In an open PR |
| --- | --- | --- |
| SignPack contracts, six JSON Schemas + validators | Working, tested | — |
| Sync engine and runtime, dependency-free | Working, tested, frozen | — |
| HTML5 video adapter | Working, tested | — |
| Local caption-pack storage, hashed IndexedDB | Working, tested | — |
| PWA playback shell | Working, blocked state by design | — |
| Authoring service with live Gemini | **Deployed and working** | PR #6 refines |
| Sign renderer + abstract motion | No | **Yes — PR #5** |
| YouTube adapter | No, HTML5 only | **Yes — PR #3** |
| Chrome extension, Manifest V3 | Empty directory | **Yes — PR #3** |
| Reviewer console | Empty directory | No — unstarted |
| SignPack publisher | Empty directory | No — unstarted |
| Any sign media | **None, by design** | **None, by design** |

On `main` alone, `apps/extension/`, `apps/reviewer/`, and
`packages/signpack-publisher/` contain zero TypeScript files. Only the reviewer
console and the publisher are genuinely unstarted; the extension and adapter are
written and waiting to merge.

### Pull requests, as of 2026-08-02

All five were conflicting when reviewed. Two turned out to be superseded rather
than pending, and one of those is actively dangerous to merge.

| PR | Verdict | Reason |
| --- | --- | --- |
| #6 authoring, deploy, integrity | **Merge** | Clean, CI green on Node 22 and 24 |
| #5 renderer + abstract motion | **Merge** | Conflict resolved; merged tree verified |
| #3 YouTube adapter + extension | **Merge** | Conflict resolved; merged tree verified |
| #2 signpack contracts | **Close, do not merge** | Zero content `main` lacks. Its `types.ts` is 372 lines against main's 379 — main is a strict superset |
| #4 gate-one governance | **Close, do not merge** | All six docs are byte-identical to main's, but its `tools/verify-baseline.mjs` is 198 lines against main's 544. Merging would revert the integrity checker |

#3 and #5 conflicted only in `HANDOFF.md`, which the execution plan reserves to
the integrator precisely because it is the merge-conflict surface. Both branches
still asserted the repository had no Git remote, so resolving the conflict
naively would have reverted current truth. Each was resolved by taking main's
file as the base and re-applying the branch's own contribution, then verifying
**the merged tree** rather than either side:

- #5 merged with main: 18/18 foundation, 119/119 Vitest across 12 files, bundle
  16.04 kB compressed, 8.0% of the 200 KB budget.
- #3 merged with main: 18/18 foundation, 101/101 Vitest.

Merging in the order #6, #5, #3 is expected to require one further `HANDOFF.md`
resolution per merge, since each lands new content in that same file.

### The PWA, as it renders today

Run `pnpm dev:pwa` and open `http://127.0.0.1:4173`. You get:

- A banner reading `SYNTHETIC TEST ONLY — Draft zxx/ZZ fixture, no publication
  authority`
- An overlay stating `Signing is unavailable for this synthetic draft`, with
  state `not_published`
- Independent source captions that stay visible
- Keyboard controls to hide, resize, and reposition the overlay
- On the PR #5 branch, an abstract-motion surface following the real media clock

`zxx` is the ISO code meaning "no linguistic content" and `ZZ` means "unknown
region". They are used everywhere precisely so no fixture can be mistaken for a
real language.

---

## 4. Deployed infrastructure

Google Cloud project **`gemini-hackathon-0802402`**, region `us-central1`,
billing linked to the $300 hackathon trial.

- Cloud Run service `authoring-service`, public and unauthenticated, max 3
  instances: `https://authoring-service-37750553255.us-central1.run.app`
- Endpoints: `GET /health`, `GET /metrics`, `POST /propose`
- Built by Cloud Build from `services/authoring/cloudbuild.yaml`, pushed to
  Artifact Registry `signbridge-repo/authoring-service:latest`

### Gemini is reached through Vertex AI. This matters.

There are two separate Google billing systems with confusingly similar names:

| Path | Bills against | Usable here |
| --- | --- | --- |
| Gemini Developer API (AI Studio key) | AI Studio prepaid credits | **No** |
| Vertex AI (`aiplatform`) | The Google Cloud project | **Yes** |

The hackathon's $300 is Google Cloud credit. It **cannot** pay for Gemini
Developer API calls. An API key was tried first and returned
`429 RESOURCE_EXHAUSTED — your prepayment credits are depleted` on every call.

The service now sets `GOOGLE_GENAI_USE_VERTEXAI=true` with
`GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`, authenticating through the
Cloud Run runtime service account. No key is stored. Do not "fix" this by
reintroducing an API key.

To verify a live call yourself:

```bash
curl -sS -X POST https://authoring-service-37750553255.us-central1.run.app/propose \
  -H "Content-Type: application/json" \
  -d '{"segmentText":"water evaporates and forms clouds","startTime":0,"endTime":4,
       "signedLanguage":"zxx","region":"ZZ","environment":"production",
       "candidates":[{"assetId":"ast_synth_water","gloss":"SYNTH-WATER"}]}'
```

Expect HTTP 200 and roughly 3–5 seconds elapsed between the run manifest's
`startedAt` and `completedAt`. The deterministic fallback finishes inside the
same millisecond, so that gap is the evidence a model was actually called.
Setting `"environment":"synthetic_test"` deliberately bypasses Gemini.

---

## 5. Contest eligibility

Missing any single item disqualifies everything else, so this outranks all
feature work.

| Requirement | State |
| --- | --- |
| A Google Cloud product in production use | Met — Cloud Run, Artifact Registry, Cloud Build |
| A live Gemini call in the deployed app | Met — verified via Vertex AI |
| Public repo with licensing | Met — Apache 2.0 |
| Pre-existing work disclosed | Met — `PREEXISTING_ASSETS.md` |
| New project within the contest period | Met — first commit 2026-07-28 |
| Working project, free and unrestricted for judges | **Open** — needs W0.3 |
| Demo video under 3 minutes | **Open** — owner |
| Funding disclosure, required even if zero | **Open** — owner |

---

## 6. What to do next, in order

1. **Resolve the five pull requests**, per the verdicts in §3. Close #2 and #4;
   merge #6, then #5, then #3, re-running `pnpm verify` on `main` after each.
   This is the largest single risk right now: five branches drifting from `main`
   is the opposite of the plan's "integrate per completed slice, `main` always
   green". Merging also lands the renderer, the YouTube adapter, and the
   extension, which together are most of the visible product.

   ```bash
   gh pr close 2 --comment "Superseded: main already contains this work."
   gh pr close 4 --comment "Superseded: main's verify-baseline.mjs is 544 lines to this branch's 198."
   gh pr merge 6 --merge && gh pr merge 5 --merge && gh pr merge 3 --merge
   ```

2. **W0.3 — the judge route.** A public page where someone with no account and
   no API key triggers a live proposal and watches it reach the review queue.
   Rate-limited, never behind a login. This closes an eligibility item, and it
   is the last one that is neither owner-only nor already done.
3. **W10.4 — funding disclosure.** Required even if the answer is zero. Minutes
   of work, and forgetting it voids everything else.
4. **W6 — publisher refusal paths.** The demo's central claim, and the only
   major workstream still unstarted. Prove by test that it refuses on incomplete
   review, withdrawn asset, hash mismatch, insufficient rights, and above all
   **absent reviewer** — the live path today.
5. **W10.2 — demo video.** Under three minutes. State plainly that on-screen
   motion is synthetic and not a signed language.

W2, the renderer, is no longer a to-do — it is written and waiting in PR #5.
The reviewer console (W5) is unstarted and is the one place where a screen
showing an empty queue is the correct, truthful result.

Business viability scores near zero by choice: all outreach, customers, and
revenue are deferred. That was a deliberate trade for zero external
dependencies, and it is not a defect to fix now.

---

## 7. Deferred, not cancelled

Nothing below may be quietly reinterpreted as unnecessary.

| Deferred | Reactivate when |
| --- | --- |
| Deaf reviewer, signer, rights grants | **Before any real signed-language content.** Non-negotiable |
| Golden pack with reviewed ASL | The reviewer gate closes |
| Revenue, customers, pilots | The owner resumes outreach |

---

## 8. Rules that will get you rejected if broken

- Never fabricate a signed-language mapping, reviewer identity, consent record,
  rights grant, review event, or approval — not even as test scaffolding or to
  make a screen look populated. An empty queue is the truthful state.
- Never use `ase` or any real signed-language code in a fixture. Use `zxx`/`ZZ`.
- Never present any on-screen motion as a signed language.
- Never weaken or delete a test to make a change pass. Escalate instead.
- Never describe the product as universal sign language or an automatic
  interpreter.
- AI output is always a proposal. It cannot approve or publish.
- The viewer must never require Gemini, Firebase, or a network connection.
- Accessibility status stays `not_evaluated` until human and device evidence
  exists. No agent may upgrade it.

---

## 9. Working agreements

Four agents work in parallel git worktrees under
`/Users/omar/Downloads/Claude/.worktrees/signbridge-overlay/`. Each assigned
worktree holds an untracked `START.md` naming its owner and paths.

**Work in your assigned worktree, never the primary checkout.** The primary has
no `START.md` by design. This rule has already been broken once: on 2026-07-29
work was left uncommitted in the primary checkout and sat orphaned for four
days. It contained three real bugs, so losing it would have silently broken the
project's core claim. Before starting anything, run `git status` in the primary
checkout and treat any uncommitted change there as an incident.

Verification is the only definition of done:

```bash
node tools/verify-baseline.mjs
corepack pnpm verify
```
