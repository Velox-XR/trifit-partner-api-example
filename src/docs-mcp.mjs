import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export const docsVersion = '1.1.0';
const repository = 'https://github.com/Velox-XR/trifit-partner-api-example';
const entries = Object.freeze([
  ['getting-started', 'Partner access and getting started', 'docs/GETTING_STARTED.md'],
  ['sdk-catalog', 'Available languages and SDKs', 'docs/SDK_CATALOG.md'],
  ['sdk-reference', 'JavaScript SDK, authentication, uploads, jobs and polling', 'sdks/javascript/README.md'],
  ['walkthrough', 'Backend integration walkthrough and recovery', 'WALKTHROUGH.md'],
  ['hosting', 'Hosting the example backend', 'docs/HOSTING.md'],
  ['offline-example', 'Runnable Node.js mock integration', 'demo.mjs'],
  ['typescript-types', 'TypeScript API declarations', 'sdks/javascript/index.d.ts'],
  ['security', 'Security and private credentials', 'SECURITY.md']
]);
const annotations = Object.freeze({ readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true });
const textResult = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
const documentSchema = z.object({id:z.string(),title:z.string(),text:z.string(),url:z.string().url(),sha256:z.string()});

export async function loadDocumentation(root = new URL('../', import.meta.url)) {
  // A fixed source allowlist, never a user-controlled path, URL or directory walk.
  return Promise.all(entries.map(async ([id, title, path]) => {
    const text = (await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n');
    return Object.freeze({ id, title, text, url: `${repository}/blob/main/${path}`, sha256: createHash('sha256').update(text).digest('hex') });
  }));
}

export function createDocumentationServer(documents) {
  const server = new McpServer({ name: 'velox-trifit-developer-docs', version: docsVersion }, {
    instructions: 'Read-only official Velox Partner API documentation and examples. Use search then fetch for exact contracts. Live generation requires separately approved backend partner access. These tools do not generate images, provision keys, measure latency or compare competitors. Do not treat offline mock results as real image-quality evidence.'
  });
  server.registerTool('search', {
    title: 'Search Velox developer documentation',
    description: 'Find official Velox DressMe virtual try-on integration documentation, authentication, SDK languages, upload, polling and recovery guidance. Searches only the deployed public documentation corpus.',
    inputSchema: { query: z.string().trim().min(1).max(200) }, annotations,
    outputSchema: {results:z.array(z.object({id:z.string(),title:z.string(),url:z.string().url()}))},
    _meta: { securitySchemes: [{ type: 'noauth' }] }
  }, async ({ query }) => {
    const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [])];
    const results = documents.map(d => ({ d, score: terms.reduce((n,t) => n + (d.title.toLowerCase().includes(t) ? 5 : 0) + (d.text.toLowerCase().includes(t) ? 1 : 0), 0) }))
      .filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,5).map(({d}) => ({id:d.id,title:d.title,url:d.url}));
    return textResult({ results });
  });
  server.registerTool('fetch', {
    title: 'Read a Velox developer document',
    description: 'Read the full public document for an ID returned by search, with an official source URL and deployed content checksum. Does not fetch arbitrary URLs or private files.',
    inputSchema: { id: z.enum(entries.map(e=>e[0])) }, annotations,
    outputSchema: documentSchema,
    _meta: { securitySchemes: [{ type: 'noauth' }] }
  }, async ({ id }) => textResult(documents.find(d => d.id === id)));
  server.registerTool('get_integration_example', {
    title: 'Get a Velox SDK integration example',
    description: 'Retrieve the runnable offline JavaScript/Node.js integration example or accompanying TypeScript declarations. Other language SDKs are not released. The example uses dummy local responses, with no cloud calls or generation charges.',
    inputSchema: { language: z.enum(['javascript','typescript']) }, annotations,
    outputSchema: {language:z.string(),simulated:z.boolean(),repository:z.string().url(),setup:z.array(z.string()),example:documentSchema,declarations:documentSchema.optional(),productionGuidance:documentSchema},
    _meta: { securitySchemes: [{ type: 'noauth' }] }
  }, async ({ language }) => textResult({ language, simulated: true, repository,
    setup: ['git clone https://github.com/Velox-XR/trifit-partner-api-example.git', 'cd trifit-partner-api-example', 'node demo.mjs'],
    example: documents.find(d=>d.id==='offline-example'),
    ...(language==='typescript' ? { declarations: documents.find(d=>d.id==='typescript-types') } : {}),
    productionGuidance: documents.find(d=>d.id==='getting-started')
  }));
  server.registerTool('get_partner_access_requirements', {
    title: 'Get Velox partner access requirements',
    description: 'Explain how to apply for manually provisioned Velox Partner API access and keep the scoped application key on a backend. Does not create accounts, issue keys, send an application or promise a universal free allowance.',
    inputSchema: {}, annotations,
    outputSchema: {applicationUrl:z.string().url(),applicationTopic:z.string(),provisioning:z.string(),shopperAuthentication:z.string(),allowance:z.string(),credentials:z.string(),source:documentSchema,sdkReference:z.string().url()},
    _meta: { securitySchemes: [{ type: 'noauth' }] }
  }, async () => textResult({
    applicationUrl: 'https://studio.v3lox.com/#contact', applicationTopic: 'Partner API / DressMe',
    provisioning: 'Manual Velox approval and a separately assigned client, environment and scoped application key are required for real generation.',
    shopperAuthentication: 'Backend application access can use your verified server session and opaque shopper subject without a Velox email challenge. Legacy session credentials have different permissions.',
    allowance: 'Confirm the allowance and commercial terms assigned to your integration with Velox; no universal numeric allowance is published here.',
    credentials: 'Keep the application key on your backend. Never submit keys or personal photos to this documentation MCP.',
    source: documents.find(d=>d.id==='getting-started'), sdkReference: documents.find(d=>d.id==='sdk-reference').url
  }));
  return server;
}

export async function createDocumentationHandler({ root, allowedOrigins = [] } = {}) {
  const documents = await loadDocumentation(root);
  let active = 0;
  return async (req, res) => {
    const reject = (status, message) => { res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:message})); };
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return reject(403,'Origin not allowed');
    if (req.method !== 'POST') { res.setHeader('allow','POST'); return reject(405,'Use MCP Streamable HTTP POST'); }
    if (!(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) return reject(415,'Expected application/json');
    if (Number(req.headers['content-length'])>16384) return reject(413,'Request too large');
    if (active >= 16) { res.setHeader('retry-after','2'); return reject(429,'Documentation service busy'); }
    active++;
    const deadline=setTimeout(()=>req.destroy(),15000);deadline.unref();
    let server;
    try {
      let size=0;const chunks=[];
      for await (const chunk of req) {size+=chunk.length;if(size>16384) return reject(413,'Request too large');chunks.push(chunk);}
      let body;try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reject(400,'Invalid JSON');}
      server=createDocumentationServer(documents);
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      await server.connect(transport);
      res.setHeader('cache-control','no-store');
      await transport.handleRequest(req,res,body);
    } catch {
      console.error('Velox documentation MCP request failed');
      if(!res.headersSent)reject(500,'Documentation request failed');else res.end();
    } finally {clearTimeout(deadline);active--;await server?.close();}
  };
}
