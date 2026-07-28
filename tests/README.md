# Test Strategy

Current automated coverage has three layers:

- 5 foundation-policy tests cover required files, dependency limits, private
  environment files, and unreviewed media.
- 34 contract tests cover malformed input, timing, state transitions,
  cross-document references, reviewer finality, signer/consent linkage, release
  scope, rights coverage, and contest-evidence integrity.
- 35 Goal 2 tests cover prepared-model authenticity, hostile input, immutable
  state, exact source matching, half-open and fractional timing, gap and asset
  fallbacks, pause/seek/rate recovery, timer-free resolution, subscription
  order, reentrant sampling, disposal, and listener isolation.
- 7 Goal 3a tests cover exact HTML5 clock sampling, source replacement,
  media-driven frame callbacks, disposal, hostile getters, and accessible
  fallback presentation.
- 8 Goal 3b tests cover import limits, invalid encoding and JSON, structural and
  profile rejection, exact-byte digests, idempotency, pack-ID conflicts,
  corruption detection, stable storage failures, and presenter ordering.

The current Vitest total is 84/84. Foundation tests run separately through
Node's test runner.

Future integration and accessibility suites still need to cover:

- HTML5 fullscreen and real-media behavior plus YouTube lifecycle behavior.
- Overlay rendering against a rights-cleared active-sign state.
- Media cache behavior, quota, and eviction.
- Manifest V3 permissions, CSP, and YouTube navigation.
- Keyboard, touch, focus, reduced-motion, and short-screen behavior.
- Public-release checks that reject private or unlicensed files.

Automated checks do not replace qualified human linguistic review.

The Playwright suite runs eight cases across desktop and small-phone Chromium.
It covers fallback visibility, keyboard controls, 320 px reflow, local import,
IndexedDB restore, invalid-pack rejection, caption preservation, no active-sign
state, and absence of external requests.
