import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function origin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9.-]+$/.test(url.hostname)) throw Error('Use an HTTPS origin without a path, port or credentials');
  if (url.hostname.endsWith('.example.com') || url.hostname === 'example.com') throw Error('Replace the example domain before building');
  return url.origin;
}

const pages = [
  ['', '让办公室的 Mac，成为你的远程 AI 搭档', '把任务交给办公室里的 AI 助手。用 mob 发起任务、查看进度，并实时看见远程桌面。'],
  ['download', '下载 mob 与 mobd', 'macOS Apple Silicon 桌面客户端与办公室端程序。下载、安装与版本信息。'],
  ['start', '从第一台 Mac 开始', '安装 mobd，配置 Agent 和系统权限，再通过 mob 客户端连接办公室。'],
  ['changelog', '每一次，向前一点', 'mob 与 mobd 的公开版本记录和历史下载。'],
  ['404', '这个页面暂时不在这里', '返回 mob 首页，继续了解你的远程 AI 搭档。'],
];

export function build(directory = 'dist', env = process.env) {
  const site = origin(env.SITE_URL), downloads = origin(env.DOWNLOAD_BASE_URL);
  if (env.REQUIRE_PUBLIC_CONFIG === '1' && (!site || !downloads)) throw Error('SITE_URL and DOWNLOAD_BASE_URL are required for deployment');
  rmSync(directory, { recursive: true, force: true });
  cpSync('public', directory, { recursive: true });
  const shell = readFileSync('src/shell.html', 'utf8');
  for (const [slug, title, description] of pages) {
    const path = slug === '404' ? '/404.html' : slug ? `/${slug}/` : '/';
    const body = readFileSync(`src/${slug || 'home'}.html`, 'utf8');
    const html = shell.replaceAll('{{TITLE}}', `${title} · mob`).replaceAll('{{DESCRIPTION}}', description)
      .replace('{{CANONICAL}}', site ? `<link rel="canonical" href="${site}${path}"><meta property="og:url" content="${site}${path}">` : '')
      .replace('{{OG_IMAGE}}', site ? `<meta property="og:image" content="${site}/assets/social.png">` : '')
      .replace('{{BODY}}', body).replace('{{PAGE}}', slug || 'home');
    const target = slug === '404' ? directory : slug ? `${directory}/${slug}` : directory;
    mkdirSync(target, { recursive: true });
    writeFileSync(`${target}/${slug === '404' ? '404' : 'index'}.html`, html);
  }
  writeFileSync(`${directory}/config.json`, JSON.stringify({ downloadBaseURL: downloads }));
  writeFileSync(`${directory}/_headers`, `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'${downloads ? ` ${downloads}` : ''}; object-src 'none'; frame-ancestors 'none'; base-uri 'self'\n/config.json\n  Cache-Control: no-store\n`);
  writeFileSync(`${directory}/robots.txt`, site ? `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  if (site) writeFileSync(`${directory}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(([slug]) => slug !== '404').map(([slug]) => `<url><loc>${site}/${slug ? `${slug}/` : ''}</loc></url>`).join('')}</urlset>`);
  return { site, downloads };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = build();
  console.log(config.downloads ? `Built mob site → dist (${config.downloads})` : 'Built local preview → dist (downloads are not configured)');
}
