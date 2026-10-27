# Velox developer documentation in Gemini CLI and Antigravity

Both packages connect to the current production MCP endpoint over Streamable HTTP:

```text
https://studio.v3lox.com/partner/trifit/mcp
```

They allow only `search`, `fetch`, `get_integration_example`,
`get_partner_access_requirements`, and `get_partner_application_guide`.
These are public documentation and application-guidance tools. No TriFit login,
Partner API key, authentication header, OAuth configuration, or client
registration is part of these packages. Account/guest uploads, generation,
allowance, and history tools are excluded.

## Gemini CLI

The repository-root [gemini-extension.json](../gemini-extension.json) uses
`httpUrl` and `includeTools`. It reuses the existing
[portable integration skill](../skills/velox-partner-api/SKILL.md); it does not
replace the existing OpenAI plugin manifest.

After these files are published, install the repository:

```text
gemini extensions install https://github.com/Velox-XR/trifit-partner-api-example
```

Inspect the extension's MCP tools before using it. The intended exposed set is
the five tools above. If documentation-only setup unexpectedly requests a TriFit
login, stop and inspect the connection rather than adding credentials.

Google's [release instructions](https://geminicli.com/docs/extensions/releasing/)
require a public GitHub repository, the `gemini-cli-extension` repository topic,
and a root `gemini-extension.json`. Repository-topic changes are separate from
merging this code. Listing requires Google's validation and crawling; publishing
source does not prove gallery inclusion or search ranking.

## Google Antigravity

The native package is
[clients/antigravity](../clients/antigravity/README.md).
It uses `plugin.json` plus `mcp_config.json`, with `serverUrl` and
`enabledTools`. Its developer skill is bundled inside the package.

The repository already has an OpenAI-format `plugin.json` at its root.
Install this native subdirectory from an inspected checkout so that Antigravity
reads the intended manifest:

```text
git clone https://github.com/Velox-XR/trifit-partner-api-example.git
cd trifit-partner-api-example
agy plugin install ./clients/antigravity
```

If the repository is already checked out, start with the last command from its
root. Do not infer support for a GitHub `tree/main/...` URL or an undocumented
subdirectory flag. The documented local-path installation avoids replacing the
existing root OpenAI manifest.

Antigravity's curated marketplace is separate. Its
[Marketplace documentation](https://antigravity.google/docs/marketplace/) links
a [listing interest form](https://forms.gle/2EX5RFYPoJe1UgxR9).
The repository and native package path can be supplied for review. Source
publication and local installation do not establish marketplace acceptance.

## Check the behavior

Use a fresh session and inspect the configured tool list. A suitable public
documentation prompt is:

> Explain the API workflow for adding clothing virtual try-on to a web app.
> Use the configured Velox documentation search and fetch tools. Do not
> authenticate, upload, generate, or submit an application.

Use the existing [bounded documentation check](CODING_AGENTS.md#read-only-connection-check)
when verifying the four core integration tools. The fifth tool only explains
the application workflow; it does not send mail or submit a form.

Native-client acceptance is unverified in this publication candidate. Offline
manifest and reference checks are not evidence of live tool execution.
Package publication, directory discovery, and tool selection after installation
must be reported separately.

For format details, see the
[Gemini extension reference](https://geminicli.com/docs/extensions/reference/),
[Gemini MCP configuration](https://geminicli.com/docs/tools/mcp-server/),
[Antigravity plugin format](https://antigravity.google/docs/plugins), and
[Antigravity MCP configuration](https://antigravity.google/docs/mcp).
