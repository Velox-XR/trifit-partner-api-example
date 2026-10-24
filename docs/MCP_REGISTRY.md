# MCP registry publication and update checklist

`server.json` now targets the **current unified Velox TriFit server** at
`https://studio.v3lox.com/partner/trifit/mcp`. It includes public developer guidance
and OAuth-protected account/guest upload and try-on tools; it is not a read-only
server. Coding-agent examples explicitly restrict which tools may be used.

## Endpoint correction candidate — 24 October 2026

The first publication selected the legacy documentation-only endpoint. That was
not the intended current connection. Version **2.0.0** prepares an update of the
same registry identifier, not a second competing listing. This is a registry
publication version for the endpoint/capability change, not a worker, OpenAI
package or hosted runtime version. The live unified server reports `0.3.1`.
Do not claim 2.0.0 is published until the exact active/latest registry record is
verified. Version 1.1.0 below remains the historical record, not the new setup URL.

The current endpoint passed initialize, 18-tool inventory/authentication-metadata
validation and all four anonymous documentation calls on 24 October 2026. No
account read, OAuth login, upload or generation was performed by that check.
Native Codex CLI and GitHub Copilot CLI also each completed the four anonymous
documentation calls against `/partner/trifit/mcp` on 24 October 2026, with only
those four tools enabled. The latest endpoint works for this tested coding-agent
use case; there is no need to select the legacy URL. VS Code UI, hosted Copilot
and authenticated try-on were not tested by these runs. The served SDK catalogue
and mock example still contain older release/contact text; that separate corpus
refresh must not be described as already deployed.

## Historical first publication — 24 October 2026

- [Official MCP Registry listing](https://registry.modelcontextprotocol.io/?q=velox-trifit):
  `io.github.Velox-XR/velox-trifit-developer`, version `1.1.0`.
- [Exact version metadata](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.Velox-XR%2Fvelox-trifit-developer/versions/1.1.0)
  was independently verified **active** and **latest** at that time; it points to
  the legacy `/partner/docs/mcp`, not the current unified connection.
- [Successful organization-identity publication workflow](https://github.com/Velox-XR/trifit-partner-api-example/actions/runs/40099586800)
  published the existing endpoint using GitHub's short-lived OIDC identity.
- GitHub's separate curated registry onboarding is **pending**. The
  [public listing request](https://github.com/github/github-mcp-server/discussions/1257#discussioncomment-19164911)
  was submitted; this is not confirmation of GitHub inclusion or approval.

This dated record is distinct from client installation, hosted code deployment
and search-engine indexing. Native Codex CLI and GitHub Copilot CLI each completed
all four public documentation tool calls on 24 October 2026. VS Code UI and GitHub
hosted-agent execution have not been acceptance-tested. Neither publication nor
successful tool calls guarantee search rankings or automatic recommendations.

## Publishing a future version

Registry versions are immutable. Publish a new version to change the endpoint or
capability description; do not overwrite 1.1.0. Preserve the existing registry
identifier and update the existing GitHub curation request after publication.
The current server needs no npm installation. Documentation is anonymous;
account/guest tools require the normal TriFit OAuth connection and consent.
Do not migrate the separately published OpenAI MCP URL.

Before publishing a new version:

1. Merge reviewed source changes after offline tests pass.
2. Validate `server.json` against its pinned official schema. Confirm the exact
   current endpoint responds to initialize, tools/list and all four read-only
   tool calls. With dependencies installed, explicitly run `npm run mcp:verify-public`.
   It reports any outdated application link separately from protocol success;
   resolve that warning before claiming the guidance is current. Record environment,
   version and checksums without secrets. This command is not part of offline CI.
3. Register only the currently deployed unified server, accurately disclosing
   its public and OAuth-protected capabilities. Pending website/corpus
   improvements are a separate release and must pass Development acceptance
   and protected Production promotion; do not claim those changes are live.
   Registration does not deploy code or change the published OpenAI connection.
4. For the Velox-XR organization namespace, use the reviewed main-only
   `Publish current Velox TriFit MCP registry entry` GitHub Actions workflow.
   Enter the exact reviewed main commit and `PUBLISH-VELOX-TRIFIT-REGISTRY`.
   The workflow uses the official checksum-pinned publisher and GitHub OIDC;
   no dedicated secret, partner key or personal token is needed. Interactive
   `mcp-publisher login github` cannot establish organization roles and may
   authorize only the personal namespace; do not rename the organization entry
   to work around that restriction.
5. Publish `server.json`, then read the official registry entry and confirm its
   exact name/version, endpoint, active status and latest-version metadata.
6. Update the existing GitHub curated-registry request rather than duplicating it,
   linking the verified registry entry, public repository, MIT licence, current
   remote endpoint and the public-docs versus OAuth-protected capability boundary.
   Do not claim GitHub listing or automatic recommendations until verified.

Read-only discovery queries:

```sh
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=velox-trifit"
curl "https://api.mcp.github.com/v0.1/servers?search=velox-trifit"
```

Check each client's UI as well as the APIs. Listing, client installation,
successful tool calls and appearing in a generic search are different checks.
Never publish keys, partner identities, private media or fabricated ratings.

The workflow fails closed on a changed repository, branch, commit, manifest,
or registry read error. It skips an already matching active/latest version;
after an uncertain publish outcome, inspect that version before rerunning.
The hosted verifier reports documentation freshness separately from protocol
success. Neither proves authenticated generation, native-client acceptance or
GitHub hosted-agent compatibility.

References:

- [Official remote-server publication](https://modelcontextprotocol.io/registry/remote-servers)
- [Immutable registry versioning](https://modelcontextprotocol.io/registry/versioning)
- [Official publisher authentication](https://modelcontextprotocol.io/registry/authentication)
- [GitHub registry maintainer onboarding clarification](https://github.com/github/github-mcp-server/discussions/1257)
