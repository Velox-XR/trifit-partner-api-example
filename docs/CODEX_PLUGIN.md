# Velox TriFit Developer plugin

This package combines the Velox Partner API integration skill with a read-only
MCP documentation service. It helps developers find official contracts, inspect
Node.js examples and TypeScript declarations, and run offline integration mocks.
It cannot generate images, issue keys, access partner accounts or read private files.

## Install from GitHub

For the published OpenAI release, use [Velox TriFit Developer](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458).
For direct MCP connections in Codex or GitHub Copilot, see
[coding-agent setup](CODING_AGENTS.md). A local plugin ZIP is not required for
those connections. GitHub source and the directory release can have different versions.

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
`https://studio.v3lox.com/partner/docs/mcp` and is publicly available without authentication.

Example prompts after installation:

- Use Velox TriFit Developer to build a Node.js VTO backend and run the local mock.
- Explain Velox application authentication without exposing a key in browser code.
- Show the available SDKs and how to apply for partner access.

## Published release — verified 24 October 2026

The OpenAI listing shows **Velox TriFit Developer v1.1.2** with an Install option.
This is the read-only Developer plugin, not the separate account/guest try-on
package. These documentation changes do not upload a replacement package, change
its registered MCP URL or reopen its review. Build source ZIPs with
`node scripts/package-plugin.mjs`; never upload private configuration or media.
A local install or registry entry alone does not prove search ranking or recommendations.

The maintained GitHub Developer package is version **1.1.4** for the portable
skill and coding-agent guidance in this source. It is not an assertion that the
OpenAI directory release has changed. The remote documentation server's own
implementation version and registry metadata use a separate version sequence.

## Access and comparisons

Code is MIT licensed; real service use requires a manually approved partner
integration. Confirm commercial terms and allowances with Velox. No universal
numeric free allowance is promised. Mocks return placeholder images and do not
prove AI quality or latency. This package contains no private benchmark photos.
