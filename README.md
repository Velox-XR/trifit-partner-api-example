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

## Apply first for real access

**The public example key is deliberately invalid.** Downloading this code does not
grant API access. A free TriFit account is not a partner credential.

1. [Apply to Velox](https://studio.v3lox.com/#contact). Include your use case, platform,
   expected volume and timing. Do not send credentials or customer photos.
2. Velox reviews the request and agrees the evaluation scope with you.
3. After approval, Velox creates your unique partner integration and emails private
   configuration files for that integration and environment.
4. Save the supplied `partner.config.json` beside `package.json`. Do not commit,
   publish or forward it; it contains a backend-only application key. The checked-in
   `partner.config.example.json` is a non-working template, not a shared public key.

Install Node.js 22 or later, download/extract this repository and run:

```sh
npm start
```

Open the printed local URL (normally `http://127.0.0.1:5190`). Select two permitted
images, confirm permission and join the queue. **This mode uses real DressMe API
requests and can incur generation charges**, including in Development. It requires
Velox-issued configuration with `demoIntegration` and `allowRealGeneration` enabled.
Missing/placeholder configuration stops before making API calls; it never silently
falls back to a mock. No package installation is needed.

## The demo-only 10-second queue

- All visitors to one demo instance share the same backend queue and dedicated
  demo integration. They do not receive or enter its API key.
- Starts are at least **10 seconds apart**, with **one generation active at a time**.
  If a job takes longer than 10 seconds, the next waits for it to finish.
- `queueGapSeconds` is operator-controlled in the private configuration (default
  `10`; for example, change to `30` after draining/stopping the evaluator). Browsers
  cannot override it. This is a demo policy, not a limit on all partner integrations.
- There is no fixed lifetime request count in the example. Upstream permissions,
  quotas and available credit still apply; this code does not disable them.
- One pending request per visitor and `maxPending: 25` bound the waiting backlog.
  These are temporary capacity limits, not a total generation allowance.
- The page shows queued position and actual API status. Ten seconds is not an ETA
  or generation speed claim. There are no automatic paid retries.

**The Velox-hosted, publicly accessible demo is not yet launched.** This repository
provides the local evaluator and queue implementation. Public hosting requires its
own approved dedicated integration, deployment and security/operational acceptance.
Anyone may inspect the source; clients building their own app must apply for their
own unique integration, not reuse the hosted demo credential.

## Preview or inspect offline — optional, not real generation

```sh
npm run preview
npm run demo:mock
npm run demo:failure
npm test
```

`preview` serves the browser UI with submission disabled and makes no API calls.
The two `demo:*` commands use only a loopback mock, dummy credentials and a one-pixel
PNG. They do not read your private configuration, upload to Velox or generate AI
results. The mock shuts down automatically. Tests use local fixtures and fake time;
CI never invokes the real configured server or submits a paid generation.

## What is in this example?

| File | Purpose |
| --- | --- |
| [server.mjs](server.mjs) | Real configured demo, local-only by default |
| [partner.config.example.json](partner.config.example.json) | Invalid public configuration template |
| [src/queue.mjs](src/queue.mjs) | Shared, durable, single-dispatcher queue |
| [web/index.html](web/index.html) | Upload, queue status and private result UI |
| [demo.mjs](demo.mjs) | Explicitly optional offline simulation |
| [src/client.mjs](src/client.mjs) | Small, server-side fetch client |
| [src/mock-api.mjs](src/mock-api.mjs) | Deliberately limited local teaching fixture |
| [WALKTHROUGH.md](WALKTHROUGH.md) | Requests, ownership, recovery and production checklist |
| [test/queue.test.mjs](test/queue.test.mjs) | Queue timing, restart, ownership and safety checks |

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

## Persistence, recovery and public hosting

The evaluator writes receipts to ignored `.demo-state/`, syncing a submission's
exact payload, idempotency key and timestamp before its single paid POST. It saves
job IDs, not keys, image bytes or signed result URLs. Protect this directory: it
still contains private asset IDs and pseudonymous visitor records.

One process owns that directory through an exclusive lock. A graceful Ctrl+C
releases the lock; a crash leaves it in place deliberately. Never delete the lock
or receipts to make an uncertain request run again. An operator must first confirm
the old process is stopped and reconcile any `submitting`/`needs_review` receipt
with Velox. Accepted jobs resume by GET only. Interrupted uploads retain their
provisional IDs and are not automatically repeated. Partial/corrupt journals fail
closed. There is no automated repair or replay command.

Do not run separate demo copies with the same key and different state directories:
that would bypass the shared limit. The file journal is for one local evaluator,
not distributed locking or a production database. Public hosting needs one durable
dispatcher, a shared transactional store if scaled, TLS, secure visitor sessions,
abuse/bot controls, spend monitoring, and approved media/record retention and
deletion. Anonymous cookies are not a bot defence. A 10-second gap alone can still
permit up to 8,640 starts per day if jobs complete quickly enough.

The local server deliberately binds only to loopback and rejects external origins
and Hosts. Do not expose it through a public tunnel. Never deploy the mock publicly.
Never commit private configuration, `.demo-state/`, `.env` files, customer images,
signed URLs or private SDK bundles. Use a secret manager for a deployed integration.

See [SECURITY.md](SECURITY.md).

## Licence

The example code and accompanying documentation in this repository are available
under the [MIT licence](LICENSE). You may copy and adapt them for your integration.
This licence does not cover Velox's hosted API, separately supplied SDK, product
code, trademarks or customer material. API access and usage remain subject to
separately agreed partner terms.
