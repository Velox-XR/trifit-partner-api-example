# From partner application to a real DressMe demo integration

[Register interest](https://studio.v3lox.com/#contact) · [Quick start](README.md)

Mention **Partner API / DressMe** in the existing contact form. The dedicated
application page is awaiting its website release; see the [README](README.md).

## Before running real requests

The public configuration has an invalid key. Apply first. After review and approval,
Velox creates a unique integration and emails private, environment-specific
configuration files. Save the supplied `partner.config.json` locally, outside Git.
`npm start` starts the real evaluator only after valid configuration and an exact
`/me` identity/environment check. `npm run preview` and `npm run demo:mock` are
separate, explicit no-generation modes.

The intended public Velox demo uses its own dedicated partner integration. Visitors
do not apply individually just to try that hosted demo and never see its key.
Clients integrating into their own products apply for separate access. The hosted
demo has not been launched by publishing this repository.

## 1. Understand the boundary

```text
Shopper's browser → your authenticated backend → Velox Partner API
                          ↓
                 your integration records
```

Your backend authenticates your shopper, binds an opaque subject from that session,
keeps the application key secret and enforces your own usage limits. The browser
must not supply another user's subject, asset ID or job ID without your backend
checking ownership. The real evaluator assigns an opaque, server-derived subject
to each HttpOnly visitor cookie; it never accepts a browser-supplied subject. Cookie
identity is not production authentication or bot protection. Only the optional
offline mock hardcodes a fictional shopper.

Approved partners are assigned a client ID, environment-specific API base URL and
scoped `va_` application credential. This is the **application** credential flow,
not the older email-code/user-token flow. A client ID alone is not authentication.
No Velox consumer account is created by the application flow.

Requests from your backend use:

```http
X-Velox-Client-Id: YOUR_ASSIGNED_CLIENT_ID
X-Velox-Integration-Key: va_YOUR_BACKEND_ONLY_APPLICATION_KEY
X-Velox-Subject: YOUR_SERVER_ASSIGNED_OPAQUE_SHOPPER_ID
```

Those are placeholders, not credentials. Subjects contain 1–128 letters, digits,
underscores or hyphens. Use opaque references, not email addresses. Product assets
belong to your application's catalogue; personal images, jobs and results are
scoped to the shopper subject. Keep Development and Production records separate.

## 2. Confirm the environment before any upload or job

`GET /me` returns application metadata, including `kind` and `environment`.
The example checks `kind === 'application'` and the exact expected environment.
It stops on a mismatch and never falls back to another environment.

The mock uses `local-mock`. For real access, use **only** the base URL and expected
environment supplied by Velox. Request paths below are relative to that base URL;
do not append an extra `/v1`. Real Development generation may also incur costs.

## 3. Upload and complete the two inputs

Reserve an asset with `POST /assets/upload-url`:

```json
{
  "role": "product",
  "fileName": "blue-shirt.png",
  "contentType": "image/png",
  "sizeBytes": 12345
}
```

Use `personal` for the shopper photo. Production inputs must meet the current
onboarding image limits; the current contract accepts single-frame PNG/JPEG/WebP,
up to 5 MiB, 8192 pixels per dimension and 16 megapixels. The mock does not validate
image dimensions, permissions, content moderation or generation suitability.

1. Save the returned `assetId` before transferring bytes (`onReserved` in the client).
2. `PUT` the binary file to the returned `uploadUrl` using **only** `uploadHeaders`.
   Do not forward any API key, subject or bearer token. Do not follow redirects.
3. `POST /assets/{assetId}/complete` with `{}`.
4. Save the **completed response's** asset ID. For catalogue deduplication it may
   differ from the provisional ID. Reuse the final product ID across shoppers.

Save IDs, not expiring upload/read URLs. After an ambiguous upload or completion
response, reconcile the reserved asset with `GET /assets/{assetId}` or completion
before reserving again. The small mock implements only the successful upload path.
Real `status: ready` proves upload completion, not prepared cache, output quality
or latency. Product preparation is separate (`preparation.status`); simulation
does not prove it.

## 4. Submit exactly one job for the intended action

Persist a UUID idempotency key **and the exact payload** before making the request:

```http
POST /dressme/jobs
Idempotency-Key: YOUR_SAVED_UUID
Content-Type: application/json
```

```json
{
  "personalAssetId": "COMPLETED_PERSONAL_ASSET_ID",
  "productAssetId": "COMPLETED_PRODUCT_ASSET_ID"
}
```

Persist the accepted `job.id`. No image bytes, provider credentials or route/model
selection belong in this request. An uncertain network response does not mean the
job failed. Reconcile using the **same key and payload** within the API's agreed
idempotency window. Never generate a new key automatically to repeat an uncertain
request; escalate if reconciliation remains uncertain.

The real evaluator's `src/queue.mjs` persists receipts before dispatch. Its shared
queue starts no more than one job every **10 seconds**, with one job active until a
definitive terminal status is read. A queued Partner API job still occupies this
slot. Waiting requests are not submitted to DressMe until admitted. The browser
cannot override timing. `queueGapSeconds` is private operator configuration.

Uploads precede queue admission to generation; their temporary IDs and final asset
IDs are recorded separately. One pending request per visitor and a bounded backlog
protect the local evaluator. There is no fixed total request allowance, but no
upstream quota or commercial permission is changed by this code.

The journal and exclusive owner lock are single-process safeguards. An interrupted
paid POST enters `needs_review`; the whole queue stops rather than replaying it or
releasing an uncertain active slot. An upstream `submission_unconfirmed` failure
also holds the queue. Polling errors hold it for review, not a second paid POST.
An accepted job survives a graceful restart and is polled by saved job ID. A crash
leaves a lock requiring operator reconciliation; never discard it or the journal
to resume blindly. See the README's recovery and public-hosting limitations.

`demo.mjs` uses memory only because it is an explicitly selected disposable mock.
A production hosted service needs durable transactional storage, an outbox/lease
strategy and agreed operator recovery. A UI timeout must never create another job.

## 5. Read the result

Poll `GET /dressme/jobs/{jobId}` with a bounded deadline. States are `queued`,
`running`, `succeeded` or `failed`. A succeeded response contains:

```json
{
  "id": "JOB_ID",
  "status": "succeeded",
  "simulated": true,
  "result": {
    "id": "RESULT_ASSET_ID",
    "contentType": "image/png",
    "url": "TEMPORARY_READ_URL",
    "expiresAt": "EXPIRY_TIMESTAMP"
  }
}
```

`simulated: true` explicitly means no real AI generation. The local fixture returns
a one-pixel PNG. Its timings are deliberately artificial and prove no latency SLA.

Retrieve `result.url` without API headers. Only show it to the authorized shopper;
signed URLs grant temporary access and must not go into public logs, analytics or
shared repositories. Store `result.id`; use `GET /assets/{result.id}` for a renewed
URL when needed. This renewal endpoint is not implemented by the small mock.

Polling is sufficient for this example. The full API can support signed webhooks
under separately configured access. Do not invent a callback URL or signing key.

## 6. Handle errors deliberately

| Outcome | What your integration should do |
| --- | --- |
| 401 / 403 | Check assigned credential and scopes; do not loop or switch environments. |
| 404 | Treat as missing or inaccessible; never try another shopper's identity. |
| 409 | Reconcile state or idempotency conflict; do not change payload under a saved key. |
| 429 | Respect `Retry-After`, queue/bound traffic and keep the same submission identity. |
| Network error / timeout / 5xx | Outcome may be uncertain. Keep receipts and reconcile; no automatic paid replay. |
| Terminal job `failed` | Show a useful failure; a deliberate new generation is a separate action, not an automatic retry. |

The client surfaces status, safe error code, request ID and retry-after metadata.
Do not log full headers, keys, signed URLs or shopper data. The demo uses no
automatic retries; `npm run demo:failure` shows the failed-job path.

The real browser evaluator gives generic error messages rather than exposing raw
upstream responses. After an uncertain browser submission, retain its request
reference and reload to read it; do not send a new request. Result URLs are returned
only to the owning visitor session. The real queue refuses simulated API responses
rather than presenting placeholders as generated results.

## Production checklist — not implemented by this teaching example

- Receive explicit access and commercial approval; verify exact environment and scopes.
- Protect backend endpoints with your own session authentication, authorization,
  CSRF protection, rate limits and spending controls. Never accept a browser-chosen subject.
- Store keys in your secret manager and plan rotation/revocation.
- Store upload receipts, final catalogue IDs, job IDs and idempotency receipts durably.
- Obtain image rights/consent and agree retention, deletion and privacy responsibilities.
- Handle expiring links, 429s, uncertain responses and restarts without duplicate paid jobs.
- Review real output quality and operational acceptance with Velox before launch.
- Obtain separately approved production credentials; do not copy Development data.

The example contains no private client names, commercial arrangements, credentials,
infrastructure inventory, admin access or customer media.
