# Offline PWA

The synthetic-only playback shell connects an HTML5 video element to the
runtime controller and an accessible, fail-visible overlay. It deliberately
loads the draft `zxx`/`ZZ` fixture, which remains blocked as `not_published`.
The independent caption text stays visible.

Users may import a local JSON fixture up to 256 KiB. The browser validates the
schema and synthetic caption-only profile, hashes the exact bytes, stores them
in IndexedDB, and rechecks the stored bytes before mounting. Reload restores a
verified local copy without creating publication authority.

This shell contains no signed-language content, media asset, network request,
analytics, service worker, or active signing path. Media caching, general
SignPack import/export, storage quotas, and eviction remain future work.

The Wave 0 integration mounts `createSignSurface` for every playback model.
The local chain is verified storage (or an explicit storage failure), HTML5
adapter sample, runtime resolution, renderer, and visible caption fallback.
The abstract `synthetic-test-only` SVG also receives its clock only from that
adapter/controller path; it has no `timeupdate` listener or timeline loop of
its own, and it freezes at playback rates other than `1x`.

The on-page integration trace contains only module names and outcome codes. It
does not retain media URLs, caption text, or viewing history.
