import { createServer } from 'node:http';
import { randomBytes, createHmac, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { QueueError } from './queue.mjs';

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

// Local evaluator host. Public hosting needs a reviewed ingress/authentication/abuse
// boundary and ONE durable dispatcher, not an exposed copy of this local server.
export async function startDemoServer({ queue, apiFor, sessionSecret, port = 5190, gapSeconds = 10 }) {
  let origin;
  const assets = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/app.mjs': ['app.mjs', 'text/javascript; charset=utf-8'],
    '/style.css': ['style.css', 'text/css; charset=utf-8']
  };
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) throw new QueueError('Use the local demo origin.', 403);
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'GET' && assets[path]) {
        const [file, type] = assets[path];
        res.writeHead(200, { 'Content-Type': type });
        res.end(await readFile(new URL(`../web/${file}`, import.meta.url))); return;
      }
      let cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('demo_session='))?.slice(13);
      const validCookie = /^[a-f0-9]{64}$/.test(cookie || '');
      if (req.method === 'GET' && path === '/api/session') {
        if (!validCookie) {
          cookie = randomBytes(32).toString('hex');
          res.setHeader('Set-Cookie', `demo_session=${cookie}; Path=/; HttpOnly; SameSite=Strict`);
        }
        return send(200, { configured: Boolean(queue), gapSeconds, mode: queue ? 'real' : 'preview' });
      }
      if (!queue) throw new QueueError('Preview only. Velox-issued demo configuration is required for real generation.', 503);
      if (!validCookie) throw new QueueError('Open the demo first.', 401);
      const owner = `demo_${createHmac('sha256', sessionSecret).update(cookie).digest('hex')}`;
      const api = apiFor(owner);
      if (req.method === 'POST' && path === '/api/requests') {
        if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) throw new QueueError('Same-origin JSON requests only.', 403);
        const data = await body(req);
        if (!uuid.test(data.id || '') || data.consent !== true) throw new QueueError('A request ID and image permission are required.', 400);
        const product = image(data.product); const personal = image(data.personal);
        const fingerprint = createHash('sha256').update(JSON.stringify([data.product, data.personal])).digest('hex');
        const status = await queue.accept({ id: data.id, owner, fingerprint }, async save => {
          const completedProduct = await api.upload(product, { role: 'product', fileName: 'demo-product', onReserved: id => save('productUploadId', id) });
          await save('productAssetId', completedProduct.id);
          const completedPersonal = await api.upload(personal, { role: 'personal', fileName: 'demo-personal', onReserved: id => save('personalUploadId', id) });
          await save('personalAssetId', completedPersonal.id);
          return { personalAssetId: completedPersonal.id, productAssetId: completedProduct.id };
        });
        return send(202, status);
      }
      const match = path.match(/^\/api\/requests\/([a-f0-9-]+)(\/result)?$/i);
      if (req.method === 'GET' && match) {
        const entry = queue.owned(match[1], owner);
        if (!match[2]) return send(200, queue.view(entry.id, owner));
        if (entry.status !== 'succeeded') throw new QueueError('Result is not ready.');
        const job = await api.request(`/dressme/jobs/${encodeURIComponent(entry.jobId)}`);
        if (job.id !== entry.jobId || job.status !== 'succeeded' || job.simulated === true || !job.result?.url) throw new QueueError('Result could not be confirmed.', 502);
        const url = new URL(job.result.url);
        if (url.protocol !== 'https:' || url.username || url.password) throw new QueueError('Invalid result URL.', 502);
        // Returned only to the owning session, never to other visitors or public logs.
        return send(200, { url: url.href });
      }
      throw new QueueError('Not found.', 404);
    } catch (error) {
      // Do not expose upstream messages, signed URLs, filesystem paths or secrets.
      if (!res.headersSent) send(error instanceof QueueError ? error.status : 503, {
        error: error instanceof QueueError ? error.message : 'Demo temporarily unavailable. Keep your request ID; do not submit again.',
        // QueueError rejections happen before admission. Upload failures after
        // admission instead return their saved upload_failed receipt.
        notAccepted: req.method === 'POST' && error instanceof QueueError
      });
      else res.end();
    }
  });
  server.requestTimeout = 120000; server.headersTimeout = 15000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, close: () => new Promise(resolve => server.close(resolve)) };
}
