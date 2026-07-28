# Accessibility Acceptance Contract

## Scope

This contract defines release acceptance for the overlay runtime, offline PWA,
Chrome extension, reviewer application, and public demo. It supplements rather
than replaces review by Deaf users and the qualified Deaf reviewer.

No current surface has passed this contract; the repository contains no working
viewer or reviewed signing media.

## Core interaction

A release candidate must:

- Expose every action by keyboard without requiring pointer gestures.
- Use native controls where possible and provide programmatic names, roles,
  states, errors, and status updates for assistive technology.
- Preserve visible focus and a logical order.
- Trap focus inside modal dialogs, close them with `Escape`, and restore focus
  to the invoking control.
- Avoid keyboard traps and timing-dependent input.
- Provide touch targets at least 44 by 44 CSS pixels for primary controls.
- Remain operable at 320 CSS pixels wide, in short landscape viewports, and at
  200 percent browser zoom without losing controls or forcing two-dimensional
  scrolling.
- Respect reduced-motion and high-contrast preferences.
- Avoid conveying state through color, sound, or motion alone.

## Signing presentation

The viewer must:

- Keep hands, face, torso, and required signing space visible.
- Preserve the approved orientation and never mirror signing media.
- Maintain aspect ratio and avoid crops introduced by fullscreen, picture
  resizing, device rotation, or page styles.
- Allow the user to resize, reposition, hide, and restore the signing layer.
- Avoid covering captions, source-video controls, or essential educational
  content; when space is insufficient, offer an explicit alternate layout.
- Keep captions independently available even when a reviewed sign segment
  exists.
- Display unsupported, missing, withdrawn, corrupt, or incompatible content as
  an explicit caption fallback rather than blank or invented signing.

Playback-rate behavior must be reviewed with the qualified Deaf reviewer.
Software must not assume that arbitrary speed changes preserve linguistic
comprehensibility.

## Offline and constrained-device behavior

- Core playback, imported packs, controls, captions, and failure messages work
  with networking disabled.
- Storage quota, eviction, interrupted import, corrupt pack, and insufficient
  space produce recoverable, understandable outcomes.
- The PWA remains usable on the selected low-resource phone profile.
- The extension requests only the host access required for the active site and
  explains optional access before requesting it.
- Loss of Gemini, cloud storage, analytics, or authoring services never blocks
  playback of a valid local pack.

## Reviewer application

The reviewer must be able to inspect source context, captions, proposal status,
signing media, timing, rights state, and prior decisions without hidden
information. Accept, request-changes, reject, and unsupported actions must be
distinct and reversible before publication.

The review workflow must support the accommodations agreed with the actual
reviewer. Identity, compensation, conflict, and private evidence must not leak
into browser URLs, client logs, screenshots, or public exports.

## Test evidence

Release evidence must include:

- Automated keyboard, semantic, contrast, reflow, and focus checks.
- Manual keyboard and screen-reader results on supported browser/platform pairs.
- Screenshots or video for narrow, short, zoomed, fullscreen, and
  high-contrast/reduced-motion states.
- Offline and storage-failure results.
- Performance and memory results on the selected low-resource phone profile.
- Inspection showing that signing is neither cropped nor mirrored.
- Deaf-user feedback and the qualified reviewer's decision for the exact media
  and presentation.

Automated accessibility scanners identify a subset of defects. They cannot
certify language quality, visual comprehensibility, cultural appropriateness, or
equivalent access.

## Acceptance

A release passes only when:

- No severity-blocking accessibility defect remains.
- Every supported surface passes its declared browser and device matrix.
- Caption fallback remains usable for every failure state.
- A qualified Deaf reviewer approves the exact signing presentation and hashes.
- Public claims match the retained evidence.

Until the human and device evidence exists, status is `not_evaluated`, not
`passed`.
