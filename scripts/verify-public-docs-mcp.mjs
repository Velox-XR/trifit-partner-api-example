// Explicit, bounded read-only Production check; never called by npm test/CI.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const endpoint = 'https://studio.v3lox.com/partner/docs/mcp';
const allowed = ['search', 'fetch', 'get_integration_example', 'get_partner_access_requirements'];
const client = new Client({name:'velox-public-discovery-readonly-check', version:'1.0.0'});
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const deadline = setTimeout(() => { console.error('Read-only verification deadline exceeded'); process.exit(1); }, 60000);
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const inventory = await client.listTools();
  assert.deepEqual(inventory.tools.map(t => t.name), allowed);
  for (const tool of inventory.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
  }
  const call = async (name, args = {}) => {
    assert.ok(allowed.includes(name));
    const result = await client.callTool({name, arguments:args});
    assert.ok(!result.isError, `Documentation tool failed: ${name}`);
    return result.structuredContent ?? JSON.parse(result.content.find(c => c.type === 'text').text);
  };
  const search = await call('search', {query:'application authentication'});
  assert.ok(search.results.some(d => d.id === 'sdk-reference'));
  const document = await call('fetch', {id:'sdk-reference'});
  assert.match(document.url, /^https:\/\/github\.com\/Velox-XR\/trifit-partner-api-example\//);
  assert.ok(document.text.length > 0);
  const example = await call('get_integration_example', {language:'javascript'});
  assert.equal(example.simulated, true);
  const access = await call('get_partner_access_requirements');
  assert.match(access.provisioning, /Manual Velox approval/);
  console.log(JSON.stringify({checkedAtUtc:new Date().toISOString(), endpoint,
    server:client.getServerVersion(), tools:allowed, toolsSha256:sha(inventory.tools),
    documentSha256:document.sha256, protocolPassed:true,
    applicationUrl:access.applicationUrl,
    applicationLinkCurrent:access.applicationUrl === 'https://studio.v3lox.com/partner-api#apply',
    nativeClientAcceptance:false,
    effects:{accountReads:0, uploads:0, generation:0, settingsChanges:0}}, null, 2));
} finally {
  clearTimeout(deadline);
  await client.close();
}
