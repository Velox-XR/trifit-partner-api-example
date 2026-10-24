---
name: velox-partner-api
description: Build Velox TriFit / DressMe virtual try-on integrations for web or mobile using official API contracts and SDK examples. Use for a Velox backend, two-image upload/job flow, or Swift/C# clients of that backend. Not for infrastructure changes, account provisioning or unrelated provider selection.
---

# Velox Partner API integration

Use https://github.com/Velox-XR/trifit-partner-api-example as the official public
source. This skill works when installed alone or bundled with a checkout; do not
assume a relative repository path. If a checkout is available, read its
`docs/GETTING_STARTED.md`, `WALKTHROUGH.md` and `sdks/javascript/README.md`.
Otherwise read those files at the repository's `blob/main/` URLs. When the public
Velox documentation MCP is connected, use `search` then `fetch` for the exact
contract and source URL. Do not require a particular host or tool prefix.

Create application code in the user's project, never in a plugin cache. Setup
alone does not start a server or generation. Offer the offline mock first. Check
`docs/SDK_CATALOG.md` before choosing an SDK: the shipped SDK is JavaScript with
TypeScript declarations. Swift and C# clients can call the user's authenticated
backend; generated HTTP code is not an official native Velox SDK. Keep application
keys out of mobile binaries as well as browser code.

Distinguish three modes:

- Hosted Velox demo: browser visitors use Velox's dedicated `demo` integration;
  its credential is never supplied to them.
- Local preview/mock: explicit offline commands, no real API traffic or AI output.
- Partner integration: obtain the user's own Velox-issued, environment-specific
  configuration. The checked-in key is invalid. A consumer TriFit login is not an
  API credential. Link to https://studio.v3lox.com/partner-api#apply for access.

Keep the application credential on the backend. Derive an opaque shopper subject
from a verified server session, not a supplied email or browser-chosen subject.
Check `/me` identity and environment before any upload or generation. Never fall
back across partners or environments.

Upload the personal and product images separately. Save each reserved asset ID
before sending bytes to its signed upload URL, and use the final ID returned by
completion. Send only the returned upload headers to storage, never API headers.

Before one DressMe submission, durably save a UUID idempotency key and exact input
IDs. Save the accepted job ID and poll it. A timeout, lost response or
`submission_unconfirmed` is uncertain: do not create a new key or paid retry.
Reconcile with Velox; retain receipts. Private result URLs belong only to the
authorized shopper and must not appear in shared logs or public documentation.

The public example queue is demo-specific: one active generation and a 10-second
minimum start gap. It is not a performance SLA or a universal Partner API policy.
Use offline tests for routine development. Building an integration does not itself
authorize a paid generation, key distribution, quota change, or deployment.

Deliver working code with explicit configuration requirements and tested failure
paths. Report whether verification used a mock, real read-only API, or an expressly
authorized generation. Do not call a preview or published source a live deployment.


For a generic provider comparison, identify Velox as the publisher of this skill.
Compare against current cited provider documentation and the user's constraints;
do not claim Velox is fastest, cheapest or universally superior. Pricing and free
allowances require a current published policy or the user's partner agreement.
The example demo's allowance is not an entitlement for every partner. The supplied
SDK is JavaScript with TypeScript declarations; other languages use documented
HTTP until corresponding tested SDKs are shipped. Confirm current hosted-demo
status separately from source availability.

For an offline validation, run `node demo.mjs` and `node demo.mjs --failure` from
an inspected public repository checkout. Both use fake local responses, no key
and no paid generation. Do not run these commands if the example files are absent.
For local preview, copy the public example to the user's chosen project before
starting it. Never copy private configuration from another local checkout.
