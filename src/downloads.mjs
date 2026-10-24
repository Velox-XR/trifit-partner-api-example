import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const repositoryUrl = 'https://github.com/Velox-XR/trifit-partner-api-example';
// Deliberate public-source allowlist. Never walk the filesystem or include private config.
export const publicFiles = Object.freeze([
  'LICENSE', 'README.md', 'WALKTHROUGH.md', 'SECURITY.md', '.gitignore',
  'package.json', 'package-lock.json', 'partner.config.example.json', 'server.mjs', 'demo.mjs',
  'src/client.mjs', 'src/config.mjs', 'src/queue.mjs', 'src/demo-server.mjs',
  'src/downloads.mjs', 'src/mock-api.mjs', 'src/webhooks.mjs', 'src/asset-downloads.mjs', 'setup-webhook.mjs', 'test/completion-downloads.test.mjs', 'web/index.html', 'web/admin.html',
  'web/app.mjs', 'web/admin.mjs', 'web/style.css', 'web/workspace.mjs', 'web/starter-products.mjs',
  'web/samples/README.md',
  'web/samples/collage-green-trench-details.png', 'web/samples/collage-green-trench-look.png',
  'web/samples/collage-burgundy-trench.png', 'web/samples/collage-navy-blazer.jpg', 'web/samples/collage-leather-denim.jpg',
  'web/samples/public-amara-person.webp', 'web/samples/public-amara-reference.webp', 'web/samples/public-amara-result.webp',
  'web/samples/public-mateo-person.webp', 'web/samples/public-mateo-reference.webp', 'web/samples/public-mateo-result.webp',
  'examples/account/README.md', 'examples/account/oauth.mjs', 'examples/account/client.mjs', 'examples/account/main.mjs',
  'docs/DRESSME_ACCESS.md', 'test/account-example.test.mjs', 'test/starter-products.test.mjs',
  'sdks/javascript/index.mjs', 'sdks/javascript/index.d.ts',
  'sdks/javascript/package.json', 'sdks/javascript/README.md', 'sdks/javascript/LICENSE',
  'docs/GETTING_STARTED.md', 'docs/SDK_CATALOG.md', 'docs/HOSTING.md',
  'docs/CODING_AGENTS.md', 'docs/MCP_REGISTRY.md', 'server.json',
  'examples/mcp/vscode.json', 'examples/mcp/github-copilot.json', 'examples/mcp/codex.toml',
  '.agents/skills/velox-partner-api/SKILL.md', 'scripts/sync-agent-skill.mjs', 'test/agent-discovery.test.mjs',
  'scripts/verify-public-docs-mcp.mjs',
  'skills/velox-partner-api/SKILL.md', 'test/integration.test.mjs', 'test/queue.test.mjs',
  'test/developer-hub.test.mjs', 'test/workspace.test.mjs', 'test/parallel-upload.test.mjs'
]);

// Dependency-free ZIP32, stored entries. Inputs come only from the fixed allowlist.
export function zip(files) {
  const local = [], central = []; let offset = 0;
  for (const [name, data] of files) {
    const path = Buffer.from(name); let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(path.length, 26);
    local.push(header, path, data);
    const item = Buffer.alloc(46); item.writeUInt32LE(0x02014b50); item.writeUInt16LE(20, 4); item.writeUInt16LE(20, 6);
    item.writeUInt32LE(crc, 16); item.writeUInt32LE(data.length, 20); item.writeUInt32LE(data.length, 24); item.writeUInt16LE(path.length, 28); item.writeUInt32LE(offset, 42);
    central.push(item, path); offset += header.length + path.length + data.length;
  }
  const index = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, index, end]);
}

export async function buildPublicDownload(root = new URL('../', import.meta.url)) {
  // Preserve allowlisted binary media. Canonical LF makes text reproducible across hosts.
  const files = await Promise.all(publicFiles.map(async name => [name, /\.(webp|png|jpg)$/.test(name)
    ? await readFile(new URL(name, root))
    : Buffer.from((await readFile(new URL(name, root), 'utf8')).replace(/\r\n/g, '\n'))]));
  const bytes = zip(files);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), fileName: 'velox-demo-javascript.zip' };
}
