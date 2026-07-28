# Project Context

## Product thesis

Deaf and hard-of-hearing viewers should be able to attach a small,
language-specific signing layer to educational video across constrained devices
and intermittent connectivity. The reusable element is a universal overlay
protocol; the signing itself remains language-, dialect-, and context-specific.

## Current architecture

The planned system separates publication from playback:

1. An authoring service accepts timed text and proposes known sign identifiers.
2. A human reviewer edits or rejects every proposal.
3. A separate strict publisher combines an approved decision with current
   licensed-asset evidence and creates a hashed SignPack.
4. A cloud-independent, headless playback core maps source-media snapshots to
   signing or caption-fallback state.
5. PWA and Chrome adapters connect that runtime to local files and web video.

The initial signing representation is rights-cleared upper-body human video.
Avatar synthesis and unconstrained text-to-sign generation are out of scope for
the first release.

The provisional first-language scope is American Sign Language in the United
States (`ase`, region `US`). Specific community and regional variation remains
unresolved until a qualified Deaf ASL reviewer approves it.

## Systems of record

- `contracts/`: machine-readable publication and review contracts.
- SignPack manifest: timing, language, provenance, review, rights, and hashes.
- Asset ledger: ownership, consent, license, attribution, and withdrawal state.
- Review-event log: proposal and human decision history.
- Release request: exact selected decisions and intended distribution scope.
- Run manifest: reproducible authoring metadata without sensitive content.
- Contest-evidence ledger: privacy-safe claim categories and evidence pointers.
- Git: source, documentation, tests, and release history.

## Gate 1 implementation boundary

The six JSON Schemas and dependency-free TypeScript validators now enforce the
locally knowable structure and cross-document relationships. The public API is
`validateReleaseCandidate`, and successful output is explicitly labeled
`structural_preflight_only`.

A release candidate must remain a draft. The validator cannot publish it,
authenticate a reviewer or grant, inspect authoritative private records, hash
actual media bytes, prove an evidence claim, or determine current withdrawal
state. Those operations remain hard gates for the future publisher and the
human release authority.

## Gate 1 operating contracts

- `docs/review-protocol.md`: human linguistic authority and review workflow.
- `docs/data-provenance.md`: source-to-release lineage.
- `docs/reproducibility.md`: build, publication, and authoring replay evidence.
- `docs/accessibility-acceptance.md`: surface and signing-presentation acceptance.
- `docs/private-evidence-system.md`: access-controlled evidence requirements.
- `docs/release-certificate-template.md`: exact-artifact release decision.

## Goal 2 headless playback boundary

The dependency-free sync engine and framework-free runtime controller implement
the playback decision layer without adding a viewer or weakening publication
authority.

- `preparePlaybackModel` is the only constructor for module-issued, immutable
  ready models. Its checks establish only supplied local playback
  readiness, never publication assurance.
- Each resolution uses the exact source fingerprint and current media snapshot
  as its sole clock. There is no timer, elapsed-time accumulator, rounding, or
  inferred drift clock.
- Segment ranges are half-open and searched deterministically. Pause, seek, and
  rate changes recalculate from the new snapshot.
- Source captions remain available for active signing and every fail-visible
  state.
- Version one activates signing only at `1x` for one duration-compatible,
  locally ready asset. Unsupported, corrupt, withdrawn, missing, incompatible,
  source-mismatched, and gap states fall back to captions.

The core has no DOM, media-element ownership, network access, or cloud
dependency. HTML5 and YouTube adapters, overlay rendering, offline storage, and
browser/device accessibility evidence remain future work. Synthetic in-memory
tests do not represent a real language selection, reviewed media, or a
published product.

## Privacy and release boundary

Public material may include source code, synthetic test fixtures, consented
aggregate metrics, and specifically licensed demo media. Identities, consent
forms, raw transcripts, private videos, credentials, detailed pilot records,
and payment information remain outside Git.

Human approval is required before dependencies, external research, media use,
cloud access, pilot contact, deployment, store submission, or contest
submission.

## Read order

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/linguistic-safety.md`
4. `docs/licensing-and-consent.md`
5. `contracts/README.md`
6. The active package README
7. `HANDOFF.md`
