import { siteURL } from '../data/site.mjs';

// Without SITE_URL (previews), keep crawlers out.
export const GET = () => new Response(siteURL ? `User-agent: *\nAllow: /\nSitemap: ${siteURL}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
