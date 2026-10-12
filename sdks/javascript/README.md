# @velox/dressme-sdk — preview

Small, dependency-free ESM SDK with TypeScript declarations for the Velox Partner API. Works with Node 22+ and modern browsers that support `fetch`, `Blob`, `AbortSignal.any` and `AbortSignal.timeout`. Application credentials belong on your backend, not in browser code. React Native and native Swift/Kotlin compatibility have not been verified.

## Use the public source

This SDK source is MIT licensed; Velox's hosted API remains separately licensed.
From the root of the downloaded public example, import it directly:

```js
import { VeloxDressMe, VeloxError } from './sdks/javascript/index.mjs';
```

Alternatively, install the local folder into your backend with
`npm install ./sdks/javascript` and use the package import shown below.
Do not assume a public npm registry release exists. The full SDK reference below
covers optional capabilities and older session authentication too; the public
demo uses only the backend application flow and DressMe. Downloading the library
does not enable AnimateMe, webhooks or any unassigned scope.

## Upload products once, through Partner API

Upload catalogue products on your backend before a campaign. Save each returned
asset ID against your product and environment; reuse that ID with later shopper
photos. Do not upload the product again for each DressMe job. The public upload,
completion and asset-read endpoints remain in **Partner API**. Internal Velox
Upload/storage/preprocessing services and their credentials are not partner-facing.

```js
const catalogue = new VeloxDressMe({baseUrl, clientId, integrationKey: applicationKey});
const product = await catalogue.uploadProductImage(productFile, {
  fileName: 'blue-jeans.webp',
  onAssetCreated: async id => savePendingProductId(id) // persist before bytes transfer
});
await saveProductIdForEnvironment(product.id);
const current = await catalogue.getAsset(product.id);
// current.status === 'ready' proves upload completion only.
// current.preparation?.status === 'ready' is shared description-cache evidence.
```

Preparation is asynchronous and does not submit a shopper-generation job. Missing
service configuration is reported as `unavailable`, not success. `simulated` is
only a no-GPU integration check. The reference library deduplicates identical
uploads within the same environment and keeps original IDs after uncertain
responses; reconcile `getAsset`/`completeImageUpload` before creating another asset.
Do not persist signed upload/read URLs. They expire; refresh access via `getAsset`.

The Partner API also deduplicates binary uploads at completion, using its own
SHA-256 of the validated bytes, not a filename or client-supplied digest. Identical
products in the same owner/catalog and environment return the **existing asset
ID**, even for simultaneous upload/import requests. Always save the ID returned
by completion (it can differ from the provisional upload ID). The provisional ID
remains a durable retry receipt. Deleted products are not reused, and personal
images are never deduplicated. Reuse preserves existing preparation evidence;
stale evidence is revalidated asynchronously rather than treated as a new upload.

**Readiness check:** inspect `getAsset(productAssetId).preparation.status` after
awaiting the asset read. Only `ready` confirms that product's shared description
cache is prepared. Top-level asset `status: ready` confirms upload completion,
not cache readiness. Missing descriptions can still be prepared during generation;
simulation does not prove a real cache.

This preview can target the separately configured Development or Production Partner API through your own backend, or the companion local sandbox. Use only the base URL and scoped application credential supplied for the intended environment, and verify `applicationInfo().environment` before uploading or generating. Never fall back between environments. Downloading this package does not provision access or certify your integration's Production acceptance. There are no live API, Azure, RunPod, Vast or Shopify credentials in the SDK.

## Application integration (explicit environment and scoped backend credential)

Velox explicitly provisions a scoped `va_` application credential after migration
005. Existing `vi_` credentials retain their previous session-based permissions.
Your backend can use the same upload/job methods without email or Velox accounts:

```js
const shopper = new VeloxDressMe({baseUrl, clientId, integrationKey: applicationKey,
  subject: session.opaqueShopperId}); // Bind from your authenticated server session.
const application = await shopper.applicationInfo();
const photo = await shopper.uploadPersonalPhoto(personFile);
const job = await shopper.createDressMeJob({personalAssetId: photo.id, productAssetId},
  {idempotencyKey: savedRequestId});
```

Product assets are shared inside the application catalog. Personal images, jobs
and results require the same opaque subject (1–128 letters/digits/underscore/hyphen).
Never let a browser choose another shopper's subject. Velox stores a hash of the
reference, not a new user account. Two rotated keys share the same application
ownership; revoking one does not delete history. Keep secrets on your backend.
Scopes are `assets:read`, `assets:write`, `assets:delete`, `jobs:read`, `jobs:write`,
`webhooks:write`, and reserved tenant monitoring scope `admin:read`.
Key revocation stops API calls, not already accepted generation or unexpired
upload/read capabilities (five minutes / one minute respectively).

