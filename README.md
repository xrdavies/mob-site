# Mob website

The product site for Mob, mob programming with your AI agents: home, download, docs, privacy policy and 404.
Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com) into static
files, hosted on **GitHub Pages**. English only for now; the structure leaves room for more languages.

## Develop

Node.js 24+.

```sh
npm ci
npm run dev        # http://127.0.0.1:4321, live reload
npm test           # builds the site with fixture manifests and checks it
npm run build      # dist/
npm run preview    # serves dist/
```

The build reads the release manifests from R2 (default `https://dl.mymob.dev`) and writes
versions, download links, SHA-256 and release notes into the HTML, so browsers never fetch R2 JSON
(**no R2 CORS needed**). Offline, a local build still succeeds and shows “Version unavailable”.

## Build configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `SITE_URL` | to deploy | Site HTTPS origin (custom domain): canonical links, sitemap, og:image |
| `DOWNLOAD_BASE_URL` | no | R2 download origin, default `https://dl.mymob.dev` |
| `IOS_APP_URL` | no | App Store or TestFlight link; without it the iPhone card says “Coming to the App Store” |
| `REQUIRE_PUBLIC_CONFIG` | — | `1` requires `SITE_URL` and fails if any manifest can't be read (CI deploys) |
| `RELEASES_FIXTURE` | — | JSON file of release histories by product used instead of R2 (tests, offline previews) |

## Deploy to GitHub Pages

1. **Settings → Pages → Build and deployment → Source**: **GitHub Actions**.
2. **Settings → Pages → Custom domain**: `mymob.dev`, then **Enforce HTTPS**. DNS for the apex:
   `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and
   `AAAA` records to `2606:50c0:8000::153` … `2606:50c0:8003::153`; `www` as a CNAME to
   `xrdavies.github.io` (GitHub then redirects it). On Cloudflare, leave these records DNS-only.
3. **Settings → Secrets and variables → Actions → Variables**: `SITE_URL` (same domain), and
   `DOWNLOAD_BASE_URL` / `IOS_APP_URL` as needed.
4. Push to `main`.

`.github/workflows/pages.yml` tests and builds pull requests, and builds and deploys on pushes to
`main`, hourly, manually, and on the `release-published` event. If R2 is unreachable the build fails
and Pages keeps serving the previous site instead of replacing download links with “unavailable”.

### Update the site right after a release

The R2 publishing workflows of mob, mobd and mob-android finish by dispatching `release-published`
to this repository. Add the secret `SITE_DISPATCH_TOKEN` to their `release` environments: a
fine-grained token with **Contents: Read and write** on `xrdavies/mob-site`. Without it the site
picks up the release on its next hourly build.

## Download protocol

```text
{DOWNLOAD_BASE_URL}/mob/releases.json        desktop app history (mob repository)
{DOWNLOAD_BASE_URL}/mobd/releases.json       mobd history (mobd repository)
{DOWNLOAD_BASE_URL}/android/releases.json    Android history (mob-android repository)
{DOWNLOAD_BASE_URL}/mobd/install.sh          mobd installer
```

Each entry has `version`, `pub_date`, `notes`, `download.url`, `download.sha256` and
`checksums_url`. Only files under the same origin, product and version path are accepted
(`mob_X.Y.Z_darwin_arm64.dmg`, `mobd_X.Y.Z_darwin_arm64.tar.gz`, `mob-android_X.Y.Z.apk`); other
entries are skipped. A 404 manifest means not released yet, and the button is disabled.

`notes` render as text with `**bold**`, links and line breaks only. Write user-facing notes before
publishing a release.

## Layout

- `src/pages/`: one file per page, plus `robots.txt` and `sitemap.xml`.
- `src/layouts/Layout.astro`: shell, navigation, footer and the CSP (`<meta>`; Pages has no custom headers).
  Nothing may be inlined: scripts and styles are emitted as files.
- `src/components/`: screenshot frames, copyable commands, release tags and folds.
- `src/data/site.mjs`: environment and release manifests, read once per build.
- `src/scripts/site.ts`: progressive enhancement (menu, copy buttons, tabs, device hint, docs sidebar).
- `src/styles/global.css`: Tailwind layers and the shared component classes.
- `lib/`: manifest validation and helpers shared with the tests.
- `public/assets/screens/`: product screenshots; a page leaves a slot out until its file exists.

Brand assets come from `../mob/public/logo.svg` and `../mob/app-icon.svg`; update both together.
