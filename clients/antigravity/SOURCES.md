# Sources and validation scope

Prepared 27 October 2026. This is a local review package; it has not been
installed, published, or tested with a live MCP request.

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
  validation. Local staging does not create a listing.
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
skill frontmatter, and local reference paths. It is not native-client or
downloaded-schema validation.

The five public tool names were verified against the connected tool metadata;
no tool was invoked. The production endpoint was copied from the installed
`mcp.json`. No authentication headers, environment variables, OAuth settings,
client registration, credentials, trust overrides, hooks, or executable server
commands are included.

Source SHA-256:
- Developer SKILL.md: `77267D59728321282FED9D0029D731B1E7A6F462A4D94D7012BC88C45AAEBCA7`
- Application reference: `E194AB6CEABEA124B80A3662B2C06C477B5106991032DDE05853A26CAE64FCF4`
- Installed mcp.json: `98537E7B03B923FF2D0FCC73C64F8EE8F69FE22D634ABA3BD0588C83838C7224`
