# SignBridge Execution Plan — Build with Gemini XPRIZE

**Written:** 2026-07-28
**Submission deadline:** 2026-08-17, 13:00 Pacific Time
**Working days remaining:** 20 (D0 = 2026-07-28, D20 = 2026-08-17)
**Status:** Active plan. Supersedes the sequencing implied by `HANDOFF.md`.

---

## 0. How to use this document

This plan is written to be executed by AI agents with a human owner making the
decisions that only a human can make. Every workstream states its **deliverable**,
its **acceptance criteria**, its **blocking dependencies**, and the **files it may
touch**. An agent should not begin a workstream whose dependencies are unmet.

Read `AGENTS.md` before touching code. This plan does not override it. Where this
plan and `AGENTS.md` conflict, `AGENTS.md` wins and the conflict is escalated to
the human owner.

Three classes of work appear here:

| Class | Marker | Who does it |
| --- | --- | --- |
| Agent-executable | **[AGENT]** | An AI agent, on a feature branch, verified by `pnpm verify` |
| Human-only | **[HUMAN]** | The owner. No agent may simulate, forge, or assume completion |
| Human-approved, agent-executed | **[GATED]** | Agent prepares; human approves before it takes effect |

**No agent may mark a [HUMAN] item complete.** Appointing a reviewer, executing a
rights grant, sending outreach, deploying to production, and submitting to the
contest are human acts. An agent that cannot proceed because a [HUMAN] gate is
open must stop and report, not work around it.

---

## 1. Situation

### 1.1 What exists

The repository contains a genuinely strong foundation built on 2026-07-28:

- Six versioned JSON Schemas in `contracts/` with dependency-free TypeScript
  validators in `packages/signpack-schema/`.
- A dependency-free sync engine (`packages/sync-engine/`) exposing
  `preparePlaybackModel` and `resolvePlaybackState`, driven solely by the media
  clock, with half-open segment ranges and explicit caption-fallback reason codes.
- A framework-free runtime controller (`packages/runtime/`) exposing
  `createRuntimeController`.
- An HTML5 lifecycle adapter (`packages/video-adapters/`) exposing
  `createHtml5VideoAdapter`.
- Digest-verified IndexedDB pack storage (`packages/pack-storage/`) exposing
  `createCaptionPackStore` and `createIndexedDbCaptionPackStore`.
- A PWA shell (`apps/pwa/`) that loads a synthetic fixture and correctly renders
  a blocked `not_published` state with an accessible overlay.
- 85 passing Vitest tests, 8 passing Playwright tests, a CI workflow, and a
  dependency/media foundation checker (`tools/verify-baseline.mjs`).
- A remote at `github.com/Omarzaf/signbridge-overlay`.

The engineering discipline here is real and should be preserved. The playback
path is dependency-free, timer-free, and fails visibly. That is the hard part of
this product and it is done.

### 1.2 What does not exist

Nothing a judge can watch. Specifically:

- No sign-media renderer. The overlay renders state, not video.
- No Chrome extension. `apps/extension/` is a README.
- No YouTube adapter.
- No authoring service. `services/authoring/` is a README.
- No reviewer console. `apps/reviewer/` is a README.
- No publisher implementation. `packages/signpack-publisher/` is a README.
- **No Gemini API call anywhere in the source.**
- **No deployment. No Google Cloud product in use.**
- No reviewed ASL content, no signer, no signed rights grant, no reviewer.

### 1.3 What the contest actually scores

Three equally weighted criteria:

1. **Business Viability** — "Teams must launch a real business during the
   hackathon, acquire real users, and generate real revenue." Judges assess
   actual revenue achieved in the window and the sustainability of the model.
   Judges may request revenue records and a live call.
2. **AI-Native Operations** — the extent to which AI is live in production and
   executes key decisions.
3. **Category Impact** — Education & Human Potential is our category.

Plus three hard eligibility requirements currently unmet:

- At least one **Google Cloud** product, with the project running on its intended
  platform.
- At least one **Gemini API call in the deployed application**.
- A **working, freely accessible project** judges can test without restriction
  until judging ends, plus a public code repo and a demo video under 3 minutes
  on YouTube/Vimeo/Youku.

"New Projects Only" is satisfied: first commit is 2026-07-28, well inside the
submission period that opened 2026-05-19. Pre-existing work disclosure is
already partly handled by `PREEXISTING_ASSETS.md` — keep it current.

### 1.4 The central tension

The repository is gated behind seven human approvals that are correct for
shipping a real accessibility product and impossible to complete in 20 days at
full strength while also earning revenue. This plan resolves that by:

- **Keeping every gate that protects Deaf users from fabricated or unreviewed
  signing.** These are non-negotiable and are also the product's differentiator.
- **Relaxing the gates that are process formality**, with each relaxation
  recorded as a dated decision record rather than silently dropped.
- **Choosing a customer whose existing staff closes the reviewer and signer gates
  as a side effect of the commercial relationship.**

That third move is the structural key to the entire plan. See §3.

---

## 2. Locked strategic decisions

