# SignPack Schema

Versioned JSON contracts and dependency-free structural validators for language,
timing, review, rights, provenance, compatibility, and hash references.

## Security boundary

`validateReleaseCandidate` is a fail-closed structural preflight for a draft
SignPack, its supplied review events and asset ledger, and an explicit
`ReleaseRequest`. It checks state transitions, cross-references, latest selected
review decisions, signer/consent sets, requested-scope coverage, and exact
lowercase SHA-256 reference syntax.

Successful output is marked `assurance: structural_preflight_only`. It is
**not release authorization** and cannot emit `releaseStatus: published` or
publication metadata. The preflight does not have authoritative log access,
hash files, canonicalize JSON, verify signatures, authenticate grants, establish
reviewer qualification, or perform current withdrawal checks. Publisher
canonical hashes, actual-byte verification, a trusted reviewer registry,
authenticated private grants, and withdrawal checks remain hard blockers before
any release.
