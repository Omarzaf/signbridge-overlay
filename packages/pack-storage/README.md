# Pack Storage

The first dependency-free IndexedDB layer imports small synthetic caption-only
SignPacks. It validates exact UTF-8 JSON bytes, enforces the draft `zxx`/`ZZ`
profile, hashes the bytes with SHA-256, stores them locally, and revalidates the
stored bytes before returning a manifest.

Successful reads carry `assurance: local_storage_integrity_only`. This proves
only that the local bytes round-trip with the recorded digest. It does not
authenticate a publisher, reviewer, rights grant, linguistic claim, current
withdrawal state, or released artifact.

Imports are limited to 256 KiB and cannot contain assets, reviewed mappings, or
real-language claims. Duplicate identical bytes are idempotent; a duplicate
pack identifier with different bytes fails instead of overwriting.

Cache Storage for immutable media, quota reporting, eviction, and general
local import/export remain future work.
