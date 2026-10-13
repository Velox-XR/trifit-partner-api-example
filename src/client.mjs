// Demo adapter around the same public SDK shipped in the downloadable ZIP.
import { VeloxDressMe } from '../sdks/javascript/index.mjs';
export class ApiError extends Error {
  constructor(message, { status, code, requestId, retryAfter } = {}) {
    super(message);
    this.name = 'ApiError';
    Object.assign(this, { status, code, requestId, retryAfter });
  }
}

export class DressMeClient {
  constructor({ baseUrl, clientId, applicationKey, subject, fetch: fetchImpl = globalThis.fetch }) {
    if (typeof window !== 'undefined') throw new Error('Use this client on your backend, never in a browser.');
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS or HTTP loopback.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Invalid API base URL.');
    if (!clientId || !applicationKey?.startsWith('va_')) throw new Error('An assigned client ID and application credential are required.');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(subject || '')) throw new Error('Use an opaque subject from your authenticated server session.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl.bind(globalThis);
    this.headers = { 'X-Velox-Client-Id': clientId, 'X-Velox-Integration-Key': applicationKey, 'X-Velox-Subject': subject };
    this.sdk = new VeloxDressMe({ baseUrl, clientId, integrationKey: applicationKey, subject, fetch: (...args) => this.fetch(...args), autoRefresh: false });
  }

  async request(path, { method = 'GET', body, headers = {}, signal } = {}) {
    try { return await this.sdk.request(path, { method, body, headers, signal }); }
    catch (error) { throw new ApiError(error.message, error); }
  }

  async verifyEnvironment(expected) {
    const info = await this.request('/me');
    if (info.kind !== 'application' || info.environment !== expected) throw new Error('Application/environment mismatch. Stop; never fall back to another environment.');
    return info;
  }

  async upload(file, { role, fileName, onReserved }) {
    if (!['personal', 'product'].includes(role)) throw new Error('Use personal or product role.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Use a PNG, JPEG or WebP image up to 5 MiB.');
    if (typeof onReserved !== 'function') throw new Error('Persist the provisional asset ID with onReserved.');
    const target = await this.request('/assets/upload-url', { method: 'POST', body: { role, fileName, contentType: file.type, sizeBytes: file.size } });
    await onReserved(target.assetId);
    const uploadUrl = new URL(target.uploadUrl);
    const localApi = new URL(this.baseUrl);
    if (uploadUrl.username || uploadUrl.password || (uploadUrl.protocol !== 'https:' && !(localApi.protocol === 'http:' && uploadUrl.origin === localApi.origin))) throw new Error('Unsafe upload URL.');
    // The signed capability authorizes this upload. Never send API credentials to storage.
    const transferred = await this.fetch(uploadUrl, { method: 'PUT', headers: target.uploadHeaders, body: file, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!transferred.ok) throw new ApiError('Upload failed; reconcile the saved asset ID before retrying.', { status: transferred.status, code: 'upload_failed' });
    return this.completeUpload(target.assetId);
  }

  completeUpload(id) { return this.request(`/assets/${encodeURIComponent(id)}/complete`, { method: 'POST', body: {} }); }
  getAsset(id) { return this.request(`/assets/${encodeURIComponent(id)}`); }

  async uploadPair({ personal, product }, save) {
    if (typeof save !== 'function') throw new Error('Persist upload receipts with save.');
    // Independent transfers overlap, but settle both before reporting failure:
    // the other transfer may have created an asset that still needs a receipt.
    const results = await Promise.allSettled(['personal', 'product'].map(async role => {
      const asset = await this.upload(role === 'personal' ? personal : product, {
        role, fileName: 'demo-' + role,
        onReserved: id => save(role + 'UploadId', id)
      });
      await save(role + 'AssetId', asset.id);
      return asset.id;
    }));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    return { personalAssetId: results[0].value, productAssetId: results[1].value };
  }

  createJob({ personalAssetId, productAssetId, notificationEndpointId, context }, idempotencyKey) {
    if (!idempotencyKey) throw new Error('Save an idempotency key before submitting.');
    return this.request('/dressme/jobs', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { personalAssetId, productAssetId, ...(notificationEndpointId ? { notificationEndpointId } : {}), ...(context ? { context } : {}) } });
  }

  async waitForJob(id, { timeoutMs = 120000, intervalMs = 1500, onStatus = () => {} } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(intervalMs) || intervalMs < 10) throw new Error('Use positive timeoutMs and intervalMs >= 10.');
    const signal = AbortSignal.timeout(timeoutMs);
    while (true) {
      signal.throwIfAborted();
      const job = await this.request(`/dressme/jobs/${encodeURIComponent(id)}`, { signal });
      await onStatus(job.status);
      if (job.status === 'succeeded') return job;
      if (job.status === 'failed') throw new ApiError(job.error?.message || 'Generation failed.', { code: job.error?.code || 'generation_failed' });
      if (!['queued', 'running'].includes(job.status)) throw new Error('Unexpected job state. Stop and investigate.');
      await new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, intervalMs);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
    }
  }
}
