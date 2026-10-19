# Example 2: DressMe with your existing TriFit account

Use your **own TriFit account and its remaining allowance**, like the linked-account
Velox TriFit plugin. **No Partner API application key is needed.** This is a local
Node.js MCP client using the existing Production OAuth service, not another
authentication server, queue or quota ledger. Source is MIT licensed.

This example is tested with offline contract/security fixtures. A live user sign-in,
upload and generated result are separate acceptance checks; passing the offline
tests does not prove a successful real try-on or current service availability.

## Start read-only

Install [Node.js 22+](https://nodejs.org/), download/clone this repository, then run
these commands in its root directory:

```sh
npm ci
npm run account:example
```

1. Type `CONNECT` in the terminal. This registers a public OAuth client for the
   local example, not a commercial partner integration or a new TriFit account.
2. Open the printed **trifit.v3lox.com** link in your normal browser. Sign in using
   your existing TriFit email and its verification code, or the supported Google
   sign-in. An already-valid website session may avoid another sign-in step.
3. Approve the displayed account permissions. Enter credentials/codes **only on
   TriFit's page**, never in the terminal, source code or ChatGPT prompt.
4. The browser returns to `http://127.0.0.1:<temporary-port>/callback`. Keep the
   terminal running. It verifies **Production + personal account**, then prints
   your live allowance. Signing in does not upload or generate anything.

You are authorising this local example separately: it does not extract or copy a
ChatGPT/Codex token. It requests account access only and cannot silently switch to
the guest demo. An email address alone is not authentication.

## Run one real DressMe request

Exit the read-only example (`logout` revokes its grant; `quit` only exits), then:

```sh
npm run account:example -- --actions
```

Sign in again and approve image-upload, result-viewing and try-on permissions.
Those permissions do not themselves start an action.

1. Enter `allowance` to see current daily, weekly and monthly balances. The example
   does not create extra free credits. Use it only while your account permits the request.
2. Enter `library`, choose `photos` or `products`, and use your existing image IDs.
   Alternatively enter `upload`, choose `personal` or `product`, enter a local file
   path, then type `UPLOAD`. Repeat for the other image only if needed. PNG/JPEG/WebP
   inputs up to 24 MiB are accepted by this client; the server validates/resizes
   them and saves the prepared image to your account. Uploading also selects that
   photo/product slot on the website. It does not generate an outfit.
3. Enter `try-on`, paste the returned **personal** and **product** asset IDs, review
   the displayed allowance, and type `GENERATE`. This is **one real request**, which
   can consume account allowance. It is not a simulation or a performance benchmark.
4. Keep the printed `requestId`. Enter `result` and paste that ID. While pending,
   wait at least five seconds before another read. After completion, the example
   saves the returned image under `.account-example/` and prints its local path,
   status and recorded duration. Open that image file normally. There is no paid retry.
5. Enter `allowance` and `library` again, or open [TriFit](https://trifit.v3lox.com/)
   with the same identity. The account library, history and usage are shared with
   the Production website; Development data is separate.

| Command | Effect |
| --- | --- |
| `allowance` | Read live account balances; no generation |
| `library` | Read one page of photos/products/looks/requests; use `nextOffset` for more |
| `upload` | With `--actions` + `UPLOAD`, import one chosen local photo; preserve its ID |
| `try-on` | With `--actions` + `GENERATE`, submit exactly one new DressMe request |
| `result` | Read the original request and save its completed image; never generate |
| `logout` | Revoke this example's connection and exit; does not delete website data |
| `quit` | Exit and discard in-memory tokens; does not promise grant revocation |

The recorded server duration includes the service's measured request lifecycle;
it is **not** GPU-only time or local image-download/display time. Missing timing
is left unavailable. An AI try-on previews appearance, not physical fit or sizing.

## Credentials and recovery

- Do **not** set `VELOX_APPLICATION_KEY`, `VELOX_CLIENT_ID`, your email as a key,
  a copied browser cookie, or a ChatGPT access token. The Production MCP resource
  is `https://studio.v3lox.com/partner/trifit/mcp`.
- OAuth uses public-client registration, PKCE S256, random state, exact issuer and
  resource binding, and a loopback-only callback. Tokens remain in process memory.
  There is no automatic token refresh or paid POST replay. If access expires,
  sign in again and read the **existing** receipt before any further action.
- `.account-example/` is ignored by Git. It holds private images, hashed account
  identifiers, import IDs, exact request payloads and receipts—not access tokens
  or signed media URLs. Preserve it after a timeout; do not share it publicly.
- An unresolved saved request blocks another generation for that account. `result`
  reconciles the original request. A missing receipt does **not** prove it never ran.
  If still uncertain, contact Velox with the request ID; do not delete the intent
  to bypass the safeguard. A new deliberate try-on is not a retry.
- Only one process can own this example's state directory. After a crash, first
  confirm the old process is stopped, retain all receipts, and remove **only** the
  stale `.account-example/client.lock` file. Restart and read the saved request.
  Never remove the entire directory to continue an uncertain generation.
- A failed upload is not automatically retried. Retain `upload-<importId>.json`,
  inspect your website library and ask Velox to reconcile an uncertain import.
- `logout`/session expiry does not delete uploaded images or account history. Use
  TriFit's supported data controls or contact Velox for deletion.

This is a single-user local teaching example, not a publicly hosted multi-user
backend. Building a commercial app for your customers requires the separately
approved [Partner API flow](../../WALKTHROUGH.md). Personal quotas are not a shared
commercial allowance or permission to automate account creation.

## How it works / tests

- `oauth.mjs`: Production metadata, public client registration and sign-in/consent.
- `client.mjs`: official MCP SDK transport, account checks, uploads and durable receipts.
- `main.mjs`: interactive commands with per-action confirmation.

```sh
node --test test/account-example.test.mjs
npm run account:example -- --help
```

Tests use synthetic metadata, an actual loopback callback and fake tool responses.
They do not sign in to Velox, register a real client, send real photos or generate.
The flow follows the [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
and uses the repository's pinned [official TypeScript/JavaScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk).
