# Contracts

This directory contains versioned machine-readable structural contracts:

- `signpack.schema.json`
- `review-event.schema.json`
- `run-manifest.schema.json`
- `asset-ledger.schema.json`
- `release-request.schema.json`
- `contest-evidence.schema.json`

Schemas keep translation, human review, asset licensing, consent, and requested
release scope independent. They are structural preflight contracts, not proof
of reviewer authority, rights, canonical bytes, contest-claim truth, or release
authorization. Contest `evidence_linked` status records only a privacy-safe
evidence pointer and method; private evidence remains outside Git.

Every schema carries the same structural-only `$comment`. Locally expressible
state and authority implications are duplicated in JSON Schema; cross-document
finality, time ordering, and rights coverage remain executable-validator rules.