These were decided by the owner on 2026-07-28 and are not reopened by agents.

| Decision | Choice | Consequence |
| --- | --- | --- |
| Who pays | Institutions pay; deaf students never pay | Revenue comes from organisations with accessibility budgets and legal obligations |
| Language scope | ASL (`ase`, `US`) only, honestly framed | Keeps the existing `docs/language-scope.md` scope. Portability to other signed languages is claimed as *architecture*, never as delivered coverage |
| Signing representation | Rights-cleared human video | No avatar, no generative text-to-sign. Unchanged from `docs/data-and-model-strategy.md` |
| Runtime independence | Playback never requires network, Gemini, or cloud | Unchanged from `AGENTS.md` |

### 2.1 The claim we are allowed to make

> SignBridge is an authoring, review, and offline-delivery system for
> human-reviewed American Sign Language layers on educational video. Gemini
> drafts segment-to-sign proposals against a rights-cleared catalog; a qualified
> Deaf reviewer decides every one; the published pack plays offline on low-cost
> devices with captions preserved in every failure state.

### 2.2 Claims that are forbidden in code, UI, docs, pitch, and demo video

- "Universal sign language" or "automatic interpreter."
- "Real-time translation" of arbitrary audio.
- Any coverage claim for a signed language we have not reviewed content in —
  specifically Pakistani, Indian, Kenyan, Nigerian, or any other signed language.
- Any accessibility conformance claim not backed by retained evidence
  (`docs/accessibility-acceptance.md` status is `not_evaluated` until proven).
- Any implication that offline copies can be remotely recalled.

The correct framing for the impact story is: *this architecture is designed so
that a Deaf community anywhere can author packs in their own signed language
without our involvement, and we have proven it in one language.* That is true,
defensible, and still a strong Category Impact story.

---

## 3. The business

### 3.1 Who buys

The paying customer is **not** the deaf student and **not** a school in a
low-income region. It is an organisation that already spends money on sign
language access and has a deadline or a legal obligation.

Ranked by how fast money can move in 20 days:

**Tier 1 — ASL interpretation / captioning / accessibility vendors.**
These are the highest-value first customers and the structural key to this plan.
They already employ qualified Deaf linguists and signers. They already hold
rights and consent infrastructure. They already have paying clients. Their
bottleneck is production throughput — exactly what a constrained Gemini proposal
layer reduces. A pilot with one of these closes the reviewer gate, the signer
gate, and the revenue gate **simultaneously**.

**Tier 2 — University disability services offices and online course providers.**
Legal obligation under the ADA and Section 508 in the US. Have budgets. Slower
procurement, but a small paid pilot can be authorised at department level.

**Tier 3 — Ed-tech platforms and MOOC providers.** Accessibility is a
procurement blocker in their enterprise and public-sector deals. Motivated, but
longer sales cycles.

**Tier 4 — Deaf-led non-profits and schools for the deaf.** These are the
mission audience. They receive the product **free**. They are references and
impact evidence, not revenue.

### 3.2 What they buy

Not the viewer. The viewer is free forever, for everyone.

They buy the **production pipeline**: the authoring service that drafts
proposals, the reviewer console that lets their Deaf linguists accept, correct,
or reject each one, and the publisher that emits a rights-bound, hash-verified,
offline-capable SignPack.

The value proposition is throughput: reviewing and correcting an AI-drafted
proposal is faster than authoring from scratch, and the false-supported rate is
measured and reported rather than hidden. The primary success metric defined in
`docs/data-and-model-strategy.md` — *reduced review effort without increasing
false support or weakening human authority* — is exactly the sales metric.

### 3.3 Pricing structure

**[HUMAN]** Validate the actual numbers against current market rates before
quoting. Do not let an agent invent a price and do not publish rates that have
not been checked.

Structure to validate:

- **Pilot fee** — a fixed engagement covering one source video end to end.
  Deliberately small enough to be approved without procurement.
- **Per finished minute** of published signed layer, which is how signed video
  production is already commonly priced and therefore easy for a buyer to compare.
- **Per reviewer seat per month** for the console, once volume justifies it.

Whichever is chosen, the invoice must be real, paid, and documented. Judges can
request revenue records.

### 3.4 The AI-Native Operations story

This criterion is about AI being live in production and executing key decisions.
Our honest and strong answer:

- Gemini, in production, with structured output constrained to a JSON Schema,
  drafts every segment-to-asset proposal and **explicitly abstains** by emitting
  `unsupported` rather than guessing.
- The abstention is itself the key AI decision, and it is measured: the
  false-supported rate is a tracked, reported metric.
- A human Deaf reviewer holds final authority by design, not by fallback.

Do not overclaim autonomy. "AI drafts, human decides, and we measure how often
the AI was wrong" is a *stronger* and more credible answer to this criterion than
a claim of full automation — especially in accessibility, where a fabricated
translation is a harm, not a rounding error.

---

## 4. Dependency and approval decisions to make on D0

**[GATED]** These unblock nearly everything. Get them approved today.

### 4.1 Production dependency approvals

