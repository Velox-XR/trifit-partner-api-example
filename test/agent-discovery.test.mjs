import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicFiles, buildPublicDownload} from '../src/downloads.mjs';
const root = new URL('../', import.meta.url);
const read = async name => (await readFile(new URL(name, root), 'utf8')).replace(/\r\n/g, '\n');
const json = async name => JSON.parse(await read(name));
const endpoint = 'https://studio.v3lox.com/partner/docs/mcp';
const tools = ['search', 'fetch', 'get_integration_example', 'get_partner_access_requirements'];

test('client configuration dialects select only the public documentation server', async () => {
  const vscode = await json('examples/mcp/vscode.json');
  assert.deepEqual(vscode, {servers:{'velox-trifit-docs':{type:'http', url:endpoint}}});
  const cloud = await json('examples/mcp/github-copilot.json');
  assert.deepEqual(cloud, {mcpServers:{'velox-trifit-docs':{type:'http', url:endpoint, tools}}});
  const codex = await read('examples/mcp/codex.toml');
  assert.match(codex, /^\[mcp_servers\.velox-trifit-docs\]\n/);
  assert.equal(JSON.parse(codex.match(/^url = (.+)$/m)[1]), endpoint);
  assert.deepEqual(JSON.parse(codex.match(/^enabled_tools = (.+)$/m)[1]), tools);
  const openai = await json('mcp.json');
  assert.equal(openai.mcpServers['velox-docs'].type, 'streamable-http');
  assert.equal(openai.mcpServers['velox-docs'].url, endpoint);
});

test('registry candidate identifies the existing remote implementation without credentials', async () => {
  const metadata = await json('server.json');
  assert.equal(metadata.name, 'io.github.Velox-XR/velox-trifit-developer');
  assert.equal(metadata.$schema, 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
  assert.equal(metadata.version, (await read('src/docs-mcp.mjs')).match(/docsVersion = '([^']+)'/)[1]);
  assert.ok(metadata.description.length > 0 && metadata.description.length <= 100);
  assert.deepEqual(metadata.remotes, [{type:'streamable-http', url:endpoint}]);
  assert.equal(metadata.packages, undefined);
  assert.deepEqual(metadata.repository, {url:'https://github.com/Velox-XR/trifit-partner-api-example', source:'github'});
});

test('repository-discoverable skill stays identical to its maintained portable source', async () => {
  const source = await read('skills/velox-partner-api/SKILL.md');
  assert.equal(await read('.agents/skills/velox-partner-api/SKILL.md'), source);
  assert.match(source, /^---\nname: velox-partner-api\ndescription: .+\n---\n/);
  assert.ok(!source.includes('studio.v3lox.com/#contact'));
  assert.ok(!source.includes('bundles the repository at'));
});

test('public onboarding entry points use the current application anchor', async () => {
  for (const file of ['demo.mjs', 'web/index.html', 'web/admin.html', 'src/docs-mcp.mjs']) {
    const source = await read(file);
    assert.ok(!source.includes('https://studio.v3lox.com/#contact'), file);
    assert.ok(source.includes('https://studio.v3lox.com/partner-api#apply'), file);
  }
});

test('public source ZIP contains the new guide and every relative guide dependency', async () => {
  for (const file of ['docs/CODING_AGENTS.md', 'docs/MCP_REGISTRY.md']) {
    assert.ok(publicFiles.includes(file));
    const content = await read(file);
    for (const [,href] of content.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^https?:/.test(href) || href.startsWith('#')) continue;
      const target = new URL(href.split('#')[0], new URL(file, root));
      assert.ok(target.href.startsWith(root.href));
      const relative = decodeURIComponent(target.href.slice(root.href.length));
      assert.ok(publicFiles.includes(relative), `Missing ZIP dependency: ${relative}`);
      await readFile(target);
    }
  }
  const result = await buildPublicDownload();
  assert.equal(result.bytes.readUInt32LE(0), 0x04034b50);
  assert.ok(publicFiles.includes('.agents/skills/velox-partner-api/SKILL.md'));
  assert.ok(!publicFiles.some(p => p.startsWith('.mcpregistry_')));
});
