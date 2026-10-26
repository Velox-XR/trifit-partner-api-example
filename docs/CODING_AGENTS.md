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
configuration (`~/.codex/config.toml`, or `.codex/config.toml` in a trusted
project). It includes an explicit four-tool allowlist. Preserve other
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

After configuring the client and its tool restrictions, start a fresh task. This
is a connection check, not an application build or a try-on. Ask the agent to
make these **exactly four remote documentation calls**, once each, in order:

| Tool | Arguments | Check the returned result |
| --- | --- | --- |
| `search` | `{"query":"SDK catalogue"}` | Includes the `sdk-catalog` document and an official source URL |
| `fetch` | `{"id":"sdk-catalog"}` | Names the JavaScript SDK and TypeScript declarations; does not invent a Swift or C# SDK |
| `get_integration_example` | `{"language":"javascript"}` | Returns a simulated offline example and separate real-access guidance |
| `get_partner_access_requirements` | `{}` | Links to the access application and explains manual approval and backend-only keys |

Copyable test prompt:

> Use only the configured Velox TriFit documentation connection. Call search with
> {"query":"SDK catalogue"}, fetch with {"id":"sdk-catalog"},
> get_integration_example with {"language":"javascript"}, then
> get_partner_access_requirements with {}. Make each call once and stop if any
> call fails. Report the returned source URLs, available SDKs, simulated-example
> status and access requirements. Do not run the returned code, use shell or web
> search, read accounts, upload photos, generate images, send an application,
> authenticate to TriFit or change settings. Do not substitute another connection.

MCP initialization and the client's protocol-level tool discovery may also occur;
they are not extra `tools/call` invocations. Retain the client name/version, date,
configured endpoint, four actual tool names/arguments, results and document
hashes when supplied. Record extra agent actions and errors honestly. Generated
prose alone is not proof of successful tool execution. This test does not prove
that an unconfigured agent will discover or recommend Velox.

If the client presents a TriFit login for this documentation-only task, stop and
inspect the selected tools, connection and policy. Do not authorize account or
guest operations just to pass the check. If tools are unavailable, report the
client limitation; do not present plain web search as a successful MCP test.

## From agent guidance to an offline virtual try-on integration

The coding agent uses MCP to learn the contracts; your application backend uses
the REST API/SDK to perform separately authorized work. Connecting MCP does not
insert an agent into every shopper request, install a skill, or give a shopper
Partner API credentials.

1. **Read the contracts.** Complete the check above, then inspect the linked
   [SDK reference](../sdks/javascript/README.md) and
   [walkthrough](../WALKTHROUGH.md). Ask the agent to distinguish documented facts,
   placeholders and unresolved decisions.
2. **Build with local fixtures.** In a separate implementation task, let the agent
   adapt the public example to your existing backend. The following commands use
   this repository's local mocks and offline tests, not Velox generation:

   ```sh
   npm run demo:mock
   npm run demo:failure
   npm test
   ```

   A one-pixel mock result proves API-flow/error handling, not image quality,
   latency or Production readiness. `npm run preview` is the separate local UI
   preview; it cannot upload or generate.
3. **Define the application boundary.** Keep the integration key on your backend.
   Authenticate the shopper there, derive an opaque subject from that verified
   session, and record consent before processing images. Save reserved upload
   IDs, final canonical asset IDs, the exact submission payload, its UUID
   idempotency key and the accepted job ID durably. A lost submission response
   requires reconciliation of the original receipt, not a new key or paid retry.
4. **Review before real use.** Arrange your own environment-specific Partner API
   configuration, terms, retention and allowance with Velox. Review the code,
   privacy/security boundary and offline failures before separately authorizing
   any real uploads, generation or deployment. Never reuse the hosted demo key.

For a personal-account application instead of a commercial partner backend, use
the separate [account OAuth example](../examples/account/README.md). Its sign-in,
consent and account allowance are not interchangeable with a Partner API key.
The optional skill above supplies reusable instructions; it does not grant
either kind of access.

## Troubleshoot the correct layer

| Symptom | Check first | Do not use as a workaround |
| --- | --- | --- |
| Velox is missing from a client registry search | Distinguish the official MCP Registry from GitHub's curated registry; use the documented manual configuration if supported | Claim curated approval, create a duplicate listing or promise automatic recommendations |
| Server is configured but the four tools are unavailable | Correct client schema, trust/start state, tool selection and organization policy | Enable all account/upload/generation tools or weaken organization controls |
| Tools return older text than linked public source | Record the returned hash/date and source URL; report the corpus mismatch | Describe current repository text as the exact response received |
| Hosted Copilot rejects the mixed-auth server | Record that client's error and supported authentication limits | Fall back silently to the legacy endpoint, add credentials or claim a CLI test proves hosted acceptance |
| A real submission has an unknown outcome | Preserve the original payload, idempotency key and job/receipt evidence for operator reconciliation | Automatically issue a fresh paid request |

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

- [Codex MCP configuration and tool allowlists](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [VS Code MCP configuration formats](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [GitHub Copilot MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