`AGENTS.md` forbids adding a production dependency without approval. The
following are the **only** production dependencies this plan authorises, and each
is confined to a path that never enters playback:

| Dependency | Where it may be imported | Where it must never appear |
| --- | --- | --- |
| `@google/genai` (Gemini SDK) | `services/authoring/` only | `packages/sync-engine`, `packages/runtime`, `packages/video-adapters`, `packages/pack-storage`, `packages/signpack-schema`, `apps/pwa`, `apps/extension` |
| A minimal HTTP server for Cloud Run | `services/authoring/` only | Everywhere else |

The playback path stays dependency-free. `tools/verify-baseline.mjs` must be
extended to **enforce** this boundary, not merely document it (see W0.4). If the
foundation checker cannot express the rule, that is a blocker to report, not a
reason to skip it.

### 4.2 Google Cloud

**[HUMAN]** Enable billing on a Google Cloud project today. Nothing else in W0 or
W4 can start without it. Services used:

- **Cloud Run** — hosts `services/authoring` and the reviewer console. Satisfies
  the Google Cloud product requirement.
- **Cloud Storage** — holds signing media and published packs.
- **Artifact Registry** — container images for Cloud Run.
- **Gemini API** via AI Studio or Vertex AI. Confirm quota and rate limits on D1,
  not on D18.

### 4.3 Chrome Web Store — do not depend on it

**[HUMAN]** Store review latency is outside our control and can exceed the
remaining window. **The submission must not require a published store listing.**
Judges get an unpacked extension with load instructions plus the hosted PWA. If
the listing happens to clear review in time, that is a bonus, not a dependency.
Submit the listing early anyway so the clock runs in parallel.

---

## 5. Critical path

The single longest pole is not code. It is **securing a qualified Deaf ASL
reviewer and a signer with executed rights**. Everything linguistic blocks on it,
and `docs/language-scope.md` correctly forbids any agent from populating a sign
catalog before that gate closes.

```
D0  ─┬─ [HUMAN] W1 outreach to Tier 1 vendors + independent reviewers ──────────┐
     ├─ [HUMAN] Google Cloud billing + Gemini quota                              │
     ├─ [GATED] dependency approvals                                             │
     └─ [AGENT] W0 compliance spike + W2 renderer starts (unblocked)             │
                                                                                 │
D1-D3 ── W0 closes: deployed app, live Gemini call, judge-testable URL           │
      ── W2 renderer, W3 extension, W4 authoring service proceed in parallel     │
                                                                                 │
D4  ─── DECISION POINT 1: is a reviewer secured? ◄───────────────────────────────┘
     ├─ yes → Tier 1 or 2 path, golden pack production begins D6
     └─ no  → escalate outreach, prepare Tier 3 fallback

D6-D12 ── W7 golden pack: record, review, correct, publish
       ── W5 reviewer console, W6 publisher, W8 offline media cache
       ── [HUMAN] W9 revenue: pilot agreement signed, invoice issued

D13 ─── DECISION POINT 2: is a published pack real? If no → Tier 3 is now final

D14-D17 ── W10 hardening, accessibility evidence, offline proof on low-end device

D18 ─── FREEZE. Demo video recorded. Submission drafted.
D19 ─── Buffer. Nothing new is started on D19.
D20 ─── Submit by 13:00 PT. Do not submit in the final hour.
```

**Submit by D19 evening.** The deadline is 13:00 PT on D20, which is early in the
day. A submission that depends on D20 morning is a submission that fails.

---

## 6. Workstreams

### W0 — Contest compliance and deployment
**Priority: absolute. Nothing outranks this.**
**Blocks:** submission eligibility itself.
**Depends on:** §4.2 Google Cloud billing.
**Target: complete by D3.**

Without W0 the project is disqualified regardless of how good it is.

#### W0.1 [AGENT] Minimal deployed authoring service with a live Gemini call
- Create `services/authoring/src/server.ts`: an HTTP service exposing
  `POST /propose`.
- Input: source segment text, timing, declared language/region/dialect, and a
  **constrained candidate asset identifier list**.
- Output: Gemini structured output conforming to a JSON Schema, emitting either
  a proposal referencing **only** supplied candidate identifiers, or an explicit
  `unsupported` result with a reason code.
- The service must be **incapable of approving or publishing**. It emits
  proposals and run metadata only, per `docs/architecture.md`.
- Never log transcript contents, reviewer identities, or student identities
  (`AGENTS.md` invariant).

**Acceptance:** a `curl` against the deployed URL returns a schema-valid proposal
produced by a real Gemini call. The call is visible in Google Cloud logs.

#### W0.2 [GATED] Deploy to Cloud Run
- Containerise `services/authoring`. Push to Artifact Registry. Deploy to Cloud
  Run in a region with Gemini availability.
- Deployment to production requires explicit human approval (`AGENTS.md`).

**Acceptance:** a public HTTPS URL responds. Google Cloud product requirement met.

#### W0.3 [AGENT] Judge-testable public demo path
This is a **hard requirement** that is easy to miss: judges must be able to test
the working project *free of charge and without restriction*.

