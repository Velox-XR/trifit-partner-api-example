import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPlugin,pluginFiles} from '../scripts/package-plugin.mjs';
const root=new URL('../',import.meta.url);
test('plugin is self-contained and excludes private runtime material',async()=>{
 const m=JSON.parse(await readFile(new URL('plugin.json',root),'utf8'));
 const legacy=JSON.parse(await readFile(new URL('.codex-plugin/plugin.json',root),'utf8'));
 assert.equal(m.name,legacy.name);assert.equal(m.version,legacy.version);
 assert.deepEqual(m.extensions['com.openai'].interface,legacy.interface);
 for(const asset of ['logo','composerIcon'])assert.ok(pluginFiles.includes(m.extensions['com.openai'].interface[asset].replace(/^.\//,'')));
 assert.ok(pluginFiles.includes('skills/velox-partner-api/SKILL.md'));
 assert.ok(pluginFiles.includes('sdks/javascript/index.mjs'));
 assert.ok(!pluginFiles.some(p=>/(^|\/)(?:\.env|partner\.config\.json|\.demo-state|credentials|results|uploads)(?:$|[/.])/.test(p)));
 const {bytes}=await buildPlugin();assert.equal(bytes.readUInt32LE(0),0x04034b50);
 assert.ok(!pluginFiles.some(p=>p.startsWith('outputs/')));
});
test('marketplace source resolves packaged root',async()=>{
 const m=JSON.parse(await readFile(new URL('.agents/plugins/marketplace.json',root),'utf8'));
 assert.equal(m.plugins[0].name,'velox-trifit-developer');assert.equal(m.plugins[0].source.path,'./');
});

