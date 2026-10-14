import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, origin } from '../build.mjs';
import { validateRelease } from '../public/releases.js';

test('production requires actual HTTPS domains; preview works before first release', t => {
  const output = mkdtempSync(join(tmpdir(), 'mob-site-test-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  assert.throws(() => build(output, { REQUIRE_PUBLIC_CONFIG: '1' }), /required/);
  assert.throws(() => origin('https://mob.example.com'), /example domain/);
  assert.throws(() => origin('http://mob.test'), /HTTPS/);
  assert.throws(() => origin('https://mob.test/?key=value'), /HTTPS/);
  build(output, {});
  assert.equal(JSON.parse(readFileSync(join(output, 'config.json'))).downloadBaseURL, '');
  assert.match(readFileSync(join(output, 'robots.txt'), 'utf8'), /Disallow/);
  for (const page of ['index.html', 'download/index.html', 'start/index.html', 'changelog/index.html', '404.html']) assert.ok(!readFileSync(join(output, page), 'utf8').includes('{{'));
});

test('configured build includes sitemap, canonical URL and download origin in CSP', t => {
  const output = mkdtempSync(join(tmpdir(), 'mob-site-test-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  build(output, { SITE_URL: 'https://mob.test', DOWNLOAD_BASE_URL: 'https://download.mob.test', REQUIRE_PUBLIC_CONFIG: '1' });
  assert.match(readFileSync(join(output, 'sitemap.xml'), 'utf8'), /https:\/\/mob.test\/start\//);
  assert.match(readFileSync(join(output, '_headers'), 'utf8'), /connect-src 'self' https:\/\/download.mob.test/);
  assert.match(readFileSync(join(output, 'download/index.html'), 'utf8'), /rel="canonical" href="https:\/\/mob.test\/download\/"/);
});

test('download manifests reject external URLs and wrong products while preserving notes as text', () => {
  const base = 'https://download.mob.test';
  const data = { version: '1.2.3', pub_date: '2026-10-14T00:00:00Z', notes: '<script>alert(1)</script>', download: { url: `${base}/mob/v1.2.3/mob_1.2.3_darwin_arm64.dmg`, sha256: 'a'.repeat(64) }, checksums_url: `${base}/mob/v1.2.3/SHA256SUMS` };
  assert.equal(validateRelease(data, 'mob', base).notes, data.notes);
  assert.throws(() => validateRelease(data, 'mobd', base), /download/);
  assert.throws(() => validateRelease({ ...data, download: { ...data.download, url: 'https://other.test/file.dmg' } }, 'mob', base), /download/);
  assert.throws(() => validateRelease({ ...data, version: '../../bad' }, 'mob', base), /version/);
});
