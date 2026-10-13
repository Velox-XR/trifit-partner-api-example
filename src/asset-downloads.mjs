import { createHash } from 'node:crypto';
import { zip } from './downloads.mjs';
import { QueueError } from './queue.mjs';

const maximumBytes = 20 * 1024 * 1024;
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export async function buildAssetDownload({ entries, api, fetchImpl = globalThis.fetch }) {
  if (!entries.length) throw new QueueError('No completed requests to download.', 409);
  if (entries.length > 25) throw new QueueError('Download at most 25 completed requests at a time.', 413);
  const files = [], manifest = { version: 1, requests: [] }, deadline = AbortSignal.timeout(90000); let total = 0;
  for (const entry of entries) {
    if (!/^[a-f0-9-]{36}$/i.test(entry.id) || entry.status !== 'succeeded' || !entry.payload || !entry.jobId) throw new QueueError('Request is not ready.', 409);
    const job = await api.request('/dressme/jobs/' + encodeURIComponent(entry.jobId));
    if (job.id !== entry.jobId || job.status !== 'succeeded' || job.simulated === true || !job.result?.id) throw new QueueError('Result could not be confirmed.', 502);
    const record = { requestId: entry.id, timing: entry.timing || null, files: [] };
    for (const [role, id] of [['shopper', entry.payload.personalAssetId], ['product', entry.payload.productAssetId], ['result', job.result.id]]) {
      // Fresh subject-scoped authorization for every asset, including after page reload.
      const asset = await api.getAsset(id), url = new URL(asset.url || 'https://invalid.invalid');
      const mediaBase = api.baseUrl?.replace(/\/v1\/?$/, '') + '/local/read/';
      if (asset.id !== id || asset.status !== 'ready' || !asset.url || url.protocol !== 'https:' || url.username || url.password
        || !api.baseUrl || !url.href.startsWith(mediaBase)) throw new QueueError('An asset is unavailable or expired. No generation was resubmitted.', 410);
      const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.any([deadline, AbortSignal.timeout(30000)]) });
      const type = response.headers.get('content-type')?.split(';')[0], extension = extensions[type];
      if (!response.ok || !extension || Number(response.headers.get('content-length')) > maximumBytes) throw new QueueError('An asset could not be downloaded.', 502);
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length; total += chunk.length;
        if (size > maximumBytes || total > 100 * 1024 * 1024) throw new QueueError('ZIP exceeds the download safety limit. Download individual requests.', 413);
        chunks.push(chunk);
      }
      if (!size) throw new QueueError('An asset is empty.', 502);
      const bytes = Buffer.concat(chunks), name = entry.id + '/' + role + '.' + extension;
      files.push([name, bytes]); record.files.push({ role, name, bytes: size, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    manifest.requests.push(record);
  }
  // No credentials, capability URLs, visitor identifiers, or other visitors' data.
  files.push(['manifest.json', Buffer.from(JSON.stringify(manifest, null, 2))]);
  return zip(files);
}
