# Fixtures

Only synthetic or explicitly rights-cleared fixtures may be committed.

The current `synthetic-unsupported.*` set is intentionally non-linguistic:

- signed language `zxx` and region `ZZ`;
- `developmentOnly: true`;
- unsupported translation state;
- no media bytes, real identities, or inferred signing.

See `SYNTHETIC_UNSUPPORTED_FIXTURES.md` for the exact boundary. Production
candidate validation rejects these sentinels.

`synthetic-invalid-caption-pack.json` is an intentionally malformed
controlled fixture used only to prove that local imports fail closed.

The first functional milestone requires one small, human-reviewed golden pack.
Private videos, personal transcripts, and unlicensed signing media must never be
used as convenient test fixtures.
