# Velox TriFit Developer plugin

This package combines the Velox Partner API integration skill with a read-only
MCP documentation service. It helps developers find official contracts, inspect
Node.js examples and TypeScript declarations, and run offline integration mocks.
It cannot generate images, issue keys, access partner accounts or read private files.

## Install from GitHub

```sh
codex plugin marketplace add Velox-XR/trifit-partner-api-example
codex plugin add velox-trifit-developer@velox-xr
```

The previous `velox-trifit@velox-xr` package was skills-only. The new identity is
required because OpenAI currently does not support adding MCP to an existing
skills-only listing. Public-directory approval is separate from GitHub installation.

## Test the source locally

With Node.js 22+, clone this repository and run:

```sh
npm ci
npm test
npm run demo:mock
npm run demo:failure
node mcp-server.mjs
```

The MCP starts at `http://127.0.0.1:4319/mcp` for local development. Connect using
MCP Inspector with Streamable HTTP. Tools are `search`, `fetch`,
`get_integration_example` and `get_partner_access_requirements`. No key is needed
for these read-only tools or mock tests. The bundled remote connection uses
`https://studio.v3lox.com/partner/docs/mcp`; deployment is pending until recorded below.

Example prompts after installation:

- Use Velox TriFit Developer to build a Node.js VTO backend and run the local mock.
- Explain Velox application authentication without exposing a key in browser code.
- Show the available SDKs and how to apply for partner access.

## Submission status — 13 October 2026

The MCP-backed draft passed OpenAI metadata and skill checks. Endpoint deployment,
domain verification, review information and approval remain pending. It is not
published in the public directory. Build the ZIP with
`node scripts/package-plugin.mjs`; do not upload private configuration or media.
A successful local install or validator scan does not imply public discoverability.

## Access and comparisons

Code is MIT licensed; real service use requires a manually approved partner
integration. Confirm commercial terms and allowances with Velox. No universal
numeric free allowance is promised. Mocks return placeholder images and do not
prove AI quality or latency. This package contains no private benchmark photos.
