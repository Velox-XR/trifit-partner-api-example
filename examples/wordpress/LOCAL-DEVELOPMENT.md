# Run the WordPress example locally, then use it on your site

This is a WordPress plugin running inside a real local WordPress installation. You do not run the PHP file directly or need a Node.js backend. The GitHub Pages illustration is separate from this working example.

## 1. Create a local WordPress site

If you already have local WordPress, use it. Otherwise, install [WordPress Studio](https://wordpress.studio/), create a blank site called `Dress Archive`, start it and open **WP Admin**. Use the local address supplied by Studio; do not copy our machine's localhost port.

WordPress documents creating local sites and installing custom plugin ZIPs in its [local development guide](https://developer.wordpress.com/docs/get-started/local-environment-setup/). Studio is a setup option; our completed live checks used native PHP with WordPress and SQLite, not Studio. Check your local runtime's outbound HTTPS and image support before live use.

## 2. Install the example and open the page

1. Download [velox-dress-me-php.zip](https://github.com/Velox-XR/trifit-partner-api-example/raw/refs/heads/main/examples/wordpress/downloads/velox-dress-me-php.zip). Do not upload the full GitHub repository ZIP as a plugin.
2. In local WP Admin, open **Plugins → Add New → Upload Plugin**, select that ZIP, install and activate it.
3. Create a page called **Dress Me**, add a **Shortcode** block and enter:

   ```text
   [velox_dress_me_php]
   ```

4. Publish the page on the local site and open its front-end URL. With no live configuration, it displays preview mode. The illustrated example is not generated output. Elementor is optional at this stage; if installed, use its **Shortcode** widget instead.

## 3. Enable real try-ons locally

For Amanda's handoff, extract `dressarchive-production.php` from the separately supplied private configuration ZIP. Put it outside the site's public/document-root directory. Never upload that private ZIP through WordPress.

Open the local site's `wp-config.php`. After the `ABSPATH` definition and **before** the line loading `wp-settings.php`, add the absolute path to the private file, for example:

```php
// Windows example; replace with your actual private path.
require 'C:/Users/YourName/velox-private/dressarchive-production.php';
// macOS/Linux alternative: require '/Users/YourName/velox-private/dressarchive-production.php';
```

Use only one `require` line and the actual path for your computer. Other partners should fill in `config.example.php` using their own assigned configuration. Do not combine different partners' keys or use a demo key as your website identity.

Reload the page and confirm the expected integration in its live banner. The supplied DressArchive file enables live Production API use: **a local website still sends consented images to Velox and consumes Production allowance**. Internet access is needed. The plugin validates `/me` before uploads or generation.

Allow image processing, choose a garment and shopper photo, and wait for both upload receipts. Each selection starts preparation independently. Click **Create my look** once. Confirm the result, slider and download; sharing depends on the browser/device. If an outcome is uncertain, retain the reference and use **Check existing request**, not a replacement submission.

The included polling flow works from localhost without a publicly reachable callback. Webhooks are optional later and need a reachable HTTPS receiver; see [the webhook guide](WEBHOOKS.md).

## 4. Customize the source

The installed files are in `wp-content/plugins/velox-dress-me-php/`. Edit `view.php` for page layout/copy, `style.css` for design and `app.js` for browser interaction. The PHP plugin file handles the API and ownership checks. Keep your edits in version control, without the private configuration. See [all source files](velox-dress-me-php/).

## 5. Move the integration to your own WordPress site

Back up the destination site and try the integration on staging first. Install your edited plugin folder/ZIP there, keep the existing theme, and place the same shortcode on the DRESS ME page or in Elementor. Install private configuration separately using the destination server's path and the environment assigned by Velox.

Transfer the plugin and page integration—not our local database, visitor cookies, image receipts or test images. Do not overwrite an existing site's `wp-config.php` with the local file; add only the appropriate private configuration include. Verify HTTPS, cache exclusions, upload limits, mobile layout and visitor ownership using the [hosting checklist](README.md#hosting-and-launch).

Local success is the starting point for host-specific acceptance. No new public hosting, WordPress subscription or webhook service is needed just to develop locally.
