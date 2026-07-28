# Data and Model Strategy

**Status:** Research recommendation  
**Date:** 2026-07-28  
**Scope:** SignBridge Overlay version one, provisionally U.S. American Sign
Language (`ase`, region `US`)

## Executive summary

SignBridge does not need to train or fine-tune a sign-language model for version
one.

The product is a reviewed-media retrieval and synchronization system:

```text
timed educational text and context
  -> retrieve known, rights-cleared asset candidates
  -> Gemini emits a structured proposal or explicit unsupported result
  -> qualified Deaf ASL reviewer decides
  -> strict publisher checks review, rights, consent, and exact hashes
  -> cloud-independent runtime plays the approved SignPack
```

The immediate data dependency is a small, commissioned, rights-cleared, and
Deaf-human-reviewed ASL media catalog. Public sign-language datasets can inform
our schema, catalog design, research evaluation, and later retrieval
experiments. None of the datasets reviewed below is currently a safe drop-in
media library for distributable offline SignPacks.

Public availability, code licensing, dataset licensing, participant consent,
and permission to redistribute human performance media are separate gates.

## Product boundary

Version one uses upper-body human signing video. Avatar synthesis,
unconstrained text-to-sign generation, and automatic sign recognition are out
of scope.

Gemini may propose only known asset identifiers and metadata. It cannot approve
a linguistic mapping, create publication authority, or silently fill an
unsupported segment. Every exact asset and mapping remains subject to qualified
Deaf review.

The viewer must remain useful without Gemini, cloud access, or a network
connection.

## Data SignBridge needs

### 1. Timed educational source corpus

For each source video:

- Stable source identifier, content hash, and duration.
- Timed captions with exact segment boundaries.
- Caption language, acquisition method, timing basis, permission, and hash.
- Educational subject, audience, and surrounding semantic context.
- Stable lesson, course, episode, and near-duplicate grouping identifiers.
- Permission for the intended source-video use.

### 2. Rights-cleared ASL asset catalog

For each signing clip:

- Stable asset identifier, exact media hash, duration, format, and path.
- Signed language, region, approved dialect or community scope, audience, and
  educational context.
- Semantic intent, contextual limitations, known variants, and required
  facial, bodily, spatial, and other nonmanual information.
- Signer reference, recording-session identifier, and capture orientation.
- Complete transformation lineage for trims, crops, transcodes, timing edits,
  and other derivatives.
- Owner, source, attribution, consent, and current withdrawal state.
- Rights for the exact intended purposes, channels, territories, hosting,
  redistribution, modification, sublicensing, demo, contest, and publicity
  scope.
- Qualified Deaf-review approval tied to the exact asset and manifest hashes.

Copyright ownership, distribution permission, participant consent, and
linguistic approval must remain separate records.

### 3. Segment-to-asset decisions

The primary authoring and evaluation unit is one semantic segment in context,
not one English word or gloss:

```text
source video group
segment identifier and time range
caption and surrounding context
language, region, dialect, audience, and topic
candidate asset identifiers
acceptable reviewed asset set or unsupported decision
split, merge, correction, replacement, or rejection decision
reason code and limitations
proposal, asset, and decision hashes
append-only review-event lineage
AI provider, model, prompt, and run metadata
```

An acceptable asset set is preferable to a single universal label because valid
ASL choices can vary by context and community. Word-for-word gloss substitution
must not be treated as complete translation.

### 4. Technical and failure corpus

Maintain deterministic fixtures and browser cases for:

- Segment boundaries, fractional boundaries, gaps, and overlapping input.
- Seek, pause, resume, playback-rate change, and video replacement.
- Missing, corrupt, incompatible, withdrawn, or source-mismatched assets.
- Offline playback, storage quota, eviction, interrupted import, and
  constrained devices.
- Caption preservation in every mapped and fail-visible state.
- Crop, mirror, obstruction, aspect-ratio, fullscreen, resize, and overlay
  positioning failures.

These cases validate software behavior. They do not provide linguistic
evidence.

### 5. Human evaluation and pilot evidence

For each reviewed segment or pack, record:

- Semantic equivalence and contextual fit.
- Grammar, facial and nonmanual information, bodily movement, and spatial use.
- Community and regional appropriateness.
- Comprehensibility and known limitations.
- Accepted unchanged, corrected, replaced, rejected, or unsupported outcome.
- Review and correction time plus a reason code.
- Timing, crop, mirror, obstruction, and presentation failures.
- Deaf-user comprehension and task feedback for the complete educational
  video.

Do not collapse these dimensions into one universal “ASL accuracy” score.

## Recommended collection tiers

The quantities below are planning heuristics, not evidence of linguistic
validity.

