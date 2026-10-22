import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, iosURL, origin, renderNotes } from '../build.mjs';
import { fetchReleases, validateRelease } from '../lib/releases.mjs';

const base = 'https://download.mob.test';
const release = (product, version, file) => ({
  version, pub_date: '2026-10-14T00:00:00Z', notes: `**Full Changelog**: https://github.com/xrdavies/${product}/commits/v${version}`,
  download: { url: `${base}/${product}/v${version}/${file}`, sha256: 'a'.repeat(64) }, checksums_url: `${base}/${product}/v${version}/SHA256SUMS`,
});
const manifests = {
  mob: [release('mob', '0.2.0', 'mob_0.2.0_darwin_arm64.dmg'), release('mob', '0.1.0', 'mob_0.1.0_darwin_arm64.dmg')],
  mobd: [release('mobd', '0.0.2', 'mobd_0.0.2_darwin_arm64.tar.gz')],
};
// android is unpublished: 404, like R2 before the first APK.
const fakeFetch = async url => {
  const product = new URL(url).pathname.split('/')[1];
  return manifests[product] ? Response.json(manifests[product]) : new Response('missing', { status: 404 });
};
const offline = async () => { throw Error('getaddrinfo ENOTFOUND'); };

function output(t) {
  const directory = mkdtempSync(join(tmpdir(), 'mob-site-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
const read = (directory, page) => readFileSync(join(directory, page), 'utf8');

test('configuration rejects unsafe or placeholder values', () => {
  assert.throws(() => origin('https://mob.example.com'), /example domain/);
  assert.throws(() => origin('http://mob.test'), /HTTPS/);
  assert.throws(() => origin('https://mob.test/?key=value'), /HTTPS/);
  assert.throws(() => iosURL('https://evil.test/app'), /apps.apple.com/);
  assert.equal(iosURL('https://testflight.apple.com/join/abc'), 'https://testflight.apple.com/join/abc');
});

test('deployment requires SITE_URL and reachable release manifests', async t => {
  await assert.rejects(build(output(t), { REQUIRE_PUBLIC_CONFIG: '1', DOWNLOAD_BASE_URL: base }, fakeFetch), /SITE_URL/);
  await assert.rejects(build(output(t), { REQUIRE_PUBLIC_CONFIG: '1', SITE_URL: 'https://mob.test', DOWNLOAD_BASE_URL: base }, offline), /release manifests/);
});

test('released products get static download links; unreleased ones are disabled', async t => {
  const directory = output(t);
  await build(directory, { SITE_URL: 'https://mob.test', DOWNLOAD_BASE_URL: base, REQUIRE_PUBLIC_CONFIG: '1' }, fakeFetch);
  const download = read(directory, 'download/index.html');
  assert.match(download, /href="https:\/\/download.mob.test\/mob\/v0.2.0\/mob_0.2.0_darwin_arm64.dmg"/);
  assert.match(download, /curl -fsSL https:\/\/download.mob.test\/mobd\/install.sh \| sh/);
  assert.match(download, /下载 APK<\/span>/, 'android button is a disabled span');
  assert.doesNotMatch(download, /android\/v/);
  assert.match(download, /即将上线/, 'iOS is coming soon without IOS_APP_URL');
  assert.match(read(directory, 'index.html'), /MOB v0.2.0 · mobd v0.0.2/);
  assert.match(read(directory, 'start/index.html'), /curl -fsSL https:\/\/download.mob.test\/mobd\/install.sh/);
  const changelog = read(directory, 'changelog/index.html');
  assert.equal(changelog.match(/class="release-entry"/g).length, 3);
  assert.match(changelog, /<strong>Full Changelog<\/strong>/);
  assert.match(read(directory, 'sitemap.xml'), /https:\/\/mob.test\/start\//);
  assert.match(read(directory, 'download/index.html'), /rel="canonical" href="https:\/\/mob.test\/download\/"/);
  for (const page of ['index.html', 'download/index.html', 'start/index.html', 'changelog/index.html', '404.html']) assert.ok(!read(directory, page).includes('{{'), page);
});

test('local preview builds offline with a helpful status', async t => {
  const directory = output(t);
  const { errors } = await build(directory, {}, offline);
  assert.equal(errors.length, 3);
  assert.match(read(directory, 'download/index.html'), /暂时无法获取版本信息/);
  assert.match(read(directory, 'robots.txt'), /Disallow/);
});

test('iOS link appears once configured', async t => {
  const directory = output(t);
  await build(directory, { DOWNLOAD_BASE_URL: base, IOS_APP_URL: 'https://apps.apple.com/app/id123' }, fakeFetch);
  const store = read(directory, 'download/index.html');
  assert.match(store, /href="https:\/\/apps.apple.com\/app\/id123">在 App Store 获取/);
  assert.match(store, /<span class="version-tag">App Store<\/span>/);
  await build(directory, { DOWNLOAD_BASE_URL: base, IOS_APP_URL: 'https://testflight.apple.com/join/abc' }, fakeFetch);
  const beta = read(directory, 'download/index.html');
  assert.match(beta, /href="https:\/\/testflight.apple.com\/join\/abc">通过 TestFlight 获取/);
  assert.match(beta, /<span class="version-tag">TestFlight<\/span>/);
  assert.doesNotMatch(beta, /App Store/);
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

test('only macOS, Android and iPhone clients render, even when manifests list Windows or Linux files', async t => {
  const mob = release('mob', '0.3.0', 'mob_0.3.0_darwin_arm64.dmg');
  const file = (product, name) => ({ url: `${base}/${product}/v0.3.0/${name}`, sha256: 'b'.repeat(64) });
  mob.downloads = {
    'windows-x64': [file('mob', 'mob_0.3.0_windows_x64-setup.exe')],
    'linux-x64': [file('mob', 'mob_0.3.0_linux_x64.AppImage'), file('mob', 'mob_0.3.0_linux_x64.deb')],
    evil: [{ url: 'https://evil.test/x.exe', sha256: 'c'.repeat(64) }],
  };
  assert.deepEqual(Object.keys(validateRelease(mob, 'mob', base).files), ['windows-x64', 'linux-x64'], 'files outside the release are dropped');
  const mobd = release('mobd', '0.3.0', 'mobd_0.3.0_darwin_arm64.tar.gz');
  mobd.platforms = { 'linux-x86_64': { ...file('mobd', 'mobd_0.3.0_linux_amd64.tar.gz'), deb: file('mobd', 'mobd_0.3.0_amd64.deb') } };
  const directory = output(t);
  const extra = { mob: [mob], mobd: [mobd] };
  await build(directory, { DOWNLOAD_BASE_URL: base }, async url => {
    const product = new URL(url).pathname.split('/')[1];
    return extra[product] ? Response.json(extra[product]) : fakeFetch(url);
  });
  const download = read(directory, 'download/index.html');
  assert.match(download, /href="https:\/\/download.mob.test\/mob\/v0.3.0\/mob_0.3.0_darwin_arm64.dmg"/);
  assert.doesNotMatch(download, /\.exe|\.AppImage|\.deb"|evil\.test/);
  assert.doesNotMatch(download, /id="(windows|linux|mobd-linux)"|Windows/);
  for (const id of ['mac', 'android', 'ios', 'mobd']) assert.match(download, new RegExp(`id="${id}"`));
  const start = read(directory, 'start/index.html');
  assert.doesNotMatch(start, /id="linux"|mobd desktops/);
  assert.equal(start.match(/install\.sh \| sh/g).length, 1, 'the install command appears once in the guide');
});
