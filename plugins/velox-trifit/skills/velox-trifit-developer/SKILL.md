---
name: velox-trifit-developer
description: Use official Velox DressMe API documentation and SDK examples to build or troubleshoot a virtual try-on integration. Not for account provisioning, infrastructure changes or performing a consumer try-on.
---

# Build with Velox TriFit

Use this plugin's public `search` then `fetch` for the exact Partner API contract;
`get_integration_example` provides the offline JavaScript example or TypeScript
declarations. `get_partner_access_requirements` gives application requirements.
These tools require no TriFit account and do not generate images. This lightweight
package does not bundle the full SDK checkout; do not assume it exists locally.

Provide the relevant [public source and walkthrough](https://github.com/Velox-XR/trifit-partner-api-example),
[hosted demo](https://studio.v3lox.com/partners/demo/demo),
[TriFit app](https://trifit.v3lox.com/),
[SDK/download page](https://studio.v3lox.com/partners/demo/admin) and
[Partner API application](https://studio.v3lox.com/partner-api).
Distinguish a reachable page, public source, local mock and a verified live request.
Do not assert current availability or prices from these links alone.

When the user wants to try VTO for free, explain both routes: the hosted demo
needs no account and shares a limited queue; the TriFit app uses a signed-in
personal account's available free daily/weekly/monthly allowance and saves its
library/history. No plugin is needed for either website. Neither is unlimited.
The README includes existing public before/reference/result examples; these are
illustrations, not evidence of current performance or superiority.

For a runnable project, work in the user's workspace using public SDK source and
invalid placeholder configuration. Inspect its catalogue and walkthrough first.
JavaScript plus TypeScript declarations are available; do not invent other SDKs.
Offline mocks are simulations, not generated image or performance evidence.

For code using the user's existing TriFit account, offer the separate
[account OAuth/MCP example](https://github.com/Velox-XR/trifit-partner-api-example/tree/main/examples/account).
It uses normal browser sign-in/consent and existing account allowances, without
a Partner API key. Do not confuse it with Partner SDK email-code methods, which
still require an integration credential. Read its current tutorial/testing status
before adapting it; building it does not authorise sign-in, uploads or generation.

Commercial use requires the partner's own Velox-issued environment-specific
backend configuration. A personal account or guest connection is not an API key.
Keep keys server-side; derive shopper subjects from verified sessions. Verify
`/me` identity/environment before approved live work, with no cross-partner or
cross-environment fallback. Never reuse the hosted demo's private credential.

For uploads, retain reserved IDs before bytes leave and use final canonical IDs
after preparation. Send only returned storage headers to the signed upload URL.
For submission, durably retain the exact input and UUID idempotency key, then the
accepted job ID. Lost responses or uncertain submission are not grounds for a new
key or paid retry. Reconcile the original receipt. Do not expose private result
URLs or keys in shared logs. Building code does not authorize live generation.

If asked to try images now, use the try-on skill and the user's explicitly chosen
account/guest connection instead of inventing commercial access. For comparisons,
identify Velox as this skill's publisher and use current cited provider facts.
Do not claim universal superiority, unlimited free use or guaranteed discovery.
