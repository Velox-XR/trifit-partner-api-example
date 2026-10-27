import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkCandidate, checkPublished, readEntry, repository} from '../scripts/registry-publication.mjs';
const manifest = JSON.parse(await readFile(new URL('../server.json', import.meta.url), 'utf8'));
const env = {GITHUB_REPOSITORY:repository, GITHUB_REF:'refs/heads/main', GITHUB_SHA:'a'.repeat(40), EXPECTED_SHA:'a'.repeat(40), CONFIRMATION:'PUBLISH-VELOX-TRIFIT-REGISTRY'};
const entry = () => ({server:structuredClone(manifest), _meta:{'io.modelcontextprotocol.registry/official':{status:'active', isLatest:true}}});
test('only exact confirmed main and current unified manifest are publishable', () => {
  checkCandidate(manifest, env);
  for (const patch of [{GITHUB_REPOSITORY:'other/repo'}, {GITHUB_REF:'refs/heads/feature'}, {EXPECTED_SHA:'b'.repeat(40)}, {EXPECTED_SHA:'main'}, {CONFIRMATION:''}]) assert.throws(() => checkCandidate(manifest, {...env,...patch}));
  for (const patch of [{name:'io.github.AlexGrona/velox-trifit-developer'}, {remotes:[{type:'streamable-http',url:'https://studio.v3lox.com/partner/docs/mcp'}]}, {packages:[]}, {unexpected:'value'}]) assert.throws(() => checkCandidate({...manifest,...patch}, env));
  assert.throws(() => checkCandidate(manifest, {...env, CONFIRMATION:'PUBLISH-VELOX-DOCS-REGISTRY'}));
});
test('only matching active/latest registry metadata confirms publication', () => {
  assert.equal(checkPublished(entry(), manifest).status, 'active');
  for (const key of ['name','version','websiteUrl','remotes']) {
    const changed = entry(); changed.server[key] = 'wrong';
    assert.throws(() => checkPublished(changed, manifest));
  }
  for (const patch of [{status:'deleted'}, {isLatest:false}]) {
    const changed = entry(); Object.assign(changed._meta['io.modelcontextprotocol.registry/official'], patch);
    assert.throws(() => checkPublished(changed, manifest));
  }
  assert.throws(() => checkPublished({}, manifest));
});
test('only an explicit 404 means absent; network or permission failures never authorize publication', async () => {
  let seen;
  assert.equal(await readEntry(manifest, async (url, options) => { seen={url,options}; return {status:404}; }), null);
  assert.match(seen.url, /io.github.Velox-XR%2Fvelox-trifit-developer\/versions\/2.0.1$/);
  assert.equal(seen.options.redirect, 'error');
  for (const status of [401,403,429,500]) await assert.rejects(readEntry(manifest, async () => ({status})));
  await assert.rejects(readEntry(manifest, async () => {throw new Error('network');}));
  assert.deepEqual(await readEntry(manifest, async () => ({status:200,json:async()=>entry()})), entry());
});
test('registry workflow is manual, main-only, exact-SHA, secretless, and does not deploy hosting', async () => {
  const workflow = await readFile(new URL('../.github/workflows/publish-mcp-registry.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request_target:|\n  push:|secrets\.|npm publish|azure\/|workflow_run:/);
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.equal((workflow.match(/id-token: write/g)||[]).length, 1);
  assert.match(workflow, /login github-oidc --registry https:\/\/registry.modelcontextprotocol.io/);
  assert.match(workflow, /sha256sum --check/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /registry-publication.mjs verify/);
});
