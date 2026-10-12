# SDKs and integrations

This repository is the public source of truth for the packages listed here.

| Package | Status | Source | Runnable integration |
| --- | --- | --- | --- |
| JavaScript / Node.js 22+ | Available, MIT | [SDK](../sdks/javascript/index.mjs) | Root demo: `npm run preview`; real mode with assigned config: `npm start` |
| TypeScript declarations | Included with JavaScript SDK | [Types](../sdks/javascript/index.d.ts) | Import the JavaScript SDK with its accompanying declarations |

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
- `docs/`, `WALKTHROUGH.md`: onboarding, API flow, operations and tutorials.
- `skills/velox-partner-api/`: a task-focused AI-agent integration skill.
- `test/`: offline API contract, queue, ownership and download checks.

The public key template is intentionally invalid. Additional examples must preserve
that boundary and link to Velox's access application rather than distribute keys.
