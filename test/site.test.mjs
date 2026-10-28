import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iosURL, origin, renderNotes } from '../lib/config.mjs';
import { fetchReleases, validateRelease } from '../lib/releases.mjs';

const base = 'https://download.mob.test';
const release = (product, version, file, notes = `**Full Changelog**: https://github.com/xrdavies/${product}/commits/v${version}`) => ({
  version, pub_date: '2026-10-14T00:00:00Z', notes,
  download: { url: `${base}/${product}/v${version}/${file}`, sha256: 'a'.repeat(64) }, checksums_url: `${base}/${product}/v${version}/SHA256SUMS`,
});
// android is unpublished, like R2 before the first APK.
const manifests = {
  mob: [release('mob', '0.2.0', 'mob_0.2.0_darwin_arm64.dmg', '**New** live view'), release('mob', '0.1.0', 'mob_0.1.0_darwin_arm64.dmg')],
  mobd: [release('mobd', '0.0.2', 'mobd_0.0.2_darwin_arm64.tar.gz')],
};
const PAGES = ['index.html', 'download/index.html', 'start/index.html', 'remote/index.html', 'privacy/index.html', '404.html'];

// Builds the site with Astro into a temporary directory, with release manifests from a fixture.
function build(t, env, fixture = manifests) {
  const root = mkdtempSync(join(tmpdir(), 'mob-site-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const fixtureFile = join(root, 'releases.json');
  writeFileSync(fixtureFile, JSON.stringify(fixture));
  const out = join(root, 'dist');
  const result = spawnSync('npx', ['astro', 'build', '--outDir', out], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, DOWNLOAD_BASE_URL: base, RELEASES_FIXTURE: fixtureFile, ASTRO_TELEMETRY_DISABLED: '1', ...env },
  });
  return { ok: result.status === 0, log: result.stdout + result.stderr, read: page => readFileSync(join(out, page), 'utf8'), out };
}

test('configuration rejects unsafe or placeholder values', () => {
  assert.throws(() => origin('https://mob.example.com'), /example domain/);
  assert.throws(() => origin('http://mob.test'), /HTTPS/);
  assert.throws(() => origin('https://mob.test/?key=value'), /HTTPS/);
  assert.throws(() => iosURL('https://evil.test/app'), /apps.apple.com/);
  assert.equal(iosURL('https://testflight.apple.com/join/abc'), 'https://testflight.apple.com/join/abc');
});

test('manifests reject external URLs and wrong products; notes are escaped', async () => {
  const data = release('mob', '1.2.3', 'mob_1.2.3_darwin_arm64.dmg');
  assert.equal(validateRelease(data, 'mob', base).version, '1.2.3');
  assert.throws(() => validateRelease(data, 'mobd', base), /download/);
  assert.throws(() => validateRelease({ ...data, download: { ...data.download, url: 'https://other.test/file.dmg' } }, 'mob', base), /download/);
  assert.throws(() => validateRelease({ ...data, version: '../../bad' }, 'mob', base), /version/);
  assert.equal(validateRelease(release('android', '0.1.0', 'mob-android_0.1.0.apk'), 'android', base).version, '0.1.0');
  const { releases } = await fetchReleases(base, 'mob', async () => Response.json([data, { ...data, version: 'bad' }]));
  assert.equal(releases.length, 1, 'invalid entries are skipped, not fatal');
  assert.equal(renderNotes('<script>alert(1)</script> $& **x**'), '&lt;script&gt;alert(1)&lt;/script&gt; $&amp; <strong>x</strong>');
});

test('deployment requires SITE_URL and reachable release manifests', t => {
  const noSite = build(t, { REQUIRE_PUBLIC_CONFIG: '1' });
  assert.equal(noSite.ok, false);
  assert.match(noSite.log, /SITE_URL is required/);
  const offline = build(t, { REQUIRE_PUBLIC_CONFIG: '1', SITE_URL: 'https://mob.test' }, { mob: 'offline' });
  assert.equal(offline.ok, false);
  assert.match(offline.log, /Could not read release manifests/);
});

