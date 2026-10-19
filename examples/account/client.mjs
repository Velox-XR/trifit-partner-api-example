import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RESOURCE, ISSUER, boundedFetch } from './oauth.mjs';

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const terminal = receipt => receipt?.acceptanceUnknown === false && ['succeeded', 'finished', 'completed', 'failed', 'cancelled', 'canceled'].includes(receipt.status);
const safeReceipt = data => Object.fromEntries(['requestId', 'jobId', 'status', 'environment', 'quotaSource', 'acceptanceUnknown', 'retryAllowed', 'elapsedSeconds', 'resultAssetId', 'createdAt', 'updatedAt'].filter(key => data[key] !== undefined).map(key => [key, data[key]]));

export async function connectMcp(session) {
  const client = new Client({ name: 'velox-trifit-account-example', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(RESOURCE), {
      requestInit: { headers: { Authorization: `Bearer ${session.accessToken}` } },
      fetch: (url, options) => {
        if (new URL(url).href !== RESOURCE || Date.now() >= session.expiresAt) throw new Error('Connection expired or resource changed. Sign in again; do not repeat a submission.');
        return boundedFetch(url, options);
      },
      // No authProvider: a failed POST must never be replayed during authentication.
      reconnectionOptions: { maxRetries: 0, maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 }
    }));
    return client;
  } catch (error) { await client.close(); throw error; }
}

export class Receipts {
  constructor(root) { this.root = root; }
  async lock() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    this.handle = await open(join(this.root, 'client.lock'), 'wx', 0o600);
    await this.handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    await this.handle.sync();
  }
  async unlock() {
    if (!this.handle) return;
    await this.handle.close(); this.handle = null;
    await rm(join(this.root, 'client.lock'));
  }
  async write(name, data, append = false) {
    const handle = await open(join(this.root, name), append ? 'a' : 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(data) + '\n'); await handle.sync(); } finally { await handle.close(); }
  }
  async pending(owner) {
    const pending = [];
    for (const name of await readdir(this.root)) {
      if (!/^request-[\da-f-]{36}\.json$/i.test(name)) continue;
      const intent = JSON.parse(await readFile(join(this.root, name), 'utf8'));
      if (intent.owner !== owner) continue;
      let latest;
      try { latest = JSON.parse((await readFile(join(this.root, `receipt-${intent.requestId}.jsonl`), 'utf8')).trim().split('\n').at(-1)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!terminal(latest)) pending.push(intent.requestId);
    }
    return pending;
  }
}

