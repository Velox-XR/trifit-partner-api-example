import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const repositoryUrl = 'https://github.com/Velox-XR/trifit-partner-api-example';
// Deliberate public-source allowlist. Never walk the filesystem or include private config.
export const publicFiles = Object.freeze([
  'LICENSE', 'README.md', 'WALKTHROUGH.md', 'SECURITY.md', '.gitignore',
  'package.json', 'partner.config.example.json', 'server.mjs', 'demo.mjs',
  'src/client.mjs', 'src/config.mjs', 'src/queue.mjs', 'src/demo-server.mjs',
  'src/downloads.mjs', 'src/mock-api.mjs', 'web/index.html', 'web/admin.html',
  'web/app.mjs', 'web/admin.mjs', 'web/style.css', 'web/workspace.mjs',
  'sdks/javascript/index.mjs', 'sdks/javascript/index.d.ts',
  'sdks/javascript/package.json', 'sdks/javascript/README.md', 'sdks/javascript/LICENSE',
  'docs/GETTING_STARTED.md', 'docs/SDK_CATALOG.md', 'docs/HOSTING.md',
  'skills/velox-partner-api/SKILL.md', 'test/integration.test.mjs', 'test/queue.test.mjs',
  'test/developer-hub.test.mjs', 'test/workspace.test.mjs', 'test/parallel-upload.test.mjs'
]);

// Dependency-free ZIP32, stored entries. Inputs come only from the fixed allowlist.
function zip(files) {
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
  // These are all UTF-8 source files. Canonical LF makes the download identical
  // across Windows Git checkouts and the Linux host, without changing content.
  const files = await Promise.all(publicFiles.map(async name => [name, Buffer.from((await readFile(new URL(name, root), 'utf8')).replace(/\r\n/g, '\n'))]));
  const bytes = zip(files);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), fileName: 'velox-demo-javascript.zip' };
}
