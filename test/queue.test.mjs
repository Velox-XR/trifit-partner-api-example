import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DemoQueue } from '../src/queue.mjs';
import { validateConfig } from '../src/config.mjs';
import { startDemoServer } from '../src/demo-server.mjs';

async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'velox-demo-queue-'));
  let time = 100000; const starts = []; const reads = []; let outcome = 'running';
  const options = { directory, binding: 'test-only-integration', now: () => time, apiFor: owner => ({
    createJob: async (payload, key) => { starts.push({ time, owner, payload, key }); return { id: key, status: 'queued' }; },
    request: async path => { reads.push(path); return { id: path.split('/').at(-1), status: outcome }; }
  }), ...overrides };
  let queue = await DemoQueue.open(options);
  t.after(async () => { if (!queue.closed) await queue.close(); await rm(directory, { recursive: true, force: true }); });
  return { get queue() { return queue; }, starts, reads, directory, options,
    time: value => { time = value; }, outcome: value => { outcome = value; },
    restart: async () => { await queue.close(); queue = await DemoQueue.open(options); }
  };
}
function enqueue(queue, owner, id = randomUUID(), fingerprint = 'input-digest') {
  return queue.accept({ id, owner, fingerprint }, async save => { await save('productUploadId', 'reserved-product'); return { personalAssetId: `personal-${owner}`, productAssetId: 'completed-product' }; });
}

test('one shared 10-second queue across visitors, FIFO, no overlap or fixed lifetime count', async t => {
  const f = await fixture(t); const a = await enqueue(f.queue, 'visitor-a'); const b = await enqueue(f.queue, 'visitor-b');
  assert.equal(b.position, 2);
  await Promise.all([f.queue.tick(), f.queue.tick(), f.queue.tick()]); assert.equal(f.starts.length, 1);
  f.time(120000); await f.queue.tick(); assert.equal(f.starts.length, 1, 'long-running job keeps its slot beyond 10 seconds');
  f.outcome('succeeded'); await f.queue.tick(); await f.queue.tick(); assert.equal(f.starts.length, 2);
  f.time(120001); await f.queue.tick();
  const again = await enqueue(f.queue, 'visitor-a');
  await f.queue.tick(); assert.equal(f.starts.length, 2);
  f.time(129999); await f.queue.tick(); assert.equal(f.starts.length, 2);
  f.time(130000); await f.queue.tick(); assert.equal(f.starts.length, 3);
  assert.deepEqual(f.starts.map(x => x.key), [a.id, b.id, again.id]);
});

test('gap is configurable to 30 seconds; saved interval survives restart', async t => {
  const f = await fixture(t, { gapMs: 30000 }); await enqueue(f.queue, 'a'); await enqueue(f.queue, 'b');
  await f.queue.tick(); f.outcome('succeeded'); await f.queue.tick(); await f.restart();
  f.time(129999); await f.queue.tick(); assert.equal(f.starts.length, 1);
  f.time(130000); await f.queue.tick(); assert.equal(f.starts.length, 2);
});

test('slow journal sync does not shorten the gap between actual API submissions', async t => {
  const f = await fixture(t); await enqueue(f.queue, 'a'); await enqueue(f.queue, 'b');
  const change = f.queue.change.bind(f.queue);
  f.queue.change = async (id, patch) => { const result = await change(id, patch); if (patch.status === 'submitting') f.time(104000); return result; };
  await f.queue.tick(); assert.equal(f.starts[0].time, 104000);
  f.queue.change = change; f.outcome('succeeded'); await f.queue.tick(); await f.restart();
  f.time(110000); await f.queue.tick(); assert.equal(f.starts.length, 1);
  f.time(114000); await f.queue.tick(); assert.equal(f.starts.length, 2);
});

test('active job resumes by GET only; second dispatcher cannot open the same journal', async t => {
  const f = await fixture(t); await enqueue(f.queue, 'a'); await f.queue.tick();
  await assert.rejects(DemoQueue.open(f.options), /locked/);
  await f.restart(); f.time(200000); await f.queue.tick();
  assert.equal(f.starts.length, 1); assert.equal(f.reads.length, 1);
});

test('uncertain submission is persisted and blocks further jobs, including after restart', async t => {
  let calls = 0;
  const f = await fixture(t, { apiFor: () => ({ createJob: async () => { calls++; throw new Error('network outcome unknown'); } }) });
  const a = await enqueue(f.queue, 'a'); await enqueue(f.queue, 'b'); await f.queue.tick();
  assert.equal(f.queue.view(a.id, 'a').status, 'needs_review'); await f.restart(); f.time(200000); await f.queue.tick();
  assert.equal(calls, 1); assert.equal(f.queue.blocked, true);
  const saved = await readFile(join(f.directory, 'receipts.jsonl'), 'utf8');
  assert.match(saved, /idempotencyKey/); assert.match(saved, /personalAssetId/); assert.doesNotMatch(saved, /applicationKey|https:/);
});

test('duplicate clicks, ownership, per-visitor pending and temporary queue capacity are enforced', async t => {
  const f = await fixture(t, { maxPending: 2 }); const a = await enqueue(f.queue, 'a');
  let uploads = 0;
  assert.equal((await f.queue.accept({ id: a.id, owner: 'a', fingerprint: 'input-digest' }, async () => { uploads++; })).id, a.id);
  assert.equal(uploads, 0);
  assert.throws(() => f.queue.view(a.id, 'b'), e => e.status === 404);
  await assert.rejects(enqueue(f.queue, 'b', a.id), e => e.status === 404);
  await assert.rejects(enqueue(f.queue, 'a', a.id, 'changed'), /different inputs/);
  await assert.rejects(enqueue(f.queue, 'a'), /active demo request/);
  await enqueue(f.queue, 'b'); await assert.rejects(enqueue(f.queue, 'c'), e => e.status === 429);
});