`importProductImage(url)` imports public HTTPS PNG/JPEG/WebP with pinned DNS,
redirect and full decoder checks. Identical ready content is reused within the
application's catalog. Uploads/imports are limited to 5 MiB, 8192px per dimension,
16 megapixels and one frame. No source URL query/secret is retained.

New personal/result assets expire after seven days by default; Velox can configure
1–30 days for subsequently created assets. Catalog products remain until explicitly
deleted. Older assets without a retention date are not retroactively expired.
`deleteAsset(id)` and `deleteSubject()` immediately remove API/capability access
and suppress dependent late results. Physical cache/blob deletion is retried and
reported separately (`pending`, `waiting_for_job`, `blocked`, `complete`). A
deleted subject reference cannot be reused. Backup expiry and provider-side data
retention are separate from API deletion and require release verification.

The older session-based flow remains supported:

```js
import { readFile } from 'node:fs/promises';
import { VeloxDressMe, VeloxError } from '@velox/dressme-sdk';

// Backend example: create this private file using credentials supplied separately.
// The downloadable source ZIP contains configuration templates, not live secrets.
const config = JSON.parse(await readFile('./config.local.json', 'utf8'));

const velox = new VeloxDressMe({
  baseUrl: config.apiBaseUrl,
  clientId: config.clientId,
  integrationKey: config.integrationKey
});

const { challengeId } = await velox.requestCode('user@example.com');
// Collect the verification code delivered to the user's email.
await velox.verifyCode(challengeId, codeEnteredByUser);

// Browser File objects are Blobs. Set image/png or image/jpeg for Node Blobs.
const person = await velox.uploadPersonalPhoto(personFile);
const product = await velox.uploadProductImage(productFile);

// Keep this key for retries of the SAME submission, including uncertain network failures.
const idempotencyKey = crypto.randomUUID();
const job = await velox.createDressMeJob({
  personalAssetId: person.id,
  productAssetId: product.id
}, { idempotencyKey });

const completed = await velox.waitForDressMe(job.id, {
  timeoutMs: 120000,
  intervalMs: 1000,
  onStatus: job => { console.log(job.id, job.status); }
});
console.log(completed.result.url, completed.simulated);
await velox.logout();
```

## Methods

| Method | Behavior |
|---|---|
| `requestCode(email)` | Returns a challenge ID; does not authenticate |
| `verifyCode(challengeId, code)` | Stores session tokens in this SDK instance's memory |
| `refresh()` | Explicitly rotates the refresh token and replaces the access token |
| `logout()` | Revokes this session family; clears local tokens after success |
| `createLinkChallenge(externalUserId, purpose?)` | Backend only; returns a nonce-bound challenge; purpose defaults to `link` |
| `linkAccount({challengeId, idToken, consent: true})` | Backend only; verifies provider proof, links the account and stores its session |
| `loginLinkedAccount({challengeId, idToken})` | Backend only; stores a new session for an existing link using a `login` challenge |
| `linkedAccount()` | Backend only; returns the current session's link metadata |
| `unlinkAccount(linkId)` | Backend only; revokes all linked sessions and clears this SDK session after success |
| `me()` | Returns authenticated user, client and environment |
| `uploadPersonalPhoto(blob, options?)` | Reserves upload, sends bytes, completes asset |
| `uploadProductImage(blob, options?)` | Same flow, with product role |
| `getAsset(id)` | Returns metadata and fresh expiring read URL for a ready asset |
| `createImageUpload(input)` | Reserves an asset and returns its ID, upload URL and required headers |
| `completeImageUpload(assetId)` | Validates/finalizes an uploaded asset and returns metadata |
| `createDressMeJob(inputs, options?)` | Returns an accepted job; supports `idempotencyKey` and `signal` |
| `getDressMeJob(id, options?)` | Reads status and completed result |
| `waitForDressMe(id, options?)` | Polls until success, failure, deadline or abort |

