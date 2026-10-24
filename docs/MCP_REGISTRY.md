# MCP registry release checklist

`server.json` describes the public **read-only documentation** server, not the
account/guest try-on server. The proposed namespace is
`io.github.Velox-XR/velox-trifit-developer`; publishing requires verification of
the Velox-XR GitHub organization. This file is a publication candidate, **not
evidence that a registry listing is live**.

The registry version is the MCP server implementation version (`1.1.0`), not the
OpenAI plugin package version. This remote server needs no npm package, API key,
OAuth scope or new endpoint. Do not migrate the published OpenAI MCP URL.

Before publishing:

1. Merge reviewed source changes after offline tests pass.
2. Validate `server.json` against its pinned official schema. Confirm the exact
   public endpoint responds to initialize, tools/list and all four read-only
   tool calls. With dependencies installed, explicitly run `npm run mcp:verify-public`.
   It reports any outdated application link separately from protocol success;
   resolve that warning before claiming the guidance is current. Record environment,
   version and checksums without secrets. This command is not part of offline CI.
3. Register only the currently deployed public server. Pending website/corpus
   improvements are a separate release and must pass Development acceptance
   and protected Production promotion; do not claim those changes are live.
   Registration does not deploy code or change the published OpenAI connection.
4. For the Velox-XR organization namespace, use the reviewed main-only
   `Publish public documentation MCP registry entry` GitHub Actions workflow.
   Enter the exact reviewed main commit and `PUBLISH-VELOX-DOCS-REGISTRY`.
   The workflow uses the official checksum-pinned publisher and GitHub OIDC;
   no dedicated secret, partner key or personal token is needed. Interactive
   `mcp-publisher login github` cannot establish organization roles and may
   authorize only the personal namespace; do not rename the organization entry
   to work around that restriction.
5. Publish `server.json`, then read the official registry entry and confirm its
   exact name/version, endpoint, active status and latest-version metadata.
6. If absent from GitHub's curated MCP registry, request onboarding using the
   official maintainer process, linking the verified registry entry, public
   repository, MIT licence, remote endpoint and no-auth/read-only description.
   Do not claim GitHub listing or automatic recommendations until verified.

Read-only discovery queries (replace the search value with the exact server name
when published):

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
The hosted verifier may still report an older application anchor separately
from protocol success. That warning remains a corpus-release task, not proof
of updated documentation or a reason to misrepresent current registry metadata.

References:

- [Official remote-server publication](https://modelcontextprotocol.io/registry/remote-servers)
- [Official publisher authentication](https://modelcontextprotocol.io/registry/authentication)
- [GitHub registry maintainer onboarding clarification](https://github.com/github/github-mcp-server/discussions/1257)