- Deploy the PWA (`dist/pwa`) to a public URL.
- Add a public demo route where a judge with **no account and no API key** can
  trigger a live Gemini proposal and watch the result flow into the reviewer
  console. Rate-limit it; do not require a login.
- Write `docs/judging-instructions.md`: the demo URL, how to load the unpacked
  extension, what to click, what to expect, and an explicit statement of what is
  *not* yet reviewed or claimed.

**Acceptance:** a person handed only the URL can exercise the full pipeline in
under three minutes without contacting us.

#### W0.4 [AGENT] Extend the foundation checker to enforce the dependency boundary
- `tools/verify-baseline.mjs` must fail if any playback-path package imports
  `@google/genai`, any HTTP client, or any `services/` or `apps/reviewer` module.
- This encodes `docs/architecture.md`'s dependency-direction rule as a test.

**Acceptance:** a deliberate violating import fails `pnpm verify`.

#### W0.5 [AGENT] Submission-readiness checklist
Create `docs/submission-checklist.md` tracking every contest requirement with
current status: public repo with licensing, demo video under 3 minutes on
YouTube, English materials, Google Cloud product, deployed Gemini call, free
unrestricted judge access, funding disclosure (**required even if zero**),
pre-existing work disclosure, representative details.

---

### W1 — Human gates: reviewer, signer, rights
**Priority: highest human priority. Start on D0, before any code.**
**Blocks:** W7 entirely, and therefore any public signing media.
**Class: [HUMAN] throughout. No agent may progress, simulate, or assume these.**

#### W1.1 [HUMAN] Secure a qualified Deaf ASL reviewer — start today
Approach Tier 1 vendors first (§3.1): a single agreement can supply reviewer,
signer, rights infrastructure, and revenue at once. Approach independent
reviewers in parallel — do not serialise.

Channels: Gallaudet University, the Registry of Interpreters for the Deaf, the
National Association of the Deaf, Deaf-led accessibility consultancies, and
Deaf ASL consultants on professional freelance platforms.

Record privately, per `docs/review-protocol.md` §Gate-closing evidence:
basis of qualification, scope of semantic and nonmanual review authority,
compensation, conflicts, consent-safe public identifier or anonymity preference,
and the correction/withdrawal/escalation process.

**Pay them properly and promptly.** This is both an ethical obligation and a
practical one — an unpaid reviewer will not prioritise a 20-day window.

#### W1.2 [HUMAN] Secure a signer
Preferably independent from the reviewer. `docs/review-protocol.md` forbids a
signer approving their own work unless the agreement explicitly records that
conflict and an independent escalation path.

#### W1.3 [HUMAN] Execute rights and consent grants
Per `docs/licensing-and-consent.md`, covering: product playback, public demo,
**contest submission**, **sponsor publicity**, territory, term, hosting,
editing/modification, sublicensing, redistribution, attribution, likeness/voice/
performance, and withdrawal.

The agreement must state plainly, **before signature**, that the release model is
an irrevocable grant per exact released asset hash, and that withdrawal blocks
future packs but cannot recall already-distributed offline copies.

Do not use a public demo, a contest submission, or sponsor publicity without an
explicit grant covering that exact purpose.

#### W1.4 [HUMAN] Choose the private evidence store
A single access-controlled location for identities, qualifications, contracts,
signatures, compensation, conflicts, and pilot notes. **Never in Git.** A private
repository or an encrypted store with documented access control is sufficient —
see the relaxation in §7.

#### W1.5 [HUMAN] Select the source video
One narrowly scoped educational video, 3–5 minutes, with rights cleared for our
use, or produced by us. Prefer content the customer already owns — it removes a
rights negotiation and makes the pilot more valuable to them.

---

### W2 — Sign media renderer and overlay
**Priority: high. This is what a judge looks at.**
**Depends on:** nothing. **Start D0 in parallel with W0.**
**Target: complete by D8.**

The runtime already resolves to an `ActiveSignPlaybackState`. Nothing renders it.

#### W2.1 [AGENT] Sign media renderer
- New `packages/sign-renderer/`, dependency-free, importing only from
  `packages/sync-engine` types.
- Consumes `PlaybackState` and renders the resolved signing asset in a video
  element positioned over the source.
- **Must never crop or mirror.** `docs/linguistic-safety.md` forbids cropping or
  mirroring hands, face, torso, or required nonmanual grammar; the accessibility
  contract sets a target of **zero** crop/mirror failures. Enforce aspect ratio
  and full-frame visibility as a test, not a hope.
- Every caption-fallback reason code must render an explicit, readable state.
  Never blank, never invented signing.
- Captions remain independently visible even when signing is active.

#### W2.2 [AGENT] Overlay controls
Extend `apps/pwa/src/accessibleFallbackOverlay.ts`, which already has keyboard
hide/resize/reposition.

Per `docs/accessibility-acceptance.md`: full keyboard operability, programmatic
names/roles/states, visible focus, no keyboard traps, 44×44 CSS pixel touch
targets, operable at 320 CSS pixels wide and 200% zoom, reduced-motion and
high-contrast support, and no state conveyed by colour alone.

