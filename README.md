# Velox TriFit — Virtual Try-On API, MCP Server and JavaScript SDK

Build virtual try-on (VTO) into a website, mobile app or retail platform with the
**Velox TriFit Partner API**, or connect a coding agent to the **Velox TriFit MCP
server** for official API documentation and integration examples. **DressMe** is
the virtual try-on operation: it turns a shopper photo and a garment image into
an AI outfit preview. The [TriFit app](https://trifit.v3lox.com/) is the consumer
experience; using it is separate from obtaining Partner API credentials.

This official developer repository contains the **JavaScript SDK with TypeScript
declarations**, runnable REST integrations, tutorials, Codex, GitHub Copilot and
Gemini CLI MCP configuration examples, and a portable integration skill. Read the
[API overview](https://studio.v3lox.com/partner-api), then choose the integration
route below. Other languages can use the documented HTTP API; this repository
does not claim an unshipped SDK.

## Virtual dressing and visual fitting rooms

Use DressMe for photo-based virtual dressing: a shopper photo and clothing
reference produce an AI outfit preview. A virtual fitting room built with
DressMe provides a visual preview, not body measurements, clothing-size
prediction or a guarantee of physical fit. The
[REST quickstart](https://studio.v3lox.com/partner-api/quickstart) explains the
upload, job submission and status flow; the
[JavaScript SDK](sdks/javascript/README.md) provides the integration code.

## Choose REST API or MCP

| Integration route | What it provides | Start here |
| --- | --- | --- |
| REST API in your application backend | Submit virtual try-on requests using your separately approved partner configuration; keep keys out of browsers and mobile apps | [REST quickstart](https://studio.v3lox.com/partner-api/quickstart) · [JavaScript SDK](sdks/javascript/README.md) · [Access requirements](docs/GETTING_STARTED.md) |
| MCP in a coding agent | Search official docs, fetch API contracts and get integration examples while building an application | [Virtual try on MCP: Codex, Copilot and Gemini setup](docs/CODING_AGENTS.md) · [Public MCP guide](https://studio.v3lox.com/partner-api/mcp) |
| Portable integration skill | Reusable instructions for an agent to plan and implement the integration; it can also use the public source without MCP | [Skill source and installation](docs/CODING_AGENTS.md#optional-portable-integration-skill) |

For a new direct MCP connection, use
`https://studio.v3lox.com/partner/trifit/mcp`. Documentation-only work needs no
TriFit sign-in or Partner API key: allow only `search`, `fetch`,
`get_integration_example` and `get_partner_access_requirements` as described in
the client guide. **The server as a whole is not read-only.** Its account/guest
upload and try-on tools require separate OAuth authorization and user consent;
they are not part of a documentation check. Connecting MCP or installing a skill
does not grant Partner API credentials, generation allowance or deployment access.

The [published OpenAI Developer plugin](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458)
is a separate installation route. Its existing reviewed connection is managed
separately; a new direct MCP setup or this README update does not migrate it.

## Start here

| Want to… | Go here |
| --- | --- |
| Try without an account | [Hosted demo](https://studio.v3lox.com/partners/demo/demo) — free shared, limited queue |
| Try with your own saved photos, products and history | [TriFit app](https://trifit.v3lox.com/) — sign in/create an account and use its available free daily/weekly/monthly allowance |
| See your demo requests and download the SDK ZIP | [Demo dashboard & SDKs](https://studio.v3lox.com/partners/demo/admin) |
| Explore immediately on your computer, without credentials | Download this repository; run `npm run preview` with Node.js 22+ |
| Build a real integration | [Getting started](docs/GETTING_STARTED.md) · [Apply for access](https://studio.v3lox.com/partner-api#apply) |
| Run real DressMe from code with my existing TriFit account, without a partner key | [Example 2: account sign-in](examples/account/README.md) |
| Understand which access route to use | [All DressMe options](docs/DRESSME_ACCESS.md) |
| Read the API flow | [Technical walkthrough](WALKTHROUGH.md) |
| Choose an SDK | [SDK catalogue](docs/SDK_CATALOG.md) |
| Use Codex or GitHub Copilot to build a web/mobile integration | [MCP setup and mobile starter prompt](docs/CODING_AGENTS.md) · [Portable integration skill](skills/velox-partner-api/SKILL.md) |
| Use Gemini CLI or Google Antigravity for API guidance | [Native Google client setup](https://github.com/Velox-XR/trifit-partner-api-example/blob/main/docs/GOOGLE_AGENTS.md) — documentation tools only |
| Verify the agent connection, then build safely offline | [Four-call MCP check](docs/CODING_AGENTS.md#read-only-connection-check) · [Agent-to-backend tutorial](docs/CODING_AGENTS.md#from-agent-guidance-to-an-offline-virtual-try-on-integration) |
| Install the published OpenAI Developer plugin | [Velox TriFit Developer](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458) — read-only API guidance |
| Connect the current MCP server | [Velox TriFit MCP](https://studio.v3lox.com/partner/trifit/mcp) — protocol endpoint; [client setup and tool restrictions](docs/CODING_AGENTS.md) |
| Find the current MCP server in the official registry | [Velox TriFit registry listing](https://registry.modelcontextprotocol.io/?q=velox-trifit) · [Publication record](docs/MCP_REGISTRY.md) |
| Find the public API overview | [Velox TriFit Partner API](https://studio.v3lox.com/partner-api) |

**Two public pages, not the Velox operator admin.** The dashboard shows only the
visitor's own browser-session requests and public SDK downloads. It exposes no
keys, routing, quota editing, other visitors' photos or traffic-test controls.
Hosted UI updates follow the Studio Development-to-Production release gates;
the public host may run an earlier accepted version than the source you inspect.

## See real public try-on examples

Existing official TriFit examples: AI personal portraits, clothing references and
their actual TriFit outputs. These are historical examples, not mocks, newly run
tests or performance/quality comparisons. [Provenance and media notes](web/samples/README.md).

| Example | Personal photo | Clothing reference | TriFit result |
| --- | --- | --- | --- |
| Amara · activewear | ![Amara, an AI personal model, before the try-on](web/samples/public-amara-person.webp) | ![Dark activewear clothing reference](web/samples/public-amara-reference.webp) | ![Existing TriFit result showing Amara in dark activewear](web/samples/public-amara-result.webp) |
| Mateo · overshirt | ![Mateo, an AI personal model, before the try-on](web/samples/public-mateo-person.webp) | ![Light blue overshirt clothing reference](web/samples/public-mateo-reference.webp) | ![Existing TriFit result showing Mateo in a light blue overshirt](web/samples/public-mateo-result.webp) |

Try your own photos in the [TriFit app](https://trifit.v3lox.com/) with available
account allowance, or the [shared demo](https://studio.v3lox.com/partners/demo/demo)
without an account. The live host receives UI updates through its separate release.

### Outfit-collage starter products

The demo source includes the **same five clothing collages used in our provider
comparison tests**, copied without image edits. Select a whole board as the product
reference and use a separate personal photo. Reference models inside a board are
not the target person. Accessory transfer and garment fidelity can vary.

| Green trench · details | Green trench · full look | Burgundy trench & skirt |
| --- | --- | --- |
| ![Green trench outfit collage with garments and accessories](web/samples/collage-green-trench-details.png) | ![Green trench full-look collage](web/samples/collage-green-trench-look.png) | ![Burgundy trench jacket, skirt and accessories collage](web/samples/collage-burgundy-trench.png) |

| Navy blazer & argyle skirt | Leather jacket & denim |
| --- | --- |
| ![Navy blazer, white shirt, argyle skirt and leg warmers collage](web/samples/collage-navy-blazer.jpg) | ![Leather jacket, burgundy top and jeans collage](web/samples/collage-leather-denim.jpg) |

These are product inputs, **not generated result images or proof of provider
rankings**. They are separate from the matched Amara/Mateo examples above.
Brand names within the boards do not imply endorsement.

## Install the Codex plugin

The [Velox TriFit Developer OpenAI listing](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458)
is published as **Velox TriFit API Docs 1.1.6** (verified 28 October 2026).
Its reviewed binding remains the legacy `/partner/docs/mcp` with four public
documentation tools. It has not migrated to the unified endpoint. You can also connect the
public documentation MCP directly in [Codex or Copilot](docs/CODING_AGENTS.md)
without installing the full plugin. Neither route grants live Partner API access.
The [official MCP Registry listing](https://registry.modelcontextprotocol.io/?q=velox-trifit),
`io.github.Velox-XR/velox-trifit-developer` version `2.0.1`, was independently verified
**active and latest** on **28 October 2026**. It points to the current connection:
`https://studio.v3lox.com/partner/trifit/mcp`. This follows 2.0.0 and supersedes the initial 1.1.0
legacy-endpoint publication under the same identifier, not a second listing.
GitHub's curated registry onboarding is **pending**;
the [listing request](https://github.com/github/github-mcp-server/discussions/1257#discussioncomment-19164911)
has been submitted, not approved. See the [publication record and update checklist](docs/MCP_REGISTRY.md).
Registry publication does not guarantee search rankings or automatic agent recommendations.

See [installation and test prompts](https://github.com/Velox-XR/trifit-partner-api-example/blob/main/docs/CODEX_PLUGIN.md). The GitHub marketplace
package is separate from universal directory review and approval.

### Velox TriFit — API guidance and try-on in one plugin

The [Velox TriFit ChatGPT/Codex plugin](https://github.com/Velox-XR/trifit-partner-api-example/blob/main/docs/TRIFIT_PLUGIN.md) combines API guidance
with consented account or guest try-on in one package. The [v1.2.1 Production-targeted source](https://github.com/Velox-XR/trifit-partner-api-example/tree/main/plugins/velox-trifit)
and reproducible ZIP builder are available for inspection. The current Production
endpoint's 18-tool inventory and four anonymous documentation calls were verified
on 24 October 2026; that check does not prove authenticated try-on/client acceptance
or public-directory approval. This repository distributes Production
packages only. Private Development packages and connection instructions are not
included. The existing developer package and its OpenAI review remain unchanged.

The candidate also includes [applying by email inside the chat](docs/TRIFIT_PLUGIN.md#apply-for-a-partner-key-without-leaving-chat):
confirm your connected sender mailbox, optionally add project details, then review
and approve the message to **partner@v3lox.com**. No automatic key issuance. This
mailbox workflow still needs an approved end-to-end send/receipt acceptance test.

## One demo, one inspectable SDK integration

The hosted application is this repository's browser UI, demo backend and shared
queue, using [the JavaScript SDK](sdks/javascript/index.mjs). It is not a separate
partner-specific application or a mock presented as real generation.

- Dedicated hosted partner identity: `demo`.
- Real DressMe requests; AnimateMe is not enabled for the public demo.
- Signed, durable webhook completion with delayed GET-only recovery if a callback is missing. The UI labels the actual completion source.
- Total elapsed duration, uploads, demo queue and submission-to-observed-completion timings. These are not GPU-only timings.
- Download one look, or all your latest 25 completed requests, as an asset ZIP containing uploaded inputs, results and a timing/checksum manifest. This is separate from the SDK source ZIP.
- One active generation, and at least **10 seconds between starts**.
- Personal and product uploads overlap, with durable receipts for both assets.
  This removes sequential upload waiting without changing generation quality or
  bypassing the queue and usage limits.
- The dashboard ZIP contains this same public source, SDK, examples and guides.
- No API key is needed to visit the Velox-hosted demo.
- To run your own commercial partner backend, apply for **your own** partner configuration.
- For code using your own TriFit account instead, use [Example 2](examples/account/README.md) without a partner key.

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

### Explore the reference workspace

The public workspace follows the fuller partner-demo layout, with a developer
sidebar linking to the public code, SDK ZIP, walkthrough and access application.

- Add up to eight shopper photos and eight product images to **local trays**.
  The source also includes five starter outfit collages from the comparison tests.
  Click one to add it to the product tray without uploading anything.
  Select a pair and inspect it before sending a request. Adding, selecting or
  removing a preview performs no upload or generation.
- JPEG, PNG and WebP photos are prepared locally in the browser: automatically
  resized to at most 2048 pixels on the longest side (never enlarged), with
  aspect ratio and browser-decoded orientation preserved. Your original files
  are untouched; only the prepared copies are submitted. No upload occurs while
  selecting or preparing images. Output stays within the API's 5 MiB cap.
  For browser safety, source files above 32 MiB or 100 megapixels are rejected
  with a prominent error. Unsupported or corrupt files also show clear errors.
- Only an explicit consented submission sends the selected pair. The example
  uploads the pair for each new request; trays are not a persistent asset-ID
  catalogue or a shared partner library.
- Review the request stages, original inputs, completed result and side-by-side
  shopper/result comparison. Local inputs are held only in the open page's memory;
  after reload, request history and available results can be read, not old inputs.
- History shows only this signed browser session's latest 25 requests. Refreshing
  history or checking an uncertain request is read-only and never replays a job.

No production/development selector, shared photo library, routing, webhook
registration or load-test controls are exposed by this public UI. The private
partner workbench is unchanged.

For real **Partner API** access:

1. [Apply through your connected mailbox in the updated plugin](docs/TRIFIT_PLUGIN.md#apply-for-a-partner-key-without-leaving-chat),
   or use the [website form](https://studio.v3lox.com/partner-api#apply).
   In-chat project, expected usage and launch timing details are optional.
2. Velox reviews your request, creates a unique partner integration and emails
   private, environment-specific configuration.
3. Save the supplied `partner.config.json` beside `package.json`.
4. Run `npm start`. Startup verifies the assigned API identity and environment.

For webhook-first completion, ask Velox to grant `webhooks:write` on your own backend
key, then register your public HTTPS receiver:

```sh
node setup-webhook.mjs https://YOUR_HTTPS_HOST/webhooks/dressme
npm start
```

The setup command saves the endpoint ID and signing secret privately in
`partner.config.json`. Hosted mounting prefixes must be included in the callback
URL. See [hosting](docs/HOSTING.md) for the exact origin/proxy contract. With no
webhook configured, the local example remains explicitly polling-only; it does not
claim webhook delivery. The standalone mock remains an unpaid API-flow fixture.

A free TriFit account is not a partner credential, but can authorise the separate
[personal-account example](examples/account/README.md) using its own available
allowance. Real Partner API use can incur charges,
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
