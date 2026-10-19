import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { challenge, discover, callbackReceiver, signIn, RESOURCE, ISSUER, READ_SCOPES, ACTION_SCOPES } from '../examples/account/oauth.mjs';
import { AccountExample, Receipts } from '../examples/account/client.mjs';

const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const metadata = { issuer: ISSUER, code_challenge_methods_supported: ['S256'], scopes_supported: ACTION_SCOPES,
  ...Object.fromEntries(Object.entries({ authorization_endpoint: 'authorize', token_endpoint: 'token', registration_endpoint: 'register', revocation_endpoint: 'revoke' }).map(([key, path]) => [key, ISSUER + '/oauth/' + path])) };
const account = { environment: 'production', quotaSource: 'trifit-account', id: 'fixture-owner', name: 'Fixture account' };
const allowance = { environment: 'production', quotaSource: 'trifit-account', stages: [{ kind: 'dressme', canRequest: true, remaining: 2, activeRequests: 0, reconciliationPending: 0 }] };
const person = randomUUID(), product = randomUUID();

async function fixture(t, { actions = false, overrides = {}, request } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'trifit-account-test-'));
  const receipts = new Receipts(root); await receipts.lock();
  t.after(async () => { await receipts.unlock(); await rm(root, { recursive: true, force: true }); });
  const calls = [];
  const client = { async callTool({ name, arguments: args }) {
    calls.push({ name, args });
    const custom = overrides[name];
    if (custom) return custom(args);
    const data = name === 'get_trifit_account' ? account : name === 'get_trifit_allowance' ? allowance
      : name === 'list_trifit_library' ? { environment: 'production', librarySource: 'trifit-account', items: [], nextOffset: null }
      : { environment: 'production', quotaSource: 'trifit-account', requestId: args.requestId, status: 'running', acceptanceUnknown: false, retryAllowed: false };
    return { structuredContent: data, content: [] };
  } };
  return { root, receipts, client, calls, example: new AccountExample({ client, receipts, actions, request }) };
}