The overlay must not cover captions, source controls, or essential educational
content; when space is insufficient, offer an explicit alternate layout.

#### W2.3 [AGENT] Respect the size budget
`docs/architecture.md` sets a provisional 200 KB compressed budget for the core
overlay. Add a build-time size assertion that fails the build when exceeded. This
budget is a load-bearing feature claim for low-cost devices — treat it as a test.

**Acceptance:** with a locally supplied pack and media, real signing video plays
in sync, uncropped, unmirrored, with captions visible, fully keyboard-operable,
and the overlay bundle is under budget.

---

### W3 — Chrome extension and YouTube adapter
**Priority: high. This is the "plugin" in the original vision.**
**Depends on:** W2.1. **Target: complete by D11.**

#### W3.1 [AGENT] Manifest V3 extension
Per the hard permission contract in `AGENTS.md` and `docs/architecture.md`:

- Initial required host access is **YouTube only**.
- Generic sites use `optional_host_permissions` with an explicit per-site user
  grant, explained before it is requested.
- **`<all_urls>` is forbidden. Remotely executed code is forbidden.** All code
  bundled locally.
- No silent caption uploads.

#### W3.2 [AGENT] YouTube adapter
- Add to `packages/video-adapters/`, alongside `createHtml5VideoAdapter`.
- Same discipline as the HTML5 adapter: sample the real media clock, resolve the
  source fingerprint on **every** sample, never advance an independent timer,
  fail visibly on source replacement.
- Handle YouTube's SPA navigation — a video change without a page load must
  invalidate the fingerprint rather than continue signing over new content.

#### W3.3 [AGENT] Extension permission and CSP tests
`docs/architecture.md` says manifest, CSP, and permission checks become release
tests once the extension toolchain is approved. Write them: assert no
`<all_urls>`, no remote code, and correct optional-permission handling.

**Acceptance:** loaded unpacked in Chrome, the extension overlays a reviewed pack
on a YouTube video, survives seek/pause/rate/fullscreen/navigation, and requests
only YouTube host access.

---

### W4 — Authoring service (full)
**Depends on:** W0.1. **Target: complete by D10.**

#### W4.1 [AGENT] Constrained proposal generation
Harden W0.1 into the real thing:

- Gemini receives a **tightly constrained candidate list** from deterministic
  lexical and metadata retrieval over the approved catalog — never an open
  vocabulary.
- Structured output conforming to a JSON Schema, per
  `docs/data-and-model-strategy.md`.
- The model **must be able to abstain**. `unsupported` is a first-class,
  encouraged output, not a failure.
- The unit of work is **one semantic segment in context**, not one English word.
  Word-for-word gloss substitution must not be treated as translation.

#### W4.2 [AGENT] Run manifests and review events
- Emit run manifests conforming to `contracts/run-manifest.schema.json` with AI
  provider, model, prompt reference, and run metadata — and no sensitive content.
- Emit `proposal_created` review events conforming to
  `contracts/review-event.schema.json`. Review events are **append-only**; a
  correction creates a new candidate and supersedes rather than erases.

#### W4.3 [AGENT] Metrics instrumentation
Instrument from day one, because these numbers are the sales pitch and the
AI-Native Operations evidence:

- **False-supported rate** — the system proposed a usable asset where the
  reviewed result was unsupported. This is the safety metric and must always be
  reported beside coverage.
- Unsupported precision and recall.
- Top-one accepted-without-change rate.
- Changes-requested and rejected rates.
- Reviewer correction time per segment and per source-video minute.

Never collapse these into a single "ASL accuracy" score
(`docs/data-and-model-strategy.md` explicitly forbids it).

---

### W5 — Reviewer console
**Depends on:** W4. **Target: complete by D12.**

This is the surface the customer's Deaf linguists actually use. It is the product
we are selling. Treat its quality as revenue-critical, not as internal tooling.

#### W5.1 [AGENT] Review surface
Per `docs/accessibility-acceptance.md` §Reviewer application, the reviewer must
see, without hidden information: source context, captions, proposal status,
signing media, timing, rights state, and prior decisions.

`approve`, `changes_requested`, `rejected`, and `unsupported_confirmed` must be
**distinct and reversible before publication**.

#### W5.2 [AGENT] Accessibility of the reviewer console itself
The reviewer is Deaf. A console that assumes hearing or that fails keyboard
operability is a product failure, not a polish item. Full keyboard operation,
screen-reader semantics, and support for whatever accommodations the actual
reviewer requests.

#### W5.3 [AGENT] Privacy
Identity, compensation, conflict, and private evidence must never leak into
browser URLs, client logs, screenshots, or public exports.

---

### W6 — Publisher
**Depends on:** W5. **Target: complete by D13.**

`packages/signpack-publisher/` is the only package permitted to emit a published
pack. Its README lists eight gates. For the contest window, implement the
cryptographic and structural gates in full and handle reviewer credentialing as a
documented manual step (see §7).

