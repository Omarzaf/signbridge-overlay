# Test Strategy

Current automated coverage includes foundation-policy tests and dependency-free
contract validation for malformed input, timing, state transitions,
cross-document references, reviewer finality, signer/consent linkage, release
scope, rights coverage, and contest-evidence integrity.

Planned runtime suites cover:

- Contract and hash validation.
- Media-clock synchronization and drift.
- Pause, seek, playback-rate, fullscreen, and video replacement.
- Offline imports, cache behavior, quota, and eviction.
- Manifest V3 permissions, CSP, and YouTube navigation.
- Keyboard, touch, focus, reduced-motion, and short-screen behavior.
- Public-release checks that reject private or unlicensed files.

Automated checks do not replace qualified human linguistic review.
