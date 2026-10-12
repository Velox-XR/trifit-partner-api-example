import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { buildPublicDownload, publicFiles } from '../src/downloads.mjs';
import { createDemoHandler, startDemoServer } from '../src/demo-server.mjs';

function entries(bytes) {
  const result = new Map(); let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString();
    const start = offset + 30 + nameLength + extra;
    result.set(name, bytes.subarray(start, start + size)); offset = start + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  return result;
}

test('public ZIP is deterministic and every file matches allowlisted GitHub source with LF line endings', async () => {
  const first = await buildPublicDownload(), second = await buildPublicDownload();
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.sha256, createHash('sha256').update(first.bytes).digest('hex'));
  const files = entries(first.bytes); assert.equal(files.size, publicFiles.length);
  for (const name of publicFiles) assert.equal(files.get(name).toString(), (await readFile(new URL('../' + name, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), name);
  assert(!files.has('partner.config.json')); assert(![...files.keys()].some(name => name.startsWith('.demo-state/') || name.startsWith('uploads/')));
  const config = JSON.parse(files.get('partner.config.example.json'));
  assert.equal(config.clientId, 'demo'); assert.match(config.applicationKey, /INVALID/); assert.equal(config.allowRealGeneration, false);
  assert.equal(JSON.parse(files.get('sdks/javascript/package.json')).license, 'MIT');
});

test('mounted demo and dashboard serve same SDK ZIP without credentials or operator routes', async t => {
  const host = await startDemoServer({ port: 0, prefix: '/partners/demo' }); t.after(host.close);
  const root = host.origin + '/partners/demo';
  for (const page of ['demo', 'admin']) {
    const response = await fetch(root + '/' + page); assert.equal(response.status, 200);
    const html = await response.text(); assert.match(html, /GitHub/); assert.match(html, /\.\/style.css/); assert.doesNotMatch(html, /va_/);
  }
  assert.equal((await fetch(host.origin + '/partners/another-partner/admin')).status, 404);
  const download = await fetch(root + '/downloads/javascript.zip'); assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), (await buildPublicDownload()).bytes);
  const response = await fetch(root + '/api/session'), cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await response.json()).configured, false);
  const options = { headers: { Cookie: cookie } };
  assert.deepEqual(await (await fetch(root + '/api/requests', options)).json(), { requests: [] });
  for (const path of ['api/keys', 'api/traffic', 'partner.config.json']) assert.notEqual((await fetch(root + '/' + path, options)).status, 200);
});

test('dashboard history belongs to a signed visitor; tampering and other visitors cannot read it', async t => {
  const records = new Map();
  const queue = { entries: records, view: (id, owner) => { assert.equal(records.get(id).owner, owner); return { id, status: 'queued' }; }, accept: async entry => { records.set(entry.id, { ...entry, createdAt: Date.now() }); return { id: entry.id, status: 'queued' }; } };
  const host = await startDemoServer({ port: 0, queue, apiFor: () => ({}), sessionSecret: 'private-session-key-for-tests-only-123456' }); t.after(host.close);
  const session = async () => (await fetch(host.origin + '/api/session')).headers.get('set-cookie').split(';')[0];
  const a = await session(), b = await session(), id = randomUUID();
  const input = { type: 'image/png', base64: 'dGVzdA==' };
  const response = await fetch(host.origin + '/api/requests', { method: 'POST', headers: { Cookie: a, Origin: host.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, consent: true, product: input, personal: input }) });
  assert.equal(response.status, 202);
  const list = async cookie => fetch(host.origin + '/api/requests', { headers: { Cookie: cookie } });
  assert.equal((await (await list(a)).json()).requests[0].id, id);
  assert.deepEqual((await (await list(b)).json()).requests, []);
  assert.equal((await list(a.slice(0, -1) + (a.endsWith('a') ? 'b' : 'a'))).status, 401);
  assert.equal((await list('velox_demo_session=' + 'a'.repeat(64))).status, 401);
});

test('HTTPS mounted handler issues Secure path-scoped cookies and no shared API credentials', async () => {
  const handler = await createDemoHandler({ getOrigin: () => 'https://studio.v3lox.com', prefix: '/partners/demo', sessionSecret: 'private-test-signing-secret-at-least-32-chars' });
  const headers = {}; let status, body;
  await handler({ method: 'GET', url: '/api/session', originalUrl: '/partners/demo/api/session', headers: { host: 'studio.v3lox.com' } }, {
    setHeader: (k, v) => { headers[k] = v; }, writeHead: code => { status = code; }, end: value => { body = value; }
  });
  assert.equal(status, 200); assert.match(headers['Set-Cookie'], /Path=\/partners\/demo; HttpOnly; SameSite=Strict; Max-Age=172800; Secure/);
  assert.doesNotMatch(body, /private-test|applicationKey/);
});
