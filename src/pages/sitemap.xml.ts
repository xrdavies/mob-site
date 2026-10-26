import { siteURL } from '../data/site.mjs';

export const PAGES = ['/', '/download/', '/start/', '/remote/', '/privacy/'];

export const GET = () => new Response(siteURL
  ? `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${PAGES.map(p => `<url><loc>${siteURL}${p}</loc></url>`).join('')}</urlset>`
  : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
