import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createDocumentationHandler} from '../src/docs-mcp.mjs';

test('public docs MCP works through the official client and exposes only read-only public content',async t=>{
 const handler=await createDocumentationHandler();
 const http=createServer((req,res)=>void handler(req,res));
 await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 const url=new URL(`http://127.0.0.1:${http.address().port}/mcp`);
 t.after(()=>{http.closeAllConnections();return new Promise(resolve=>http.close(resolve));});
 const client=new Client({name:'acceptance-test',version:'1.0.0'});
 await client.connect(new StreamableHTTPClientTransport(url));
 t.after(()=>client.close());
 const {tools}=await client.listTools();
 assert.deepEqual(tools.map(x=>x.name),['search','fetch','get_integration_example','get_partner_access_requirements']);
 for(const tool of tools){assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.annotations.destructiveHint,false);assert.equal(tool.annotations.openWorldHint,false);}
 const call=async(name,args={})=>{const result=await client.callTool({name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text);};
 assert.ok((await call('search',{query:'application authentication'})).results.some(d=>d.id==='sdk-reference'));
 assert.match((await call('fetch',{id:'sdk-reference'})).text,/without email or Velox accounts/);
 assert.match((await call('get_integration_example',{language:'javascript'})).example.text,/LOCAL SIMULATION ONLY/);
 assert.match((await call('get_integration_example',{language:'typescript'})).declarations.text,/VeloxDressMe/);
 assert.match((await call('get_partner_access_requirements')).provisioning,/Manual Velox approval/);
 for(const [name,args] of [['fetch',{id:'../../.env'}],['get_integration_example',{language:'java'}],['search',{query:'a'.repeat(201)}]]){
  assert.equal((await client.callTool({name,arguments:args})).isError,true);
 }
 assert.deepEqual((await call('search',{query:'zzzxnonexistent'})).results,[]);
 assert.equal((await fetch(url,{method:'POST',headers:{origin:'https://untrusted.invalid','content-type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(url)).status,405);
 assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
 assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({x:'a'.repeat(17000)})})).status,413);
});
