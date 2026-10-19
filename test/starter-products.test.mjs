import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { starterProducts, loadStarterProduct } from '../web/starter-products.mjs';
import { startDemoServer } from '../src/demo-server.mjs';

const hashes = ['71a7a808667942793347839abd03d4c4eb38a71770ac72187457d288a4533e33', '888060c4b625c718c753e972bdaadc8499ea40fa30c206dd2e4f0d67dbf4afee', '90b3a2591c589039402b4930cec60911440afb03a9c5df5317aca10fbb8aeb70', '8ab4279d2fa3726edd8e5f37d1c9b6075c48e242818ec1b8e934e104160576e6', '7366da7d974472e21c49f4e9a141d0ea466eb24a72b586fd4f8045f04104ad1d'];
test('mounted demo serves five exact comparison collages without an API key or generation', async t => {
  let accepted = 0;
  const host = await startDemoServer({ port: 0, prefix: '/partners/demo', queue: { accept: () => { accepted++; } } });
  t.after(host.close);
  const base = host.origin + '/partners/demo/';
  assert.equal(starterProducts.length, 5);
  for (const [index, sample] of starterProducts.entries()) {
    const file = await loadStarterProduct(sample.id, base);
    assert.equal(file.type, sample.type);
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.deepEqual(bytes, await readFile(new URL('../web/samples/' + sample.file, import.meta.url)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[index]);
  }
  assert.equal(accepted, 0);
  assert.notEqual((await fetch(base + 'samples/public-amara-person.webp')).status, 200);
  const html = await (await fetch(base + 'demo')).text();
  assert.match(html, /https:\/\/trifit\.v3lox\.com\//);
  assert.match(html, /id="starter-products"/);
  assert.match(html, /shared limited queue/);
});

test('invalid starter ID and failed/mistyped image responses are visible failures, never fallbacks', async () => {
  await assert.rejects(loadStarterProduct('private', 'https://example.invalid/', () => assert.fail('No fetch')), /Unknown/);
  await assert.rejects(loadStarterProduct('green-trench-look', 'https://example.invalid/', async () => new Response('', { status: 404 })), /could not be loaded/);
  await assert.rejects(loadStarterProduct('green-trench-look', 'https://example.invalid/', async () => new Response('<html>')), /not a supported image/);
});

test('README embeds approved public example pairs and account example', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const name of ['amara', 'mateo']) for (const role of ['person', 'reference', 'result']) {
    assert(readme.includes('web/samples/public-' + name + '-' + role + '.webp'));
  }
  assert(readme.includes('examples/account/README.md'));
});