### Prototype golden pack

- One narrowly scoped three-to-five-minute educational video.
- Approximately 30–60 reviewed semantic segments.
- Approximately 20–40 exact-hash signing clips.
- One rights-cleared signer.
- One qualified Deaf ASL reviewer, preferably independent from the signer.
- Captions and explicit unsupported fallbacks for every segment.
- Deliberate ambiguous, split or merge, technical, and unsupported cases.

This tier supports a credible product demonstration. It does not support a
general ASL-translation claim.

### Proposal-evaluation tier

- Approximately 300–500 adjudicated segments.
- Approximately 10–20 source videos across several educational topics.
- Multiple recording sessions and reviewed language-variation cases.
- A second qualified reviewer on a stratified subset.
- Difficult negatives such as names, numbers, fingerspelling, polysemy,
  technical terms, poor captions, and context-dependent meanings.

### Production-pilot tier

- Thousands of append-only, adjudicated decisions from the actual launch
  curriculum.
- Multiple signers, sessions, topics, audiences, and approved community
  variants.
- Enough observations to report results separately by important slice.
- Ongoing correction, supersession, rights-expiry, and withdrawal records.

Breadth should expand only after reviewer authority, signer agreements,
language scope, distribution grants, and the private evidence system are
established.

## External dataset assessment

