import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as helpers from '../web/workspace.mjs';
import { starterProducts } from '../web/starter-products.mjs';
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
async function workspace({ saved, configured = true, initial = [], failHistory = false, state = 'running', rejectPost, failPost = false, prepare = async file => ({ file, width: 1536, height: 2048, resized: true }) } = {}) {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.classList = { toggle() {} }; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(event, handler) { this.listeners[event] = handler; }
    setAttribute(name, value) { this[name] = value; }
    removeAttribute(name) { delete this[name]; }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolled = true; }
  }
  const nodes = new Map(), get = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  get('#try-on').elements = { consent: { checked: true } }; get('#try-on').reportValidity = () => true;
  const calls = [], storage = new Map(saved ? [['velox-demo-pending-request', saved]] : []);
  const fakeURL = class extends URL { static createObjectURL() { return 'blob:local-input'; } static revokeObjectURL() {} };
  const source = (await readFile(new URL('../web/app.mjs', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
  const fetch = async (url, options) => {
    const path = new URL(url).pathname, method = options?.method || 'GET'; calls.push({ path, method });
    if (method === 'POST' && failPost) throw new Error('connection lost');
    const data = path === '/api/session' ? { configured, gapSeconds: 10 } : path === '/api/requests' && method === 'GET' ? { requests: initial } : method === 'POST' ? rejectPost || { id: 'new-request', status: 'queued' } : path.endsWith('/result') ? { url: 'https://media.example/result.png' } : { id: saved || 'new-request', status: state };
    const ok = !(failHistory && path === '/api/requests' && method === 'GET') && !(method === 'POST' && rejectPost);
    return { ok, json: async () => data };
  };
  const context = { ...helpers, prepareImage: prepare, URL: fakeURL, AbortSignal, Map, Set, console, Date, Image: class {}, document: { querySelector: get, querySelectorAll: () => [], createElement: () => new Element() }, location: { href: 'http://localhost/demo' }, fetch, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, crypto: { randomUUID: () => 'new-request' }, setTimeout: () => 1, clearTimeout: () => {}, FileReader: class { readAsDataURL() { this.result = 'data:image/png;base64,dGVzdA=='; this.onload(); } } };
  Object.assign(context, { starterProducts, loadStarterProduct: async id => ({ type: 'image/webp', name: id + '.webp' }) });
  const ui = await runInNewContext('(async () => {' + source + '\nreturn { select: () => { selected.personal = selected.product = { file: { type: "image/png" }, url: "blob:input" }; controls(); }, submit: () => form.listeners.submit({ preventDefault() {} }), refresh: () => history(), poll }; })()', context);
  return { ui, calls, nodes, storage };
}

test('preview permits local selection but never generation', async () => {
  const { ui, calls, nodes } = await workspace({ configured: false }); ui.select(); await ui.submit();
  assert(nodes.get('#submit').disabled); assert(!calls.some(call => call.method === 'POST'));
});

test('starter product selection reuses local preparation, resets consent and submits nothing', async () => {
  const { calls, nodes } = await workspace({ configured: false });
  const buttons = nodes.get('#starter-products').children;
  assert.equal(buttons.length, 5);
  await buttons[0].listeners.click();
  assert.equal(nodes.get('#try-on').elements.consent.checked, false);
  assert.equal(nodes.get('#selected-product').children.length, 1);
  assert.match(nodes.get('#product-status').textContent, /Nothing uploaded/);
  assert(!calls.some(call => call.method === 'POST'));
});

function pngFile(width = 6000, height = 4000) {
  const bytes = new Uint8Array(24), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a);
  bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height);
  return new File([bytes], 'large.png', { type: 'image/png' });
}
test('image preparation bounds dimensions without cropping or enlarging', () => {
  assert.deepEqual(helpers.imageSize(6000, 4000), { width: 2048, height: 1365 });
  assert.deepEqual(helpers.imageSize(4000, 6000), { width: 1365, height: 2048 });
  assert.deepEqual(helpers.imageSize(400, 600), { width: 400, height: 600 });
  for (const pair of [[0, 10], [NaN, 10], [100001, 1000]]) assert.throws(() => helpers.imageSize(...pair));
});
test('large source is resized locally; metadata/original bytes are not passed through', async () => {
  const original = pngFile(), originalBytes = await original.arrayBuffer(), calls = []; let closed = 0;
  const result = await helpers.prepareImage(original, {
    decode: async file => { assert.equal(file, original); return { width: 4000, height: 6000, close() { closed++; } }; },
    encode: async (_decoded, width, height, type) => { calls.push({ width, height, type }); return new Blob(['prepared'], { type }); }
  });
  assert.equal(result.resized, true); assert.equal(result.width, 1365); assert.equal(result.height, 2048);
  assert.equal(result.file.type, 'image/png'); assert.equal(await result.file.text(), 'prepared');
  assert.deepEqual(await original.arrayBuffer(), originalBytes); assert.equal(closed, 1); assert.equal(calls.length, 1);
});
test('byte-heavy PNG is compressed as JPEG within the unchanged API cap', async () => {
  const calls = []; let closed = false;
  const result = await helpers.prepareImage(pngFile(), {
    decode: async () => ({ width: 6000, height: 4000, close() { closed = true; } }),
    encode: async (_decoded, width, height, type) => { calls.push({ width, height, type }); return new Blob([new Uint8Array(type === 'image/png' ? 5242881 : 1200)], { type }); }
  });
  assert.equal(result.file.name, 'large.jpg'); assert.equal(result.file.size, 1200); assert.equal(calls.length, 2); assert(closed);
});
test('oversized, unsupported and corrupt inputs fail before decoding', async () => {
  let calls = 0; const images = { decode() { calls++; throw Error('must not decode'); } };
  for (const file of [{ size: helpers.imageLimits.sourceBytes + 1 }, pngFile(100001, 1000), new File(['broken'], 'broken.jpg'), new File(['<svg/>'], 'image.svg')]) await assert.rejects(helpers.prepareImage(file, images));
  assert.equal(calls, 0);
});
test('encoding failure releases the decoder and never returns an oversized upload', async () => {
  let closed = 0, calls = 0;
  await assert.rejects(helpers.prepareImage(pngFile(), {
    decode: async () => ({ width: 6000, height: 4000, close() { closed++; } }),
    encode: async () => { calls++; return new Blob([new Uint8Array(5242881)], { type: 'image/jpeg' }); }
  }), /5 MiB/);
  assert.equal(closed, 1); assert.equal(calls, 5);
});
test('file pickers prepare both roles with visible progress and no upload; submission blocked during preparation', async () => {
  let finish;
  const { ui, calls, nodes } = await workspace({ prepare: file => new Promise(resolve => { finish = () => resolve({ file, width: 2048, height: 1365, resized: true }); }) });
  ui.select();
  for (const role of ['personal', 'product']) {
    const input = nodes.get('#' + role + '-files'); input.files = [pngFile()];
    const pending = input.listeners.change();
    assert(nodes.get('#submit').disabled); assert.match(nodes.get('#' + role + '-status').textContent, /Preparing/);
    await ui.submit(); finish(); await pending;
    assert.equal(input.disabled, false); assert.equal(nodes.get('#' + role + '-status').dataset.state, 'success');
    assert.match(nodes.get('#' + role + '-status').textContent, /automatically resized/);
  }
  assert(!calls.some(call => call.method === 'POST'));
});
test('failed selection is prominent, focuses the error panel, preserves existing selection and permits recovery', async () => {
  let fail = true;
  const { ui, calls, nodes } = await workspace({ prepare: async file => { if (fail) throw Error('Invalid photo.'); return { file, width: 100, height: 100 }; } });
  ui.select(); const input = nodes.get('#personal-files'); input.files = [pngFile()];
  await input.listeners.change();
  const panel = nodes.get('#input-errors'); assert.equal(panel.hidden, false); assert(panel.focused); assert(panel.scrolled);
  assert.equal(nodes.get('#personal-status').role, 'alert'); assert.match(nodes.get('#personal-status').textContent, /large.png: Invalid/);
  assert.equal(input.disabled, false); assert.equal(nodes.get('#submit').disabled, false);
  fail = false; await input.listeners.change(); assert(panel.hidden);
  assert(!calls.some(call => call.method === 'POST'));
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
