import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DemoQueue } from '../src/queue.mjs';
import { verifyWebhook } from '../src/webhooks.mjs';
import { startDemoServer } from '../src/demo-server.mjs';
import { buildAssetDownload } from '../src/asset-downloads.mjs';
import { durationText } from '../web/workspace.mjs';

const webhook = { endpointId: 'callback-fixture', keyId: 'fixture-key', secret: 'fixture-signing-secret-at-least-32-characters', environment: 'development', recoveryAfterMs: 600000 };
function signed(event, time) {
  const bytes = Buffer.from(JSON.stringify(event)), timestamp = String(Math.floor(time / 1000));
  return { bytes, headers: { 'x-velox-timestamp': timestamp, 'x-velox-key-id': webhook.keyId, 'x-velox-event-id': event.eventId,
    'x-velox-signature': 'v1=' + createHmac('sha256', webhook.secret).update(timestamp + '.').update(bytes).digest('hex') } };
}
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'velox-webhook-test-'));
  let time = 1791900000000, posts = 0, reads = 0, failRead = false;
  const jobId = randomUUID();
  const api = { baseUrl: 'https://media.example/v1', createJob: async payload => { posts++; assert.equal(payload.notificationEndpointId, webhook.endpointId); return { id: jobId }; },
    request: async () => { reads++; if (failRead) throw Error('temporary'); return { id: jobId, status: 'succeeded', result: { id: 'result' } }; },
    getAsset: async id => ({ id, status: 'ready', url: 'https://media.example/local/read/' + id }) };
  const options = { directory, binding: 'fixture-only', now: () => time, webhook, apiFor: () => api };
  let queue = await DemoQueue.open(options);
  t.after(async () => { await queue.close(); await rm(directory, { recursive: true, force: true }); });
  return { get queue() { return queue; }, api, jobId, now: () => time, advance: n => { time += n; }, get posts() { return posts; }, get reads() { return reads; }, failRead: v => { failRead = v; },
    restart: async () => { await queue.close(); queue = await DemoQueue.open(options); } };
}
async function accept(f, owner = 'visitor') {
  const id = randomUUID(); await f.queue.accept({ id, owner, fingerprint: 'fixture' }, async () => ({ personalAssetId: 'shopper', productAssetId: 'product' })); await f.queue.tick(); return id;
}
const eventFor = (f, id) => ({ eventId: randomUUID(), jobId: f.jobId, type: 'dressme.succeeded', status: 'succeeded', environment: 'development', context: { requestId: id } });

test('raw body signature, key, event ID, freshness, type and environment fail closed', () => {
  const time = 1791900000000, event = { eventId: randomUUID(), jobId: randomUUID(), type: 'dressme.succeeded', status: 'succeeded', environment: 'development' };
  const { bytes, headers } = signed(event, time);
  assert.equal(verifyWebhook(bytes, headers, webhook, time).jobId, event.jobId);
  for (const patch of [{ 'x-velox-key-id': 'wrong' }, { 'x-velox-event-id': randomUUID() }, { 'x-velox-signature': 'v1=' + '0'.repeat(64) }]) assert.throws(() => verifyWebhook(bytes, { ...headers, ...patch }, webhook, time));
  assert.throws(() => verifyWebhook(Buffer.concat([bytes, Buffer.from(' ')]), headers, webhook, time));
  assert.throws(() => verifyWebhook(bytes, headers, webhook, time + 301000));
  for (const patch of [{ environment: 'production' }, { type: 'animateme.succeeded' }, { status: 'running' }]) {
    const invalid = signed({ ...event, ...patch }, time); assert.throws(() => verifyWebhook(invalid.bytes, invalid.headers, webhook, time));
  }
});

test('webhook-first makes no upstream polls until callback; persists, deduplicates and confirms by scoped GET after restart', async t => {
  const f = await fixture(t), id = await accept(f);
  await f.queue.tick(); assert.equal(f.reads, 0);
  f.advance(15000); const e = signed(eventFor(f, id), f.now()), receipt = verifyWebhook(e.bytes, e.headers, webhook, f.now());
  await f.queue.receiveWebhook(receipt); await f.queue.receiveWebhook(receipt);
  await assert.rejects(f.queue.receiveWebhook({ ...receipt, bodyHash: 'different' }), /conflicts/);
  await f.restart(); await f.queue.tick();
  const view = f.queue.view(id, 'visitor');
  assert.equal(view.status, 'succeeded'); assert.equal(view.completionSource, 'webhook'); assert.equal(view.timing.totalMs, 15000); assert.equal(f.posts, 1); assert.equal(f.reads, 1);
  assert.match(durationText(view), /Total: 15.0s.*verified webhook/);
  await f.queue.receiveWebhook(receipt); await f.queue.tick(); assert.equal(f.posts, 1);
});

