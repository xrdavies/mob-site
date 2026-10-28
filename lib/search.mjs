// The site search's index: every section of the built pages (its heading, its text, a link to it),
// written to /search.json after the build. Pages without sections are one entry.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const strip = html => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e])
  .replace(/\s+/g, ' ')
  .trim();

export function sections(html, url) {
  const main = html.match(/<article[^>]*>([\s\S]*?)<\/article>\s*<\/div>\s*<\/main>/)?.[1] ?? html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  // The page's name from its <title> ("Install on Linux · Mob"), not its headline.
  const page = strip(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').replace(/ · Mob$/, '');
  const out = [];
  for (const m of main.matchAll(/<section id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const title = strip(m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '');
    if (title) out.push({ url: `${url}#${m[1]}`, page, title, text: strip(m[2].replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '')).slice(0, 4000) });
  }
  if (!out.length && page) out.push({ url, page, title: page, text: strip(main.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '')).slice(0, 4000) });
  return out;
}

/** Astro integration: indexes the built pages listed in `paths`. */
export function searchIndex(paths) {
  return {
    name: 'mob-search',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir);
        const entries = paths.flatMap(p => sections(readFileSync(join(root, p, 'index.html'), 'utf8'), p));
        writeFileSync(join(root, 'search.json'), JSON.stringify(entries));
      },
    },
  };
}
