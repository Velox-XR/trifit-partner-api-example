// Package only the reviewed client instructions/configuration; no server or secrets.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {relative, isAbsolute} from 'node:path';
import {zip} from '../src/downloads.mjs';

export const productionRoot = new URL('../plugins/velox-trifit/', import.meta.url);
const profiles = Object.freeze({
  production: {name:'velox-trifit', version:'1.2.1', url:'https://studio.v3lox.com/partner/trifit/mcp'}
});
export const trifitFiles = Object.freeze(['plugin.json', 'mcp.json',
  'skills/velox-trifit-setup/SKILL.md', 'skills/velox-trifit-developer/SKILL.md',
  'skills/velox-trifit-try-on/SKILL.md', 'assets/trifit-icon.png']);

export async function buildTriFitPlugin(root = productionRoot, environment = 'production') {
  assert.ok(Object.hasOwn(profiles, environment), 'Explicit supported package environment required');
  const profile = profiles[environment];
  const resolvedRoot = await realpath(fileURLToPath(root));
  const entries = await Promise.all(trifitFiles.map(async name => {
    const file = new URL(name, root), resolved = await realpath(fileURLToPath(file));
    const rel = relative(resolvedRoot, resolved);
    assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Package file must stay inside its source root');
    const bytes = name.endsWith('.png') ? await readFile(file)
      : Buffer.from((await readFile(file, 'utf8')).replace(/\r\n/g, '\n'));
    return [name, bytes];
  }));
  const files = new Map(entries);
  const manifest = JSON.parse(files.get('plugin.json'));
  assert.equal(manifest.name, profile.name);
  assert.equal(manifest.version, profile.version);
  assert.deepEqual(JSON.parse(files.get('mcp.json')), {
    $schema:'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers:{'velox-trifit':{type:'streamable-http',url:profile.url}}
  });
  const ext = manifest.extensions['com.openai'];
  assert.deepEqual(Object.keys(ext).sort(), ['interface', 'onboardingSkill']);
  for (const name of [ext.onboardingSkill, ext.interface.logo, ext.interface.composerIcon]) {
    assert.ok(name.startsWith('./') && files.has(name.slice(2)), 'Manifest reference must be packaged');
  }
  const bytes = zip(entries);
  return {bytes, sha256:createHash('sha256').update(bytes).digest('hex'), files:[...trifitFiles],
    version:manifest.version, fileName:`${manifest.name}-${manifest.version}.zip`};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const environment = process.argv[2] || 'production';
  assert.ok(process.argv.length <= 3 && Object.hasOwn(profiles, environment), 'Only Production packages are distributed here');
  const result = await buildTriFitPlugin(productionRoot, environment);
  const out = new URL('../dist/', import.meta.url);
  await mkdir(out, {recursive:true});
  await writeFile(new URL(result.fileName, out), result.bytes);
  await writeFile(new URL(`${result.fileName}.sha256`, out), `${result.sha256}  ${result.fileName}\n`);
  console.log(JSON.stringify({file:`dist/${result.fileName}`,sha256:result.sha256,files:result.files.length,
    environment,publicDirectoryApproval:false}));
}
