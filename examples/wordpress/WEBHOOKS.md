# Hosted WordPress / WooCommerce webhook integration

Implementation guide, 22 November 2026. The supplied 0.3.4 plugin uses one-second sequential polling. This guide describes the extension; it is not an installed or live-tested webhook receiver. PHP can implement the entire server flow without Node.js.

## Recommended flow

1. Keep the existing consented early uploads and canonical asset IDs. A webhook does not prepare images or accelerate inference.
2. WordPress saves the visitor-owned request, exact payload and idempotency key before one generation POST.
3. Velox sends a signed terminal notification to your public HTTPS WordPress endpoint.
4. WordPress durably records the verified event, resolves the original request, and performs an authenticated job GET using that request's saved shopper subject.
5. WordPress updates its local completion receipt. The browser reads this local receipt every second, then retrieves the authorized image once. These local status reads must **not** call Velox on every read.
6. For push delivery, replace local polling with an authenticated SSE or WebSocket channel only if your hosting supports it. A webhook alone cannot update an already-open browser. Shared PHP hosting often makes one-second local receipt polling simpler; long-lived SSE requests occupy PHP workers and may be buffered by proxies.

## Register the public callback once

Use a permanent URL such as `https://YOUR-SITE.example/wp-json/velox-wp/v1/events`. HTTPS port 443, public DNS, no query string, redirects, credentials or fragment. Plain WordPress `?rest_route=` URLs cannot be used for callback registration: configure pretty permalinks / rewriting. Localhost is not reachable by Velox.

From the backend only, using the assigned Production application's credential with `webhooks:write`:

```http
POST {assigned-api-base}/notification-endpoints
X-Velox-Client-Id: YOUR_CLIENT_ID
X-Velox-Integration-Key: YOUR_BACKEND_KEY
Content-Type: application/json

{"url":"https://YOUR-SITE.example/wp-json/velox-wp/v1/events"}
```

Persist returned `id`, `keyId` and `secret` privately outside the document root. The webhook secret is distinct from the API application key. Do not register on each page load. Use `GET /notification-endpoints` to inspect the registered list; do not invent endpoint IDs or silently reuse another integration's endpoint. Use separate credentials, inboxes and environment settings for test and Production.

Extend the existing saved generation payload **before its first POST**:

```json
{
  "personalAssetId": "SAVED_PERSONAL_ID",
  "productAssetId": "SAVED_PRODUCT_ID",
  "notificationEndpointId": "REGISTERED_ENDPOINT_ID",
  "context": {"requestId": "SAVED_WORDPRESS_REQUEST_UUID"}
}
```

Endpoint and request ID come from server records, not browser-controlled inputs. Include these fields in payload equality and idempotency handling. Never change the saved payload under a used key. Existing accepted polling requests stay on their original contract.

## Verify the exact raw bytes in PHP

WordPress REST routes are registered on `rest_api_init`. The callback cannot require a shopper cookie, WP nonce or browser Origin: it is a server-to-server request. Its permission callback must verify the signature instead. Keep the existing visitor CSRF/ownership checks on all browser routes.

The following is the verification core, not a complete storage/receiver plugin:

```php
function verify_velox_event(WP_REST_Request $request, array $keys, string $environment): array {
    $raw = $request->get_body();
    if (strlen($raw) > 65536) throw new RuntimeException('Oversized callback');
    $timestamp = $request->get_header('x-velox-timestamp');
    $keyId = $request->get_header('x-velox-key-id');
    $signature = $request->get_header('x-velox-signature');
    $secret = $keys[$keyId] ?? null;
    if (!is_string($secret) || $secret === '' ||
        !preg_match('/^[0-9]{1,12}$/D', $timestamp) ||
        abs(time() - (int)$timestamp) > 300 ||
        !preg_match('/^v1=[a-f0-9]{64}$/D', $signature)) {
        throw new RuntimeException('Invalid callback authentication');
    }
    $expected = 'v1=' . hash_hmac('sha256', $timestamp . '.' . $raw, $secret);
    if (!hash_equals($expected, $signature)) throw new RuntimeException('Invalid signature');
    $event = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($event) ||
        !preg_match('/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/D', $event['eventId'] ?? '') ||
        ($event['eventId'] ?? '') !== $request->get_header('x-velox-event-id') ||
        ($event['environment'] ?? '') !== $environment ||
        !in_array($event['type'] ?? '', ['dressme.succeeded', 'dressme.failed'], true) ||
        ($event['type'] ?? '') !== 'dressme.' . ($event['status'] ?? '')) {
        throw new RuntimeException('Invalid event contract');
    }
    return ['event' => $event, 'bodyHash' => hash('sha256', $raw)];
}
```

