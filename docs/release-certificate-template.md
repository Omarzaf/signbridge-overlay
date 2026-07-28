# Release Certificate Template

> Template only. An empty or partially completed certificate is not release
> approval. Copy this file into the release-evidence process; do not overwrite
> the template.

## Release identity

| Field | Value |
| --- | --- |
| Product version | `TBD` |
| Git commit | `TBD` |
| Source tree clean | `TBD` |
| Build identifier | `TBD` |
| Runtime artifacts and hashes | `TBD` |
| SignPack identifiers and hashes | `TBD` |
| Publisher/schema/runtime versions | `TBD` |
| Supersedes | `TBD` |
| Intended release channel | `TBD` |

## Declared linguistic scope

| Field | Value |
| --- | --- |
| Signed language | `TBD` |
| Region | `TBD` |
| Dialect/community scope | `TBD` |
| Audience and educational context | `TBD` |
| Known limitations and unsupported content | `TBD` |

The provisional repository scope (`ase`, `US`) must not be copied here as if it
were human-approved.

## Gate evidence

Use `pass`, `block`, or `not_applicable`. Every `pass` requires an evidence
identifier resolvable by an authorized human.

| Gate | Status | Public evidence | Private evidence reference | Approver |
| --- | --- | --- | --- | --- |
| Qualified Deaf reviewer and authority scope | `block` | `TBD` | `TBD` | Human owner |
| Exact-hash linguistic approval | `block` | `TBD` | `TBD` | Deaf reviewer |
| Signer consent and performance/publicity grant | `block` | `TBD` | `TBD` | Rights owner |
| Copyright, license, attribution, and distribution grant | `block` | `TBD` | `TBD` | Rights owner |
| Asset effective/withdrawal state | `block` | `TBD` | `TBD` | Publisher |
| Provenance chain complete | `block` | `TBD` | `TBD` | Release owner |
| Reproducible build and deterministic publication | `block` | `TBD` | `TBD` | QA |
| Unit, contract, browser, extension, and offline tests | `block` | `TBD` | `TBD` | QA |
| Accessibility and constrained-device acceptance | `block` | `TBD` | `TBD` | QA and Deaf reviewer |
| Privacy and public-surface negative checks | `block` | `TBD` | `TBD` | Security reviewer |
| Threat model, CSP, permissions, and dependency review | `block` | `TBD` | `TBD` | Security reviewer |
| Third-party notices and pre-existing-work disclosure | `block` | `TBD` | `TBD` | Release owner |
| Product and contest claims supported | `block` | `TBD` | `TBD` | Human entrant |

## Verification record

```text
Environment:
Commands:
Test counts:
Browser/device matrix:
Artifact sizes:
Repeated publication hash comparison:
Known warnings:
```

## Synthetic content

| Question | Answer |
| --- | --- |
| Does any release artifact contain a synthetic test fixture? | `TBD` |
| Does any public demo represent synthetic motion as a signed language? | `TBD` |
| Did synthetic results enter linguistic or user-impact metrics? | `TBD` |

All three answers must be reviewed. Synthetic test motion must never be
represented as ASL or released as reviewed signing.

## Exceptions and residual risk

List accepted non-blocking risks with owner, justification, expiry, and
follow-up. An exception cannot waive linguistic approval, consent, ownership,
asset rights, private-data protection, or a hard security failure.

```text
TBD
```

## Decision

- Release decision: `BLOCKED`
- Decision scope: exact artifacts and hashes listed above
- Decision owner: `TBD`
- Decision record: `TBD`

Separate sign-offs are required because linguistic approval, rights approval,
technical verification, and overall release authority are not interchangeable.
Public copies use consent-safe identifiers; legal names and signatures remain
in the private evidence system.
