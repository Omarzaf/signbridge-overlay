# SignPack Schema

Versioned JSON contracts and dependency-free structural validators for language,
timing, review, rights, provenance, compatibility, and hash references.

## Security boundary

`validatePublicationPreflight` is a fail-closed structural preflight. It checks
schema shape, state transitions, cross-references, approval authority, release
ordering, and exact lowercase SHA-256 reference syntax.

Success is **not release authorization**. The preflight does not hash files,
canonicalize JSON, verify signatures, establish
reviewer qualification, or prove that referenced consent and rights records
exist. A formatted or cross-matched hash is not cryptographically validated.
Publisher canonical hashes, actual-byte verification, a trusted reviewer
registry, and private grants remain hard blockers before any release.
