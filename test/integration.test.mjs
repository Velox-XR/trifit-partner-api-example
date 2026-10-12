import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { get } from 'node:http';
import { DressMeClient } from '../src/client.mjs';
import { startMockApi, DUMMY, PLACEHOLDER } from '../src/mock-api.mjs';

async function inputs(api) {
  const image = new Blob([PLACEHOLDER], { type: 'image/png' });
  const reserved = [];
  const product = await api.upload(image, { role: 'product', fileName: 'dummy-product.png', onReserved: id => reserved.push(id) });
  const personal = await api.upload(image, { role: 'personal', fileName: 'dummy-person.png', onReserved: id => reserved.push(id) });
  assert.equal(reserved.length, 2);
  return { personalAssetId: personal.id, productAssetId: product.id };
}

test('local flow, storage credential isolation and idempotency', async () => {
  const mock = await startMockApi();
  try {
    const api = new DressMeClient({ baseUrl: mock.baseUrl, ...DUMMY });
    await api.verifyEnvironment('local-mock');
    await assert.rejects(api.verifyEnvironment('production'), /mismatch/);
    const payload = await inputs(api); const key = randomUUID();
    const job = await api.createJob(payload, key);
    assert.equal((await api.createJob(payload, key)).id, job.id);
    assert.equal(mock.jobs.size, 1);
    await assert.rejects(api.createJob({ ...payload, productAssetId: randomUUID() }, key), error => error.status === 409);
    const states = [];
    const done = await api.waitForJob(job.id, { intervalMs: 10, onStatus: s => states.push(s) });
    assert.deepEqual(states, ['running', 'succeeded']);
    assert.equal(done.simulated, true);
    assert.deepEqual(Buffer.from(await (await fetch(done.result.url)).arrayBuffer()), PLACEHOLDER);
    for (const h of mock.receivedStorageHeaders) for (const name of ['x-velox-integration-key', 'x-velox-client-id', 'x-velox-subject', 'authorization']) assert.equal(h[name], undefined);
  } finally { await mock.close(); }
});

test('terminal failure is surfaced without another job', async () => {
  const mock = await startMockApi({ failure: true });
  try {
    const api = new DressMeClient({ baseUrl: mock.baseUrl, ...DUMMY });
    const job = await api.createJob(await inputs(api), randomUUID());
    await assert.rejects(api.waitForJob(job.id, { intervalMs: 10 }), e => e.code === 'generation_failed');
    assert.equal(mock.jobs.size, 1);
  } finally { await mock.close(); }
});

test('invalid credentials, browser origins and public Host are rejected by mock', async () => {
  const mock = await startMockApi();
  try {
    const api = new DressMeClient({ baseUrl: mock.baseUrl, ...DUMMY, applicationKey: 'va_BAD_DUMMY' });
    await assert.rejects(api.verifyEnvironment('local-mock'), e => e.status === 401);
    assert.equal((await fetch(`${mock.baseUrl}/me`, { headers: { Origin: 'https://example.com' } })).status, 403);
    // Node fetch normalizes Host; use an HTTP request to exercise the server's Host guard.
    const status = await new Promise((resolve, reject) => {
      get(`${mock.baseUrl}/me`, { headers: { Host: 'example.com' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(status, 403);
  } finally { await mock.close(); }
});

test('client refuses unsafe setup and missing submission identity', () => {
  for (const baseUrl of ['http://example.com/v1', 'https://user:pass@example.com/v1', 'https://example.com/v1?key=x']) assert.throws(() => new DressMeClient({ baseUrl, ...DUMMY }));
  assert.throws(() => new DressMeClient({ baseUrl: 'https://example.com/v1', ...DUMMY, subject: 'person@example.com' }));
  const api = new DressMeClient({ baseUrl: 'https://example.com/v1', ...DUMMY });
  assert.throws(() => api.createJob({}, ''), /idempotency/);
});

test('429 metadata is surfaced; network uncertainty is never automatically replayed', async () => {
  let calls = 0;
  const api = new DressMeClient({ baseUrl: 'https://example.com/v1', ...DUMMY, fetch: async () => { calls++; return new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'Wait.' } }), { status: 429, headers: { 'retry-after': '10', 'x-request-id': 'dummy-request' } }); } });
  await assert.rejects(api.createJob({}, randomUUID()), e => e.status === 429 && e.retryAfter === '10' && e.requestId === 'dummy-request');
  assert.equal(calls, 1);
  api.fetch = async () => { calls++; throw new TypeError('Network failure'); };
  await assert.rejects(api.createJob({}, randomUUID()), /Network failure/);
  assert.equal(calls, 2);
});

test('polling has a deadline and never submits', async () => {
  let calls = 0;
  const api = new DressMeClient({ baseUrl: 'https://example.com/v1', ...DUMMY, fetch: async (_url, options) => { calls++; assert.equal(options.method, 'GET'); return Response.json({ status: 'running' }); } });
  await assert.rejects(api.waitForJob('dummy-job', { timeoutMs: 40, intervalMs: 10 }), e => e.name === 'TimeoutError');
  assert.ok(calls >= 1);
});
