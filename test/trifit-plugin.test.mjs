import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {buildTriFitPlugin, trifitFiles, productionRoot} from '../scripts/package-trifit-plugin.mjs';
import {buildPlugin} from '../scripts/package-plugin.mjs';

test('plugin skills offer TriFit app as well as limited demo', async () => {
  for (const name of ['setup', 'developer', 'try-on']) {
    const text = await readFile(new URL('../plugins/velox-trifit/skills/velox-trifit-' + name + '/SKILL.md', import.meta.url), 'utf8');
    assert.match(text, /https:\/\/trifit\.v3lox\.com\//); assert.match(text, /https:\/\/studio\.v3lox\.com\/partners\/demo\/demo/);
    assert.match(text, /allowance/); assert.match(text, /limited/);
  }
});

test('default builder produces only the exact seven-file Production candidate', async () => {
  const first = await buildTriFitPlugin(), second = await buildTriFitPlugin();
  assert.equal(first.sha256, 'a470a9e7a49261929c68751b614e14224de0e44578d95f2d159597facd41a18a');
  assert.equal(first.files.length, 7);
  assert.deepEqual(first.bytes, second.bytes);
  assert.deepEqual(first.files, trifitFiles);
  const names = [], bytes = first.bytes;
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18), pathLength = bytes.readUInt16LE(offset + 26);
    const name = bytes.subarray(offset + 30, offset + 30 + pathLength).toString();
    names.push(name);
    const data = bytes.subarray(offset + 30 + pathLength, offset + 30 + pathLength + length);
    const source = await readFile(new URL(name, productionRoot));
    assert.deepEqual(data, name.endsWith('.png') ? source : Buffer.from(source.toString().replace(/\r\n/g, '\n')));
    offset += 30 + pathLength + length;
  }
  assert.deepEqual(names, trifitFiles);
  assert.ok(names.includes('skills/velox-trifit-developer/references/partner-application.md'));
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
});

test('Codex and Copilot marketplaces list the same two Production plugins', async () => {
  const catalogue = JSON.parse(await readFile(new URL('../.agents/plugins/marketplace.json', import.meta.url)));
  const copilot = JSON.parse(await readFile(new URL('../.github/plugin/marketplace.json', import.meta.url)));
  assert.equal(copilot.name, catalogue.name);
  assert.deepEqual(copilot.plugins.map(p => [p.name, p.source]), catalogue.plugins.map(p => [p.name, p.source.path]));
  const developer = catalogue.plugins.find(p => p.name === 'velox-trifit-developer');
  assert.equal(developer.source.path, './');
  const production = catalogue.plugins.find(p => p.name === 'velox-trifit');
  assert.equal(production.source.path, './plugins/velox-trifit');
  assert.deepEqual(catalogue.plugins.map(p => p.name), ['velox-trifit-developer', 'velox-trifit']);
  const roots = [new URL('../', import.meta.url), new URL('../' + production.source.path + '/', import.meta.url)];
  for (const root of roots) {
    const manifest = JSON.parse(await readFile(new URL('plugin.json', root)));
    const entry = copilot.plugins.find(p => p.name === manifest.name);
    assert.ok(entry);
    assert.equal(entry.description, manifest.description);
    const mcp = JSON.parse(await readFile(new URL('mcp.json', root)));
    for (const server of Object.values(mcp.mcpServers)) assert.equal(new URL(server.url).origin, 'https://studio.v3lox.com');
  }
  assert.deepEqual(await readdir(new URL('../plugins/', import.meta.url)), ['velox-trifit']);
});

test('Production package is reproducible, separately bound and preserves the reviewed docs plugin', async () => {
  const first = await buildTriFitPlugin(productionRoot, 'production');
  assert.deepEqual(first.bytes, (await buildTriFitPlugin(productionRoot, 'production')).bytes);
  assert.equal(first.fileName, 'velox-trifit-1.2.3.zip');
  assert.deepEqual(first.files, trifitFiles);
  const manifest = JSON.parse(await readFile(new URL('plugin.json', productionRoot)));
  assert.equal(manifest.extensions['com.openai'].interface.displayName, 'Velox TriFit');
  const mcp = JSON.parse(await readFile(new URL('mcp.json', productionRoot)));
  assert.deepEqual(Object.keys(mcp.mcpServers), ['velox-trifit']);
  assert.equal(mcp.mcpServers['velox-trifit'].url, 'https://studio.v3lox.com/partner/trifit/mcp');
  for (const file of trifitFiles.filter(p => !p.endsWith('.png'))) {
    const text = await readFile(new URL(file, productionRoot), 'utf8');
    assert.doesNotMatch(text, /studio-dev\.v3lox|trifit-dev\.v3lox|plugin_asdk_app_|link_6ad|Bearer /);
  }
  assert.deepEqual(await readFile(new URL('assets/trifit-icon.png', productionRoot)), await readFile(new URL('../assets/trifit-icon.png', import.meta.url)));
  await assert.rejects(buildTriFitPlugin(productionRoot, 'development'), /Explicit supported/);
  await assert.rejects(buildTriFitPlugin(productionRoot, 'other'), /Explicit supported/);
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
