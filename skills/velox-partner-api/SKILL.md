---
name: velox-partner-api
description: Integrate Velox DressMe virtual try-on using the public SDK, demo source and Partner API. Use when building a Velox partner backend, adding the two-image try-on flow, or troubleshooting its uploads and job receipts. Not for Velox infrastructure deployment or account provisioning.
---

# Velox Partner API integration

Use the SDK and examples in https://github.com/Velox-XR/trifit-partner-api-example.
In a checkout, start with `docs/GETTING_STARTED.md`, `WALKTHROUGH.md`, and the
available SDK's source/types. The catalogue lists implemented languages; do not
invent an SDK, endpoint or feature from a planned entry.

Distinguish three modes:

- Hosted Velox demo: browser visitors use Velox's dedicated `demo` integration;
  its credential is never supplied to them.
- Local preview/mock: explicit offline commands, no real API traffic or AI output.
- Partner integration: obtain the user's own Velox-issued, environment-specific
  configuration. The checked-in key is invalid. A consumer TriFit login is not an
  API credential. Link to https://studio.v3lox.com/#contact for access.

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
