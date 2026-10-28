import { siteURL } from '../data/site.mjs';
import { DOC_PATHS } from '../data/docs.mjs';

export const PAGES = ['/', '/download/', ...DOC_PATHS, '/privacy/'];

export const GET = () => new Response(siteURL
  ? `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${PAGES.map(p => `<url><loc>${siteURL}${p}</loc></url>`).join('')}</urlset>`
  : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