The
[GitHub sign-language-datasets topic](https://github.com/topics/sign-language-datasets)
is a discovery index, not a linguistic, licensing, or consent review. It mixes
different signed languages, recognition tasks, avatars, static hand images, and
media governed by separate terms.

| Dataset | Potential value | SignBridge decision |
| --- | --- | --- |
| [ASL STEM Wiki](https://www.microsoft.com/en-us/research/project/asl-stem-wiki/) | Closest structural analogue: sentence-level educational ASL, more than 300 hours, professional interpreters, and STEM vocabulary | Best workflow and evaluation reference. Its [standard license](https://www.microsoft.com/en-us/research/project/asl-stem-wiki/dataset-license/) restricts use to non-commercial research and prohibits distributing the data or modifications. Do not place its videos in SignPacks without a separate grant. |
| [PopSign ASL v1.0](https://signdata.cc.gatech.edu/view/datasets/popsign_v1_0/index.html) | 200,686 isolated-sign videos covering 250 signs and 47 signers; published under CC BY 4.0 | Most promising permissive research candidate. It is still isolated-sign recognition data, not sentence-level ASL. Confirm participant consent and product-specific likeness, performance, modification, and redistribution rights before displaying any clip. |
| [ASL Citizen](https://www.microsoft.com/en-us/research/project/asl-citizen/) | 83,399 videos covering 2,731 isolated signs from 52 signers; consented, signer-independent dictionary-retrieval research | Useful for vocabulary structure, catalog metadata, and retrieval research. It is not continuous translation, and commercial use requires separate contact with Microsoft. |
| [How2Sign](https://how2sign.github.io/) | More than 80 hours of continuous instructional ASL with transcripts, multiview video, and pose modalities | Useful for segmentation and alignment research. It is research-only and CC BY-NC; the project also warns that sentence clips may not align perfectly with the English translation. Do not treat it as shippable product media. |
| [WLASL](https://github.com/dxli94/WLASL) | Large 2,000-gloss word-recognition benchmark with signer and variation metadata | Research benchmark only. It uses disappearing source URLs, is governed by C-UDA, and prohibits commercial use. It is not a reliable or licensed product-media catalog. |
| [ASL-LEX 2.0](https://asl-lex.org/download.html) | Lexical and phonological metadata for 2,723 signs | Useful for catalog-field research. The database is non-commercial, and the reference videos cannot be saved or displayed without permission. |
| [SignAvatars](https://github.com/ZhengdiYu/SignAvatars) | Whole-body 3D motion and sign-production research | Exclude from version one because avatar synthesis is outside the approved human-media architecture. Access is non-commercial research and original RGB video is not distributed by the project. |
| [PHOENIX datasets](https://github.com/enhuiz/phoenix-datasets) | Continuous sign-language research and evaluation tooling | Exclude from the ASL catalog because PHOENIX is German Sign Language. Signed languages must never be merged because a topic page groups them together. |

### Explicit exclusions

- Static alphabet images: no movement, face, body, grammar, coarticulation, or
  sentence context.
- Fingerspelling-only datasets: useful for names and technical terms but not a
  substitute for ASL translation.
- Generic gestures or hand-pose datasets: gestures are not ASL.
- Synthetic concatenation of isolated signs: not grammatical continuous ASL.
- Non-ASL corpora: BSL, DGS, ISL, PSL, and other signed languages are distinct
  languages and cannot populate an ASL SignPack.
- Code repositories whose MIT or Apache license does not cover their human
  video, dataset, likeness, or performance rights.

## Model recommendation

### Version one

Use:

- Deterministic lexical and metadata retrieval over the approved catalog.
- Optional pretrained embeddings if the catalog outgrows simple retrieval.
- Gemini prompting with a tightly constrained candidate list.
- Gemini
  [structured output](https://ai.google.dev/gemini-api/docs/structured-output)
  so every proposal conforms to a JSON Schema and can explicitly abstain.
- Existing validators, append-only review events, and strict publication gates.

Do not use:

- A custom sign-recognition model.
- Automatic continuous ASL translation.
- Generative or avatar text-to-sign output.
- AI approval or publication.
- An unreviewed fallback that appears to be signing.

As of Google’s documentation updated on 2026-04-28, the Gemini Developer API
and AI Studio have
[no model available for fine-tuning](https://ai.google.dev/gemini-api/docs/model-tuning).
That platform limitation reinforces, but does not create, the product
recommendation.

### When to reconsider training

Consider a learned candidate reranker only when:

- The catalog and review log contain thousands of consent-compatible,
  human-adjudicated decisions.
- A frozen, leakage-safe evaluation set exists.
- Prompting and deterministic retrieval have been measured first.
- Evidence shows candidate ranking, rather than missing content, weak captions,
  rights, or review capacity, is the bottleneck.
- The model remains reviewer-assistance only.

Any later visual model must use signer-, recording-session-, source-video-, and
asset-lineage-disjoint evaluation splits. A full recognition or text-to-sign
system is a separate product and research program, not an incremental version
one feature.

## Evaluation metrics

Track:

- False-supported rate: the system proposes a supposedly usable asset when the
  reviewed result is unsupported.
- Unsupported precision and recall.
- Acceptable-set recall at `k` for catalog retrieval.
- Top-one accepted-without-change rate.
- Changes-requested and rejected rates.
- Reviewer correction time per segment and per source-video minute.
- Mapping coverage, always reported beside the false-supported rate.
- Performance by topic, community scope, caption quality, segment length, and
  ambiguity class.
- Caption availability and fail-visible behavior.
- Crop and mirror failures, with a target of zero.
- Playback boundary and synchronization failures during play, pause, seek,
  replacement, and offline operation.

The primary success criterion is not maximum automated coverage. It is reduced
review effort without increasing false support or weakening human authority.

## Minimum viable collection order

1. Appoint and compensate the qualified Deaf ASL reviewer; document authority,
   language scope, conflicts, and escalation privately.
2. Select one narrow educational source video and one signer.
3. Execute source, performance, product playback, redistribution, modification,
   hosting, demo, contest, publicity, attribution, and withdrawal grants.
4. Segment the source video semantically while preserving captions and context.
5. Commission and review the small signing-media catalog.
6. Run deterministic retrieval and no-training Gemini proposals.
7. Record every proposal and human decision append-only.
8. Freeze one golden pack and a separate held-out evaluation set.
9. Measure the actual bottleneck before considering a learned reranker.

## Public and private boundaries

Public-safe material may include source code, schemas, unmistakably
nonlinguistic synthetic fixtures, sanitized run manifests, opaque consent-safe
references, exact hashes, decision states, limitations, consented aggregate
metrics, and specifically licensed demo media.

Private material includes legal identities, contact details, qualifications,
contracts, signatures, accommodations, compensation, conflicts, participant
feedback, private source videos, private transcripts, raw authoring inputs and
outputs, pilot evidence, credentials, payments, and any dataset whose terms do
not permit redistribution.

## Governing project contracts

This report must be applied together with:

- [Project context](../PROJECT_CONTEXT.md) for the approved product boundary.
- [Architecture](architecture.md) for publication and playback separation.
- [Language scope](language-scope.md) for the provisional ASL scope and open
  human gate.
- [Human review protocol](review-protocol.md) for linguistic authority and
  exact-candidate review.
- [Licensing and consent](licensing-and-consent.md) for asset grant and
  withdrawal requirements.
- [Data provenance](data-provenance.md) for source-to-release lineage.
- [Privacy](privacy.md) and the
  [private evidence system](private-evidence-system.md) for public/private data
  separation.

External dataset facts and license terms are a 2026-07-28 research snapshot.
They must be rechecked before downloading, training, media use, publication, or
release.

## Decision

Proceed with a commissioned golden SignPack and a no-training authoring
baseline. Use public datasets as research evidence only unless a dataset passes
an explicit, documented review of language fit, task fit, license, participant
consent, media rights, transformation rights, redistribution rights, and
exact-hash Deaf-human approval.
