import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, fetchReleases } from './lib/releases.mjs';

export const DEFAULT_DOWNLOAD_BASE_URL = 'https://mob-releases.0xd.app';

export function origin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9.-]+$/.test(url.hostname)) throw Error('Use an HTTPS origin without a path, port or credentials');
  if (url.hostname.endsWith('.example.com') || url.hostname === 'example.com') throw Error('Replace the example domain before building');
  return url.origin;
}

// Optional App Store or TestFlight link; the iOS card says "coming soon" until it is set
// and names TestFlight when the link is a beta invitation.
export function iosURL(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['apps.apple.com', 'testflight.apple.com'].includes(url.hostname)) throw Error('IOS_APP_URL must be an apps.apple.com or testflight.apple.com link');
  return url.href;
}

const pages = [
  ['', '在办公室的电脑上运行编码 Agent，随时随地驱动它', '在办公室 Mac 上运行 Codex 或 Claude Code，用 MOB 从 Mac、iPhone 或 Android 发起任务、回答问题，并实时查看办公室桌面。'],
  ['download', '下载 MOB', 'MOB 桌面端（macOS）、Android、iPhone（TestFlight）客户端，以及办公室端 mobd（macOS）的下载与版本信息。'],
  ['start', '快速开始', '在办公室 Mac 上安装和配置 mobd，再用 MOB 客户端配对连接。'],
  ['changelog', '更新日志', 'MOB 桌面端、mobd 与 Android 应用的公开版本记录和历史下载。'],
  ['404', '页面不存在', '这个页面不存在。返回 MOB 首页或下载页。'],
];

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const formatDate = value => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(new Date(value));

// Release notes are plain text with light Markdown from GitHub; render bold, links and line breaks only.
export function renderNotes(text) {
  return escape(text.trim())
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/https:\/\/[^\s<]+/g, url => `<a href="${url}" rel="noreferrer">${url.replace(/^https:\/\//, '')}</a>`)
    .replace(/\n/g, '<br>');
}

function renderers({ releases, base, ios }) {
  const latest = product => releases[product].releases[0];
  const testflight = Boolean(ios) && new URL(ios).hostname === 'testflight.apple.com';
  const pending = product => releases[product].error ? '暂时无法获取版本信息' : '即将推出';
  return {
    version: product => latest(product) ? `v${latest(product).version}` : pending(product),
    meta: product => {
      const release = latest(product);
      return release ? `<span class="version-tag">v${release.version}</span><span>${formatDate(release.date)}</span>` : `<span class="version-tag muted">${pending(product)}</span>`;
    },
    download: (product, label) => {
      const release = latest(product);
      if (!release) return `<span class="button primary is-disabled" aria-disabled="true">${escape(label)}</span>`;
      return `<a class="button primary" href="${escape(release.url)}" data-download="${product}">${escape(label)} <span aria-hidden="true">↓</span></a>`;
    },
    link: (product, label) => {
      const release = latest(product);
      return release ? `<a class="text-link" href="${escape(release.url)}">${escape(label)} ↓</a>` : '';
    },
    checksum: product => {
      const release = latest(product);
      if (!release) return '';
      return `<details class="checksum"><summary>SHA-256 校验值</summary><code>${release.sha256}</code><a href="${escape(release.checksums)}">SHA256SUMS ↗</a></details>`;
    },
    install: () => `curl -fsSL ${base}/mobd/install.sh | sh`,
    base: () => base,
    ios: label => ios
      ? `<a class="button primary" href="${escape(ios)}">${escape(testflight ? '通过 TestFlight 获取' : label)} <span aria-hidden="true">↗</span></a>`
      : '<span class="button primary is-disabled" aria-disabled="true">即将上线</span>',
    iosmeta: () => ios ? `<span class="version-tag">${testflight ? 'TestFlight' : 'App Store'}</span>` : '<span class="version-tag muted">即将推出</span>',
    changelog: product => {
      const { releases: list, error } = releases[product];
      if (!list.length) return `<p class="empty-release">${error ? '暂时无法获取发布记录，请稍后刷新。' : '尚未发布公开版本。'}</p>`;
      return list.map((release, index) => `<article class="release-entry"><header><h3>v${release.version}${index === 0 ? ' <span class="latest-tag">最新</span>' : ''}</h3><time datetime="${escape(release.date)}">${formatDate(release.date)}</time></header>`
        + `<div class="release-notes">${renderNotes(release.notes || `${product} ${release.version}`)}</div>`
        + `<p class="release-links"><a href="${escape(release.url)}">下载此版本 ↓</a><a href="${escape(release.checksums)}">SHA256SUMS ↗</a></p></article>`).join('');
    },
  };
}