#### W6.1 [AGENT] Implement
- Retrieve the authoritative complete review log.
- Hash actual media bytes and canonical contract bytes.
- Recompute decision, review-log, asset-ledger, and release hashes.
- Check current withdrawal state atomically before emitting.
- Bind the artifact to a human release certificate
  (`docs/release-certificate-template.md`).
- Emit a content-addressed SignPack or a structured failure. **It may never
  infer a sign, approve a proposal, repair missing rights evidence, or silently
  downgrade unsupported content.**

**Acceptance:** the publisher refuses to emit when review is incomplete, when an
asset is withdrawn, when a hash mismatches, or when a rights grant does not cover
the requested purpose — each proven by a test.

---

### W7 — Golden pack production
**Depends on:** W1 (all of it), W6. **Target: complete by D14.**
**This is the workstream that cannot start without the human gates.**

Per the prototype tier in `docs/data-and-model-strategy.md`:

- One narrowly scoped 3–5 minute educational video.
- Approximately 30–60 reviewed semantic segments.
- Approximately 20–40 exact-hash signing clips.
- One rights-cleared signer, one qualified Deaf reviewer.
- Captions and explicit unsupported fallbacks for **every** segment.
- Deliberately include ambiguous cases, split/merge cases, technical terms,
  names, numbers, fingerspelling, and genuinely unsupported concepts — the
  honest failure cases are more persuasive to a judge than a clean demo.

**[HUMAN]** The reviewer approves the exact hashed assets and manifest being
released. Nothing else closes this gate. If a segment is unresolved, it ships as
a caption fallback. **Deadline pressure never changes that outcome**
(`docs/review-protocol.md`).

This tier supports a credible product demonstration. It does **not** support a
general ASL-translation claim, and the demo video must not imply otherwise.

---

### W8 — Offline media and constrained devices
**Depends on:** W2, W7. **Target: complete by D16.**

This is the differentiator for the impact story. Prove it, do not assert it.

#### W8.1 [AGENT] Media caching
Extend `packages/pack-storage/` from JSON-only into Cache Storage for media
bytes. Current `MAX_CAPTION_PACK_BYTES` is 262,144 — media needs a separate,
larger, quota-aware path. Preserve the existing discipline: hash on write,
rehash and revalidate on read, idempotent identical bytes, no silent overwrite
on conflict.

#### W8.2 [AGENT] Quota, eviction, and recovery
Storage quota, eviction, interrupted import, corrupt pack, and insufficient space
must all produce recoverable, understandable outcomes.

#### W8.3 [AGENT] Offline proof on a real low-end device
- Full airplane-mode test: playback, imported packs, controls, captions, and
  failure messages all work with networking disabled.
- Loss of Gemini, cloud storage, or the authoring service must never block
  playback of a valid local pack.
- **[HUMAN]** Test on an actual low-cost Android phone, not just a throttled
  desktop profile. Record it — this footage is the impact story in the demo video.

---

### W9 — Revenue
**Class: [HUMAN] throughout. Start D0. Do not defer to D15.**
**Target: signed agreement by D12, paid invoice by D16.**

Revenue is one of three equally weighted criteria and the one most likely to be
missed by an engineering-led team. It cannot be compressed into the final week.

#### W9.1 [HUMAN] Outreach — D0
Contact Tier 1 vendors and Tier 2 institutions in parallel. A Tier 1 partner who
supplies a reviewer *and* pays for a pilot resolves W1 and W9 in one relationship
— pursue that combination hardest.

Never send outreach without explicit approval (`AGENTS.md`). An agent may draft;
a human sends.

#### W9.2 [HUMAN] Pilot agreement
Small, fixed scope, one source video, clearly defined deliverable. Small enough
to be approved without a procurement cycle.

#### W9.3 [HUMAN] Take real payment
Set up payment collection early. Issue a real invoice, collect real money, retain
the records. Judges may request revenue records, expense statements, and proof of
user relationships, and may require a live call.

#### W9.4 [HUMAN] Free tier for the mission audience
Deaf-led non-profits and schools for the deaf get the product free. Document
these as users and impact evidence. This is both the right thing and the
strongest possible answer to Category Impact.

#### W9.5 [HUMAN] Funding disclosure
The contest requires disclosing funding acquired during the period **even if
zero**. Do not overlook this.

---

### W10 — Hardening, evidence, and submission
**Target: freeze D18, submit D19 evening.**

#### W10.1 [AGENT] Accessibility evidence
`docs/accessibility-acceptance.md` demands automated keyboard/semantic/contrast/
reflow/focus checks, manual keyboard and screen-reader results, screenshots for
narrow/short/zoomed/fullscreen/high-contrast/reduced-motion states, offline and
storage-failure results, low-resource performance results, and crop/mirror
inspection. Produce what is achievable and **report the status honestly**.

Until human and device evidence exists, the status is `not_evaluated`, **not
`passed`**. Do not let an agent upgrade this status.

#### W10.2 [HUMAN] Demo video, under 3 minutes
Structure:
1. The problem — captions assume written-language literacy that many deaf
   students schooled in a signed language do not have. This is the real argument
   and it is not widely understood.
