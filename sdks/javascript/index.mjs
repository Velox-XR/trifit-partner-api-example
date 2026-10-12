export class VeloxError extends Error {
  constructor(message, { status = 0, code = 'network_error', requestId, retryAfter } = {}) {
    super(message);
    this.name = 'VeloxError';
    Object.assign(this, { status, code, requestId, retryAfter });
  }
}

export class VeloxDressMe {
  constructor({ baseUrl, clientId, fetch: fetchImpl = globalThis.fetch, timeoutMs = 30000, autoRefresh = false, serverToken, integrationKey, subject }) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
      throw new Error('Use HTTPS or HTTP loopback for the local sandbox');
    }
    if (url.username || url.password || url.search || url.hash) throw new Error('Invalid API base URL');
    if (!clientId || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('clientId and positive timeoutMs required');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    // Browser fetch requires the Window/global receiver, not this SDK instance.
    this.fetch = fetchImpl.bind(globalThis);
    this.timeoutMs = timeoutMs;
    this.session = null;
    this.autoRefresh = autoRefresh;
    this.refreshInFlight = null;
    this.serverToken = serverToken;
    if(integrationKey&&typeof window!=='undefined')throw new Error('Integration access keys belong on your backend, never in browser code');
    this.integrationKey=integrationKey;
    if(subject!==undefined&&(!integrationKey?.startsWith('va_')||!/^[A-Za-z0-9_-]{1,128}$/.test(subject)))throw new Error('Subject requires an application credential and an opaque reference');
    this.subject=subject;
  }

  async request(path, { method = 'GET', body, signal, headers = {}, _authRetry = false } = {}) {
    const sentToken = this.session?.accessToken;
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method, signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: 'error',
      headers: {
        'X-Velox-Client-Id': this.clientId,
        ...(this.integrationKey?{'X-Velox-Integration-Key':this.integrationKey}:{}),
        ...(this.subject?{'X-Velox-Subject':this.subject}:{}),
        ...(this.session || this.serverToken ? { Authorization: `Bearer ${this.session?.accessToken || this.serverToken}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = response.status === 204 ? null : await response.json();
    if (this.autoRefresh && !_authRetry && !path.startsWith('/auth/') && response.status === 401 && data?.error?.code === 'unauthorized' && this.session) {
      if (this.session.accessToken === sentToken) await this.refresh();
      return this.request(path, { method, body, signal, headers, _authRetry: true });
    }
    if (!response.ok) throw new VeloxError(data?.error?.message || 'Request failed', {
      status: response.status, code: data?.error?.code || 'api_error',
      requestId: response.headers.get('x-request-id'), retryAfter: response.headers.get('retry-after')
    });
    return data;
  }

  requireBackend() { if (typeof window !== 'undefined' || !this.integrationKey) throw new Error('Linked account operations require your authenticated backend and integration key'); }
  createLinkChallenge(externalUserId, purpose = 'link') { this.requireBackend(); return this.request('/auth/linked/challenge', {method:'POST',body:{externalUserId,purpose}}); }
  async linkAccount({challengeId,idToken,consent}) { this.requireBackend(); this.session=await this.request('/auth/linked/link',{method:'POST',body:{challengeId,idToken,consent}}); return this.session; }
  async loginLinkedAccount({challengeId,idToken}) { this.requireBackend(); this.session=await this.request('/auth/linked/session',{method:'POST',body:{challengeId,idToken}}); return this.session; }
  linkedAccount() { this.requireBackend(); return this.request('/auth/linked/account'); }
  async unlinkAccount(linkId) { this.requireBackend(); const result=await this.request('/auth/linked/unlink',{method:'POST',body:{linkId}}); this.session=null; return result; }

  requestCode(email) { return this.request('/auth/email/request-code', { method: 'POST', body: { email } }); }
  async verifyCode(challengeId, code) {
    this.session = await this.request('/auth/email/verify', { method: 'POST', body: { challengeId, code } });
    return this.session;
  }
  async refresh() {
    if (!this.session) throw new Error('No session');
    if (this.refreshInFlight) return this.refreshInFlight;
    const before = this.session;
    this.refreshInFlight = (async () => {
      const updated = await this.request('/auth/refresh', { method: 'POST', body: { refreshToken: before.refreshToken } });
      if (this.session !== before) throw new Error('Session changed during renewal; sign in again');
      this.session = updated;
      return updated;
    })();
    try { return await this.refreshInFlight; }
    finally { this.refreshInFlight = null; }
  }
  async logout() {
    if (!this.session) return;
    await this.request('/auth/logout', { method: 'POST', body: { refreshToken: this.session.refreshToken } });
    this.session = null;
  }
  me() { return this.request('/me'); }
  applicationInfo() { this.requireBackend(); return this.request('/me'); }
  notificationEndpoints() { this.requireBackend(); return this.request('/notification-endpoints'); }
  registerNotificationEndpoint(url) { this.requireBackend(); return this.request('/notification-endpoints',{method:'POST',body:{url}}); }
  setNotificationEndpointState(id,{enabled,expectedRevision}) { this.requireBackend(); return this.request(`/notification-endpoints/${encodeURIComponent(id)}/state`,{method:'POST',body:{enabled,expectedRevision}}); }
  importProductImage(url,{signal}={}) { this.requireBackend(); return this.request('/assets/import',{method:'POST',body:{url},signal}); }
  deleteAsset(id) { this.requireBackend(); return this.request(`/assets/${encodeURIComponent(id)}/delete`,{method:'POST',body:{}}); }
  deleteSubject() { this.requireBackend(); return this.request('/subjects/delete',{method:'POST',body:{}}); }
  profiles() { this.requireBackend(); return this.request('/profiles'); }
  overview({runId}={}) { this.requireBackend(); return this.request('/admin/overview'+(runId?'?runId='+encodeURIComponent(runId):'')); }
  getAsset(id) { return this.request(`/assets/${encodeURIComponent(id)}`); }
  createImageUpload({ role, fileName, contentType, sizeBytes }, { signal } = {}) {
    return this.request('/assets/upload-url', { method: 'POST', signal, body: { role, fileName, contentType, sizeBytes } });
  }
  completeImageUpload(assetId, { signal } = {}) {
    return this.request(`/assets/${encodeURIComponent(assetId)}/complete`, { method: 'POST', signal, body: {} });
  }

  async uploadImage(file, { role, fileName = 'image.png', signal, onAssetCreated } = {}) {
    const target = await this.createImageUpload({
      role, fileName, contentType: file.type, sizeBytes: file.size
    }, { signal });
    // Persist the ID before transferring bytes, without persisting the signed
    // capability. A client can reconcile /complete after an uncertain response.
    if(onAssetCreated)await onAssetCreated(target.assetId);
    // Signed upload URLs are capabilities. Never forward the user's bearer token.
    const uploadUrl = new URL(target.uploadUrl);
    const localApi = new URL(this.baseUrl);
    if (uploadUrl.protocol !== 'https:' && !(localApi.protocol === 'http:' && uploadUrl.origin === localApi.origin)) {
      throw new Error('Unsafe upload URL');
    }
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const response = await this.fetch(uploadUrl, {
      method: 'PUT', headers: target.uploadHeaders, body: file, redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout
    });
    if (!response.ok) throw new VeloxError('Image upload failed', { status: response.status, code: 'upload_failed' });
    return this.completeImageUpload(target.assetId, { signal });
  }
  uploadPersonalPhoto(file, options = {}) { return this.uploadImage(file, { ...options, role: 'personal' }); }
  uploadProductImage(file, options = {}) { return this.uploadImage(file, { ...options, role: 'product' }); }
  createDressMeJob(input, { idempotencyKey = crypto.randomUUID(), signal } = {}) {
    if(Object.hasOwn(input,'routeProfile'))return Promise.reject(new VeloxError('Routes are assigned by Velox Admin; omit routeProfile',{status:400,code:'route_managed_by_velox'}));
    const {personalAssetId,productAssetId,notificationEndpointId,context}=input;
    return this.request('/dressme/jobs', { method: 'POST', signal,
      headers: { 'Idempotency-Key': idempotencyKey }, body: { personalAssetId, productAssetId, ...(notificationEndpointId?{notificationEndpointId}:{}),...(context?{context}:{}) } });
  }
  getDressMeJob(id, { signal } = {}) { return this.request(`/dressme/jobs/${encodeURIComponent(id)}`, { signal }); }
  createAnimateMeJob(input, { idempotencyKey = crypto.randomUUID(), signal } = {}) {
    if(Object.hasOwn(input,'routeProfile'))return Promise.reject(new VeloxError('Routes are assigned by Velox Admin; omit routeProfile',{status:400,code:'route_managed_by_velox'}));
    const {sourceAssetId,notificationEndpointId,context}=input;
    return this.request('/animateme/jobs', {method:'POST',signal,headers:{'Idempotency-Key':idempotencyKey},body:{sourceAssetId,...(notificationEndpointId?{notificationEndpointId}:{}),...(context?{context}:{})}});
  }
  getAnimateMeJob(id, { signal } = {}) { return this.request(`/animateme/jobs/${encodeURIComponent(id)}`, {signal}); }
  waitForDressMe(id, options) { return this.waitForJob('dressme',id,options); }
  waitForAnimateMe(id, options) { return this.waitForJob('animateme',id,options); }
  async waitForJob(kind, id, { timeoutMs = 120000, intervalMs = 1000, signal, onStatus } = {}) {
    if(!['dressme','animateme'].includes(kind))throw new Error('Unknown generation kind');
    if (!Number.isFinite(intervalMs) || intervalMs < 10) throw new Error('intervalMs must be at least 10');
    const deadline = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    while (true) {
      combined.throwIfAborted();
      const job = await (kind==='animateme'?this.getAnimateMeJob(id,{signal:combined}):this.getDressMeJob(id,{signal:combined}));
      if (onStatus) await onStatus(job);
      if (job.status === 'succeeded') return job;
      if (job.status === 'failed') throw new VeloxError(job.error?.message || 'Generation failed', { code: job.error?.code || 'generation_failed' });
      await new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(combined.reason); };
        const timer = setTimeout(() => { combined.removeEventListener('abort', abort); resolve(); }, intervalMs);
        combined.addEventListener('abort', abort, { once: true });
        if (combined.aborted) abort();
      });
    }
  }
}
