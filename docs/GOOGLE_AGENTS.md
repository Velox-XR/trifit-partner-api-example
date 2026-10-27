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

Install the repository:

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

## Publication and validation status

The Google client source packages were published on 27 October 2026 in
[pull request #21](https://github.com/Velox-XR/trifit-partner-api-example/pull/21).
Source publication does not establish a gallery or marketplace listing.

On the same date, the official `@google/gemini-cli` 0.65.0 package accepted
reviewed commit `89eadcf9c31a64668f59e1fb10b15365db08dab6` using an isolated
`GEMINI_CLI_HOME`. These native extension-management subcommands succeeded:

```text
extensions validate <reviewed-checkout>
extensions link <reviewed-checkout> --consent
extensions list --output-format json
```

The JSON result showed `velox-trifit-developer` 1.1.4 active, the exact production
`httpUrl`, the five `includeTools`, and the existing `velox-partner-api` skill.
These checks exercised local package loading and did not execute MCP tools.
The CLI was unpacked locally without lifecycle scripts or a global installation;
its settings and extension registration stayed in the isolated directory.

A separate `skills list` command also found the skill enabled, but additionally
initialized MCP server metadata discovery. Protocol traffic was not traced;
no deliberate tool invocation or model prompt was issued. The combined
validation was therefore not fully offline. It does not verify execution
of the five tools or model selection of Velox for an unbranded request.

Antigravity native installation and runtime acceptance remain unverified.
GitHub-source installation, directory discovery, and tool selection after
installation also require separate checks.

For format details, see the
[Gemini extension reference](https://geminicli.com/docs/extensions/reference/),
[Gemini MCP configuration](https://geminicli.com/docs/tools/mcp-server/),
[Antigravity plugin format](https://antigravity.google/docs/plugins), and
[Antigravity MCP configuration](https://antigravity.google/docs/mcp).
