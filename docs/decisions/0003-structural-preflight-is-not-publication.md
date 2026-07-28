# ADR 0003: Structural preflight is not publication

## Status

Accepted.

## Decision

`packages/signpack-schema` exposes `validateReleaseCandidate` as a fail-closed,
dependency-free structural preflight. It accepts only a draft SignPack and marks
successful output `structural_preflight_only`.

The validator may check supplied documents for local shape, state, timing,
cross-references, selected-event finality, exact-hash reference equality, and
declared rights-scope coverage. It may not create publication metadata or claim
that a candidate is released, linguistically correct, legally authorized, or
supported by true contest evidence.

Only the future publisher may create an immutable published SignPack, and only
after authoritative records, actual bytes, authenticated grants, withdrawal
state, reviewer authority, and the human release certificate have all passed.

## Consequences

- A valid candidate can still be rejected by the publisher or human authority.
- Synthetic and development-only content cannot become a release candidate.
- A supplied review-event array is not treated as the authoritative complete
  log.
- JSON Schema comments and package documentation must preserve this assurance
  boundary.
- Playback code may consume only immutable published packs; it cannot import
  authoring, reviewer, or publisher authority.
