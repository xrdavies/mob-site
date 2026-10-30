// Everything the pages need from the environment and the release manifests, read once per build.
import { readFileSync } from 'node:fs';
import { DEFAULT_DOWNLOAD_BASE_URL, DEFAULT_SITE_URL, iosURL, origin } from '../../lib/config.mjs';
import { PRODUCTS, fetchReleases, validateRelease } from '../../lib/releases.mjs';

const env = process.env;
// The site's domain is part of the product, like the download domain. SITE_URL= (empty) builds a
// preview: no canonical links, and robots.txt keeps crawlers out.
export const siteURL = origin(env.SITE_URL ?? DEFAULT_SITE_URL);
export const base = origin(env.DOWNLOAD_BASE_URL || DEFAULT_DOWNLOAD_BASE_URL);
export const ios = iosURL(env.IOS_APP_URL);
export const testflight = Boolean(ios) && new URL(ios).hostname === 'testflight.apple.com';
const strict = env.REQUIRE_PUBLIC_CONFIG === '1';
if (strict && !siteURL) throw Error('SITE_URL is required for deployment');

// RELEASES_FIXTURE (tests, offline previews): a JSON file of release histories by product, used
// instead of R2. A missing product counts as unreleased.
async function load(product) {
  if (!env.RELEASES_FIXTURE) return fetchReleases(base, product);
  const history = JSON.parse(readFileSync(env.RELEASES_FIXTURE, 'utf8'))[product] ?? [];
  if (history === 'offline') return { releases: [], error: `${product}: offline` };
  return { releases: history.map(item => validateRelease(item, product, base)) };
}

export const releases = Object.fromEntries(await Promise.all(Object.keys(PRODUCTS).map(async p => [p, await load(p)])));
export const errors = Object.values(releases).map(r => r.error).filter(Boolean);
// A deploy with an unreachable R2 would replace live download links with "unavailable"; fail and keep the old site.
if (strict && errors.length) throw Error(`Could not read release manifests: ${errors.join('; ')}`);
for (const error of errors) console.warn(`Warning: ${error}`);

export const latest = product => releases[product].releases[0];
export const pending = product => (releases[product].error ? 'Version unavailable' : 'Coming soon');
export const install = `curl -fsSL ${base}/mobd/install.sh | sh`;

// The source code (MIT) and where to report problems, per part of Mob.
export const github = 'https://github.com/xrdavies';
const repos = { mob: 'mob', mobd: 'mobd', android: 'mob-android' };
export const releasePage = (product, version) => `${github}/${repos[product]}/releases/tag/v${version}`;
export const releasesPage = product => `${github}/${repos[product]}/releases`;
export const parts = [
  { name: 'mobd (office computer)', repo: 'mobd' },
  { name: 'Mob Desktop (macOS, Windows, Linux)', repo: 'mob' },
  { name: 'Mob Mobile for iPhone & iPad', repo: 'mob-ios' },
  { name: 'Mob Mobile for Android', repo: 'mob-android' },
  { name: 'This website', repo: 'mob-site' },
];
