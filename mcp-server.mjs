import {createServer} from 'node:http';
import {createDocumentationHandler} from './src/docs-mcp.mjs';

// Local development only. Production uses the guarded Studio deployment.
const handle=await createDocumentationHandler({allowedOrigins:['http://127.0.0.1:4319']});
const server=createServer((req,res)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/mcp'){res.writeHead(404);res.end();return;}
  void handle(req,res);
});
server.listen(4319,'127.0.0.1',()=>console.log('Read-only Velox docs MCP: http://127.0.0.1:4319/mcp'));
