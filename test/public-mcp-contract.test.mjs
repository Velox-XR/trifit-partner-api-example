import test from 'node:test';
import assert from 'node:assert/strict';
import {allowed, publicTools, connectedTools, checkInventory, endpoint} from '../scripts/public-mcp-contract.mjs';
const fixture = () => ({tools:[
  ...publicTools.map(name => ({name, annotations:{readOnlyHint:true, destructiveHint:false}, _meta:{securitySchemes:[{type:'noauth'}]}})),
  ...connectedTools.map(name => ({name, _meta:{securitySchemes:[{type:'oauth2', scopes:[]}]}})),
]});
test('current unified metadata includes both public docs and connected tools but verifier calls only four docs tools', () => {
  assert.equal(endpoint, 'https://studio.v3lox.com/partner/trifit/mcp');
  assert.equal(allowed.length, 4);
  assert.equal(publicTools.length, 5);
  assert.equal(connectedTools.length, 13);
  assert.ok(allowed.every(name => !connectedTools.includes(name)));
  checkInventory(fixture());
});
test('inventory verification rejects legacy-only, extra, duplicate and wrongly authenticated tools', () => {
  const variants = [fixture(), fixture(), fixture(), fixture(), fixture(), fixture()];
  variants[0].tools = variants[0].tools.filter(t => allowed.includes(t.name));
  variants[1].tools.push({name:'unexpected'});
  variants[2].tools[0].name = variants[2].tools[1].name;
  variants[3].tools[0].annotations.readOnlyHint = false;
  variants[4].tools[0]._meta.securitySchemes = [{type:'oauth2', scopes:[]}];
  variants[5].tools.at(-1)._meta.securitySchemes = [{type:'noauth'}];
  for (const inventory of variants) assert.throws(() => checkInventory(inventory));
});
