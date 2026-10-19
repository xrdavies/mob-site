// Release manifests are published to R2 by the mob, mobd and mob-android repositories.
// The site reads them at build time, so the browser never needs CORS access to R2.
export const PRODUCTS = {
  mob: { file: v => `mob_${v}_darwin_arm64.dmg` },
  mobd: { file: v => `mobd_${v}_darwin_arm64.tar.gz` },
  android: { file: v => `mob-android_${v}.apk` },
};

export function validateRelease(value, product, base) {
  if (!value || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.version ?? '')) throw Error('Invalid release version');
  const prefix = `${base}/${product}/v${value.version}/`;
  if (value.download?.url !== prefix + PRODUCTS[product].file(value.version) || value.checksums_url !== `${prefix}SHA256SUMS` || !/^[a-f0-9]{64}$/.test(value.download?.sha256 ?? '')) throw Error('Invalid release download');
  if (!Number.isFinite(Date.parse(value.pub_date))) throw Error('Invalid release date');
  // mob also ships Windows and Linux files (`downloads`, from 0.3); only files under this release are kept.
  const files = {};
  for (const [key, list] of Object.entries(value.downloads ?? {})) {
    if (!/^[a-z0-9-]+$/.test(key) || !Array.isArray(list)) continue;
    const valid = list.filter(f => typeof f?.url === 'string' && f.url.startsWith(prefix) && /^[\w.-]+$/.test(f.url.slice(prefix.length)) && /^[a-f0-9]{64}$/.test(f.sha256 ?? ''));
    if (valid.length) files[key] = valid.map(f => ({ url: f.url, sha256: f.sha256 }));
  }
  return {
    version: value.version, url: value.download.url, sha256: value.download.sha256, checksums: value.checksums_url,
    date: value.pub_date, notes: typeof value.notes === 'string' ? value.notes : '', files,
  };
}

// Returns { releases } newest first, [] before the first release, or { error } when R2 is unreachable.
export async function fetchReleases(base, product, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${base}/${product}/releases.json`, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404) return { releases: [] };
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw Error('Invalid release history');
    const releases = [];
    for (const item of data) {
      try { releases.push(validateRelease(item, product, base)); }
      catch (error) { console.warn(`Skipping ${product} ${item?.version ?? '?'}: ${error.message}`); }
    }
    return { releases };
  } catch (error) {
    return { releases: [], error: `${product}: ${error.message}` };
  }
}
