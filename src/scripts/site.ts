// Progressive enhancement only: every page and download link works without JavaScript.
const root = document.documentElement;
root.classList.add('js');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = (el: Element, fn: () => void, margin = '0px 0px -20% 0px') => {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
};

// Headlines arrive word by word, like a model's reply.
for (const el of document.querySelectorAll<HTMLElement>('[data-stream]')) {
  let i = 0;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of (child.textContent ?? '').split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(part); continue; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          w.style.transitionDelay = `${i++ * 70}ms`;
          frag.append(w);
        }
        child.replaceWith(frag);
      } else walk(child);
    }
  };
  walk(el);
  seen(el, () => el.classList.add('on'));
}

// Tool calls: spinners turn into results one after another.
for (const list of document.querySelectorAll<HTMLElement>('[data-steps]')) {
  const steps = [...list.querySelectorAll<HTMLElement>('.step')];
  seen(list, () => steps.forEach((s, n) => {
    if (s.dataset.hold !== undefined) return;
    setTimeout(() => s.setAttribute(s.dataset.result === 'fail' ? 'data-fail' : 'data-done', ''), still ? 0 : 500 + n * 650);
  }));
}

// The screen's readout, its glow and the phone follow the hour on screen.
const readTime = document.querySelector('[data-read-time]');
const readTurn = document.querySelector('[data-read-turn]');
const readPlace = document.querySelector('[data-read-place]');
const phones = [...document.querySelectorAll<HTMLElement>('[data-phone]')];
const hours = [...document.querySelectorAll<HTMLElement>('[data-hour]')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const h = (e.target as HTMLElement).dataset;
      if (readTime) readTime.textContent = h.time ?? '';
      if (readTurn) readTurn.textContent = h.turn ?? '';
      if (readPlace) readPlace.textContent = h.place ?? '';
      if (h.glow) root.style.setProperty('--glow', h.glow);
      for (const p of phones) p.classList.toggle('on', p.dataset.phone === h.hour);
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  for (const h of hours) io.observe(h);
}

// Answering the question on the phone lets the agent carry on.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-answer]')) {
  button.addEventListener('click', () => {
    for (const box of document.querySelectorAll<HTMLElement>('[data-question]')) box.hidden = true;
    for (const box of document.querySelectorAll<HTMLElement>('[data-answered]')) {
      box.hidden = false;
      box.querySelector('b')!.textContent = button.dataset.answer!;
    }
    const wait = document.querySelector<HTMLElement>('[data-waiting]');
    if (wait) { wait.removeAttribute('data-hold'); wait.setAttribute('data-done', ''); wait.querySelector('span')!.textContent = `Answered: ${button.dataset.answer}`; }
    const deploy = document.querySelector<HTMLElement>('[data-after-answer]');
    if (deploy) { deploy.hidden = false; setTimeout(() => deploy.setAttribute('data-done', ''), still ? 0 : 900); }
  });
}

// Copy buttons
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const source = button.parentElement?.querySelector('[data-copy-source]');
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(source?.textContent?.trim() ?? ''); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select to copy'; }
    setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  });
}

// Put the display to sleep, and wake it.
document.querySelector('[data-sleep]')?.addEventListener('click', () => document.body.classList.add('asleep'));
document.querySelector('[data-wake]')?.addEventListener('click', () => document.body.classList.remove('asleep'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('asleep'); });

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

// Get started was one long page; its old anchors now live on their own pages.
const moved: Record<string, string> = {
  requirements: '/start/', install: '/install/macos/', config: '/configure/', permissions: '/install/macos/#permissions',
  run: '/install/macos/#start', connect: '/pair/', remote: '/remote/', cloudflare: '/remote/#cloudflare',
  upgrade: '/install/macos/#upgrade', commands: '/commands/', faq: '/faq/', report: '/faq/#report',
};
if (location.pathname === '/start/' && moved[location.hash.slice(1)] && moved[location.hash.slice(1)] !== '/start/') {
  location.replace(moved[location.hash.slice(1)]);
}

// Docs: the sidebar follows the section in view (this page's #section links only).
const docLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-doc-nav] a')]
  .filter(link => link.hash && link.pathname === location.pathname);
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
