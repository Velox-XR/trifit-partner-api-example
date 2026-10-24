# Velox TriFit API with Codex and GitHub Copilot

Build web or mobile virtual try-on integrations from official DressMe API
documentation. Use the current unified MCP endpoint below. Its public documentation
tools need no partner API key, OAuth connection, local plugin ZIP or npm server
installation. The server as a whole is **not read-only**: account/guest tools are
separately OAuth-protected and must not be enabled for unattended documentation tasks.

```text
https://studio.v3lox.com/partner/trifit/mcp
```

For coding, allow only `search`, `fetch`, `get_integration_example` and
`get_partner_access_requirements` over Streamable HTTP. These four tools do not
upload photos, generate try-ons, read accounts, issue credentials or grant allowance.
The live inventory checked on 24 October 2026 contains 18 tools: five public
guidance tools (including `get_partner_application_guide`) and 13 OAuth-protected
account/guest tools. A metadata check is not authenticated client acceptance.
The old `/partner/docs/mcp` endpoint is legacy; do not use it for new direct setup.
Existing reviewed OpenAI package connections are managed separately and are not
silently migrated by these instructions.
Real application access is separate: [apply here](https://studio.v3lox.com/partner-api#apply).

## Choose your client

### ChatGPT / OpenAI plugin directory

Open the published [Velox TriFit Developer plugin](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458)
and use its Install option. Availability can depend on the client, account and
workspace policy. The published Developer package is distinct from the optional
account/guest try-on package; installing it does not grant Partner API access.

### Codex

Merge [this TOML entry](../examples/mcp/codex.toml) into your Codex
configuration. It includes an explicit four-tool allowlist. Preserve other
servers and settings. The local name `velox-trifit-docs` describes the restricted
task, not a different server. Run `codex mcp list`, start a new session if needed
and verify the tools below. Do not log in to TriFit for documentation-only work.
Do not configure a duplicate connection if the Developer plugin supplies one.

### GitHub Copilot in VS Code

Merge [the VS Code configuration](../examples/mcp/vscode.json) into your project's
`.vscode/mcp.json`. In VS Code open **MCP: List Servers**, select
`velox-trifit-docs`, and follow the client's trust/start controls. In Copilot Chat
agent mode, use the tool picker to enable **only the four documentation tools**
listed above. The configuration file alone does not enforce that selection. This file
uses `servers` and `type: http`, not the OpenAI plugin package schema.

### GitHub Copilot cloud agent

In the target repository's **Settings → Copilot → MCP servers**, merge
[the cloud-agent configuration](../examples/mcp/github-copilot.json) and save.
It uses `mcpServers` and an explicit `tools` allowlist. An administrator may need
to enable custom MCP servers. No secret is required for this public endpoint.

Cloud-agent tool calls can run autonomously. Keep this connection limited to the
four read-only documentation tools on the current endpoint. Do not add OAuth
credentials, account tools, upload tools or `*`. GitHub documents that hosted
agents do not support remote OAuth MCP authentication. This example targets only
the endpoint's anonymous tools; mixed-auth hosted-agent compatibility must be
validated in that client and is not established by a CLI test. If rejected, stop
and report the client limitation rather than silently substituting the legacy URL.

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
On 24 October 2026, native Codex CLI and GitHub Copilot CLI each successfully
called all four allowed documentation tools at `/partner/trifit/mcp` without a
TriFit sign-in. This is not a VS Code UI, hosted Copilot or authenticated try-on
acceptance result. The tests identified older catalogue/mock-example text in the
served corpus; prefer the maintained linked source and verify release status.

Official client references:

- [Codex MCP configuration](https://developers.openai.com/codex/mcp)
- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [GitHub Copilot MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
