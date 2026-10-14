import { fetchReleases } from './releases.js';

const page = document.body.dataset.page;
for (const link of document.querySelectorAll('.site-header a')) {
  if (new URL(link.href).pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
}

function notice(text) {
  const element = document.querySelector('[data-download-notice]');
  if (element) element.textContent = text;
}

function empty(product, text) {
  const status = document.querySelector(`[data-status="${product}"]`);
  const history = document.querySelector(`[data-releases="${product}"]`);
  if (status) status.textContent = text;
  if (history) {
    const p = document.createElement('p'); p.className = 'empty-release'; p.textContent = text; history.replaceChildren(p);
  }
}

function showDownload(product, release, base) {
  document.querySelector(`[data-status="${product}"]`).textContent = `v${release.version} · ${new Date(release.date).toLocaleDateString('zh-CN')}`;
  const link = document.querySelector(`[data-download="${product}"]`);
  link.href = release.url; link.removeAttribute('aria-disabled');
  const checksum = document.querySelector(`[data-checksum="${product}"]`);
  checksum.href = release.checksums; checksum.hidden = false;
  if (product === 'mobd') {
    const command = `curl -fsSL ${base}/mobd/install.sh | sh`;
    document.querySelector('[data-install-command]').textContent = command;
    const button = document.querySelector('[data-copy]'); button.disabled = false;
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(command); button.textContent = '已复制'; }
      catch { notice('请选中安装命令，手动复制到办公室 Mac 的终端。'); }
    });
  }
}

function showHistory(product, releases) {
  const root = document.querySelector(`[data-releases="${product}"]`);
  root.replaceChildren();
  for (const release of releases) {
    const article = document.createElement('article'); article.className = 'release-entry';
    const title = document.createElement('h3'); title.textContent = `v${release.version}`;
    const time = document.createElement('time'); time.dateTime = release.date; time.textContent = new Date(release.date).toLocaleDateString('zh-CN'); title.append(time);
    const notes = document.createElement('pre'); notes.textContent = release.notes || `${product} ${release.version}`;
    const download = document.createElement('a'); download.href = release.url; download.textContent = '下载此版本 ↓';
    const checksums = document.createElement('a'); checksums.href = release.checksums; checksums.textContent = 'SHA-256 ↗';
    article.append(title, notes, download, checksums); root.append(article);
  }
}

async function load() {
  let base;
  try {
    const response = await fetch('/config.json');
    if (!response.ok) throw Error('Missing site configuration');
    base = (await response.json()).downloadBaseURL;
    if (!base) {
      for (const product of ['mob', 'mobd']) empty(product, '首个公开版本准备中');
      notice('下载即将开放。你可以先阅读快速开始指南，了解两端的配置方式。');
      return;
    }
  } catch {
    for (const product of ['mob', 'mobd']) empty(product, '暂时无法获取下载信息，请稍后刷新。');
    return;
  }
  await Promise.all(['mob', 'mobd'].map(async product => {
    try {
      const releases = await fetchReleases(base, product, page === 'changelog');
      if (!releases.length) { empty(product, '尚未发布公开版本'); return; }
      if (page === 'download') showDownload(product, releases[0], base);
      else showHistory(product, releases);
    } catch {
      empty(product, '暂时无法获取版本信息，请稍后刷新。');
      notice('下载服务暂时不可用，请稍后再试。');
    }
  }));
}

if (page === 'download' || page === 'changelog') void load();
