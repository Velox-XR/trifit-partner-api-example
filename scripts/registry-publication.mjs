import assert from 'node:assert/strict';
import {readFile, appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const registry = 'https://registry.modelcontextprotocol.io';
export const repository = 'Velox-XR/trifit-partner-api-example';
export const name = 'io.github.Velox-XR/velox-trifit-developer';
export function checkCandidate(manifest, env) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.match(env.EXPECTED_SHA || '', /^[a-f0-9]{40}$/);
  assert.equal(env.GITHUB_SHA, env.EXPECTED_SHA);
  assert.equal(env.CONFIRMATION, 'PUBLISH-VELOX-TRIFIT-REGISTRY');
  assert.equal(manifest.name, name);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(manifest.remotes, [{type:'streamable-http', url:'https://studio.v3lox.com/partner/trifit/mcp'}]);
  assert.equal(manifest.title, 'Velox TriFit: Virtual Try-On API');
  assert.equal(manifest.description, 'Virtual try-on (VTO) API docs and SDK examples; OAuth account/guest photo uploads and try-ons.');
  assert.deepEqual(manifest.repository, {url:`https://github.com/${repository}`, source:'github'});
  assert.equal(manifest.websiteUrl, 'https://studio.v3lox.com/partner-api');
  assert.equal(manifest.packages, undefined);
  assert.deepEqual(Object.keys(manifest).sort(), ['$schema','description','name','remotes','repository','title','version','websiteUrl'].sort());
}
export function checkPublished(entry, manifest) {
  assert.ok(entry && entry.server && entry._meta, 'Registry entry is incomplete');
  for (const key of Object.keys(manifest)) assert.deepEqual(entry.server[key], manifest[key], `Registry mismatch: ${key}`);
  const official = entry._meta['io.modelcontextprotocol.registry/official'];
  assert.equal(official?.status, 'active');
  assert.equal(official?.isLatest, true);
  return {name:manifest.name, version:manifest.version, status:official.status, isLatest:official.isLatest, endpoint:manifest.remotes[0].url};
}
export async function readEntry(manifest, request = fetch) {
  const url = `${registry}/v0.1/servers/${encodeURIComponent(manifest.name)}/versions/${encodeURIComponent(manifest.version)}`;
  const response = await request(url, {redirect:'error', signal:AbortSignal.timeout(15000)});
  if (response.status === 404) return null;
  assert.equal(response.status, 200, `Registry read failed: ${response.status}`);
  return response.json();
}
async function main() {
  const mode = process.argv[2];
  assert.ok(['preflight','verify'].includes(mode), 'Use preflight or verify');
  const manifest = JSON.parse(await readFile(new URL('../server.json', import.meta.url), 'utf8'));
  checkCandidate(manifest, process.env);
  const entry = await readEntry(manifest);
  if (entry) console.log(JSON.stringify(checkPublished(entry, manifest)));
  else assert.equal(mode, 'preflight', 'Registry publication is not yet visible; inspect before retrying publication');
  if (mode === 'preflight') {
    assert.ok(process.env.GITHUB_OUTPUT, 'Expected GitHub Actions output path');
    await appendFile(process.env.GITHUB_OUTPUT, `already_registered=${entry !== null}\n`);
    console.log(entry ? 'Exact active/latest version already registered; skip duplicate publish.' : 'Exact version absent; publication may proceed.');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
