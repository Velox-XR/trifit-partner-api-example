import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildUnifiedPlugin, unifiedFiles, unifiedRoot, productionRoot} from '../scripts/package-unified-plugin.mjs';
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
  const production = catalogue.plugins.find(p => p.name === 'velox-trifit-unified');
  assert.equal(production.source.path, './plugins/velox-trifit-unified');
});

test('Production package is reproducible, separately bound and preserves the reviewed docs plugin', async () => {
  const first = await buildUnifiedPlugin(productionRoot, 'production');
  assert.deepEqual(first.bytes, (await buildUnifiedPlugin(productionRoot, 'production')).bytes);
  assert.equal(first.fileName, 'velox-trifit-unified-0.4.0.zip');
  assert.deepEqual(first.files, unifiedFiles);
  const manifest = JSON.parse(await readFile(new URL('plugin.json', productionRoot)));
  assert.equal(manifest.extensions['com.openai'].interface.displayName, 'Velox TriFit');
  const mcp = JSON.parse(await readFile(new URL('mcp.json', productionRoot)));
  assert.deepEqual(Object.keys(mcp.mcpServers), ['velox-trifit']);
  assert.equal(mcp.mcpServers['velox-trifit'].url, 'https://studio.v3lox.com/partner/trifit/mcp');
  for (const file of unifiedFiles.filter(p => !p.endsWith('.png'))) {
    const text = await readFile(new URL(file, productionRoot), 'utf8');
    assert.doesNotMatch(text, /studio-dev\.v3lox|trifit-dev\.v3lox|plugin_asdk_app_|link_6ad|Bearer /);
  }
  assert.deepEqual(await readFile(new URL('assets/trifit-icon.png', productionRoot)), await readFile(new URL('../assets/trifit-icon.png', import.meta.url)));
  assert.deepEqual(await readFile(new URL('skills/velox-trifit-developer/SKILL.md', productionRoot)), await readFile(new URL('skills/velox-trifit-developer/SKILL.md', unifiedRoot)));
  await assert.rejects(buildUnifiedPlugin(productionRoot), /Assertion/);
  await assert.rejects(buildUnifiedPlugin(unifiedRoot, 'production'), /Assertion/);
  await assert.rejects(buildUnifiedPlugin(productionRoot, 'other'), /Explicit supported/);
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