Enforce a 64 KiB request limit at the web server as well, before WordPress buffers the body. Keep clocks synchronized. Select secrets only from the configured environment/integration key-ID map. Never JSON-decode/re-encode before signature verification; whitespace changes the signature. Do not log raw request bodies, credentials or capability URLs.

## Durable inbox and reconciliation

Use a database table with a UNIQUE key on `(environment, application_id, event_id)`, body digest, job ID, request ID, received/processed timestamps and reconciliation state. Use a transactional storage engine and atomic inserts; transient caches and an in-memory list are insufficient.

- Verify authentication first; atomically persist before returning HTTP 204.
- An identical event ID/body digest is an acknowledged duplicate. A conflicting body for the same ID is rejected and flagged.
- Retain verified early callbacks if they arrive before the POST response. Match the signed `context.requestId` to a saved pending request, then require the returned job ID to match before completing it.
- Never trust a callback's result URL, shopper identity or result ID as authorization. GET the saved job with the existing application key and **saved owner subject**; check job ID, terminal status and `simulated === false`, then retain the authenticated result ID.
- Store an event as pending reconciliation until the authenticated GET and local update succeed. A crash between receipt and processing must remain recoverable. Use a reliable host scheduler / existing WooCommerce Action Scheduler for recovery; ordinary traffic-triggered WP-Cron is not a prompt-delivery guarantee. Do not keep the provider waiting for a slow image download.
- No callback handler, retry or browser refresh may create another generation POST. Preserve uncertain submissions and their allowance/active locks.
- Keep failed events terminal, preserve user-facing request references, and do not overwrite a completed state with an older notification.

In this starter, `Velox_WP_Example::status()` currently makes upstream reads while pending. A hosted webhook implementation must separate **local status reads** from **reconciliation**. The visitor status route reads only the visitor-owned receipt; the inbox consumer performs the authorized Velox GET. Keep a bounded GET-only fallback for missing notifications and label completion source honestly. The official evaluator uses ten minutes before fallback and at most one recovery read per 30 seconds; choose and document your host's approved recovery policy rather than silently copying its latency behavior.

## Browser and store integration

Keep existing shortcode / Elementor placement. For WooCommerce, map catalogue product/variation IDs to application-owned canonical product asset IDs on the server. Do not overwrite WooCommerce order status or payment state from a try-on event. Shopper images/results remain private to the original session/customer, independent of public product media.

Poll the local saved receipt sequentially at one second while the tab is active and request pending. Stop on terminal status, bound the active window, and offer explicit saved-request recovery after timeout. After authorized completion, return a validated temporary result URL only to its owning visitor in a private/no-store response. Display it directly with no-referrer, then prepare download/share bytes separately as in 0.3.4. Never put the capability in localStorage, logs or analytics; renew access by the saved result asset ID when needed. If using push, authenticate the channel, check ownership on every subscription, reconnect with a cursor and replay missed local events. Never broadcast signed image URLs or another shopper's job.

## Acceptance checks before enabling live callbacks

Test valid/invalid HMAC, changed raw bytes, unknown key ID, expired/future timestamp, wrong environment, oversized body, duplicate/conflicting events, early callback, wrong job/request correlation, concurrent delivery, crash recovery, expired media URLs, missing callback, and cross-shopper access. Verify both successes and failures cause zero duplicate paid POSTs. Then run one authorized live hosted request and measure click, API acceptance, backend URL readiness, callback arrival, local state commit, browser detection, media transfer, image decode and paint opportunity. Report unmeasured intervals and cross-host clock uncertainty.

## Sources and checked contract

- [Official Partner integration walkthrough](https://github.com/Velox-XR/trifit-partner-api-example/blob/64d54a085963b81d5ac7da16b87e26744936a89e/WALKTHROUGH.md), fetched 22 November 2026 (webhook-first completion).
- [Official source repository](https://github.com/Velox-XR/trifit-partner-api-example).
- WordPress 7.1.5 bundled REST implementation supplies `WP_REST_Request::get_body()`, `get_header()` and `register_rest_route()`. This guide does not claim a deployed receiver or webhook latency result.