2. The product — Gemini drafts, a Deaf reviewer decides, the pack publishes.
3. The offline proof — a real low-cost phone in airplane mode, playing.
4. The business — who pays, what they paid, what it replaced.
5. The honesty — one language, reviewed, with measured limits. State the
   false-supported rate out loud.

No third-party trademarks, no copyrighted music. Public on YouTube.

#### W10.3 [AGENT] Repository presentation
The README is judged. It must state plainly what is real, what is scoped out, and
what is not yet reviewed. Keep `PREEXISTING_ASSETS.md` current — the contest
requires explaining any pre-existing work used.

#### W10.4 [HUMAN] Submit
Complete `docs/submission-checklist.md`. Submit **D19 evening**, not D20 morning.

---

## 7. Governance: keep versus relax

Every relaxation below must be recorded as a dated decision record in
`docs/decisions/`, following the existing `0001`–`0004` pattern. **Relaxations
are documented, never silent.**

### 7.1 Keep at full strength — non-negotiable

| Control | Source | Why it stays |
| --- | --- | --- |
| Deaf reviewer has final linguistic authority | `linguistic-safety.md` | The entire ethical basis of the product, and its commercial differentiator |
| No AI-published or agent-inferred mappings | `AGENTS.md` | A fabricated translation is a harm, not a bug |
| Visible caption fallback in every failure state | `architecture.md` | Prevents silent wrong signing — the worst possible failure |
| No cropping or mirroring | `linguistic-safety.md` | Destroys grammar carried by face, body, and signing space |
| Declared language, region, dialect per pack | `linguistic-safety.md` | Prevents the "universal sign language" falsehood |
| Rights, consent, and withdrawal before any public media | `licensing-and-consent.md` | Legal exposure and respect for the signer |
| Synthetic fixtures unmistakably labelled, never `ase` | `review-protocol.md` | Prevents synthetic motion being mistaken for real ASL |
| Append-only review events | `review-protocol.md` | Corrections supersede; they never erase |
| Playback works with no network, no Gemini, no cloud | `AGENTS.md` | The core product claim |
| No `<all_urls>`, no remote code in the extension | `AGENTS.md` | Security and store policy |
| Never log transcripts or identities | `AGENTS.md` | Privacy of students and reviewers |

### 7.2 Relax for the contest window — with a decision record each

| Control | Full form | Contest form | Justification |
| --- | --- | --- | --- |
| Private evidence system | Bespoke access-controlled system with retention policy | One private repo or encrypted store, access documented in `docs/privacy.md` | The *separation* of private from public is what matters; the sophistication of the store does not |
| Second independent reviewer on a stratified subset | Required for the proposal-evaluation tier | Single reviewer, disclosed as a stated limitation | Cannot staff two reviewers in 20 days. Disclosure preserves honesty |
| Corpus breadth | 300–500 adjudicated segments across 10–20 videos | Prototype golden pack only: 30–60 segments, one video | Already the documented prototype tier — this is following the plan, not breaking it |
| Multiple signers and sessions | Production-pilot tier | One signer, one session | Same |
| Publisher reviewer credentialing | Cryptographic authentication of reviewer identity and scope | Manual human release certificate binding exact hashes | Keep all hashing and withdrawal checks; make credentialing a signed human step |
| Contest-evidence ledger | Fully automated population | Schema retained, populated by hand | The schema is the contract; automation is convenience |
| Accessibility acceptance | Every item in the contract proven | Automated checks plus achievable manual passes; remainder honestly marked `not_evaluated` | Overclaiming conformance is worse than reporting gaps |

### 7.3 What no deadline may justify

- Publishing an unreviewed mapping.
- Labelling a synthetic fixture as ASL.
- Claiming coverage of a signed language we have not reviewed content in.
- Shipping media without an executed grant covering that exact purpose.
- Marking an accessibility status `passed` without evidence.
- Any agent marking a [HUMAN] gate complete.

If the deadline can only be met by doing one of these, **miss the deadline.** A
contest placement obtained by faking sign language for deaf students is worth
less than nothing.

---

## 8. Fallback ladder

Decision points are D4 (reviewer secured?) and D13 (published pack real?).

**Tier 1 — Vendor partnership.** A Tier 1 customer supplies reviewer, signer, and
rights, and pays for a pilot. Full golden pack, all three judging criteria
answered strongly. *Pursue this hardest.*

**Tier 2 — Independent reviewer.** Reviewer and signer contracted separately.
Smaller pack: a 2–3 minute video, 15–25 segments. Revenue from a Tier 2
institutional pilot. Still a complete, honest product.

**Tier 3 — Pipeline only, no published pack.** *Triggered if no reviewer is
secured by D7.* Ship the authoring service, reviewer console, publisher, runtime,
extension, and PWA — with the reviewer seat visibly empty and every pack
correctly blocked at `not_published`.

This is a **much stronger fallback than it appears**, because the chosen business
model sells the pipeline, not the pack. The demo becomes: *here is the production
system, here is Gemini drafting and abstaining live, here is the review queue,
and here is the system refusing to publish because no qualified Deaf reviewer has
approved it yet.* A system that visibly refuses to fabricate sign language is a
credible accessibility product. Revenue still comes from a pilot of the tool.