test('missing webhook uses delayed GET-only recovery, including transient read failures; old requests do not invent duration', async t => {
  const f = await fixture(t), id = await accept(f);
  f.advance(599999); await f.queue.tick(); assert.equal(f.reads, 0);
  f.advance(1); f.failRead(true); await f.queue.tick(); assert.equal(f.queue.view(id, 'visitor').status, 'running');
  f.failRead(false); await f.queue.tick(); assert.equal(f.reads, 1);
  f.advance(30000); await f.queue.tick(); assert.equal(f.posts, 1); assert.equal(f.queue.view(id, 'visitor').completionSource, 'polling-recovery');
  assert.match(durationText({ status: 'succeeded', createdAt: f.now() - 10000 }), /unavailable/);
});

test('early callback saved during submission is reconciled only against its returned job ID', async t => {
  const f = await fixture(t), id = randomUUID();
  await f.queue.accept({ id, owner: 'visitor', fingerprint: 'fixture' }, async () => ({ personalAssetId: 'shopper', productAssetId: 'product' }));
  const original = f.api.createJob;
  f.api.createJob = async payload => { const event = signed(eventFor(f, id), f.now()); await f.queue.receiveWebhook(verifyWebhook(event.bytes, event.headers, webhook, f.now())); return original(payload); };
  await f.queue.tick(); await f.queue.tick(); assert.equal(f.queue.view(id, 'visitor').completionSource, 'webhook');
  await assert.rejects(f.queue.receiveWebhook({ jobId: randomUUID(), requestId: id }), /not found/);
});

test('session-owned ZIP includes three authorized media files and safe manifest, never credentials or signed URLs', async t => {
  const f = await fixture(t), id = await accept(f); f.advance(600000); await f.queue.tick();
  const calls = [], fetchImpl = async (url, options) => { calls.push({ url: String(url), options }); return new Response(Buffer.from('fixture-media'), { headers: { 'content-type': 'image/png' } }); };
  const bytes = await buildAssetDownload({ entries: [{ ...f.queue.owned(id, 'visitor'), timing: f.queue.view(id, 'visitor').timing }], api: f.api, fetchImpl });
  assert.equal(bytes.readUInt32LE(0), 0x04034b50); assert.match(bytes.toString(), /shopper.png/); assert.match(bytes.toString(), /product.png/); assert.match(bytes.toString(), /result.png/); assert.match(bytes.toString(), /manifest.json/);
  assert.doesNotMatch(bytes.toString(), /https:|applicationKey|fixture-signing|demo_visitor/); assert.equal(calls.length, 3);
  for (const call of calls) { assert.equal(call.options.redirect, 'error'); assert.equal(call.options.headers, undefined); }
  await assert.rejects(buildAssetDownload({ entries: [], api: f.api }), /No completed/);
  await assert.rejects(buildAssetDownload({ entries: [f.queue.owned(id, 'visitor')], api: { ...f.api, getAsset: async id => ({ id, status: 'ready', url: 'http://localhost/secret' }) }, fetchImpl }), /unavailable/);
});

test('HTTP webhook needs no visitor cookie but ZIPs enforce owner; browser GET never submits again', async t => {
  const f = await fixture(t), server = await startDemoServer({ queue: f.queue, apiFor: () => f.api, webhook, port: 0, now: f.now,
    assetFetch: async () => new Response('fixture', { headers: { 'content-type': 'image/png' } }) });
  t.after(server.close);
  const session = await fetch(server.origin + '/api/session'), cookie = session.headers.get('set-cookie').split(';')[0];
  const sessionB = await fetch(server.origin + '/api/session'), other = sessionB.headers.get('set-cookie').split(';')[0];
  assert.equal((await session.json()).completionMode, 'webhook-first');
  // Derive the owner's identity through an actual accepted browser request, no key exposure.
  f.api.uploadPair = async () => ({ personalAssetId: 'shopper', productAssetId: 'product' });
  const id = randomUUID(), image = { type: 'image/png', base64: 'Zml4dHVyZQ==' };
  assert.equal((await fetch(server.origin + '/api/requests', { method: 'POST', headers: { Cookie: cookie, Origin: server.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, consent: true, product: image, personal: image }) })).status, 202);
  await f.queue.tick(); const e = signed(eventFor(f, id), f.now());
  assert.equal((await fetch(server.origin + '/webhooks/dressme', { method: 'POST', headers: e.headers, body: e.bytes })).status, 204);
  await f.queue.tick();
  assert.equal((await fetch(server.origin + '/api/requests/' + id + '/download.zip', { headers: { Cookie: other } })).status, 404);
  assert.equal((await fetch(server.origin + '/api/requests/download.zip', { headers: { Cookie: other } })).status, 409);
  assert.equal((await fetch(server.origin + '/api/requests/' + id + '/download.zip', { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await fetch(server.origin + '/api/requests/download.zip', { headers: { Cookie: cookie } })).status, 429);
  f.advance(10000);
  assert.equal((await fetch(server.origin + '/api/requests/download.zip', { headers: { Cookie: cookie } })).status, 200);
  assert.equal(f.posts, 1);
});
