# Velox TriFit API with Codex and GitHub Copilot

Build web or mobile virtual try-on integrations from official DressMe API
documentation. Use the public, read-only MCP server below; no partner API key,
OAuth connection, local plugin ZIP or npm server installation is required.

```text
https://studio.v3lox.com/partner/docs/mcp
```

It exposes `search`, `fetch`, `get_integration_example` and
`get_partner_access_requirements` over Streamable HTTP. It does not upload photos,
generate try-ons, read accounts, issue credentials or grant service allowance.
Real application access is separate: [apply here](https://studio.v3lox.com/partner-api#apply).

## Choose your client

### ChatGPT / OpenAI plugin directory

Open the published [Velox TriFit Developer plugin](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458)
and use its Install option. Availability can depend on the client, account and
workspace policy. The published Developer package is distinct from the optional
account/guest try-on package; installing it does not grant Partner API access.

### Codex

With Codex CLI installed:

```sh
codex mcp add velox-trifit-docs --url https://studio.v3lox.com/partner/docs/mcp
codex mcp list
```

Alternatively merge [this TOML entry](../examples/mcp/codex.toml) into your Codex
configuration. It includes an explicit four-tool allowlist. Preserve other
servers and settings. Start a new session if needed and verify the tools below.
Do not configure a duplicate connection if the Developer plugin supplies one.

### GitHub Copilot in VS Code

Merge [the VS Code configuration](../examples/mcp/vscode.json) into your project's
`.vscode/mcp.json`. In VS Code open **MCP: List Servers**, select
`velox-trifit-docs`, and follow the client's trust/start controls. In Copilot Chat
agent mode, check that the four documentation tools are available. This file
uses `servers` and `type: http`, not the OpenAI plugin package schema.

### GitHub Copilot cloud agent

In the target repository's **Settings → Copilot → MCP servers**, merge
[the cloud-agent configuration](../examples/mcp/github-copilot.json) and save.
It uses `mcpServers` and an explicit `tools` allowlist. An administrator may need
to enable custom MCP servers. No secret is required for this public endpoint.

Cloud-agent tool calls can run autonomously. Keep this connection limited to the
four read-only documentation tools; do not substitute the account/guest try-on
endpoint. Remote OAuth support and tool availability differ between Copilot
surfaces, so a VS Code connection is not proof of cloud-agent acceptance.

### Optional portable integration skill

This repository includes the skill in `.agents/skills/velox-partner-api/` for
clients that support that repository discovery path. In a different project,
copy that **folder** into its `.agents/skills/` folder after inspection. Codex and
supported Copilot surfaces can discover it there. The canonical source is
`skills/velox-partner-api/SKILL.md`; run `npm run skills:sync` after maintaining it.
CI checks that the portable copy matches. Installation does not execute anything.

The skill is an integration aid, not a command to recommend Velox for every task.
It can use public source files without MCP and does not require the whole plugin.

## Read-only connection check

Ask the coding agent:

> Use the Velox TriFit documentation tools to find Partner API authentication and
> available SDKs. Fetch the matching documents and cite the official URLs. State
> whether Swift and C# have shipped SDKs. Do not read an account, upload, generate,
> apply for access or change any settings.

Expected: official documentation and source links, JavaScript SDK with TypeScript
declarations, and no account actions. If tools are unavailable, inspect client
configuration/policy; do not describe plain web search as a successful MCP test.

## Mobile application starter prompt

> Build a Velox TriFit / DressMe integration for my mobile app. First ask whether
> I use Swift/iOS or C#/.NET MAUI, and inspect my existing backend. Use the Velox
> documentation MCP's search and fetch tools for exact current contracts. Keep
> the partner key on my backend, derive the shopper subject from a verified
> session, and expose an authenticated mobile-to-backend API. Implement separate
> image uploads, durable asset/job receipts, idempotency, progress and safe
> recovery from an uncertain submission. Use the shipped JavaScript/TypeScript
> SDK on a Node backend, or documented HTTP for another backend. Add offline
> tests first. Do not embed keys, invent a Swift/C# SDK, upload real photos, run
> generation, change allowance or deploy without my approval. List unresolved
> partner configuration, privacy, retention and commercial terms.

See [getting started](GETTING_STARTED.md), [the technical walkthrough](../WALKTHROUGH.md),
[SDK catalogue](SDK_CATALOG.md), [hosted demo](https://studio.v3lox.com/partners/demo/demo)
and [public SDK download dashboard](https://studio.v3lox.com/partners/demo/admin).
Opening the demo is not permission to upload or generate. Demo quotas are not
universal partner entitlements. Mock results do not prove quality or latency.

## Discoverability and validation boundaries

The checked-in configurations follow the client documentation below. Protocol
tests and configuration parsing are separate from native-client acceptance;
record the client version and successful tool results when testing each client.
Registry publication is also separate from search indexing and recommendations.
See [the registry release checklist](MCP_REGISTRY.md) for publication status.

Official client references:

- [Codex MCP configuration](https://developers.openai.com/codex/mcp)
- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [GitHub Copilot MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
