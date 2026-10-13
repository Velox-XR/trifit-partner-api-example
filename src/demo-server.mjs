import { createServer } from 'node:http';
import { randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { QueueError } from './queue.mjs';
import { buildPublicDownload, repositoryUrl } from './downloads.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const types = new Set(['image/png', 'image/jpeg', 'image/webp']);
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 14 * 1024 * 1024) throw new QueueError('Use two images of at most 5 MiB each.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new QueueError('Invalid request.', 400); }
}
function image(input) {
  if (!types.has(input?.type) || typeof input?.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) throw new QueueError('Use PNG, JPEG or WebP images.', 400);
  const bytes = Buffer.from(input.base64, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new QueueError('Each image must be at most 5 MiB.', 413);
  return new Blob([bytes], { type: input.type });
}

// Shared source for the loopback evaluator and Velox's mounted HTTPS demo.
// The host supplies the exact origin, persistent queue and private credentials.
export async function createDemoHandler({ queue, apiFor, sessionSecret = randomBytes(32).toString('hex'), getOrigin, prefix = '', gapSeconds = 10, now = Date.now }) {
  if (!/^$|^\/[a-z0-9/-]+[a-z0-9]$/.test(prefix) || prefix.includes('//') || typeof getOrigin !== 'function' || sessionSecret.length < 32) throw new Error('Invalid demo host configuration.');
  const download = await buildPublicDownload();
  const sign = value => createHmac('sha256', sessionSecret).update(prefix + ':' + value).digest('hex');
  let uploads = 0, sessionWindow = now(), sessionCount = 0;
  const assets = {
    '/': ['index.html', 'text/html; charset=utf-8'], '/demo': ['index.html', 'text/html; charset=utf-8'],
    '/admin': ['admin.html', 'text/html; charset=utf-8'],
    '/app.mjs': ['app.mjs', 'text/javascript; charset=utf-8'], '/admin.mjs': ['admin.mjs', 'text/javascript; charset=utf-8'],
    '/workspace.mjs': ['workspace.mjs', 'text/javascript; charset=utf-8'],
    '/style.css': ['style.css', 'text/css; charset=utf-8']
  };
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      const origin = getOrigin(), originUrl = new URL(origin), secure = originUrl.protocol === 'https:';
      if ((!secure && !['127.0.0.1', 'localhost', '[::1]'].includes(originUrl.hostname)) || originUrl.origin !== origin) throw new Error('Invalid origin.');
      if (req.headers.host !== originUrl.host || (req.headers.origin && req.headers.origin !== origin)) throw new QueueError('Use the configured demo origin.', 403);
      const pathname = new URL(req.originalUrl || req.url, origin).pathname;
      if (prefix && pathname !== prefix && !pathname.startsWith(prefix + '/')) throw new QueueError('Not found.', 404);
      const path = pathname.slice(prefix.length) || '/';
      if (prefix && path === '/') { res.writeHead(303, { Location: prefix + '/demo' }); res.end(); return; }
      if (req.method === 'GET' && assets[path]) {
        const [file, type] = assets[path], bytes = await readFile(new URL('../web/' + file, import.meta.url));
        res.writeHead(200, { 'Content-Type': type }); res.end(bytes); return;
      }
      if (req.method === 'GET' && path === '/api/sdk') return send(200, { languages: ['javascript', 'typescript'], repositoryUrl, sha256: download.sha256, fileName: download.fileName });
      if (req.method === 'GET' && path === '/downloads/javascript.zip') {
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="' + download.fileName + '"', 'X-Content-SHA256': download.sha256 }); res.end(download.bytes); return;
      }
      const token = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('velox_demo_session='))?.slice('velox_demo_session='.length);
      let nonce, expires;
      if (typeof token === 'string' && /^[a-f0-9]{64}\.\d{13}\.[a-f0-9]{64}$/.test(token)) {
        const [candidate, expiration, signature] = token.split('.');
        if (Number(expiration) > now() && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(candidate + '.' + expiration)))) { nonce = candidate; expires = Number(expiration); }
      }
      if (req.method === 'GET' && path === '/api/session') {
        if (!nonce) {
          if (now() - sessionWindow >= 3600000) { sessionWindow = now(); sessionCount = 0; }
          if (++sessionCount > 500) throw new QueueError('Demo admission is busy. Try later.', 429);
          nonce = randomBytes(32).toString('hex'); expires = now() + 48 * 3600000;
          const value = nonce + '.' + expires;
          res.setHeader('Set-Cookie', 'velox_demo_session=' + value + '.' + sign(value) + '; Path=' + (prefix || '/') + '; HttpOnly; SameSite=Strict; Max-Age=172800' + (secure ? '; Secure' : ''));
        }
        return send(200, { configured: Boolean(queue), gapSeconds, mode: queue ? 'real' : 'preview', clientId: 'demo', expiresAt: new Date(expires).toISOString() });
      }
      if (!nonce) throw new QueueError('Open the demo first.', 401);
      const owner = 'demo_' + createHmac('sha256', sessionSecret).update(nonce).digest('hex');
      if (req.method === 'GET' && path === '/api/requests') {
        const requests = queue ? [...queue.entries.values()].filter(entry => entry.owner === owner).sort((a, b) => b.createdAt - a.createdAt).slice(0, 25).map(entry => ({ ...queue.view(entry.id, owner), createdAt: entry.createdAt })) : [];
        return send(200, { requests });
      }
      if (!queue) throw new QueueError('Preview only. Live generation is not enabled.', 503);
      const api = apiFor(owner);
      if (req.method === 'POST' && path === '/api/requests') {
        if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) throw new QueueError('Same-origin JSON requests only.', 403);
        if (uploads >= 2) throw new QueueError('Uploads are busy. Please try again shortly.', 429);
        uploads++;
        try {
          const data = await body(req);
          if (!uuid.test(data.id || '') || data.consent !== true) throw new QueueError('A request ID and image permission are required.', 400);
          const product = image(data.product), personal = image(data.personal);
          const fingerprint = createHash('sha256').update(JSON.stringify([data.product, data.personal])).digest('hex');
          const status = await queue.accept({ id: data.id, owner, fingerprint }, async save => {
            const completedProduct = await api.upload(product, { role: 'product', fileName: 'demo-product', onReserved: id => save('productUploadId', id) });
            await save('productAssetId', completedProduct.id);
            const completedPersonal = await api.upload(personal, { role: 'personal', fileName: 'demo-personal', onReserved: id => save('personalUploadId', id) });
            await save('personalAssetId', completedPersonal.id);
            return { personalAssetId: completedPersonal.id, productAssetId: completedProduct.id };
          });
          return send(202, status);
        } finally { uploads--; }
      }
      const match = path.match(/^\/api\/requests\/([a-f0-9-]+)(\/result)?$/i);
      if (req.method === 'GET' && match) {
        const entry = queue.owned(match[1], owner);
        if (!match[2]) return send(200, queue.view(entry.id, owner));
        if (entry.status !== 'succeeded') throw new QueueError('Result is not ready.');
        const job = await api.request('/dressme/jobs/' + encodeURIComponent(entry.jobId));
        if (job.id !== entry.jobId || job.status !== 'succeeded' || job.simulated === true || !job.result?.url) throw new QueueError('Result could not be confirmed.', 502);
        const url = new URL(job.result.url);
        if (url.protocol !== 'https:' || url.username || url.password) throw new QueueError('Invalid result URL.', 502);
        return send(200, { url: url.href });
      }
      throw new QueueError('Not found.', 404);
    } catch (error) {
      if (!res.headersSent) send(error instanceof QueueError ? error.status : 503, {
        error: error instanceof QueueError ? error.message : 'Demo temporarily unavailable. Keep your request ID; do not submit again.',
        notAccepted: req.method === 'POST' && error instanceof QueueError
      });
      else res.end();
    }
  };
}

export async function startDemoServer({ queue, apiFor, sessionSecret, port = 5190, gapSeconds = 10, prefix = '' }) {
  let origin;
  const handler = await createDemoHandler({ queue, apiFor, sessionSecret, gapSeconds, prefix, getOrigin: () => origin });
  const server = createServer(handler);
  server.requestTimeout = 120000; server.headersTimeout = 15000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  return { origin, close: () => new Promise(resolve => server.close(resolve)) };
}
