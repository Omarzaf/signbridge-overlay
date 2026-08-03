# Video Adapters

The dependency-free HTML5 and YouTube lifecycle adapters are implemented. Page
content is untrusted input and adapters may not weaken runtime contracts.

`createHtml5VideoAdapter` observes time updates, play, pause, seeking, seek
completion, rate changes, metadata changes, source replacement, and ended
signals. Each signal causes a fresh sample of the actual source media time,
state, rate, and caller-resolved exact source fingerprint.

Adapters must not advance an independent clock, round media time, retain a
stale fingerprint after navigation, construct a ready playback model, hide
caption fallback, or infer signing behavior. They pass snapshots to the
framework-free runtime controller and leave source captions independently
available.

The fingerprint resolver is called for every sample because an
`HTMLMediaElement` cannot authenticate the source bytes by itself. An absent or
hostile fingerprint resolver fails visibly through the runtime rather than
reusing an earlier value.

`createYouTubeVideoAdapter` locates the current page video, wraps the HTML5
adapter, and resolves a descriptor containing the fresh media source, page URL,
and YouTube video identifier on every sample. It listens to YouTube navigation
events, `popstate`, and DOM replacement. A navigation or replaced video emits
an invalid media snapshot before the new element is sampled, so the runtime
cannot continue using a stale fingerprint during a single-page transition.
Mutation observation only detects page and element changes; media time still
comes exclusively from the video element and media-driven frame callbacks.
