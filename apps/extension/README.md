# Chrome Extension

This Manifest V3 extension loads a locally bundled, caption-preserving runtime
on YouTube. It includes no signing media, remote executable code, network
request, analytics, transcript upload, or production dependency.

The browser action badge and popup are the authoritative safety surface. The
content-script overlay is best effort: it is isolated in Shadow DOM and is
reattached if the host page removes it. Dismissing that page overlay never
removes the browser-controlled badge state.

Pack storage is read only in the extension service worker's origin. The content
script receives only a revalidated synthetic manifest or a stable failure
code, then connects the primary player through the video adapter, runtime, and
renderer. A YouTube/blob locator is not treated as an authenticated source
fingerprint, so signing remains blocked until a trusted locator contract exists.

Required host access is limited to `www.youtube.com` and `m.youtube.com`.
Generic HTTP(S) video sites are declared only as optional hosts. Opening the
toolbar popup explains the access before the user initiates Chrome's exact-site
permission prompt. A declined prompt injects nothing. `<all_urls>` is never
requested.

## Load the unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `apps/extension` directory.
4. Open or reload a supported YouTube page. The action badge should show the
   caption fallback state, and the best-effort page overlay should say that
   source captions remain available.
5. To try a generic HTML5-video site, open the toolbar popup, review the named
   origin, and choose **Continue to Chrome prompt**. Chrome then asks for that
   one origin; access is not requested until this click.

Every executable file used by the manifest is present in this directory. To
rebuild the two checked-in local bundles after source changes:

```bash
corepack pnpm exec vite build --config apps/extension/vite.content.config.js
corepack pnpm exec vite build --config apps/extension/vite.background.config.js
```

To revoke a generic-site grant, open Chrome's extension details, select
**Site access**, and remove the site. YouTube remains the only required host
access. Chrome retains an approved exact-site grant, and the service worker
reinjects the local content bundle after reload or same-origin navigation.