// {{name}}, {{name:product}} or {{name:product|label}} inside page bodies.
export function render(body, context) {
  const fns = renderers(context);
  return body.replace(/\{\{([a-z]+)(?::([\w-]+))?(?:\|([^}]*))?\}\}/g, (match, name, arg, label) => {
    if (!fns[name]) throw Error(`Unknown template token ${match}`);
    return name === 'ios' ? fns.ios(label ?? arg) : fns[name](arg, label);
  });
}

export async function build(directory = 'dist', env = process.env, fetchImpl = fetch) {
  const strict = env.REQUIRE_PUBLIC_CONFIG === '1';
  const site = origin(env.SITE_URL), base = origin(env.DOWNLOAD_BASE_URL || DEFAULT_DOWNLOAD_BASE_URL), ios = iosURL(env.IOS_APP_URL);
  if (strict && !site) throw Error('SITE_URL is required for deployment');
  const releases = Object.fromEntries(await Promise.all(Object.keys(PRODUCTS).map(async product => [product, await fetchReleases(base, product, fetchImpl)])));
  const errors = Object.values(releases).map(r => r.error).filter(Boolean);
  // A deploy with an unreachable R2 would replace live download links with "unavailable"; fail and keep the old site.
  if (strict && errors.length) throw Error(`Could not read release manifests: ${errors.join('; ')}`);

  rmSync(directory, { recursive: true, force: true });
  cpSync('public', directory, { recursive: true });
  const shell = readFileSync('src/shell.html', 'utf8');
  const context = { releases, base, ios };
  for (const [slug, title, description] of pages) {
    const path = slug === '404' ? '/404.html' : slug ? `/${slug}/` : '/';
    const body = render(readFileSync(`src/${slug || 'home'}.html`, 'utf8'), context);
    const html = shell.replaceAll('{{TITLE}}', slug ? `${title} · MOB` : `MOB · ${title}`).replaceAll('{{DESCRIPTION}}', description)
      .replace('{{CANONICAL}}', site ? `<link rel="canonical" href="${site}${path}"><meta property="og:url" content="${site}${path}">` : '')
      .replace('{{OG_IMAGE}}', site ? `<meta property="og:image" content="${site}/assets/social.png">` : '')
      .replace('{{BODY}}', () => body).replace('{{PAGE}}', slug || 'home');
    const target = slug === '404' || !slug ? directory : `${directory}/${slug}`;
    mkdirSync(target, { recursive: true });
    writeFileSync(`${target}/${slug === '404' ? '404' : 'index'}.html`, html);
  }
  writeFileSync(`${directory}/.nojekyll`, '');
  writeFileSync(`${directory}/robots.txt`, site ? `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  if (site) writeFileSync(`${directory}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(([slug]) => slug !== '404').map(([slug]) => `<url><loc>${site}/${slug ? `${slug}/` : ''}</loc></url>`).join('')}</urlset>`);
  return { site, base, releases, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { base, releases, errors } = await build();
  const summary = Object.entries(releases).map(([product, r]) => `${product} ${r.releases[0] ? `v${r.releases[0].version}` : r.error ? 'unavailable' : 'unreleased'}`).join(', ');
  console.log(`Built MOB site → dist (${base}: ${summary})`);
  for (const error of errors) console.warn(`Warning: ${error}`);
}
