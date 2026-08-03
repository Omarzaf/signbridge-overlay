# Chrome Extension

This build-free Manifest V3 extension loads a local, caption-preserving status
overlay on YouTube. It includes no signing media, remote executable code,
network request, analytics, transcript upload, or production dependency.

Required host access is limited to `www.youtube.com` and `m.youtube.com`.
Generic HTTP(S) video sites are declared only as optional hosts. Opening the
toolbar popup explains the access before the user initiates Chrome's exact-site
permission prompt. A declined prompt injects nothing. `<all_urls>` is never
requested.

## Load the unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `apps/extension` directory.
4. Open or reload a supported YouTube page. The status overlay should say that
   no reviewed SignPack is loaded and that source captions remain available.
5. To try a generic HTML5-video site, open the toolbar popup, review the named
   origin, and choose **Continue to Chrome prompt**. Chrome then asks for that
   one origin; access is not requested until this click.

No build or Chrome Web Store listing is required. Every executable file used by
the manifest is present in this directory.

To revoke a generic-site grant, open Chrome's extension details, select
**Site access**, and remove the site. YouTube remains the only required host
access.
