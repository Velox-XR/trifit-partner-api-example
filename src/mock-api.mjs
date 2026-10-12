// Teaching fixture only. Not a cloud API, an authentication system or a production server.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const DUMMY = Object.freeze({ clientId: 'example-partner', applicationKey: 'va_DUMMY_NOT_A_REAL_KEY', subject: 'example-shopper-001' });
// A one-pixel PNG, not a person, garment or generated try-on.
export const PLACEHOLDER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

async function bytes(req) {
  const parts = []; let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 5 * 1024 * 1024) throw new Error('Request too large.');
    parts.push(part);
  }
  return Buffer.concat(parts);
}

export async function startMockApi({ failure = false } = {}) {
  const assets = new Map(); const jobs = new Map(); const idempotency = new Map();
  const receivedStorageHeaders = [];
  let origin;
  const server = createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-Id': randomUUID() }); res.end(JSON.stringify(data)); };
    const fail = (status, code, message) => send(status, { error: { code, message } });
    try {
      if (req.headers.host !== new URL(origin).host || req.headers.origin) return fail(403, 'local_only', 'This fixture accepts only the local backend example.');
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'PUT' && path.startsWith('/upload/')) {
        if (req.headers['x-velox-integration-key'] || req.headers.authorization || req.headers['x-velox-subject'] || req.headers['x-velox-client-id']) return fail(400, 'credential_leak', 'Do not send API credentials to storage.');
        const asset = assets.get(path.slice('/upload/'.length));
        if (!asset) return fail(404, 'not_found', 'Upload missing.');
        receivedStorageHeaders.push(req.headers);
        const data = await bytes(req);
        if (data.length !== asset.sizeBytes) return fail(400, 'size_mismatch', 'Size mismatch.');
        asset.uploaded = true;
        res.writeHead(200); res.end(); return;
      }
      if (req.method === 'GET' && path === '/result.png') {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }); res.end(PLACEHOLDER); return;
      }
      if (req.headers['x-velox-client-id'] !== DUMMY.clientId || req.headers['x-velox-integration-key'] !== DUMMY.applicationKey || req.headers['x-velox-subject'] !== DUMMY.subject) return fail(401, 'unauthorized', 'Use the dummy example credentials.');
      if (req.method === 'GET' && path === '/v1/me') return send(200, { kind: 'application', clientId: DUMMY.clientId, environment: 'local-mock' });
      if (req.method === 'POST' && path === '/v1/assets/upload-url') {
        const body = JSON.parse((await bytes(req)).toString());
        if (!['personal', 'product'].includes(body.role)) return fail(400, 'invalid_role', 'Invalid asset role.');
        const id = randomUUID();
        assets.set(id, { id, ...body, status: 'uploading' });
        return send(201, { assetId: id, uploadUrl: `${origin}/upload/${id}`, uploadHeaders: { 'Content-Type': body.contentType } });
      }
      const complete = path.match(/^\/v1\/assets\/([^/]+)\/complete$/);
      if (req.method === 'POST' && complete) {
        const asset = assets.get(complete[1]);
        if (!asset?.uploaded) return fail(409, 'not_uploaded', 'Complete the byte upload first.');
        asset.status = 'ready'; return send(200, { id: asset.id, role: asset.role, status: asset.status });
      }
      if (req.method === 'POST' && path === '/v1/dressme/jobs') {
        const body = JSON.parse((await bytes(req)).toString());
        const key = req.headers['idempotency-key'];
        if (!key) return fail(400, 'idempotency_required', 'Idempotency key required.');
        const fingerprint = JSON.stringify(body);
        const previous = idempotency.get(key);
        if (previous) return previous.fingerprint === fingerprint ? send(200, jobs.get(previous.id)) : fail(409, 'idempotency_conflict', 'Reuse the same key only with the same payload.');
        if (assets.get(body.personalAssetId)?.role !== 'personal' || assets.get(body.productAssetId)?.role !== 'product' || [body.personalAssetId, body.productAssetId].some(id => assets.get(id)?.status !== 'ready')) return fail(400, 'asset_not_ready', 'Ready personal and product assets are required.');
        const job = { id: randomUUID(), kind: 'dressme', status: 'queued', simulated: true, environment: 'local-mock' };
        jobs.set(job.id, job); idempotency.set(key, { id: job.id, fingerprint });
        return send(202, job);
      }
      const read = path.match(/^\/v1\/dressme\/jobs\/([^/]+)$/);
      if (req.method === 'GET' && read) {
        const job = jobs.get(read[1]);
        if (!job) return fail(404, 'not_found', 'Job missing.');
        if (job.status === 'queued') job.status = 'running';
        else if (job.status === 'running') {
          job.status = failure ? 'failed' : 'succeeded';
          if (failure) job.error = { code: 'generation_failed', message: 'Simulated failure. No generation was submitted.' };
          else job.result = { id: randomUUID(), role: 'result', contentType: 'image/png', url: `${origin}/result.png`, expiresAt: new Date(Date.now() + 60000).toISOString() };
        }
        return send(200, job);
      }
      return fail(404, 'not_found', 'Endpoint not implemented by this small mock.');
    } catch { if (!res.headersSent) fail(400, 'invalid_request', 'Invalid example request.'); else res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl: `${origin}/v1`, jobs, receivedStorageHeaders, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
