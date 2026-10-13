# Velox Developer Hub — DressMe & TriFit

Build virtual try-on into your website, app or retail platform. **DressMe** turns
a shopper photo and a garment image into an AI outfit preview. **TriFit** is
Velox's consumer experience.

This repository is the public home for Velox SDK source, runnable integrations,
tutorials and AI-agent integration skills. Start with the demo, then inspect the
exact SDK implementation behind it.

## Start here

| Want to… | Go here |
| --- | --- |
| Try the Velox-hosted example | [Demo](https://studio.v3lox.com/partners/demo/demo) — **hosting release pending; not live yet** |
| See your demo requests and download the SDK ZIP | [Demo dashboard & SDKs](https://studio.v3lox.com/partners/demo/admin) — **hosting release pending; not live yet** |
| Explore immediately on your computer, without credentials | Download this repository; run `npm run preview` with Node.js 22+ |
| Build a real integration | [Getting started](docs/GETTING_STARTED.md) · [Apply for access](https://studio.v3lox.com/#contact) |
| Read the API flow | [Technical walkthrough](WALKTHROUGH.md) |
| Choose an SDK | [SDK catalogue](docs/SDK_CATALOG.md) |
| Work with an AI coding agent | [Velox Partner API skill](skills/velox-partner-api/SKILL.md) |

**Two public pages, not the Velox operator admin.** The dashboard shows only the
visitor's own browser-session requests and public SDK downloads. It exposes no
keys, routing, quota editing, other visitors' photos or traffic-test controls.
The public pages must pass the Studio release gates before they are marked live.

## Install the Codex plugin

See [installation and test prompts](https://github.com/Velox-XR/trifit-partner-api-example/blob/main/docs/CODEX_PLUGIN.md). The GitHub marketplace
package is separate from universal directory review and approval.

## One demo, one inspectable SDK integration

The hosted application is this repository's browser UI, demo backend and shared
queue, using [the JavaScript SDK](sdks/javascript/index.mjs). It is not a separate
partner-specific application or a mock presented as real generation.

- Dedicated hosted partner identity: `demo`.
- Real DressMe requests; AnimateMe is not enabled for the public demo.
- One active generation, and at least **10 seconds between starts**.
- The dashboard ZIP contains this same public source, SDK, examples and guides.
- No API key is needed to visit the hosted demo once launched.
- To run your own real backend, apply for **your own** partner configuration.

The checked-in [configuration template](partner.config.example.json) identifies
the `demo` integration and Production API URL, but its key is deliberately
invalid and real generation is disabled. **It is not a public API credential.**
The hosted service loads the real key privately on Velox's server. It never
appears in GitHub, JavaScript sent to the browser or public ZIP downloads.

## Run locally

Install Node.js 22 or later. No dependency installation is required:

```sh
npm run preview
```

Open the printed URL. The demo and dashboard work locally; the preview cannot
upload or generate. The dashboard's ZIP download works in preview too.

For real access:

1. [Contact Velox](https://studio.v3lox.com/#contact), mentioning Partner API /
   DressMe, your platform, expected usage and launch timing.
2. Velox reviews your request, creates a unique partner integration and emails
   private, environment-specific configuration.
3. Save the supplied `partner.config.json` beside `package.json`.
4. Run `npm start`. Startup verifies the assigned API identity and environment.

A free TriFit account is not a partner credential. Real API use can incur charges,
including in Development. Never commit the private configuration or reuse the
Velox-hosted demo key in another deployment.

## Available SDKs

**JavaScript (Node.js) + TypeScript declarations** are available now, under MIT:
[SDK source](sdks/javascript) · [SDK reference](sdks/javascript/README.md).

The runnable demo is one complete integration of this SDK. More language packages,
framework examples and agent guides can be added to this hub; the catalogue lists
only implementations that actually exist. Other languages may use the documented
HTTP API, but are not advertised as downloadable SDKs until shipped and tested.

## Queue, privacy and safe recovery

The 10-second gap is a minimum start interval, not an ETA or performance guarantee.
A job taking longer keeps the active slot until it finishes. One pending request
per visitor and a backlog of 25 bound temporary admission; there is no lifetime
request cap in the example. **Velox API quotas and commercial permissions still
apply.** The newly created hosted partner currently has its default 100/month
allowance; this repository does not silently increase it.

Browser sessions are private, signed and HttpOnly, with Secure cookies on HTTPS.
The dashboard is session-scoped; clearing cookies loses access to that session's
history. A 48-hour cookie expiry is not automatic media deletion. Image consent,
the privacy policy and agreed retention apply.

The local evaluator stores receipts in ignored `.demo-state/`, with a single
exclusive owner. It saves input IDs, idempotency keys and job IDs, not image bytes,
API keys or signed URLs. An uncertain submission pauses the queue; it is never
automatically replayed. After a crash, retain the journal and lock for operator
reconciliation. Do not run multiple copies with the shared demo credential.

See [hosting and release requirements](docs/HOSTING.md) and [security](SECURITY.md).
The queue's rate limit alone is not a financial budget or full bot defence.

## Test without paid API calls

```sh
npm test
npm run demo:mock
npm run demo:failure
```

Tests and explicit mock modes use local fixtures only. They do not read private
configuration or call Velox. A mock result is not a real AI result or latency proof.

## Licence

The **public SDKs, examples, documentation and agent skill** in this repository
are [MIT licensed](LICENSE). This does not license Velox's hosted API service,
private product code, trademarks or customer material. API access and usage remain
subject to separately agreed terms. AI previews are not guarantees of fit, sizing,
colour or garment detail.
