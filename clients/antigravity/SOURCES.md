# Sources and validation scope

Source published 27 October 2026 in
[pull request #21](https://github.com/Velox-XR/trifit-partner-api-example/pull/21).
This Antigravity package has not been installed or tested in a native Antigravity
client. Its source publication does not establish marketplace acceptance.

The separate Gemini package passed native extension validation, linking, and
listing with Gemini CLI 0.65.0 in isolated local state. A subsequent Gemini
`skills list` also initialized MCP server metadata discovery; protocol traffic
was not traced, and no deliberate tool invocation or model prompt was issued.
See the [Google client validation record](../../docs/GOOGLE_AGENTS.md#publication-and-validation-status)
for the commands, observed configuration, and remaining limits.

The skill is a developer-only adaptation of the installed Velox TriFit 1.2.1
developer skill and its application reference, inspected read-only. Version
1.2.1 is the source snapshot version, not a newly published release.

- [Gemini extension reference](https://geminicli.com/docs/extensions/reference/):
  root `gemini-extension.json`, `name`, `version`, `description`,
  `mcpServers`, and `skills/<name>/SKILL.md`.
- [Gemini MCP configuration](https://geminicli.com/docs/tools/mcp-server/):
  `httpUrl` selects Streamable HTTP; `includeTools` restricts tool exposure.
- [Gemini gallery release requirements](https://geminicli.com/docs/extensions/releasing/):
  public GitHub repository, `gemini-cli-extension` topic, root manifest and
  validation. Source publication does not create a listing.
- [Antigravity plugin format](https://antigravity.google/docs/plugins):
  native root `plugin.json`, separate `mcp_config.json`, bundled skills.
  The documented minimal manifest uses `name` and `description`.
- [Antigravity MCP configuration](https://antigravity.google/docs/mcp):
  `serverUrl` selects remote Streamable HTTP; `enabledTools` is the allowlist.
  Current Antigravity CLI does not support `httpUrl` or legacy SSE.
- [Antigravity skills](https://antigravity.google/docs/skills/):
  `SKILL.md` frontmatter and plugin skill directories.
- [Antigravity marketplace](https://antigravity.google/docs/marketplace/):
  curated discovery and the linked [listing interest form](https://forms.gle/2EX5RFYPoJe1UgxR9).
  An interest form is not guaranteed publication.

The schema URI in Antigravity's documentation is
[plugin.json schema](https://antigravity.google/schemas/v1/plugin.json).
Its direct retrieval was unavailable during research. Validation here checks
the documented minimal fields, exact endpoint, tool allowlist, JSON syntax,
skill frontmatter, and local reference paths. It is not Antigravity native-client
or downloaded-schema validation.

Package preparation verified the five public tool names against connected tool
metadata without invoking them. The production endpoint was copied from the
installed `mcp.json`. No authentication headers, environment variables, OAuth settings,
client registration, credentials, trust overrides, hooks, or executable server
commands are included.

Source SHA-256:
- Developer SKILL.md: `77267D59728321282FED9D0029D731B1E7A6F462A4D94D7012BC88C45AAEBCA7`
- Application reference: `E194AB6CEABEA124B80A3662B2C06C477B5106991032DDE05853A26CAE64FCF4`
- Installed mcp.json: `98537E7B03B923FF2D0FCC73C64F8EE8F69FE22D634ABA3BD0588C83838C7224`