export class AccountExample {
  constructor({ client, receipts, actions = false, request = boundedFetch }) {
    this.client = client; this.receipts = receipts; this.actions = actions; this.request = request;
  }
  async call(name, args = {}) {
    // MCP isError is a failure even when HTTP transport succeeded. Never log raw errors/tokens.
    let result;
    try { result = await this.client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 }); }
    catch { throw new Error('TriFit connection failed or expired. Preserve receipts and sign in again; do not repeat an uncertain action.'); }
    if (result.isError) throw new Error('TriFit rejected the operation. Check connection, permissions and allowance. Nothing will be retried automatically.');
    const data = result.structuredContent;
    if (!data || data.environment !== 'production') throw new Error('Unexpected or missing Production response. Stopped.');
    return { data, result };
  }
  async account() {
    const { data } = await this.call('get_trifit_account');
    if (data.quotaSource !== 'trifit-account' || !data.id) throw new Error('This example requires a personal TriFit account, not guest access.');
    const owner = createHash('sha256').update(data.id).digest('hex');
    if (this.owner && this.owner !== owner) throw new Error('Connected account changed. Stopped.');
    this.owner = owner;
    return data;
  }
  async allowance() {
    await this.account();
    const { data } = await this.call('get_trifit_allowance');
    if (data.quotaSource !== 'trifit-account') throw new Error('Unexpected allowance source.');
    return data;
  }
  async library(kind = 'all', offset = 0) {
    await this.account();
    const { data } = await this.call('list_trifit_library', { kind, offset, limit: 50 });
    if (data.librarySource !== 'trifit-account') throw new Error('Unexpected library source.');
    return data;
  }
  async upload(role, bytes, contentType, confirmed) {
    if (!this.actions || confirmed !== true) throw new Error('Upload requires --actions and your explicit confirmation.');
    if (!['personal', 'product'].includes(role) || !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)
      || !Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 24 * 1024 * 1024) throw new Error('Select one PNG/JPEG/WebP image up to 24 MiB.');
    await this.account();
    const clientImportId = randomUUID();
    await this.receipts.write(`upload-${clientImportId}.json`, { clientImportId, role, owner: this.owner,
      sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: new Date().toISOString() });
    const { data: target } = await this.call('prepare_trifit_upload', { clientImportId, role, permissionConfirmed: true });
    const url = new URL(target.uploadUrl);
    if (target.method !== 'PUT' || target.clientImportId !== clientImportId || target.role !== role
      || url.origin !== 'https://trifit.v3lox.com' || !new RegExp(`^${new URL(ISSUER).pathname}/upload/[\\w-]{43}$`).test(url.pathname)
      || url.search || url.hash || url.username || url.password || !Number.isFinite(target.maxBytes) || bytes.length > target.maxBytes
      || !(Date.parse(target.expiresAt) > Date.now())) throw new Error('Invalid upload capability. No bytes sent.');
    // Capability URL only: NEVER include OAuth/Partner headers or follow redirects.
    let response;
    try { response = await this.request(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: bytes, redirect: 'error' }); }
    catch { throw new Error(`Upload outcome uncertain; preserve import ${clientImportId}. Check your library, do not upload again automatically.`); }
    if (!response.ok) throw new Error(`Upload failed (HTTP ${response.status}); preserve import ${clientImportId}. Do not retry automatically.`);
    const data = await response.json();
    if (data.environment !== 'production' || data.librarySource !== 'trifit-account' || data.role !== role || data.status !== 'available' || !uuid(data.assetId)) throw new Error('Upload outcome uncertain. Check your TriFit library; do not upload again.');
    await this.receipts.write(`upload-result-${clientImportId}.json`, { clientImportId, assetId: data.assetId, role });
    return data;
  }
  async generate(personalAssetId, productAssetId, confirmed) {
    if (this.submitting) throw new Error('A submission is already being checked. No concurrent submission allowed.');
    this.submitting = true;
    try { return await this.submitOnce(personalAssetId, productAssetId, confirmed); }
    finally { this.submitting = false; }
  }
  async submitOnce(personalAssetId, productAssetId, confirmed) {
    if (!this.actions || confirmed !== true) throw new Error('Generation requires --actions and explicit confirmation.');
    if (!uuid(personalAssetId) || !uuid(productAssetId)) throw new Error('Use the two image IDs from your own account library/uploads.');
    const allowance = await this.allowance();
    const stage = allowance.stages?.find(row => row.kind === 'dressme');
    if (!stage?.canRequest || stage.activeRequests !== 0 || stage.reconciliationPending !== 0
      || (stage.remaining !== null && !(stage.remaining > 0))) throw new Error('DressMe is unavailable, busy or has no remaining allowance.');
    const pending = await this.receipts.pending(this.owner);
    if (pending.length) throw new Error(`Read the unresolved request first: ${pending.join(', ')}. No new submission made.`);
    const requestId = randomUUID();
    // Durable intent precedes the only paid POST. Neither reconnect nor restart replays it.
    await this.receipts.write(`request-${requestId}.json`, { requestId, personalAssetId, productAssetId,
      owner: this.owner, environment: 'production', resource: RESOURCE, createdAt: new Date().toISOString() });
    try {
      const { data } = await this.call('create_trifit_try_on', { requestId, personalAssetId, productAssetId, permissionConfirmed: true });
      if (data.requestId !== requestId || data.quotaSource !== 'trifit-account') throw new Error('Invalid receipt.');
      await this.receipts.write(`receipt-${requestId}.jsonl`, safeReceipt(data), true);
      return data;
    } catch { throw new Error(`Submission outcome may be uncertain. Saved request: ${requestId}. Use result to read it; never resubmit automatically.`); }
  }
  async result(requestId) {
    if (!uuid(requestId)) throw new Error('Enter the saved request UUID.');
    await this.account();
    const { data } = await this.call('get_trifit_try_on', { requestId });
    if (data.quotaSource !== 'trifit-account' || (data.requestId && data.requestId !== requestId)
      || (data.acceptanceUnknown !== true && data.requestId !== requestId)) throw new Error('Unexpected request receipt.');
    // Missing receipt is not proof that a generation never ran.
    await this.receipts.write(`receipt-${requestId}.jsonl`, safeReceipt(data), true);
    if (!['finished', 'completed', 'succeeded'].includes(data.status) || data.acceptanceUnknown !== false) return { receipt: data };
    const shown = await this.call('show_trifit_try_on', { requestId });
    if (shown.data.requestId !== requestId || shown.data.quotaSource !== 'trifit-account') throw new Error('Unexpected image receipt.');
    const image = shown.result.content?.find(item => item.type === 'image');
    if (!image || !['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType) || typeof image.data !== 'string' || !image.data.length || image.data.length > 32 * 1024 * 1024) throw new Error('Completed image unavailable. No new generation started.');
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[image.mimeType];
    const path = join(this.receipts.root, `result-${requestId}-${randomUUID()}.${extension}`);
    const handle = await open(path, 'wx', 0o600);
    try { await handle.writeFile(Buffer.from(image.data, 'base64')); } finally { await handle.close(); }
    return { receipt: data, imagePath: path };
  }
}
