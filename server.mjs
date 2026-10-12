import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { DressMeClient } from './src/client.mjs';
import { validateConfig } from './src/config.mjs';
import { DemoQueue } from './src/queue.mjs';
import { startDemoServer } from './src/demo-server.mjs';

const preview = process.argv.length === 3 && process.argv[2] === '--preview';
let queue; let server; let timer; let ticking = Promise.resolve();
try {
  if (process.argv.length > 2 && !preview) throw new Error('Use npm start, or npm run preview for the disabled UI.');
  if (preview) {
    server = await startDemoServer({});
    console.log(`UI preview only — generation disabled: ${server.origin}`);
  } else {
    let config;
    try { config = validateConfig(JSON.parse(await readFile('partner.config.json', 'utf8'))); }
    catch { throw new Error('Real demo is disabled. Apply at https://studio.v3lox.com/#contact for your unique partner integration and private partner.config.json. The public example key is invalid. Use npm run preview or npm run demo:mock without credentials.'); }
    const apiFor = subject => new DressMeClient({ ...config, subject });
    const info = await apiFor('demo-connection-check').verifyEnvironment(config.environment);
    if (info.clientId !== config.clientId) throw new Error('Assigned integration does not match. Stop and contact Velox.');
    const binding = createHash('sha256').update(JSON.stringify([config.baseUrl, config.clientId, config.environment, config.sessionSecret])).digest('hex');
    queue = await DemoQueue.open({ directory: resolve('.demo-state'), binding, apiFor, gapMs: config.queueGapSeconds * 1000, maxPending: config.maxPending });
    server = await startDemoServer({ queue, apiFor, sessionSecret: config.sessionSecret, port: config.port, gapSeconds: config.queueGapSeconds });
    timer = setInterval(() => { ticking = ticking.then(() => queue.tick()).catch(() => { clearInterval(timer); console.error('Queue stopped for review. No automatic resubmission.'); }); }, 2000);
    console.log(`Real DressMe demo: ${server.origin}`);
    console.log(`Shared queue: minimum ${config.queueGapSeconds}s between starts; one active generation. Real generation can incur charges.`);
  }
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true; clearInterval(timer);
    await server.close(); await ticking; await queue?.close();
  };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch (error) {
  clearInterval(timer); await server?.close(); await queue?.close();
  // Config validation errors above are safe; never dump a fetch error or credential.
  console.error(error.message.startsWith('Real demo is disabled.') || error.message.startsWith('Use npm') ? error.message : 'Demo could not start. Check the private configuration and queue ownership; no automatic retry.');
  process.exitCode = 1;
}
