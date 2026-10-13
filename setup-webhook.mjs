// Run explicitly after Velox grants webhooks:write to your private application key.
import { readFile, writeFile } from 'node:fs/promises';
import { validateConfig } from './src/config.mjs';
import { DressMeClient } from './src/client.mjs';
try {
  const config = validateConfig(JSON.parse(await readFile('partner.config.json', 'utf8')));
  const url = new URL(process.argv[2]);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/webhooks/dressme')) throw new Error('Provide your public HTTPS webhook URL ending /webhooks/dressme.');
  const api = new DressMeClient({ ...config, subject: 'demo-connection-check' });
  const identity = await api.verifyEnvironment(config.environment);
  if (identity.clientId !== config.clientId) throw new Error('Integration mismatch.');
  const endpoint = await api.sdk.registerNotificationEndpoint(url.href);
  const updated = { ...config, webhook: { endpointId: endpoint.id, keyId: endpoint.keyId, secret: endpoint.secret, recoveryAfterMs: 600000 } };
  validateConfig(updated);
  await writeFile('partner.config.json', JSON.stringify(updated, null, 2) + '\n', { mode: 0o600 });
  console.log('Webhook configuration saved privately. Restart the demo. No generation was submitted.');
} catch { console.error('Webhook setup failed. Check your assigned scope and HTTPS callback URL. Keep credentials private; no generation was submitted.'); process.exitCode = 1; }
