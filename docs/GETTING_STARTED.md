# From trying DressMe to building with it

**Choose your route first:** [all DressMe access options](DRESSME_ACCESS.md).
For personal use, open the [TriFit app](https://trifit.v3lox.com/) and sign in or
create an account to use its available free allowances. For code using that same
account without a Partner API key, follow [Example 2](../examples/account/README.md).
The steps below describe the separate partner-backend integration.

## 1. Try the hosted integration

[Demo](https://studio.v3lox.com/partners/demo/demo) ·
[Demo dashboard & SDK download](https://studio.v3lox.com/partners/demo/admin)

These public pages are hosted by Velox. Check the
root README for source/release guidance. No visitor API key is required for the hosted
demo. Use only photos and garment images you have permission to process.

## 2. Inspect the exact implementation

The public pages use `web/`, `src/demo-server.mjs`, `src/queue.mjs` and
`sdks/javascript/`. The ZIP is assembled by `src/downloads.mjs` from fixed public
paths. There is no hidden credential inside the download. ZIP file contents match
the corresponding GitHub files from that deployed source version.

With Node.js 22+, run `npm run preview`, open the printed URL, and follow
**Dashboard & SDKs**. It works offline apart from external documentation links.
The preview explicitly disables generation; `npm run demo:mock` is a separate
command demonstrating the API flow with artificial local responses.

## 3. Get your own real access

[Apply to Velox](https://studio.v3lox.com/partner-api#apply) with your platform,
expected usage and launch timing. Applying does not activate access or incur a charge.
After review, Velox supplies private configuration for your own integration.
Save it as `partner.config.json`, which is ignored by Git, then run `npm start`.
Do not use `demo` as your own identity unless Velox explicitly assigned it to you.
The public template's invalid key cannot call the real API.

## 4. Put the SDK on your backend

```js
import { VeloxDressMe } from './sdks/javascript/index.mjs';

const api = new VeloxDressMe({
  baseUrl: process.env.VELOX_API_BASE_URL,
  clientId: process.env.VELOX_CLIENT_ID,
  integrationKey: process.env.VELOX_APPLICATION_KEY,
  subject: authenticatedShopper.opaqueId,
  autoRefresh: false
});
const identity = await api.applicationInfo();
// Check the assigned clientId and environment before uploading or generating.
```

`authenticatedShopper` comes from your server's verified session, not a browser
parameter. Never expose `VELOX_APPLICATION_KEY` in frontend code. Read the
[walkthrough](../WALKTHROUGH.md) before uploads: save provisional and completed
asset IDs, persist the exact payload and idempotency key, then save the accepted
job ID. On uncertain submission, reconcile rather than automatically retry.

## 5. Adapt, test, then launch

Use the [webhook-first walkthrough](../WALKTHROUGH.md#webhook-first-completion) to
register your own signed callback before enabling webhook mode. The example also
demonstrates truthful request timing and session-authorized input/result ZIPs;
the public SDK ZIP contains source only, never private configuration or media.

The SDK is MIT licensed. Your application controls identity, consent, retention,
spending and operational recovery. The demo's single queue is an example, not a
rule imposed on every partner. Keep Development and Production separate. Arrange
production access and acceptance with Velox before exposing your own paid workflow.
