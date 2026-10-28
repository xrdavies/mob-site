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

// Search: the index of every docs section is fetched on first use (/search.json, built by lib/search.mjs).
interface Entry { url: string; page: string; title: string; text: string }
const search = document.querySelector<HTMLDialogElement>('[data-search]');
if (search) {
  const input = search.querySelector('input')!;
  const results = search.querySelector<HTMLElement>('[data-search-results]')!;
  let index: Entry[] | null = null;
  const load = async () => (index ??= await fetch('/search.json').then(r => r.json() as Promise<Entry[]>).catch(() => []));
  const open = async () => {
    if (!search.open) search.showModal();
    input.select();
    await load();
    render();
  };
  for (const button of document.querySelectorAll('[data-search-open]')) button.addEventListener('click', () => void open());
  document.addEventListener('keydown', event => {
    const typing = (event.target as Element).closest('input, textarea, [contenteditable]');
    if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      void open();
    }
  });
  search.addEventListener('click', event => { if (event.target === search) search.close(); });
  results.addEventListener('click', event => { if ((event.target as Element).closest('a')) search.close(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      results.querySelector('a')?.click();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      results.querySelector('a')?.focus();
    }
  });
  results.addEventListener('keydown', event => {
    const link = (event.target as Element).closest('a');
    if (!link || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? link.nextElementSibling : link.previousElementSibling;
    (next instanceof HTMLAnchorElement ? next : input).focus();
  });

  // Text with every query word marked, built from nodes (never HTML).
  function marked(text: string, words: string[]): DocumentFragment {
    const out = document.createDocumentFragment();
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    for (const [i, part] of text.split(pattern).entries()) {
      if (!part) continue;
      if (i % 2) { const m = document.createElement('mark'); m.textContent = part; out.append(m); } else out.append(part);
    }
    return out;
  }

  function render() {
    results.replaceChildren();
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const note = (text: string) => { const p = document.createElement('p'); p.className = 'px-3 py-4 text-sm text-zinc-500'; p.textContent = text; results.append(p); };
    if (!index) return note('Loading…');
    if (!words.length) return note('Type to search the docs. Press / or ⌘K to open search anywhere.');
    const found = index
      .map(e => {
        const title = e.title.toLowerCase(), page = e.page.toLowerCase(), text = e.text.toLowerCase();
        if (!words.every(w => title.includes(w) || page.includes(w) || text.includes(w))) return null;
        const score = words.reduce((n, w) => n + (title.includes(w) ? 10 : 0) + (page.includes(w) ? 4 : 0) + text.split(w).length - 1, 0);
        return { e, score };
      })
      .filter((r): r is { e: Entry; score: number } => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    if (!found.length) return note(`Nothing found for “${input.value.trim()}”.`);
    for (const [n, { e }] of found.entries()) {
      const a = document.createElement('a');
      a.href = e.url;
      if (!n) a.dataset.first = '';
      const head = document.createElement('span');
      head.className = 'block text-sm text-zinc-100';
      head.append(`${e.page} › `, marked(e.title, words));
      const at = Math.max(0, e.text.toLowerCase().indexOf(words.find(w => e.text.toLowerCase().includes(w)) ?? '') - 50);
      const snippet = document.createElement('span');
      snippet.className = 'mt-0.5 block truncate text-xs text-zinc-500';
      snippet.append(marked((at ? '…' : '') + e.text.slice(at, at + 160), words));
      a.append(head, snippet);
      results.append(a);
    }
  }
}
