// Publish one maintained skill in the repository discovery path used by agents.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('skills/velox-partner-api/SKILL.md', root), 'utf8');
const target = new URL('.agents/skills/velox-partner-api/', root);
await mkdir(target, {recursive:true});
await writeFile(new URL('SKILL.md', target), source.replace(/\r\n/g, '\n'));
console.log('Synchronized the portable Velox Partner API skill.');
