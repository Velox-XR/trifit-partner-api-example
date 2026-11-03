import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const pluginRoot = new URL('../clients/antigravity/', import.meta.url);

test('the Antigravity package includes the fields and local artwork required for a Marketplace card', async () => {
  const manifest = JSON.parse(await readFile(new URL('plugin.json', pluginRoot), 'utf8'));
  for (const field of ['name', 'displayName', 'description', 'version', 'logo']) {
    assert.ok(typeof manifest[field] === 'string' && manifest[field].trim(), field);
  }
  const publisher = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name;
  assert.ok(publisher?.trim(), 'Marketplace publisher');
  assert.ok(Array.isArray(manifest.suggestedPrompts) && manifest.suggestedPrompts.length >= 1 && manifest.suggestedPrompts.length <= 3);
  assert.ok(manifest.suggestedPrompts.every(prompt => typeof prompt === 'string' && prompt.trim()));

  const logo = new URL(manifest.logo, pluginRoot);
  assert.ok(logo.href.startsWith(pluginRoot.href), 'logo must be bundled inside the plugin');
  const asset = await stat(logo);
  assert.ok(asset.isFile() && asset.size > 0, 'bundled logo exists');
});
