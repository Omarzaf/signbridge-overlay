# Test Strategy

Current automated coverage has three layers:

- 5 foundation-policy tests cover required files, dependency limits, private
  environment files, and unreviewed media.
- 34 contract tests cover malformed input, timing, state transitions,
  cross-document references, reviewer finality, signer/consent linkage, release
  scope, rights coverage, and contest-evidence integrity.
- 34 Goal 2 tests cover prepared-model authenticity, hostile input, immutable
  state, exact source matching, half-open and fractional timing, gap and asset
  fallbacks, pause/seek/rate recovery, timer-free resolution, subscription
  order, disposal, and listener isolation.

The current Vitest total is 68/68. Foundation tests run separately through
Node's test runner.

Future integration and accessibility suites still need to cover:

- HTML5 and YouTube adapter lifecycle behavior, fullscreen, and source
  replacement.
- Overlay rendering against the headless playback states.
- Offline imports, cache behavior, quota, and eviction.
- Manifest V3 permissions, CSP, and YouTube navigation.
- Keyboard, touch, focus, reduced-motion, and short-screen behavior.
- Public-release checks that reject private or unlicensed files.

Automated checks do not replace qualified human linguistic review.
