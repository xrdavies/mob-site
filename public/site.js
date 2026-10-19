// Progressive enhancement only: every page and download link works without JavaScript.
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

for (const link of nav.querySelectorAll('a')) {
  if (!link.hash && new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
  link.addEventListener('click', () => setMenu(false));
}

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.sr-only').textContent = open ? '关闭菜单' : '打开菜单';
  nav.classList.toggle('open', open);
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });

const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Copy buttons: explicit [data-copy] next to [data-copy-source], plus one per guide code block.
async function copy(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = '已复制';
    button.classList.add('copied');
    setTimeout(() => { button.textContent = '复制'; button.classList.remove('copied'); }, 1800);
  } catch {
    button.textContent = '请手动复制';
  }
}
for (const button of document.querySelectorAll('[data-copy]')) {
  const source = button.parentElement.querySelector('[data-copy-source]');
  button.addEventListener('click', () => copy(button, source.textContent.trim()));
}
for (const pre of document.querySelectorAll('.guide-content pre')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-button';
  button.textContent = '复制';
  button.setAttribute('aria-label', '复制代码');
  // Copy commands without trailing "# comment" annotations.
  button.addEventListener('click', () => copy(button, pre.querySelector('code').textContent.replace(/[ \t]+#.*$/gm, '').trim()));
  pre.append(button);
}

// Tabs (configuration examples).
for (const tabs of document.querySelectorAll('[data-tabs]')) {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  const select = target => {
    for (const button of buttons) {
      const selected = button === target;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    }
  };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      select(next);
      next.focus();
    });
  });
}

// Highlight the download that fits this device.
const ua = navigator.userAgent;
const platform = /android/i.test(ua) ? 'android'
  : /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? 'ios'
  : /macintosh|mac os x/i.test(ua) ? 'mac' : /windows/i.test(ua) ? 'windows' : /linux|x11/i.test(ua) ? 'linux' : '';
document.querySelector(`[data-platform="${platform}"]`)?.classList.add('is-recommended');

// Seamless marquee: the track scrolls by half its width.
const track = document.querySelector('.marquee-track');
if (track) {
  for (const item of [...track.children]) {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.append(clone);
  }
}

// Guide table of contents follows the section in view.
const guideLinks = [...document.querySelectorAll('.guide-nav a')];
if (guideLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of guideLinks) link.classList.toggle('active', link.hash === `#${entry.target.id}`);
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  for (const link of guideLinks) {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  }
}

// Gentle reveal on scroll for large blocks.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const element of document.querySelectorAll('.feature, .app-demo, .phone-stage, .connection, .terminal, .download-card, .requirements > div, .release-entry')) {
    element.classList.add('reveal');
    observer.observe(element);
  }
}
