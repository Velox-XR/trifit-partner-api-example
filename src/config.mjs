export function validateConfig(config) {
  const invalid = value => typeof value !== 'string' || !value.trim() || /INVALID|DUMMY|YOUR_|REPLACE_/i.test(value);
  if (invalid(config.clientId) || invalid(config.applicationKey) || !config.applicationKey.startsWith('va_') || invalid(config.sessionSecret) || config.sessionSecret.length < 32) {
    throw new Error('Apply to Velox for your private partner.config.json. The public example key is intentionally invalid.');
  }
  const base = new URL(config.baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.hostname.endsWith('.invalid')) throw new Error('Use the HTTPS API base URL supplied by Velox.');
  if (!['development', 'production'].includes(config.environment)) throw new Error('Use the exact environment supplied by Velox.');
  if (config.demoIntegration !== true || config.allowRealGeneration !== true) throw new Error('Real generation must be explicitly enabled for this dedicated demo integration.');
  const queueGapSeconds = config.queueGapSeconds ?? 10;
  const maxPending = config.maxPending ?? 25;
  const port = config.port ?? 5190;
  if (!Number.isInteger(queueGapSeconds) || queueGapSeconds < 1 || queueGapSeconds > 3600) throw new Error('queueGapSeconds must be an integer from 1 to 3600.');
  if (!Number.isInteger(maxPending) || maxPending < 1 || maxPending > 100) throw new Error('maxPending must be an integer from 1 to 100.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local demo port.');
  return { ...config, baseUrl: base.href.replace(/\/$/, ''), queueGapSeconds, maxPending, port };
}
