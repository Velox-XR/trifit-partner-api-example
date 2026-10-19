import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildUnifiedPlugin, unifiedFiles, unifiedRoot} from '../scripts/package-unified-plugin.mjs';
import {buildPlugin} from '../scripts/package-plugin.mjs';

test('unified source builds the exact tested six-file Development candidate', async () => {
  const first = await buildUnifiedPlugin(), second = await buildUnifiedPlugin();
  assert.equal(first.sha256, 'c38274f4c043dea3fe3c47f23e3a05d5519c1c63e921768a097270eaa53e6a27');
  assert.deepEqual(first.bytes, second.bytes);
  assert.deepEqual(first.files, unifiedFiles);
  const names = [], bytes = first.bytes;
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18), pathLength = bytes.readUInt16LE(offset + 26);
    const name = bytes.subarray(offset + 30, offset + 30 + pathLength).toString();
    names.push(name);
    const data = bytes.subarray(offset + 30 + pathLength, offset + 30 + pathLength + length);
    const source = await readFile(new URL(name, unifiedRoot));
    assert.deepEqual(data, name.endsWith('.png') ? source : Buffer.from(source.toString().replace(/\r\n/g, '\n')));
    offset += 30 + pathLength + length;
  }
  assert.deepEqual(names, unifiedFiles);
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
});

test('marketplace adds the preview without replacing the developer package', async () => {
  const catalogue = JSON.parse(await readFile(new URL('../.agents/plugins/marketplace.json', import.meta.url)));
  const developer = catalogue.plugins.find(p => p.name === 'velox-trifit-developer');
  assert.equal(developer.source.path, './');
  const preview = catalogue.plugins.find(p => p.name === 'velox-trifit-unified-development');
  assert.equal(preview.source.path, './plugins/velox-trifit-unified-development');
  const manifest = JSON.parse(await readFile(new URL('../' + preview.source.path + '/plugin.json', import.meta.url)));
  assert.equal(manifest.name, preview.name);
  assert.notEqual(manifest.name, developer.name);
});

test('standalone developer ZIP does not advertise an unpackaged sibling preview', async () => {
  const {bytes} = await buildPlugin();
  let offset = 0, catalogue;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18), pathLength = bytes.readUInt16LE(offset + 26);
    const name = bytes.subarray(offset + 30, offset + 30 + pathLength).toString();
    if (name === '.agents/plugins/marketplace.json') {
      catalogue = JSON.parse(bytes.subarray(offset + 30 + pathLength, offset + 30 + pathLength + length));
    }
    offset += 30 + pathLength + length;
  }
  assert.deepEqual(catalogue.plugins.map(p => [p.name, p.source.path]), [['velox-trifit-developer', './']]);
});