Upload options: `{ fileName?, signal?, onAssetCreated? }`. The optional async `onAssetCreated(assetId)` callback is awaited after reservation and before byte transfer; persist that ID for recovery. Job inputs: `{ personalAssetId, productAssetId, notificationEndpointId? }`. Poll options: `{ timeoutMs?, intervalMs?, signal?, onStatus? }`. The optional `onStatus(job)` callback runs for every returned status, including unchanged and terminal statuses, before polling returns or throws on failure. An async callback is awaited; callback errors stop polling. The interval is a pause between checks, so network and callback time can extend it. These options apply to DressMe, AnimateMe and `waitForJob`. Constructor supports injected `fetch` and per-request `timeoutMs` (30 seconds by default).

Statuses: `queued`, `running`, `succeeded`, `failed`. The sandbox transitions from queued directly to succeeded/failed when polled. `simulated: true` means no image generation occurred. Result URLs are temporary capabilities; obtain a fresh URL with `getAsset(result.id)` when expired. Do not log or publicly share tokens or signed URLs.

## Sessions, retries and errors

By default, automatic refresh is off. With `autoRefresh: true`, the SDK refreshes once on expired access and retries the protected request once. Network failures are never replayed automatically. Refresh before access expiry; serialize refresh calls so parallel refreshes do not look like token replay. Keep tokens in memory for browser integrations; any persistent session strategy belongs to the host application. Do not embed a client secret in browser/mobile code. A client ID identifies the integration; it is not a secret or proof of application authenticity.

`VeloxError` exposes `status`, `code`, `requestId` and `retryAfter`. Native fetch network errors and abort/timeout errors propagate unchanged. Handle 401 by refreshing once or logging in again; 404 means absent or inaccessible; 409 means conflicting state/idempotency payload; 429 includes `retryAfter` seconds. Never retry a job using a new key after an ambiguous network result.

An upload-helper error does **not** prove that reservation, byte transfer or completion failed. Persist the provisional ID with `onAssetCreated` before transfer. Keep that ID and the original environment/owner when an acknowledgement is uncertain; inspect `getAsset(savedAssetId)` and reconcile completion with `completeImageUpload(savedAssetId)` before considering any replacement. Completion can return a canonical deduplicated product ID, which must also be retained. Do not blindly call the upload helper again or replay an expired/single-use upload URL. If no reservation ID was received, or its status cannot be established, retain the failure evidence and stop for reconciliation rather than automatically reserving another asset. Only a definitively unusable reservation permits a deliberate replacement; an HTTP timeout alone does not.

The SDK generates a key when omitted, but calling `createDressMeJob` again then creates a new key. Applications that need reliable retry must supply and retain their own key. SDK polling cancellation does not cancel a backend job.

Logout does not instantly invalidate already issued image URLs. They expire independently. If logout fails, the SDK retains tokens so the app can retry revocation. An app can discard its local session with `velox.session = null`, but that does not revoke the server session.

The distribution contains only the SDK and this documentation. It does not include the local sandbox or a production server. Preview version; no production compatibility guarantee until 1.0.

## Upload once, submit asset IDs separately

DressMe takes asset IDs, not image bytes in the generation request. Upload and complete assets separately. With application credentials, products are shared within the partner catalogue; personal images and results are restricted to their opaque subject. Legacy user-session assets retain their original user ownership. The helpers combine reservation, binary upload and completion; explicit methods support custom upload UI:

```js
const target = await velox.createImageUpload({
  role: 'personal', fileName: file.name, contentType: file.type, sizeBytes: file.size
});
const response = await fetch(target.uploadUrl, {
  method: 'PUT', headers: target.uploadHeaders, body: file
});
if (!response.ok) throw new Error('Upload failed');
const personal = await velox.completeImageUpload(target.assetId);
const job = await velox.createDressMeJob({
  personalAssetId: personal.id, productAssetId: savedProductAssetId
}, { idempotencyKey: crypto.randomUUID() });
```

Use only the returned upload headers when sending bytes to the upload URL; never forward API credentials. Different integrations cannot share asset IDs. Application subjects can reuse their own partner catalogue products, not each other's private photos/results. Only Velox Admin controls the route assigned to each partner/environment. The SDK and API reject new requests containing a route override, including from credentials with a historical `routes:select` scope. Accepted jobs retain their assigned route; an exact replay of a previously accepted request returns that same job, never reroutes or resubmits it.

### Optional session renewal

Set `autoRefresh: true` in the constructor to renew an expired access token automatically on a protected API response with `401 unauthorized`. The browser example enables this. Concurrent requests share one refresh; the original request is retried once with unchanged input and idempotency key. Network errors and uncertain generation submissions are not retried. If the refresh token has expired or been revoked, sign in again. Default remains false for explicit session management.

