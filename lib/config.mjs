// Build-time configuration and small renderers shared by the Astro pages and the tests.
export const DEFAULT_DOWNLOAD_BASE_URL = 'https://dl.mymob.dev';

export function origin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9.-]+$/.test(url.hostname)) throw Error('Use an HTTPS origin without a path, port or credentials');
  if (url.hostname.endsWith('.example.com') || url.hostname === 'example.com') throw Error('Replace the example domain before building');
  return url.origin;
}

// Optional App Store link (a TestFlight invitation also works and is named as such).
export function iosURL(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['apps.apple.com', 'testflight.apple.com'].includes(url.hostname)) throw Error('IOS_APP_URL must be an apps.apple.com or testflight.apple.com link');
  return url.href;
}

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const formatDate = value => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));

// Release notes are plain text with light Markdown from GitHub; render bold, links and line breaks only.
export function renderNotes(text) {
  return escape(text.trim())
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/https:\/\/[^\s<]+/g, url => `<a href="${url}" rel="noreferrer">${url.replace(/^https:\/\//, '')}</a>`)
    .replace(/\n/g, '<br>');
}
