import assert from 'node:assert/strict';
import test from 'node:test';
import { DressMeClient } from '../src/client.mjs';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('both uploads start before either finishes, and both completed IDs are persisted', async () => {
  const pending = { personal: deferred(), product: deferred() }, started = [], receipts = {};
  const api = { upload: async (file, { role, onReserved }) => {
    started.push(role); assert.equal(file, role);
    await onReserved(role + '-reserved');
    return pending[role].promise;
  } };
  const done = DressMeClient.prototype.uploadPair.call(api,
    { personal: 'personal', product: 'product' }, async (field, id) => { receipts[field] = id; });
  assert.deepEqual(started, ['personal', 'product']);
  pending.product.resolve({ id: 'product-complete' });
  pending.personal.resolve({ id: 'personal-complete' });
  assert.deepEqual(await done, { personalAssetId: 'personal-complete', productAssetId: 'product-complete' });
  assert.deepEqual(receipts, { personalUploadId: 'personal-reserved', productUploadId: 'product-reserved',
    personalAssetId: 'personal-complete', productAssetId: 'product-complete' });
});

test('one failed transfer waits for the other receipt and never retries or submits', async () => {
  const pending = deferred(), receipts = {}, calls = [];
  const api = { upload: async (_, { role, onReserved }) => {
    calls.push(role); await onReserved(role + '-reserved');
    if (role === 'personal') throw new Error('transfer failed');
    return pending.promise;
  } };
  let settled = false;
  const done = DressMeClient.prototype.uploadPair.call(api, {}, async (field,id) => { receipts[field]=id; });
  const rejected = assert.rejects(done, /transfer failed/).then(() => { settled = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  pending.resolve({ id: 'product-complete' });
  await rejected;
  assert.equal(receipts.productAssetId, 'product-complete');
  assert.deepEqual(calls, ['personal', 'product']);
});
