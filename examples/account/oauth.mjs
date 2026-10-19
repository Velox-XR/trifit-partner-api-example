import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

// Public Production endpoints, never an application key or a saved user token.
export const RESOURCE = 'https://studio.v3lox.com/partner/trifit/mcp';
export const ISSUER = 'https://trifit.v3lox.com/consumer/studio';
export const READ_SCOPES = ['trifit:read', 'trifit:images:read'];
export const ACTION_SCOPES = [...READ_SCOPES, 'trifit:images:write', 'trifit:try-on'];
export const randomSecret = () => randomBytes(32).toString('base64url');
export const challenge = verifier => createHash('sha256').update(verifier).digest('base64url');
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function boundedFetch(url, options = {}) {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.any([
    AbortSignal.timeout(60_000), ...(options.signal ? [options.signal] : [])
  ]) });
}
async function json(request, url, options) {
  const response = await request(url, options);
  if (!response.ok) throw new Error(`Authentication request failed (HTTP ${response.status}). No automatic retry.`);
  return response.json();
}

export async function discover(request = boundedFetch) {
  const resource = await json(request, 'https://studio.v3lox.com/.well-known/oauth-protected-resource/partner/trifit/mcp');
  if (resource.resource !== RESOURCE || !resource.authorization_servers?.includes(ISSUER)) throw new Error('Unexpected Production authorization server. Stopped.');
  const metadata = await json(request, 'https://trifit.v3lox.com/.well-known/oauth-authorization-server/consumer/studio');
  if (metadata.issuer !== ISSUER || !metadata.code_challenge_methods_supported?.includes('S256')) throw new Error('Invalid Production OAuth metadata.');
  for (const [field, path] of Object.entries({ authorization_endpoint: 'authorize', token_endpoint: 'token', registration_endpoint: 'register', revocation_endpoint: 'revoke' })) {
    if (metadata[field] !== `${ISSUER}/oauth/${path}`) throw new Error('Unexpected OAuth endpoint. Stopped.');
  }
  return metadata;
}

// Binds only to loopback. State + PKCE + issuer bind the callback to this process.
// No passwords/email codes are accepted by this example; enter them on TriFit only.
export async function callbackReceiver(state, timeoutMs = 600_000) {
  let complete, fail, used = false;
  const result = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
  result.catch(() => {}); // A discovery failure may close before the caller awaits it.
  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const expectedHost = `127.0.0.1:${server.address().port}`;
    const url = new URL(req.url, `http://${expectedHost}`);
    if (req.headers.host !== expectedHost || req.method !== 'GET' || url.pathname !== '/callback' || used) {
      res.writeHead(404); res.end('Not found'); return;
    }
    if (!equal(url.searchParams.get('state'), state) || url.searchParams.get('iss') !== ISSUER) {
      res.writeHead(400); res.end('Invalid sign-in callback. Return to your terminal.'); return;
    }
    const code = url.searchParams.get('code');
    used = true;
    if (url.searchParams.has('error') || !code || !/^[\w-]{43}$/.test(code)) {
      res.writeHead(400); res.end('Connection was not completed.'); fail(new Error('TriFit sign-in was cancelled or invalid.')); return;
    }
    res.end('Connected. Return to the terminal. No upload or generation has run. You may close this tab.');
    complete(code);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const timer = setTimeout(() => { fail(new Error('Sign-in timed out. No automatic retry.')); server.close(); }, timeoutMs);
  return {
    redirectUri: `http://127.0.0.1:${server.address().port}/callback`, result,
    close: () => { clearTimeout(timer); server.close(); server.closeAllConnections(); }
  };
}

export async function signIn({ actions = false, print = console.log, request = boundedFetch } = {}) {
  const state = randomSecret(), verifier = randomSecret();
  const receiver = await callbackReceiver(state);
  try {
    const metadata = await discover(request), scopes = actions ? ACTION_SCOPES : READ_SCOPES;
    if (!scopes.every(scope => metadata.scopes_supported?.includes(scope))) throw new Error('Required account permissions are not available.');
    const client = await json(request, metadata.registration_endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Velox TriFit local account example', redirect_uris: [receiver.redirectUri],
        token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'] })
    });
    if (typeof client.client_id !== 'string' || !client.client_id) throw new Error('Invalid OAuth client registration.');
    const url = new URL(metadata.authorization_endpoint);
    url.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: receiver.redirectUri,
      response_type: 'code', code_challenge: challenge(verifier), code_challenge_method: 'S256',
      scope: scopes.join(' '), resource: RESOURCE, state }).toString();
    print('Open this link in your browser. Sign in to YOUR TriFit account and approve the displayed permissions:');
    print(url.href); // Authorization URL has no access token, email, code or PKCE verifier.
    const code = await receiver.result;
    const tokens = await json(request, metadata.token_endpoint, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier,
        client_id: client.client_id, redirect_uri: receiver.redirectUri, resource: RESOURCE }) });
    if (typeof tokens.access_token !== 'string' || !/^[\w-]{43}$/.test(tokens.access_token)
      || tokens.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0
      || !scopes.every(scope => String(tokens.scope || '').split(' ').includes(scope))) throw new Error('Invalid account token response.');
    return { accessToken: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000,
      async revoke() {
        await json(request, metadata.revocation_endpoint, { method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: tokens.access_token, client_id: client.client_id }) });
      } };
  } finally { receiver.close(); }
}
