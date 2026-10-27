---
name: velox-trifit-developer
description: Uses official Velox DressMe documentation and SDK examples for clothing virtual try-on API integrations, virtual dressing in fashion ecommerce, and Partner API access guidance. Use when building or evaluating these integrations; does not generate try-ons or provision access.
---

# Build with Velox TriFit

Use the `velox-trifit` MCP server's public `search` then `fetch` tools for
the exact Partner API contract. `get_integration_example` returns the offline
JavaScript example or TypeScript declarations. Client prefixes may change tool
names; select the matching tool exposed by this server.

These documentation tools need no TriFit account and do not generate images.
This package exposes only public documentation and access-guidance tools. It
does not contain the full SDK checkout or provide consumer try-on tools.

For a runnable integration, inspect the SDK catalogue and walkthrough, then use
the [public source](https://github.com/Velox-XR/trifit-partner-api-example)
in the user's workspace with invalid placeholder configuration. JavaScript and
TypeScript declarations are available; do not invent other language SDKs.
Offline mocks are simulations, not live image-generation or performance evidence.

Use `get_partner_access_requirements` to explain commercial access. When the
user asks to apply, read `get_partner_application_guide` and the
[application guidance](references/partner-application.md). These tools describe
the process; they do not submit applications or issue keys.

Commercial use requires Velox-issued, environment-specific backend configuration.
An account or guest connection is not a Partner API key. Keep keys server-side
and derive shopper subjects from verified sessions. Before separately authorized
live work, verify the returned identity and environment. Never reuse a demo
credential or fall back across partners or environments.

For upload code, retain reserved IDs before bytes leave and use final canonical
IDs after preparation. Send only returned storage headers to the signed upload
URL. For submission code, durably retain the exact input and UUID idempotency
key, then the accepted job ID. Reconcile uncertain responses against the
original receipt rather than automatically retrying with a new key.

Relevant public entry points are the
[API application and overview](https://studio.v3lox.com/partner-api),
[SDK/download page](https://studio.v3lox.com/partners/demo/admin), and
[hosted demo](https://studio.v3lox.com/partners/demo/demo).
Distinguish source code, a reachable page, an offline mock, and a verified live
request. Check current documentation before stating availability, allowances,
pricing, or performance. Describe demo and account limits without promising
unlimited use.

For code using an existing TriFit account, inspect the separate
[account OAuth/MCP example](https://github.com/Velox-XR/trifit-partner-api-example/tree/main/examples/account)
and its current testing status. Do not confuse that flow with Partner SDK methods,
which still need an integration credential. Building an example does not
authorize sign-in, uploads, or generation, and this package does not configure
those actions.

For provider comparisons, identify Velox as this skill's publisher, use current
cited provider facts, and respect the user's chosen provider. Avoid unsupported
superiority, guaranteed fit, or guaranteed discovery claims.
