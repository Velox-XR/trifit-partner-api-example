# SDKs and integrations

This repository is the public source of truth for the packages listed here.

| Package | Status | Source | Runnable integration |
| --- | --- | --- | --- |
| JavaScript / Node.js 22+ | Available, MIT | [SDK](../sdks/javascript/index.mjs) | Root demo: `npm run preview`; real mode with assigned config: `npm start` |
| TypeScript declarations | Included with JavaScript SDK | [Types](../sdks/javascript/index.d.ts) | Import the JavaScript SDK with its accompanying declarations |
| Personal account OAuth/MCP example / Node.js 22+ | Source with offline contract tests; live sign-in acceptance still required | [Account example](../examples/account/README.md) | `npm ci`, then `npm run account:example`; explicit `--actions` for uploads/try-ons |

The [public demo dashboard](https://studio.v3lox.com/partners/demo/admin) will
provide the credential-free SDK integration ZIP after the hosting release. See
the root README for live status. Its contents are the same files in this repository,
not the private, partner-configured SDK package from Velox's internal admin.

Additional language SDKs are not yet released. Do not mistake a code snippet or
HTTP example for a supported package. Contributions should include runnable
examples, typed/error contracts where applicable, offline tests, licence and
version information. CI must never run a paid generation.

## Repository layout

- `sdks/<language>/`: distributable SDK source, types and reference documentation.
- `web/`, `src/`, `server.mjs`: the first runnable SDK integration: the public demo.
- `examples/account/`: the second example, using a verified TriFit account and its allowance without a partner key.
- `docs/`, `WALKTHROUGH.md`: onboarding, API flow, operations and tutorials.
- `skills/velox-partner-api/`: a task-focused AI-agent integration skill.
- `test/`: offline API contract, queue, ownership and download checks.

The public partner key template is intentionally invalid. Neither example distributes
keys. Account OAuth does not provision commercial Partner API access. See
[access routes](DRESSME_ACCESS.md) for the distinction.
