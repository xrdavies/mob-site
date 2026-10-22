// Progressive enhancement only: every page and download link works without JavaScript.
const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.getElementById('site-nav');
const setMenu = (open: boolean) => {
  toggle?.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('hidden', !open);
  nav?.classList.toggle('flex', open);
};
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', event => { if ((event.target as Element).closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });

// Copy buttons next to [data-copy-source].
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const source = button.parentElement?.querySelector('[data-copy-source]');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source?.textContent?.trim() ?? '');
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      button.textContent = 'Select and copy';
    }
  });
}

// Tabs (configuration examples).
for (const tabs of document.querySelectorAll('[data-tabs]')) {
  const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (target: HTMLButtonElement) => {
    for (const button of buttons) {
      const selected = button === target;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')!)!.hidden = !selected;
    }
  };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      const step = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[event.key];
      if (!step) return;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      select(next);
      next.focus();
    });
  });
}

// Mark the client that fits this device.
const ua = navigator.userAgent;
const platform = /android/i.test(ua) ? 'android'
  : /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? 'ios'
  : /macintosh|mac os x/i.test(ua) ? 'mac' : '';
if (platform) document.querySelector(`[data-platform="${platform}"]`)?.setAttribute('data-recommended', '');

// Docs: the sidebar follows the section in view.
const docLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-doc-nav] a')];
if (docLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of docLinks) link.toggleAttribute('data-active', link.hash === `#${entry.target.id}`);
    }
  }, { rootMargin: '-15% 0px -75% 0px' });
  for (const link of docLinks) {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  }
}
const mobileToc = document.querySelector<HTMLDetailsElement>('[data-mobile-toc]');
mobileToc?.addEventListener('click', event => { if ((event.target as Element).closest('a')) mobileToc.open = false; });
