import { randomUUID } from 'node:crypto';
import { DressMeClient } from './src/client.mjs';
import { DUMMY, PLACEHOLDER, startMockApi } from './src/mock-api.mjs';

const failure = process.argv.includes('--failure');
const mock = await startMockApi({ failure });
try {
  console.log('DressMe Partner API — LOCAL SIMULATION ONLY');
  console.log('Dummy credentials. Placeholder images. No Velox/cloud calls or generation charges.\n');
  const api = new DressMeClient({ baseUrl: mock.baseUrl, ...DUMMY });
  await api.verifyEnvironment('local-mock');
  console.log('1. Backend connection and expected environment verified.');
  // In this throwaway simulation, IDs live in memory. Persist them in your database in a real integration.
  const saved = {};
  const image = new Blob([PLACEHOLDER], { type: 'image/png' });
  const product = await api.upload(image, { role: 'product', fileName: 'dummy-product.png', onReserved: id => { saved.productUploadId = id; } });
  saved.productAssetId = product.id; // Completion may return a deduplicated catalogue ID.
  console.log('2. Product uploaded and completed. Reuse its final asset ID for later shoppers.');
  const personal = await api.upload(image, { role: 'personal', fileName: 'dummy-person.png', onReserved: id => { saved.personalUploadId = id; } });
  saved.personalAssetId = personal.id;
  console.log('3. Personal image uploaded under this shopper’s opaque subject.');
  saved.idempotencyKey = randomUUID();
  saved.payload = { personalAssetId: saved.personalAssetId, productAssetId: saved.productAssetId };
  const job = await api.createJob(saved.payload, saved.idempotencyKey);
  saved.jobId = job.id;
  console.log(`4. Job accepted: ${job.status}. Poll this job; do not submit another.`);
  const done = await api.waitForJob(saved.jobId, { intervalMs: 50, onStatus: status => console.log(`   Status: ${status}`) });
  const result = await fetch(done.result.url, { redirect: 'error', signal: AbortSignal.timeout(5000) }); // No API headers.
  if (!result.ok) throw new Error('Could not read simulated result.');
  const imageBytes = new Uint8Array(await result.arrayBuffer());
  console.log(`5. Result retrieved (${imageBytes.length} bytes). simulated=${done.simulated}.`);
  console.log('   This is a one-pixel placeholder, NOT an AI try-on or evidence of quality/latency.');
} catch (error) {
  if (failure && error.code === 'generation_failed') console.log(`Handled expected failure: ${error.message}`);
  else { console.error(`Example stopped: ${error.name}${error.code ? ` (${error.code})` : ''}. No automatic retry.`); process.exitCode = 1; }
} finally {
  await mock.close();
  console.log('\nRegister Partner API interest: https://studio.v3lox.com/partner-api#apply (mention Partner API / DressMe)');
}
