import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {publicFiles} from '../src/downloads.mjs';
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


const root = new URL('../',import.meta.url);
const extras=['plugin.json','.codex-plugin/plugin.json','.agents/plugins/marketplace.json','assets/trifit-icon.png','skills/velox-partner-api/agents/openai.yaml','docs/CODEX_PLUGIN.md','scripts/package-plugin.mjs','test/plugin.test.mjs'];
export const pluginFiles=[...new Set([...publicFiles,...extras])].sort();
export async function buildPlugin(){
 const entries=await Promise.all(pluginFiles.map(async name=>[name,name.endsWith('.png') ? await readFile(new URL(name,root)) : Buffer.from((await readFile(new URL(name,root),'utf8')).replace(/\r\n/g,'\n'))]));
 const bytes=zip(entries);return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),files:pluginFiles};
}
if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url){
 const m=JSON.parse(await readFile(new URL('plugin.json',root),'utf8'));const result=await buildPlugin();
 const dir=new URL('dist/',root);await mkdir(dir,{recursive:true});
 await writeFile(new URL(`${m.name}-${m.version}.zip`,dir),result.bytes);
 await writeFile(new URL('plugin-package.json',dir),JSON.stringify({version:m.version,sha256:result.sha256,files:result.files},null,2));
 console.log(JSON.stringify({file:`dist/${m.name}-${m.version}.zip`,sha256:result.sha256,files:result.files.length}));
}
