# WordPress / Elementor: native PHP DressMe example

Run DressMe in WordPress without a Node.js service or build step. The plugin includes shopper and garment uploads, background preparation, a before-and-after slider, image download and native device sharing with a download fallback.

- [Open the illustrated page demo](https://velox-xr.github.io/trifit-partner-api-example/)
- [Download the installable plugin ZIP](https://github.com/Velox-XR/trifit-partner-api-example/raw/refs/heads/main/examples/wordpress/downloads/velox-dress-me-php.zip)
- [Inspect the PHP, JavaScript and CSS](velox-dress-me-php/)
- [Partner API documentation](../../docs/GETTING_STARTED.md) · [API walkthrough](../../WALKTHROUGH.md)

The public page demo is an **offline illustration**, not a hosted WordPress installation or generated result. Its upload/generate controls are disabled. Install the plugin on your WordPress host for the working form. The separate [Velox hosted live demo](https://studio.v3lox.com/partners/demo/demo) lets visitors try the API using its limited shared allowance.

## Start locally, then adapt your own site

Follow [Run the example in local WordPress](LOCAL-DEVELOPMENT.md) to create a local site, install the plugin, enable your private configuration and then transfer the integration to your WordPress/Elementor site. No Node.js backend is required.

## Install

1. In WordPress, choose **Plugins → Add New → Upload Plugin**, upload `velox-dress-me-php.zip`, and activate it.
2. Add a full-width page. In Elementor use the **Shortcode** widget; in the block editor use a **Shortcode** block:

   ```text
   [velox_dress_me_php]
   ```

3. Preview mode is the default. Use `[velox_dress_me_php preview="yes"]` for an explicitly illustrated page. Preview mode makes no uploads or generation requests.
4. Get your own environment-specific partner configuration from Velox. Copy `config.example.php` **outside the public document root**, replace its invalid placeholders with your assigned configuration, and enable `VELOX_WP_LIVE` only when ready for live use. Do not use the hosted demo's private credential.
5. In `wp-config.php`, after `ABSPATH` is defined and before `wp-settings.php` is loaded, include your private configuration:

   ```php
   require '/absolute/private/path/velox-wordpress.php';
   ```

6. Check that the live banner identifies the expected integration. The backend checks `/me` against the configured client, application and environment. With permission to process the images, select both images and choose **Create my look**. Live requests consume your account's allowance.

Keep your existing WordPress/Elementor theme. Never paste the key into a Shortcode widget, JavaScript, public Media Library or source control. This is a direct HTTP integration in PHP, not a separate PHP SDK.

## Upload and completion flow

Each image selection starts its own upload after consent. PHP reserves and persists the asset receipt, sends bytes using only returned storage headers, completes the upload and saves the canonical asset ID. Completion starts the API's background preparation. Create submits the saved `personalAssetId` and `productAssetId`; it does not upload again.

The product preparation label is a snapshot. Shopper upload completion does not expose live cache readiness; neither successful upload nor immediate clicking guarantees both caches are warm. For an archive/store, prepare catalogue garments ahead of visits and retain their canonical IDs on the server. A shared catalogue administration interface is not included.

The browser polls sequentially on a one-second start-to-start cadence, without overlapping reads, for up to two minutes. Slow responses can exceed that cadence. **Check existing request** resumes reads of the saved request. Exact inputs and a UUID idempotency key are retained before submission; uncertain submissions are not automatically replaced or charged again.

The authorized temporary result URL is displayed directly. Export bytes are prepared after display, so download preparation does not delay the image. Sharing opens the operating system's file-sharing menu where supported; otherwise visitors download and attach the image themselves. It does not directly publish a social-media post.

## Customize

| File | Purpose |
| --- | --- |
| `velox-dress-me-php/view.php` | Page copy and form/result layout |
| `velox-dress-me-php/style.css` | Responsive styles and colours |
| `velox-dress-me-php/app.js` | Uploads, status polling, slider and export UI |
| `velox-dress-me-php/velox-dress-me-php.php` | WordPress routes, API calls, ownership and durable receipts |

Edit the installed plugin files or repackage the source folder as a ZIP. Plugin replacement overwrites local edits, so keep a versioned copy. Use `python scripts/package-wordpress.py` from the repository root to reproduce the download; Python is only a maintainer packaging tool, not a WordPress hosting dependency.

## Hosted webhooks

The supplied plugin uses polling. [The PHP webhook guide](WEBHOOKS.md) describes an optional hosted extension: signed callbacks, durable inbox, original-job reconciliation and local browser status reads. It is not an installed receiver. Webhooks notify the server; the browser still needs local polling or an authenticated push channel. They do not accelerate inference.

## Hosting and launch

Use HTTPS, a supported WordPress/PHP version (plugin minimum PHP 8.1), outbound HTTPS to your assigned API/storage hosts, `upload_max_filesize >= 6M`, `post_max_size >= 14M`, and a request timeout allowing up to three sequential 25-second upload steps. Images are limited to 5 MiB, 8192 pixels per side and 16 megapixels. Exclude `/wp-json/velox-wp/v1/*` and `?rest_route=/velox-wp/v1/*` from page/CDN caching; preserve the incoming Origin.

The example has been exercised end-to-end in local WordPress with real Production requests and verified preparation-cache reuse. The local installation used SQLite; validate MySQL hosting, Elementor styling, mobile layouts and sharing on your own site. Social posting has not been tested. The preview slider and PHP syntax were checked before publication.

Configure site-specific consent/privacy wording, retention/deletion, account allowances and abuse controls before public launch. Visitor cookies last 48 hours; receipt records remain for recovery. Cookie expiry does not delete uploaded images. There is no retention-cleanup or operator-reconciliation screen. Do not delete active receipts to bypass uncertain submissions. Private media, keys and signed URLs must stay out of logs and analytics.

## Observed performance

A Production prepared-input benchmark on 23 November 2026 completed 100/100 requests with **9.31 seconds mean** and **13.98 seconds p95** to URL ready; p99 was 28.62 seconds and maximum 52.60 seconds. Requests arrived globally about three seconds apart on two ready workers using the Flash profile. [Sanitized summary](performance-summary.json).

This is an observed backend benchmark, not an SLA or a WordPress click-to-display measurement. Uploads, preparation, polling, transfer and rendering can add time. A separate WordPress request encountered transport timeouts and took 41.04 seconds to display despite cache reuse. The six-second backend target is still under investigation. Keep progress and saved-request recovery available.

## Public package boundaries

No real shopper photos, private configuration, demo keys, signed URLs, raw logs or infrastructure diagnostics are included. The SVG illustration is explicitly not an AI result. The plugin is version 0.3.4; the source and installable ZIP contain the same files. See the repository [MIT license](../../LICENSE).
