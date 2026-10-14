export function validateRelease(value, product, base) {
  if (!value || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.version ?? '')) throw Error('Invalid release version');
  const prefix = `${base}/${product}/v${value.version}/`;
  const suffix = product === 'mob' ? '.dmg' : '.tar.gz';
  if (value.download?.url !== `${prefix}${product}_${value.version}_darwin_arm64${suffix}` || value.checksums_url !== `${prefix}SHA256SUMS` || !/^[a-f0-9]{64}$/.test(value.download?.sha256 ?? '')) throw Error('Invalid release download');
  if (!Number.isFinite(Date.parse(value.pub_date))) throw Error('Invalid release date');
  return { version: value.version, url: value.download.url, checksums: value.checksums_url, date: value.pub_date, notes: typeof value.notes === 'string' ? value.notes : '' };
}

export async function fetchReleases(base, product, history = false) {
  const response = await fetch(`${base}/${product}/${history ? 'releases' : 'latest'}.json`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (response.status === 404) return [];
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (history && !Array.isArray(data)) throw Error('Invalid release history');
  return (history ? data : [data]).map(item => validateRelease(item, product, base));
}
