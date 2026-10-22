import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { origin } from './lib/config.mjs';

// Static site for GitHub Pages. SITE_URL enables canonical links and the sitemap.
export default defineConfig({
  site: origin(process.env.SITE_URL) || undefined,
  integrations: [tailwind({ applyBaseStyles: false })],
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  build: { format: 'directory', inlineStylesheets: 'never' },
  // The CSP allows only same-origin scripts and styles: nothing may be inlined.
  vite: { build: { assetsInlineLimit: 0 } },
});