**Tier 4 — Protocol and runtime only.** Current state plus renderer and
extension, synthetic fixtures throughout. Weak on Business Viability. Accept only
if W1 and W9 both fail entirely.

---

## 9. Risk register

| Risk | Impact | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| No Deaf reviewer secured in time | Blocks all linguistic work | **High** | Start D0, pursue vendor partnership and independents in parallel, Tier 3 fallback ready | [HUMAN] |
| Revenue not achieved | Loses a third of the score | **High** | Outreach from D0, multiple parallel prospects, small pilot sized to avoid procurement | [HUMAN] |
| W0 slips and eligibility fails | **Fatal** | Medium | W0 outranks everything; complete by D3 | [AGENT] |
| Chrome Web Store review latency | Loses the extension demo | Medium | Never depend on the listing; ship unpacked with instructions | [HUMAN] |
| Gemini quota or billing limits | Blocks W4 and the judge demo | Medium | Confirm quota D1; rate-limit the public demo route | [HUMAN] |
| Rights not executed in time | No public media | Medium | Tier 3 fallback | [HUMAN] |
| Governance perfectionism consumes the window | Nothing ships | **High** | §7 relaxations decided **now**, not debated on D15 | [HUMAN] |
| Scope creep toward avatars or text-to-sign | Unshippable | Medium | Explicitly out of scope in `data-and-model-strategy.md`; agents must refuse | [AGENT] |
| Overclaiming in the demo video | Reputational, and unfair to Deaf users | Medium | §2.2 forbidden-claims list is a review checklist for the script | [HUMAN] |
| Overlay exceeds the 200 KB budget | Breaks the low-cost-device claim | Low | Build-time size assertion (W2.3) | [AGENT] |
| Submitting on D20 morning | **Fatal** | Medium | Freeze D18, submit D19 evening | [HUMAN] |

---

## 10. Agent operating rules

Beyond `AGENTS.md`, which remains authoritative:

1. **One write-capable agent per branch or worktree.** Feature branch and
   reviewed pull request. Never push directly to `main`.
2. **`pnpm verify` must pass before any task is reported complete.** It runs the
   foundation check, lint, typecheck, tests, and build. A task with a failing
   verify is not complete — report the failure rather than describing the work
   as done.
3. **Never add a production dependency** outside the §4.1 approvals.
4. **Never weaken a test to make a change pass.** If a test blocks the work, the
   test is probably right; escalate.
5. **Never mark a [HUMAN] gate complete**, and never generate a fake reviewer
   identifier, consent record, rights grant, review event, or approval — not even
   as a placeholder, not even in a fixture. Synthetic fixtures must use the
   reserved non-linguistic marker (`zxx`/`ZZ`), never `ase`.
6. **Never put private material in Git**: identities, contact details,
   qualifications, contracts, signatures, compensation, conflicts, participant
   feedback, private transcripts, credentials, payments, or customer names. This
   plan itself is in a public repository — keep it free of customer and reviewer
   identities.
7. **Report honestly.** If a workstream is partially done, say which part. If
   something was skipped, say so. The whole product is an argument about not
   fabricating things; the process should match.
8. **Update `HANDOFF.md`** at the end of each task with what actually landed and
   what remains. Note that its current line 117 claim of "no Git remote" is stale
   — a remote now exists.

---

## 11. Definition of done

The project is submission-ready when all of the following are true:

- [ ] Deployed application publicly reachable, free, and unrestricted for judges
- [ ] At least one Google Cloud product in production use
- [ ] At least one Gemini API call in the deployed application, judge-triggerable
- [ ] Public repository with licensing, and pre-existing work disclosed
- [ ] Demo video under 3 minutes, public on YouTube, no third-party marks or music
- [ ] Funding disclosed, even if zero
- [ ] Real invoice issued and paid, records retained
- [ ] Free users onboarded from the mission audience, documented
- [ ] `pnpm verify` green; Playwright suite green
- [ ] Overlay within the 200 KB budget, asserted at build time
- [ ] Offline playback proven on a real low-cost device, on video
- [ ] Every §2.2 forbidden claim absent from code, UI, docs, README, and video
- [ ] Accessibility status reported honestly, `not_evaluated` where unproven
- [ ] Either a reviewer-approved published pack, or Tier 3 with the block visible
- [ ] Submitted by D19 evening

---

## 12. What to do next

**Today, D0, in this order:**

1. **[HUMAN]** Begin reviewer and vendor outreach. This is the longest pole and
   every hour matters. Nothing else on this list is as time-critical.
2. **[HUMAN]** Enable Google Cloud billing and confirm Gemini quota.
3. **[GATED]** Approve the §4.1 production dependencies.
4. **[AGENT]** Start W0.1 — the deployed Gemini call — and W2.1 — the sign media
   renderer — in parallel on separate branches.

The reviewer outreach is the one thing that cannot be parallelised, compressed,
or recovered later. Start it before the code.
