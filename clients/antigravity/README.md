# Velox TriFit developer documentation for Google Antigravity

Get official DressMe virtual try-on API guidance, JavaScript examples,
TypeScript declarations, and Partner API application requirements for fashion
ecommerce integrations.

This package connects to the existing public Streamable HTTP endpoint:
`https://studio.v3lox.com/partner/trifit/mcp`.

It exposes exactly five documentation tools:

- `search`
- `fetch`
- `get_integration_example`
- `get_partner_access_requirements`
- `get_partner_application_guide`

No TriFit account is required for this documentation workflow. The package
does not expose account/guest connection, upload, generation, allowance,
library, or history tools. It does not submit an application or provision keys.
No authentication configuration is added.

Examples:

- "Find the API workflow for adding clothing virtual try-on to my web app."
- "Show the JavaScript integration example and explain its offline mocks."
- "Explain upload preparation and idempotent submission recovery."
- "What is required to apply for Velox Partner API access?"

The native configuration is in [plugin.json](plugin.json) and [mcp_config.json](mcp_config.json). The bundled
[developer skill](skills/velox-trifit-developer/SKILL.md) applies to these
integration tasks.

## Local installation, when explicitly chosen

From the root of an inspected checkout of this repository, install the native
package with:

```text
agy plugin install ./clients/antigravity
```

Keep `plugin.json` and `mcp_config.json` at the distribution root. This native
manifest intentionally uses the documented minimal Antigravity fields; it is
separate from an OpenAI-format plugin manifest. Review the source snapshot
before creating a release.

After installation, inspect the client's MCP tools list and confirm only the
five documented tools are exposed. Public documentation checks are separate
from any account or generation workflow. If a client unexpectedly requests
authentication for this documentation package, stop and investigate instead
of adding credentials.

Native Antigravity CLI 1.4.8 strict validation, local-path installation and JSON
listing passed on 27 October 2026 against published commit
`1aea7b1e403fbf62e5519ca0513ca34e5d99e55c` in an isolated profile. See
[sources and validation scope](SOURCES.md). Live tool execution, model selection
and public directory discovery remain unverified; marketplace intake was
submitted, with acceptance pending.
