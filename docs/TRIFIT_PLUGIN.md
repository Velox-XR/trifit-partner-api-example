# Velox TriFit plugin

One plugin for two tasks: learn how to integrate DressMe using official API
documentation and SDK examples, or preview clothing using a consented TriFit
account or limited guest session.

## Release status

**v1.2.0 is the Production-targeted release candidate, named Velox TriFit.**
Production activation and client acceptance are in progress. Do not treat this
source publication as proof that the connection is installed or ready, or as an
OpenAI-approved listing. This repository distributes Production packages only;
private testing packages and Development connection details are not included.

The Production package uses `https://studio.v3lox.com/partner/trifit/mcp`.
**Wait for verified Production readiness before connecting it.** The existing
documentation-only service at `https://studio.v3lox.com/partner/docs/mcp` and its
current developer-plugin review remain unchanged. Installing source is separate
from public-directory approval and does not guarantee recommendations in chats.

For immediate public use, try the [website demo](https://studio.v3lox.com/partners/demo/demo),
read the [walkthrough](../WALKTHROUGH.md), or [apply for Partner API access](https://studio.v3lox.com/partner-api).

## Inspect or build the Production package

Production source: [`plugins/velox-trifit`](../plugins/velox-trifit).
It contains one portable manifest, one remote MCP connection, three skills and an
icon. There is no bundled API credential, OAuth token, customer image or server
implementation. Repository code is MIT licensed; this does not license Velox's
hosted services or grant commercial API access.

With Node.js 22 or later, from this repository:

```sh
node --test test/trifit-plugin.test.mjs
npm run plugin:production:build
```

The Production command creates `dist/velox-trifit-1.2.0.zip` and its
SHA-256 file. The command does not install, connect, upload, generate, deploy or
submit a review. The fixed six-file Production archive has SHA-256:

```text
457e588ab7b1a8b41e69c8e9b0ab5b74f7b52b1f27a1d5b54ed8aee1e5c4e0cc
```

## Install in supported desktop clients

Add this repository as a marketplace using the Codex CLI:

```sh
codex plugin marketplace add Velox-XR/trifit-partner-api-example --ref main
```

After Production readiness is confirmed, open the desktop Plugins directory,
choose the **Velox XR** marketplace, and install **Velox TriFit** v1.2.0
(`velox-trifit@velox-xr`). Refresh the marketplace or restart
the desktop app if needed. Start a fresh chat with **Try now** and explicitly
select the plugin during acceptance testing. This is manual repository
distribution, not installation from the public OpenAI directory.

Version 1.2.0 is newer than the earlier documentation-only `velox-trifit` 1.0.1
package. Existing users must review the expanded capabilities and approve any
account or guest permissions through normal consent; installation never grants
those permissions automatically. The separate `velox-trifit-developer` package
and its existing review are unchanged.

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

For a ChatGPT account exposing **Add custom MCP server**, use the Production
endpoint only after readiness is confirmed:

```text
https://studio.v3lox.com/partner/trifit/mcp
```

Use ChatGPT's normal custom-connection and OAuth consent flow. Complete the
TriFit sign-in yourself. Select account or guest deliberately. Availability is
controlled by the ChatGPT account/workspace and the live Velox service, not by
this repository.

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
The Production guest policy is one attempt per guest session and a shared
10/day guest cap, also subject to the hosted demo integration's allowance and
availability. Private test allowances do not apply to the public service.
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
