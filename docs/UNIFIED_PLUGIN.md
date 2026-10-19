# Velox TriFit unified plugin

One plugin for two tasks: learn how to integrate DressMe using official API
documentation and SDK examples, or preview clothing using a consented TriFit
account or limited guest session.

## Release status

**v0.3.0 is a Development preview for authorised testers. It is not a Production
release, an OpenAI-approved listing or a promise of unrestricted free use.**
Publishing this source does not open Development to everyone or bypass its access
screen. The existing developer plugin and its review are not replaced by this preview.

The planned unified Production service will use a separate Studio URL,
`https://studio.v3lox.com/partner/trifit/mcp`, after Development acceptance and
protected promotion. **Do not use that planned address as a live connection yet.**
The current documentation-only Production endpoint remains separate.

For immediate public use, try the [website demo](https://studio.v3lox.com/partners/demo/demo),
read the [walkthrough](../WALKTHROUGH.md), or [apply for Partner API access](https://studio.v3lox.com/partner-api).

## Inspect or build the exact preview

Source: [`plugins/velox-trifit-unified-development`](../plugins/velox-trifit-unified-development).
It contains one portable manifest, one remote MCP connection, three skills and an
icon. There is no bundled API credential, OAuth token, customer image or server
implementation. Repository code is MIT licensed; this does not license Velox's
hosted services or grant commercial API access.

With Node.js 22 or later, from this repository:

```sh
node --test test/unified-plugin.test.mjs
npm run plugin:unified:build
```

The command creates `dist/velox-trifit-unified-development-0.3.0.zip` and its
SHA-256 file. It does not install anything, connect an account, upload, generate,
deploy or submit a review. The fixed six-file allowlist reproduces the tested
candidate SHA-256:

```text
c38274f4c043dea3fe3c47f23e3a05d5519c1c63e921768a097270eaa53e6a27
```

## Install in supported desktop clients

Add this repository as a marketplace using the Codex CLI:

```sh
codex plugin marketplace add Velox-XR/trifit-partner-api-example --ref main
```

Then open the desktop Plugins directory, choose the **Velox XR** marketplace,
and install **Velox TriFit · Unified Dev**. Refresh the marketplace or restart
the desktop app if needed. Start a fresh chat with **Try now** and explicitly
select the plugin during acceptance testing. This is manual repository
distribution, not installation from the public OpenAI directory.

Local and repository marketplace support varies by client. A GitHub link or ZIP
is **not** a universal one-click install link for the ChatGPT website. Follow
[OpenAI's package/marketplace guidance](https://developers.openai.com/plugins/build/plugins)
for your supported client. Never paste an API key into a chat or modify installed
cache files to make the connection work.

For complete-package testing in ChatGPT, use **Work mode in the desktop app**
with this installed package selected. Test Codex separately. The browser custom
connection below is useful for testing tools, but is not a substitute for either
complete-package check. Keep existing connections unless a normal consent screen
asks for the permissions needed by the action you explicitly requested.

## ChatGPT web testing

For an authorised Development tester whose ChatGPT account exposes **Add custom
MCP server**, the test endpoint is:

```text
https://studio-dev.v3lox.com/partner/docs/mcp
```

Use ChatGPT's normal custom-connection and OAuth consent flow. Complete the
Development access screen and TriFit sign-in yourself. Select account or guest
deliberately. Availability is controlled by the ChatGPT account/workspace and
Velox's Development access, not by this repository.

This custom MCP connection tests server tools. It does not by itself demonstrate
that the complete three-skill archive has been installed in ChatGPT. Do not
describe a connected icon or a successful allowance read as a successful try-on.
See [OpenAI's connection testing guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Start without spending an attempt

- “Show the Velox API documentation, GitHub and demo links. Do not upload or generate.”
- “Check my connected TriFit account and allowances only.”
- “Show my selected existing result without generating another image.”

Documentation is public and needs no TriFit account. Personal tools require
explicit connection and permission. A TriFit account uses the same-environment
website identity, library, history and daily/weekly/monthly allowance. Verified
Google sign-in can avoid another email-code step; a ChatGPT email or name cannot
be used as proof of identity.

Guests share the hosted demo queue and its actual session/shared allowances.
Read the returned limits and dispatch spacing before submitting; a 10-second gap
between dispatches does not mean the result will finish in 10 seconds. Guest
history does not automatically migrate into an account. Connection expiry or
disconnect is not a guarantee of stored-image deletion.

To generate, explicitly choose a personal photograph and clothing image, approve
their processing and request one try-on. The plugin must submit once and read
that receipt, never automatically retry an uncertain paid request. AI results are
visual previews, not a guarantee of clothing size or physical fit.

## Before public release

Development acceptance must cover both clients, account and guest consent,
selected uploads, existing-result display, history/quota parity and isolation.
Production is promoted only after acceptance, then verified separately. The
release instructions and endpoint must be updated from evidence before inviting
public users. This source release does not change the existing OpenAI review;
public-directory submission, approval and discoverability remain separate.