test('released products get downloads and notes; the site is English, CSP-clean and complete', t => {
  const site = build(t, { SITE_URL: 'https://mob.test', REQUIRE_PUBLIC_CONFIG: '1' });
  assert.ok(site.ok, site.log);
  const download = site.read('download/index.html');
  assert.match(download, /href="https:\/\/download.mob.test\/mob\/v0.2.0\/mob_0.2.0_darwin_arm64.dmg"/);
  assert.match(download, /curl -fsSL https:\/\/download.mob.test\/mobd\/install.sh \| sh/);
  assert.doesNotMatch(download, /android\/v/, 'no APK link before the first Android release');
  assert.match(download, /<strong>New<\/strong> live view/, 'latest notes of the desktop app');
  assert.equal(download.match(/Release notes/g).length, 2, 'notes for mob and mobd, none for unreleased Android');
  assert.match(download, /Coming to the App Store/);
  const home = site.read('index.html');
  assert.match(home, /Mob 0.2.0 · mobd 0.0.2/, 'versions in the footer');
  assert.match(home, /Leave the desk\./);
  assert.match(home, /Codex · Claude Code · Pi/, 'all three agents');
  assert.match(download, /Mob Desktop for macOS/);
  assert.match(download, /Mob Mobile for Android/);
  for (const hour of ['08:47', '09:12', '12:30', '15:05', '18:00', '21:40']) assert.match(home, new RegExp(`data-time="${hour}"`), hour);
  assert.match(home, /curl -fsSL https:\/\/download.mob.test\/mobd\/install.sh \| sh/);
  assert.match(site.read('start/index.html'), /curl -fsSL https:\/\/download.mob.test\/mobd\/install.sh/);
  assert.match(download, /rel="canonical" href="https:\/\/mob.test\/download\/"/);
  const sitemap = site.read('sitemap.xml');
  for (const path of ['/', '/download/', '/start/', '/remote/', '/privacy/']) assert.ok(sitemap.includes(`<loc>https://mob.test${path}</loc>`), path);
  assert.match(site.read('robots.txt'), /Sitemap: https:\/\/mob.test\/sitemap.xml/);
  assert.match(site.read('privacy/index.html'), /mailto:mob@taoist.dev/);
  assert.match(download, /href="https:\/\/github.com\/xrdavies\/mob\/releases\/tag\/v0.2.0"/, 'the desktop download links its GitHub release');
  assert.match(download, /href="https:\/\/github.com\/xrdavies\/mobd\/releases\/tag\/v0.0.2"/, 'mobd links its GitHub release');
  assert.doesNotMatch(download, /mob-android\/releases/, 'no Android release link before its first release');
  assert.match(home, /Open source/, 'the footer says it is open source');
  assert.match(home, /href="\/start\/#report"/, 'the footer links Report a problem');
  const report = site.read('start/index.html');
  for (const repo of ['mobd', 'mob', 'mob-ios', 'mob-android', 'mob-site']) assert.match(report, new RegExp(`href="https://github.com/xrdavies/${repo}/issues"`), `issues of ${repo}`);
  const remote = site.read('remote/index.html');
  for (const id of ['choose', 'lan', 'tailscale', 'cloudflare', 'funnel', 'both', 'security', 'problems']) assert.match(remote, new RegExp(`id="${id}"`), `remote#${id}`);
  assert.match(remote, /mobd remote setup --tailscale/);
  assert.match(remote, /mobd remote setup --cloudflare --hostname mob.example.com/);
  const start = site.read('start/index.html');
  assert.match(start, /id="remote"[\s\S]*href="\/remote\/"/, 'Get started points to the remote access guide');
  assert.match(start, /id="cloudflare"/, 'old #cloudflare links still land on the page');
  for (const page of PAGES) {
    const html = site.read(page);
    assert.doesNotMatch(html, /[一-鿿]/, `${page}: English only`);
    assert.doesNotMatch(html, /changelog|\bMOB\b/, `${page}: no changelog links, product written "Mob"`);
    assert.doesNotMatch(html, /office Mac/i, `${page}: mobd runs on an office computer, not only a Mac`);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>|<style|\sstyle="/, `${page}: nothing inline (CSP)`);
    for (const [, src] of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
      const file = src.endsWith('/') ? `${src}index.html` : src;
      assert.ok(existsSync(join(site.out, file)), `${page} links to ${src}`);
    }
  }
});

test('a local preview builds offline with a helpful status', t => {
  const site = build(t, {}, { mob: 'offline', mobd: 'offline', android: 'offline' });
  assert.ok(site.ok, site.log);
  assert.match(site.read('download/index.html'), /Version unavailable/);
  assert.doesNotMatch(site.read('index.html'), /mobd \d+\.\d+\.\d+/, 'no versions without manifests');
  assert.match(site.read('robots.txt'), /Disallow/);
});

test('iOS card: coming soon, App Store link, or TestFlight link', t => {
  const store = build(t, { IOS_APP_URL: 'https://apps.apple.com/app/id123' }).read('download/index.html');
  assert.match(store, /href="https:\/\/apps.apple.com\/app\/id123"[^>]*>Get it on the App Store/);
  assert.doesNotMatch(store, /Coming to the App Store/);
  const beta = build(t, { IOS_APP_URL: 'https://testflight.apple.com/join/abc' }).read('download/index.html');
  assert.match(beta, /href="https:\/\/testflight.apple.com\/join\/abc"[^>]*>Join on TestFlight/);
});

test('only macOS, iPhone and Android clients get downloads, even when manifests list Windows or Linux files', t => {
  const file = (product, name) => ({ url: `${base}/${product}/v0.3.0/${name}`, sha256: 'b'.repeat(64) });
  const mob = release('mob', '0.3.0', 'mob_0.3.0_darwin_arm64.dmg');
  mob.downloads = { 'windows-x64': [file('mob', 'mob_0.3.0_windows_x64-setup.exe')], 'linux-x64': [file('mob', 'mob_0.3.0_linux_x64.AppImage'), file('mob', 'mob_0.3.0_linux_x64.deb')] };
  const mobd = release('mobd', '0.3.0', 'mobd_0.3.0_darwin_arm64.tar.gz');
  mobd.platforms = { 'linux-x86_64': { ...file('mobd', 'mobd_0.3.0_linux_amd64.tar.gz'), deb: file('mobd', 'mobd_0.3.0_amd64.deb') } };
  const download = build(t, {}, { mob: [mob], mobd: [mobd] }).read('download/index.html');
  assert.match(download, /href="https:\/\/download.mob.test\/mob\/v0.3.0\/mob_0.3.0_darwin_arm64.dmg"/);
  assert.doesNotMatch(download, /\.exe"|\.AppImage"|\.deb"/);
});
