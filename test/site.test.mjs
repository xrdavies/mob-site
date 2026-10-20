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
  assert.match(read(directory, 'download/index.html'), /href="https:\/\/apps.apple.com\/app\/id123"/);
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

test('mob releases with Windows and Linux files get those buttons; files outside the release are dropped', async t => {
  const r = release('mob', '0.3.0', 'mob_0.3.0_darwin_arm64.dmg');
  const file = name => ({ url: `${base}/mob/v0.3.0/${name}`, sha256: 'b'.repeat(64) });
  r.downloads = {
    'macos-arm64': [r.download],
    'windows-x64': [file('mob_0.3.0_windows_x64-setup.exe')],
    'linux-x64': [file('mob_0.3.0_linux_x64.AppImage'), file('mob_0.3.0_linux_x64.deb')],
    evil: [{ url: 'https://evil.test/x.exe', sha256: 'c'.repeat(64) }],
  };
  assert.deepEqual(Object.keys(validateRelease(r, 'mob', base).files), ['macos-arm64', 'windows-x64', 'linux-x64']);
  const directory = output(t);
  const fetchV3 = async url => new URL(url).pathname.startsWith('/mob/') ? Response.json([r]) : fakeFetch(url);
  await build(directory, { DOWNLOAD_BASE_URL: base }, fetchV3);
  const download = read(directory, 'download/index.html');
  for (const name of ['mob_0.3.0_windows_x64-setup.exe', 'mob_0.3.0_linux_x64.AppImage', 'mob_0.3.0_linux_x64.deb']) assert.match(download, new RegExp(`href="${base}/mob/v0.3.0/${name}"`));
  assert.doesNotMatch(download, /evil\.test/);
  // Older manifests without `downloads` leave the buttons disabled.
  await build(directory, { DOWNLOAD_BASE_URL: base }, fakeFetch);
  const old = read(directory, 'download/index.html');
  assert.match(old, /<span class="button primary is-disabled" aria-disabled="true">下载安装程序<\/span>/);
  assert.equal(old.match(/即将推出/g).length >= 2, true, 'Windows and Linux are coming soon, not tagged with the macOS version');
});

test('mobd releases with Linux platforms get .deb buttons per architecture', async t => {
  const r = release('mobd', '0.4.0', 'mobd_0.4.0_darwin_arm64.tar.gz');
  const file = name => ({ url: `${base}/mobd/v0.4.0/${name}`, sha256: 'd'.repeat(64) });
  r.platforms = {
    'darwin-aarch64': r.download,
    'linux-x86_64': { ...file('mobd_0.4.0_linux_amd64.tar.gz'), deb: file('mobd_0.4.0_amd64.deb') },
    'linux-aarch64': { ...file('mobd_0.4.0_linux_arm64.tar.gz'), deb: { url: 'https://evil.test/mobd.deb', sha256: 'e'.repeat(64) } },
  };
  const files = validateRelease(r, 'mobd', base).files;
  assert.equal(files['linux-x86_64'].length, 2);
  assert.equal(files['linux-aarch64'].length, 1, 'a file outside the release is dropped');
  const directory = output(t);
  const fetchLinux = async url => new URL(url).pathname.startsWith('/mobd/') ? Response.json([r]) : fakeFetch(url);
  await build(directory, { DOWNLOAD_BASE_URL: base }, fetchLinux);
  const download = read(directory, 'download/index.html');
  assert.match(download, new RegExp(`href="${base}/mobd/v0.4.0/mobd_0.4.0_amd64.deb"`));
  assert.match(download, /<span class="button ghost is-disabled" aria-disabled="true">下载 deb \(arm64\)<\/span>/);
  assert.doesNotMatch(download, /evil\.test/);
  // Before mobd ships Linux the buttons are disabled and the card says so.
  await build(directory, { DOWNLOAD_BASE_URL: base }, fakeFetch);
  assert.match(read(directory, 'download/index.html'), /<span class="button ghost is-disabled" aria-disabled="true">下载 deb \(x86_64\)<\/span>/);
  assert.match(read(directory, 'start/index.html'), /id="linux"/);
});