### Optional completion webhooks

For application-key integrations, use the partner dashboard's **Webhook
configuration** in the selected environment, or these backend-only methods:

```js
const endpoint = await velox.registerNotificationEndpoint('https://your-backend.example/events');
// Store endpoint.id, endpoint.keyId and endpoint.secret privately on your backend.
const configuration = await velox.notificationEndpoints(); // no signing secrets
// Drain accepted jobs before disabling their destination.
await velox.setNotificationEndpointState(endpoint.id, {
  enabled: false, expectedRevision: configuration.revision
});
```

Registration/state changes require `webhooks:write`; listing accepts `admin:read`
or `webhooks:write`. Tenant/environment ownership is enforced on the API. Only
partner-created endpoints can be toggled by the partner. A changed URL/signing key
uses a newly registered endpoint, not a rewrite of in-flight job destinations.
The registration response supplies signing material (also returned when retrying
the same enabled partner URL); listings contain endpoint metadata and the last
100 delivery records, not secrets or output URLs. Registration does not verify
reachability. Delivery acknowledgments and receiver-side processing are separate
checks. The hosted reference demo retains its own receiver configuration.

Register your callback through your backend's `POST /notification-endpoints`, under separately approved webhook access. The public demo does not configure callbacks. Use the returned endpoint ID:

```js
const job = await velox.createDressMeJob({
  personalAssetId, productAssetId,
  notificationEndpointId: 'dressme-completion'
}, { idempotencyKey: crypto.randomUUID() });
```

Omit `notificationEndpointId` for polling only. Register a public HTTPS URL; arbitrary per-request URLs are not accepted. The receiver verifies `X-Velox-Signature` (HMAC-SHA256 over `timestamp + '.' + exact raw body`), the five-minute timestamp window and key ID, and deduplicates `eventId`. Delivery is at least once. A callback failure never repeats generation.

For partner backend result retrieval only:

```js
const reader = new VeloxDressMe({
  baseUrl: process.env.VELOX_API_URL,
  clientId: process.env.VELOX_CLIENT_ID,
  integrationKey: process.env.VELOX_INTEGRATION_KEY,
  serverToken: process.env.VELOX_RESULT_READ_TOKEN
});
const job = await reader.getDressMeJob(event.jobId);
const result = await reader.getAsset(event.resultAssetId);
```

Velox supplies and manages this read-only credential when needed. Never embed it in frontend or mobile code. It cannot upload images, submit jobs or read input photos. The companion example ZIP includes signature verification and durable event inbox handling.

## External development pilot

Use `https://velox-studio-shopify-dev.azurewebsites.net/partner/v1` on your backend with your assigned `clientId` and `integrationKey`. These are separate from the user bearer session. The integration key is required even for requesting login codes and for result-read credentials. It is scoped to one integration and can be revoked in Velox admin. Never put it in browser or mobile code; the constructor rejects it in a browser.

```js
const velox = new VeloxDressMe({
  baseUrl: process.env.VELOX_API_URL,
  clientId: process.env.VELOX_CLIENT_ID,
  integrationKey: process.env.VELOX_INTEGRATION_KEY,
  autoRefresh: true
});
```

Use one SDK session per authenticated user, not one globally shared instance. The portable pilot browser uses a loopback backend that injects its integration key and relays capabilities without exposing secrets. Hosted email codes arrive by email. After verification, the email matches the existing Velox identity, while assets/jobs remain user-and-integration scoped. The API does not permit partner routing overrides.

## Linked-account authentication reference

Linking requires Velox to configure your integration's trusted provider. All five linking methods require a backend `integrationKey`; browser calls are rejected. They use the same user-scoped assets/jobs as email authentication. Use one SDK/session per authenticated application user. The companion ZIP's **ACCOUNT_LINKING.md** contains the full walkthrough, and **TUTORIAL.md** explains the runnable isolated demo.

### createLinkChallenge(externalUserId, purpose = 'link')

Returns `Promise<{ challengeId: string; nonce: string; expiresIn: number }>`. `externalUserId` is the provider's stable, case-sensitive subject (1–255 characters), obtained from your authenticated application session. `purpose` is `link` to connect/reconnect, or `login` to obtain a new session for an existing link. No current Velox session is required.

Pass the returned nonce to your provider to obtain a fresh RS256 ID token. The challenge lasts 300 seconds, binds the integration, subject, purpose and policy, and is single-use. Requesting it does not connect an account or change `velox.session`.