test('terminal failures free a slot, but unconfirmed upstream submissions do not', async t => {
  const f = await fixture(t); const a = await enqueue(f.queue, 'a'); await f.queue.tick(); f.outcome('failed'); await f.queue.tick();
  assert.equal(f.queue.view(a.id, 'a').status, 'failed'); assert.equal(f.queue.blocked, false);
  const b = await enqueue(f.queue, 'b'); f.time(120000); await f.queue.tick();
  f.queue.apiFor = () => ({ request: async () => ({ id: b.id, status: 'failed', error: { code: 'submission_unconfirmed' } }) });
  await f.queue.tick(); assert.equal(f.queue.blocked, true);
});

test('partial journal refuses startup; interrupted submitting intent is not replayed', async t => {
  const f = await fixture(t); const a = await enqueue(f.queue, 'a');
  await f.queue.change(a.id, { status: 'submitting', submittedAt: 100000, idempotencyKey: a.id });
  await f.restart(); await f.queue.tick(); assert.equal(f.starts.length, 0); assert.equal(f.queue.blocked, true);
  await f.queue.close(); await writeFile(join(f.directory, 'receipts.jsonl'), '{broken', 'utf8');
  await assert.rejects(DemoQueue.open(f.options));
});

test('public placeholder config fails closed and missing config exits before serving or network calls', async t => {
  const placeholder = JSON.parse(await readFile(new URL('../partner.config.example.json', import.meta.url)));
  assert.throws(() => validateConfig(placeholder), /intentionally invalid/);
  assert.equal(placeholder.queueGapSeconds, 10);
  const directory = await mkdtemp(join(tmpdir(), 'velox-demo-empty-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: directory, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1); assert.match(result.stderr, /public example key is invalid/); assert.equal(result.stdout, '');
});

test('preview is disabled, serves no configuration and rejects cross-origin writes', async t => {
  const server = await startDemoServer({ port: 0 }); t.after(server.close);
  const response = await fetch(`${server.origin}/api/session`); assert.equal((await response.json()).configured, false);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.equal((await fetch(`${server.origin}/partner.config.json`)).status, 401);
  assert.equal((await fetch(`${server.origin}/api/requests`, { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const html = await (await fetch(server.origin)).text(); assert.match(html, /10 seconds/); assert.doesNotMatch(html, /va_/);
});

test('browser submissions use server-owned subjects, real adapter, private receipts and one queue', async t => {
  const subjects = []; let uploads = 0; let submits = 0;
  const apiFor = owner => ({
    upload: async (_image, options) => { subjects.push(owner); uploads++; await options.onReserved('reserved-' + uploads); return { id: 'completed-' + uploads }; },
    createJob: async (_payload, key) => { submits++; return { id: key }; },
    request: async path => ({ id: path.split('/').at(-1), status: 'succeeded', result: { id: 'private-result', url: 'https://result.example.invalid/private-image' } })
  });
  const f = await fixture(t, { apiFor });
  const server = await startDemoServer({ queue: f.queue, apiFor, sessionSecret: 'private-test-secret-never-sent-to-browser', port: 0 });
  t.after(server.close);
  async function session() {
    const response = await fetch(`${server.origin}/api/session`);
    const text = await response.text(); assert.doesNotMatch(text, /private-test-secret|applicationKey/);
    return response.headers.get('set-cookie').split(';')[0];
  }
  const cookieA = await session(); const cookieB = await session();
  const image = { type: 'image/png', base64: 'dGVzdA==' };
  const id = randomUUID();
  const submit = (cookie, payload) => fetch(`${server.origin}/api/requests`, { method: 'POST', headers: { Cookie: cookie, Origin: server.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const payload = { id, consent: true, personal: image, product: image, subject: 'attacker-chosen' };
  assert.equal((await submit(cookieA, payload)).status, 202); assert.equal(uploads, 2);
  assert.equal((await submit(cookieA, payload)).status, 202); assert.equal(uploads, 2, 'same request is not uploaded twice');
  assert.equal((await submit(cookieB, { ...payload, id: randomUUID() })).status, 202);
  assert.match(subjects[0], /^demo_[a-f0-9]{64}$/); assert.notEqual(subjects[0], subjects[2]);
  assert.equal((await fetch(`${server.origin}/api/requests/${id}`, { headers: { Cookie: cookieB } })).status, 404);
  await f.queue.tick(); assert.equal(submits, 1); await f.queue.tick();
  const result = await fetch(`${server.origin}/api/requests/${id}/result`, { headers: { Cookie: cookieA } });
  assert.equal(result.status, 200); assert.match((await result.json()).url, /private-image/);
  assert.equal((await fetch(`${server.origin}/api/requests/${id}/result`, { headers: { Cookie: cookieB } })).status, 404);
  f.time(109999); await f.queue.tick(); assert.equal(submits, 1);
  f.time(110000); await f.queue.tick(); assert.equal(submits, 2);
});

test('live queue never reports simulated upstream output as a real generation', async t => {
  const f = await fixture(t, { apiFor: () => ({ createJob: async () => ({ id: 'mock-job', simulated: true }) }) });
  const request = await enqueue(f.queue, 'a'); await f.queue.tick();
  assert.equal(f.queue.view(request.id, 'a').status, 'needs_review'); assert.equal(f.queue.blocked, true);
});
