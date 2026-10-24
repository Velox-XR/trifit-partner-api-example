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
3. Complete any hosted documentation release through Development acceptance
   and protected Production promotion. Do not claim a pending page is live.
4. Use the official `mcp-publisher` release and verify the namespace via
   `mcp-publisher login github`. A repository maintainer must authorize any new
   OAuth access; never substitute a partner key or copy unrelated credentials.
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

References:

- [Official remote-server publication](https://modelcontextprotocol.io/registry/remote-servers)
- [Official publisher authentication](https://modelcontextprotocol.io/registry/authentication)
- [GitHub registry maintainer onboarding clarification](https://github.com/github/github-mcp-server/discussions/1257)
