# DressMe Partner API example

Bring virtual try-on into your own website, app or retail platform.
**DressMe** creates an AI outfit preview from a shopper photo and a clothing image.
**TriFit** is Velox's consumer experience; the Partner API lets you build your own.

**[Register Partner API interest](https://studio.v3lox.com/#contact)** ·
[Try TriFit](https://trifit.v3lox.com/) · [Technical walkthrough](WALKTHROUGH.md)

For now, use the existing Velox contact form and mention **Partner API / DressMe**
in your message. The dedicated [Partner API application page](https://studio.v3lox.com/partner-api#apply)
is being prepared and is not live yet. This example is available independently
of that website release.

## Run it in a minute

Install Node.js 22 or later. Download this repository's ZIP from GitHub, extract it,
and open a terminal in its folder:

```sh
npm start
npm run demo:failure
npm test
```

No `npm install`, account, API key, Docker or cloud service is needed. There are no
package dependencies. Works in Windows PowerShell, macOS and Linux terminals.

`npm start` starts an ephemeral **loopback-only mock server**, connects with dummy
credentials and demonstrates:

1. Verify the application and environment.
2. Reserve, upload and complete a product image.
3. Upload a personal image for an opaque shopper subject.
4. Submit one DressMe job with a saved idempotency key.
5. Poll it and read the simulated result without forwarding API credentials.

The mock shuts down automatically. It uses a one-pixel PNG, not customer images.
**No real email, upload to Velox, GPU job or paid generation occurs.** It never
reads environment variables or local credential files. Changing an environment
variable cannot turn the demo into a paid integration.

Expected output ends with:

```text
4. Job accepted: queued. Poll this job; do not submit another.
   Status: running
   Status: succeeded
5. Result retrieved (...) bytes. simulated=true.
   This is a one-pixel placeholder, NOT an AI try-on or evidence of quality/latency.
```

`npm run demo:failure` demonstrates a terminal job failure without retrying.

## What is in this example?

| File | Purpose |
| --- | --- |
| [demo.mjs](demo.mjs) | The end-to-end integration flow |
| [src/client.mjs](src/client.mjs) | Small, server-side fetch client |
| [src/mock-api.mjs](src/mock-api.mjs) | Deliberately limited local teaching fixture |
| [WALKTHROUGH.md](WALKTHROUGH.md) | Requests, ownership, recovery and production checklist |
| [test/integration.test.mjs](test/integration.test.mjs) | Offline contract and safety checks |

This example illustrates a subset of the application-credential contract. It is
not the full Velox SDK, a hosted sandbox, a production authentication system or a
performance benchmark. Approved partners receive the current SDK and their
environment-specific onboarding details. Routes and models are assigned by Velox;
the example does not select or provision workers.

## Ready to evaluate a real integration?

[Tell Velox what you are building](https://studio.v3lox.com/#contact).
Include your platform, estimated monthly try-ons, use case and target timing.
Do **not** send credentials or customer photos with your application.

Access is reviewed. Development access, usage limits, privacy requirements and
support are agreed during onboarding. Production access and commercial pricing
are agreed separately. A free TriFit consumer account is not a Partner API key.
AnimateMe animation is optional and requires separate enablement.

AI outfit previews are not measurements or guarantees of garment fit, sizing,
colour or detail. Evaluate quality with agreed, consented material before launch.

## Before hosting anything

Do not deploy `src/mock-api.mjs` publicly. It deliberately omits production
authentication, durable storage, media validation, retention and rate limiting.
Never commit real keys, `.env` files, customer photos, signed URLs or private SDK
bundles. This repository contains none of those materials.

See [SECURITY.md](SECURITY.md).

## Licence

The example code and accompanying documentation in this repository are available
under the [MIT licence](LICENSE). You may copy and adapt them for your integration.
This licence does not cover Velox's hosted API, separately supplied SDK, product
code, trademarks or customer material. API access and usage remain subject to
separately agreed partner terms.