### linkAccount({ challengeId, idToken, consent: true })

Returns `Promise<Session>` with required `link` metadata and assigns the result to `velox.session`. Use a `link` challenge and the fresh provider token bearing its nonce. Set consent only after the authenticated user's Connect action. Verified email matching follows the configured policy; neither an email string nor your integration key alone proves identity.

### loginLinkedAccount({ challengeId, idToken })

Returns `Promise<Session>` with `link` metadata and replaces `velox.session`. Requires a fresh `login` challenge, matching provider token and an existing active link. It uses no Velox email code. A disconnected or policy-invalidated account must reconnect instead.

### linkedAccount()

Returns `Promise<AccountLink>` for the current linked session. Requires unexpired user access. It does not return credentials. The fields are `id`, `externalUserId`, `email`, `veloxUserId`, `status`, `linkedAt`, `lastLoginAt` and `unlinkedAt`. The public endpoint returns an active link; `relink_required` and disconnected states are used by internal administration and cannot authorize a session.

### unlinkAccount(linkId)

Returns `Promise<{ unlinked: true }>` and sets `velox.session = null` only after success. `linkId` must belong to the current linked session. It revokes all access/refresh families for that link, preserving user records, assets and request history. It does not cancel generation. Subsequent linked login fails until the user reconnects.

On failure the SDK retains its session. Do not announce server-side disconnection solely because you cleared local storage. A lost response may already have revoked access; handle that uncertain outcome before retrying or reconnecting.

### Session persistence and renewal

```js
// Load this authenticated user's saved session, never a shared global session.
velox.session = savedSession;
const renewed = await velox.refresh();
// Atomically save renewed on your backend before another request uses it.
const link = await velox.linkedAccount();
await velox.unlinkAccount(link.id);
// velox.session is null. Remove this user's persisted session after success.
```

`Session` contains `accessToken`, `refreshToken`, `tokenType: 'Bearer'`, `expiresIn` and `user: { id, email }`. Link/login responses also contain `link`; **refresh responses do not**, so persist its ID separately or call `linkedAccount()` again. Token storage belongs to your backend; the SDK keeps only memory and offers no persistence callback.

Access lasts at most 15 minutes. Linked refresh families expire after the configured 1–30 days even when renewed. Refresh is single-use, and reuse revokes its family. Serialize and save refreshes across your backend workers; the SDK only coalesces concurrent refreshes within one instance. Recover a lost refresh response or an expired family through a fresh provider assertion and linked login.

Automatic refresh does not run for `/auth/` methods, including `linkedAccount()` and `unlinkAccount()`. Refresh explicitly before them if access expired. Explicit renewal is also easiest when your backend must persist rotated tokens. `logout()` revokes the current session family but retains the account link; `unlinkAccount()` revokes all families for the connection.

### Linked-account errors

Errors use the existing `VeloxError` shape. `linking_disabled` means provider setup is not enabled; `invalid_identity_token` or `invalid_link_challenge` requires fresh valid proof; `consent_required` requires the user's Connect action; `account_not_linked` requires reconnecting; `link_policy_denied` and `link_conflict` require Velox review. `link_revoked` rejects expired/disconnected/policy-invalidated sessions. `invalid_token` or `refresh_reuse` requires new authentication. `identity_provider_unavailable` is retryable. Never fall back to an unverified email or fabricated token.
# AnimateMe

The existing `VeloxDressMe` client also supports AnimateMe. Use your existing authenticated SDK instance; Velox configures routing per integration.

```js
const source = await sdk.uploadPersonalPhoto(photoBlob);
// Or reuse dressMeJob.result.id after DressMe succeeds.
const job = await sdk.createAnimateMeJob(
  { sourceAssetId: source.id },
  { idempotencyKey: savedRequestId }
);
const done = await sdk.waitForAnimateMe(job.id, {
  timeoutMs: 20 * 60 * 1000,
  intervalMs: 3000
});
// done.result.contentType === 'video/mp4' for real cloud generation.
// Download done.result.url without API authentication headers.
```

`savedRequestId` is generated once by your application (for example `crypto.randomUUID()`) and retained for retries. `getAnimateMeJob(jobId)` reads status once. An optional `notificationEndpointId` in `createAnimateMeJob` requests signed completion events instead of requiring polling. Use `getAsset(resultAssetId)` for a renewed video read URL. Existing DressMe methods and imports are unchanged.
