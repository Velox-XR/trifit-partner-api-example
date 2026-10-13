import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as helpers from '../web/workspace.mjs';
import { startDemoServer } from '../src/demo-server.mjs';

test('status messages distinguish admission, generation, uncertainty and failures without an ETA', () => {
  assert.match(helpers.statusMessage({ status: 'queued', position: 2, queuePaused: true }), /position 2.*paused/);
  assert.doesNotMatch(helpers.statusMessage({ status: 'queued' }), /undefined|null|seconds/);
  for (const status of ['uploading', 'queued', 'submitting', 'running', 'needs_review', 'upload_failed', 'unknown']) assert(helpers.blocksSubmission({ status }));
  for (const status of ['failed', 'succeeded']) assert(!helpers.blocksSubmission({ status }));
  assert.match(helpers.statusMessage({ status: 'needs_review' }), /not been submitted again/);
  assert.equal(helpers.progressStage('succeeded'), 3);
  assert.equal(helpers.progressStage('failed'), -1);
});

test('local images and result URLs are restricted before rendering', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) helpers.validateImage({ type, size: 1024 });
  for (const file of [null, { type: 'image/svg+xml', size: 20 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 5242881 }]) assert.throws(() => helpers.validateImage(file));
  assert.equal(helpers.safeResultUrl('https://media.example/result.png'), 'https://media.example/result.png');
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,AA==', 'http://example.com/a', 'https://user:pass@example.com/a']) assert.throws(() => helpers.safeResultUrl(url));
});

// Lightweight browser harness: execute the actual entry module with controlled
// DOM/storage/network, so tests never use real credentials, uploads or GPU jobs.
async function workspace({ saved, configured = true, initial = [], failHistory = false, state = 'running', rejectPost, failPost = false } = {}) {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.classList = { toggle() {} }; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(event, handler) { this.listeners[event] = handler; }
    setAttribute(name, value) { this[name] = value; }
    removeAttribute(name) { delete this[name]; }
  }
  const nodes = new Map(), get = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  get('#try-on').elements = { consent: { checked: true } }; get('#try-on').reportValidity = () => true;
  const calls = [], storage = new Map(saved ? [['velox-demo-pending-request', saved]] : []);
  const fakeURL = class extends URL { static createObjectURL() { return 'blob:local-input'; } static revokeObjectURL() {} };
  const source = (await readFile(new URL('../web/app.mjs', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/, '');
  const fetch = async (url, options) => {
    const path = new URL(url).pathname, method = options?.method || 'GET'; calls.push({ path, method });
    if (method === 'POST' && failPost) throw new Error('connection lost');
    const data = path === '/api/session' ? { configured, gapSeconds: 10 } : path === '/api/requests' && method === 'GET' ? { requests: initial } : method === 'POST' ? rejectPost || { id: 'new-request', status: 'queued' } : path.endsWith('/result') ? { url: 'https://media.example/result.png' } : { id: saved || 'new-request', status: state };
    const ok = !(failHistory && path === '/api/requests' && method === 'GET') && !(method === 'POST' && rejectPost);
    return { ok, json: async () => data };
  };
  const context = { ...helpers, URL: fakeURL, AbortSignal, Map, Set, console, Date, Image: class {}, document: { querySelector: get, querySelectorAll: () => [], createElement: () => new Element() }, location: { href: 'http://localhost/demo' }, fetch, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, crypto: { randomUUID: () => 'new-request' }, setTimeout: () => 1, clearTimeout: () => {}, FileReader: class { readAsDataURL() { this.result = 'data:image/png;base64,dGVzdA=='; this.onload(); } } };
  const ui = await runInNewContext('(async () => {' + source + '\nreturn { select: () => { selected.personal = selected.product = { file: { type: "image/png" }, url: "blob:input" }; controls(); }, submit: () => form.listeners.submit({ preventDefault() {} }), refresh: () => history(), poll }; })()', context);
  return { ui, calls, nodes, storage };
}

test('preview permits local selection but never generation', async () => {
  const { ui, calls, nodes } = await workspace({ configured: false }); ui.select(); await ui.submit();
  assert(nodes.get('#submit').disabled); assert(!calls.some(call => call.method === 'POST'));
});
test('unconfirmed history prevents a new generation', async () => {
  const { ui, calls, nodes } = await workspace({ failHistory: true }); ui.select(); await ui.submit();
  assert(nodes.get('#submit').disabled); assert(!calls.some(call => call.method === 'POST'));
});
test('stored pending request resumes using GET only, with no replay', async () => {
  const { ui, calls, nodes } = await workspace({ saved: 'existing', state: 'needs_review' }); ui.select(); await ui.submit();
  assert(calls.some(call => call.path === '/api/requests/existing')); assert(!calls.some(call => call.method === 'POST'));
  assert(nodes.get('#submit').disabled);
});
test('server history blocks submission even when sessionStorage has lost its reference', async () => {
  const { ui, calls, storage } = await workspace({ initial: [{ id: 'active', status: 'running' }] }); ui.select(); await ui.submit();
  assert.equal(storage.get('velox-demo-pending-request'), 'active'); assert(!calls.some(call => call.method === 'POST'));
});
test('double click and uncertain transport never replay the paid POST', async () => {
  const { ui, calls, nodes, storage } = await workspace({ failPost: true, state: 'needs_review' }); ui.select();
  await Promise.all([ui.submit(), ui.submit()]); await ui.submit(); await ui.poll();
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  assert(nodes.get('#submit').disabled); assert.equal(storage.get('velox-demo-pending-request'), 'new-request');
});
test('an explicit not-accepted response releases the local lock without automatic retry', async () => {
  const { ui, calls, storage } = await workspace({ rejectPost: { notAccepted: true, error: 'Queue full' } }); ui.select(); await ui.submit();
  assert.equal(calls.filter(call => call.method === 'POST').length, 1); assert.equal(storage.size, 0);
});
test('completion releases the active lock and reads the result without a new POST', async () => {
  const { ui, calls, nodes, storage } = await workspace({ saved: 'existing', state: 'succeeded' }); ui.select();
  assert.equal(storage.size, 0); assert(!nodes.get('#submit').disabled);
  assert.equal(nodes.get('#open-result').href, 'https://media.example/result.png'); assert(!calls.some(call => call.method === 'POST'));
});

test('public workspace assets mount under the demo prefix and no operator controls are added', async t => {
  const host = await startDemoServer({ port: 0, prefix: '/partners/demo' }); t.after(host.close);
  const root = host.origin + '/partners/demo';
  const html = await (await fetch(root + '/demo')).text();
  for (const id of ['product-library', 'personal-library', 'request-steps', 'history', 'open-result']) assert(html.includes('id="' + id + '"'));
  assert.match(html, /data-review="compare"/); assert.match(html, /GitHub/);
  assert.doesNotMatch(html, /traffic-form|shopper-shared|test-policy-form|partner-webhook-form|skoleom/i);
  const module = await fetch(root + '/workspace.mjs'); assert.equal(module.status, 200); assert.match(module.headers.get('content-type'), /javascript/);
});
