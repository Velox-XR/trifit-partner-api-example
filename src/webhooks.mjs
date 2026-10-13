import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { QueueError } from './queue.mjs';

export function verifyWebhook(bytes, headers, config, now = Date.now()) {
  if (!config?.secret || !config.keyId) throw new QueueError('Webhook not configured.', 404);
  const timestamp = String(headers['x-velox-timestamp'] || ''), signature = String(headers['x-velox-signature'] || '');
  const expected = 'v1=' + createHmac('sha256', config.secret).update(timestamp + '.').update(bytes).digest('hex');
  if (headers['x-velox-key-id'] !== config.keyId || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300
    || !/^v1=[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new QueueError('Invalid webhook signature.', 401);
  let event; try { event = JSON.parse(bytes); } catch { throw new QueueError('Invalid webhook event.', 400); }
  const uuid = /^[a-f0-9-]{36}$/;
  if (!uuid.test(event.eventId || '') || event.eventId !== headers['x-velox-event-id'] || !uuid.test(event.jobId || '')
    || event.environment !== config.environment || !['succeeded', 'failed'].includes(event.status) || event.type !== 'dressme.' + event.status) throw new QueueError('Invalid webhook event.', 400);
  // No URL or payload from a callback becomes an authorized result. Re-read the job.
  return { eventId: event.eventId, jobId: event.jobId, requestId: event.context?.requestId, status: event.status,
    bodyHash: createHash('sha256').update(bytes).digest('hex'), receivedAt: now };
}

export function validateWebhook(config, environment) {
  if (!config || !/^[a-z0-9][a-z0-9-]{2,60}$/.test(config.endpointId || '') || typeof config.keyId !== 'string' || !config.keyId
    || typeof config.secret !== 'string' || config.secret.length < 32 || /INVALID|REPLACE_/i.test(config.secret)) throw new Error('Use the registered webhook endpoint and private signing key supplied by Velox.');
  const recoveryAfterMs = config.recoveryAfterMs ?? 600000;
  if (!Number.isInteger(recoveryAfterMs) || recoveryAfterMs < 1000 || recoveryAfterMs > 3600000) throw new Error('Invalid webhook recovery delay.');
  return { ...config, environment, recoveryAfterMs };
}