test('PKCE uses RFC S256 and metadata is pinned to Production resource/issuer/endpoints', async () => {
  assert.equal(challenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const good = async url => json(url.includes('oauth-protected-resource') ? { resource: RESOURCE, authorization_servers: [ISSUER] } : metadata);
  assert.equal((await discover(good)).issuer, ISSUER);
  await assert.rejects(discover(async () => json({ resource: RESOURCE, authorization_servers: ['https://invalid.example'] })), /Unexpected/);
  await assert.rejects(discover(async url => url.includes('oauth-protected-resource') ? good(url) : json({ ...metadata, token_endpoint: 'https://invalid.example/token' })), /Unexpected OAuth/);
});

test('loopback consent validates state and issuer and consumes callback once', async t => {
  const receiver = await callbackReceiver('test-state', 5000); t.after(receiver.close);
  const callback = new URL(receiver.redirectUri);
  callback.search = new URLSearchParams({ state: 'wrong', iss: ISSUER, code: 'c'.repeat(43) });
  assert.equal((await fetch(callback)).status, 400);
  callback.searchParams.set('state', 'test-state'); callback.searchParams.set('iss', 'https://wrong.invalid');
  assert.equal((await fetch(callback)).status, 400);
  callback.searchParams.set('iss', ISSUER);
  assert.equal((await fetch(callback)).status, 200);
  assert.equal(await receiver.result, 'c'.repeat(43));
  assert.equal((await fetch(callback)).status, 404);
});

test('mock OAuth code flow uses normal consent, PKCE and audience without partner key or action scopes', async () => {
  let authorize, callbackDone, registered, tokenBody, revoked = false;
  const request = async (url, options) => {
    if (url.includes('oauth-protected-resource')) return json({ resource: RESOURCE, authorization_servers: [ISSUER] });
    if (url.includes('.well-known/oauth-authorization-server')) return json(metadata);
    if (url.endsWith('/register')) { registered = JSON.parse(options.body); return json({ client_id: 'public-client' }); }
    if (url.endsWith('/token')) {
      tokenBody = options.body;
      assert.equal(tokenBody.get('resource'), RESOURCE);
      assert.equal(challenge(tokenBody.get('code_verifier')), authorize.searchParams.get('code_challenge'));
      return json({ access_token: 't'.repeat(43), token_type: 'Bearer', expires_in: 3600, scope: READ_SCOPES.join(' ') });
    }
    if (url.endsWith('/revoke')) { revoked = true; return json({ revoked: true }); }
    throw new Error('Unexpected network destination');
  };
  const session = await signIn({ request, print: text => {
    if (!text.startsWith('https:')) return;
    authorize = new URL(text);
    const callback = new URL(authorize.searchParams.get('redirect_uri'));
    callback.search = new URLSearchParams({ state: authorize.searchParams.get('state'), iss: ISSUER, code: 'c'.repeat(43) });
    callbackDone = fetch(callback);
  } });
  assert.equal((await callbackDone).status, 200);
  assert.equal(registered.token_endpoint_auth_method, 'none');
  assert.deepEqual(registered.redirect_uris, [authorize.searchParams.get('redirect_uri')]);
  assert.equal(authorize.searchParams.get('scope'), READ_SCOPES.join(' '));
  assert(!authorize.searchParams.has('code_verifier'));
  assert(!tokenBody.has('client_secret')); assert(!tokenBody.has('applicationKey'));
  await session.revoke(); assert(revoked);
});

test('default mode permits account metadata only; guest/environment mismatches fail closed', async t => {
  const f = await fixture(t);
  assert.equal((await f.example.allowance()).quotaSource, 'trifit-account');
  await f.example.library();
  await assert.rejects(f.example.upload('personal', Buffer.from('fixture'), 'image/png', true), /--actions/);
  await assert.rejects(f.example.generate(person, product, true), /--actions/);
  assert(!f.calls.some(call => /create_|prepare_/.test(call.name)));
  for (const data of [{ ...account, quotaSource: 'shared-hosted-demo' }, { ...account, environment: 'development' }]) {
    const blocked = new AccountExample({ client: { callTool: async () => ({ structuredContent: data }) }, receipts: f.receipts });
    await assert.rejects(blocked.account(), /personal TriFit|Production/);
  }
});

test('one confirmed submission durably saves inputs before call; restart and uncertain reads cannot replay it', async t => {
  let savedId;
  const f = await fixture(t, { actions: true, overrides: {
    create_trifit_try_on: async args => {
      savedId = args.requestId;
      const intent = JSON.parse(await readFile(join(f.root, 'request-' + savedId + '.json')));
      assert.equal(intent.personalAssetId, person); assert.equal(intent.productAssetId, product);
      assert.equal(args.permissionConfirmed, true);
      throw new Error('Lost response (fixture)');
    },
    get_trifit_try_on: async () => ({ structuredContent: { environment: 'production', quotaSource: 'trifit-account', status: 'unknown', acceptanceUnknown: true } })
  } });
  await assert.rejects(f.example.generate(person, product, false), /confirmation/);
  await assert.rejects(f.example.generate(person, product, true), /Saved request:/);
  const restarted = new AccountExample({ client: f.client, receipts: f.receipts, actions: true });
  await restarted.result(savedId);
  await assert.rejects(restarted.generate(person, product, true), /unresolved request/);
  assert.equal(f.calls.filter(call => call.name === 'create_trifit_try_on').length, 1);
  const second = new Receipts(f.root); await assert.rejects(second.lock(), { code: 'EEXIST' });
});

test('exhausted/busy allowances, MCP errors and concurrent calls never create a duplicate', async t => {
  const blocked = await fixture(t, { actions: true, overrides: {
    get_trifit_allowance: async () => ({ structuredContent: { ...allowance, stages: [{ ...allowance.stages[0], remaining: 0 }] } })
  } });
  await assert.rejects(blocked.example.generate(person, product, true), /unavailable/);
  assert(!blocked.calls.some(call => call.name === 'create_trifit_try_on'));
  const f = await fixture(t, { actions: true });
  const results = await Promise.allSettled([f.example.generate(person, product, true), f.example.generate(person, product, true)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(f.calls.filter(call => call.name === 'create_trifit_try_on').length, 1);
  const bad = new AccountExample({ client: { callTool: async () => ({ isError: true }) }, receipts: f.receipts });
  await assert.rejects(bad.account(), /rejected/);
});

test('upload uses only a validated one-use capability, no OAuth header, and saves asset receipt', async t => {
  let puts = 0;
  const f = await fixture(t, { actions: true, overrides: {
    prepare_trifit_upload: async args => ({ structuredContent: {
      environment: 'production', ...args, method: 'PUT', maxBytes: 1024, expiresAt: new Date(Date.now() + 60000).toISOString(),
      uploadUrl: ISSUER + '/upload/' + 'u'.repeat(43)
    } })
  }, request: async (url, options) => {
    puts++; assert.equal(url.origin, 'https://trifit.v3lox.com');
    assert.deepEqual(options.headers, { 'Content-Type': 'image/png' }); assert.equal(options.redirect, 'error');
    return json({ environment: 'production', librarySource: 'trifit-account', role: 'personal', status: 'available', assetId: person });
  } });
  assert.equal((await f.example.upload('personal', Buffer.from('fixture'), 'image/png', true)).assetId, person);
  assert.equal(puts, 1);
  assert((await readdir(f.root)).some(name => name.startsWith('upload-result-')));
  for (const name of await readdir(f.root)) assert.doesNotMatch(await readFile(join(f.root, name), 'utf8'), /\/upload\/|Bearer|access_token/);
  const malicious = await fixture(t, { actions: true, overrides: {
    prepare_trifit_upload: async args => ({ structuredContent: { environment: 'production', ...args, method: 'PUT', maxBytes: 1024, expiresAt: new Date(Date.now()+60000).toISOString(), uploadUrl: 'https://invalid.example/upload/' + 'u'.repeat(43) } })
  }, request: async () => { assert.fail('Must not send image'); } });
  await assert.rejects(malicious.example.upload('personal', Buffer.from('fixture'), 'image/png', true), /Invalid upload capability/);
});

test('existing result uses only read tools and native image bytes, not a second generation or private URL', async t => {
  const id = randomUUID();
  const receipt = { environment: 'production', quotaSource: 'trifit-account', requestId: id, status: 'finished', acceptanceUnknown: false, elapsedSeconds: 12 };
  const f = await fixture(t, { overrides: {
    get_trifit_try_on: async () => ({ structuredContent: receipt }),
    show_trifit_try_on: async () => ({ structuredContent: receipt, content: [{ type: 'image', mimeType: 'image/png', data: Buffer.from('fixture-image').toString('base64') }] })
  } });
  const result = await f.example.result(id);
  assert.equal(result.receipt.elapsedSeconds, 12);
  assert.equal(await readFile(result.imagePath, 'utf8'), 'fixture-image');
  assert.deepEqual(f.calls.map(call => call.name), ['get_trifit_account', 'get_trifit_try_on', 'show_trifit_try_on']);
});
