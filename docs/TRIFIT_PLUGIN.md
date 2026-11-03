# Velox TriFit plugin

One plugin for two tasks: learn how to integrate DressMe using official API
documentation and SDK examples, or preview clothing using a consented TriFit
account or limited guest session.

## Release status

**The unified MCP endpoint is deployed in Production. The source package is
Velox TriFit v1.2.3; authenticated client acceptance is still incomplete.**
Use `https://studio.v3lox.com/partner/trifit/mcp` with Streamable HTTP.
Public developer documentation needs no TriFit login or Partner API key.
Account and guest tools use the client's normal OAuth connection and user consent.

The evidence below covers different surfaces; one does not establish the others.

| Surface | Verified status and remaining limit |
| --- | --- |
| Unified Production server | Deployed on 28 October 2026. The 1 November anonymous check listed 18 tools: five public guidance tools and 13 OAuth-protected account/guest tools. All five public tools responded; an unauthenticated account read was denied without returning account data. |
| Authenticated client journeys | Account/guest sign-in, selected uploads, try-on generation, result display and quota/history behavior have not completed end-to-end acceptance across supported clients. Public-tool success is not evidence that these journeys passed. |
| Repository package | `velox-trifit` v1.2.3 targets the unified endpoint. Installing or updating source does not update a different installed package, a manually registered connection, or OpenAI's published listing. |
| Published OpenAI listing | As checked on 2 November 2026, [Velox TriFit API Docs 1.1.6](https://chatgpt.com/plugins/plugin_asdk_app_6acded3353148191b15d782c1cc1f458) remains on `https://studio.v3lox.com/partner/docs/mcp`, with four public documentation tools and no authentication. Its migration to the unified URL and OAuth has not been completed. Keep existing connections until a supported replacement is approved. |

For documentation-only coding tasks, use the restricted configurations in
[CODING_AGENTS.md](CODING_AGENTS.md). A Partner API key is for your separately
approved backend API integration; it is not the credential for account/guest MCP
OAuth. Installing source or finding a directory listing does not grant account
permissions or guarantee recommendations in chats.

The package includes TriFit app/free-account alternatives, a personal-account
code example and an optional connected-mailbox application workflow. One
owner-approved email test passed sender selection, preview/approval, delivery
and reading a genuine manual reply; see the [acceptance evidence and remaining
client checks](review/partner-email-acceptance.md). Installed-package behavior
still needs client checks. Velox inbox auto-acknowledgement is not configured by
this package. This repository distributes Production packages only; private
testing packages and Development connection details are not included.

For immediate browser use, open the [TriFit app](https://trifit.v3lox.com/) with
your own saved library and available free account allowance, or use the
[account-free shared demo](https://studio.v3lox.com/partners/demo/demo).
Neither requires a plugin. See [all DressMe access routes](DRESSME_ACCESS.md),
read the [walkthrough](../WALKTHROUGH.md), or [apply for Partner API access](https://studio.v3lox.com/partner-api).

## Inspect or build the Production package

Production source: [`plugins/velox-trifit`](../plugins/velox-trifit).
It contains one portable manifest, one remote MCP connection, three skills, a
partner-application workflow reference and an icon. There is no bundled API credential, OAuth token, customer image or server
implementation. Repository code is MIT licensed; this does not license Velox's
hosted services or grant commercial API access.

With Node.js 22 or later, from this repository:

```sh
node --test test/trifit-plugin.test.mjs
npm run plugin:production:build
```

The Production command creates `dist/velox-trifit-1.2.3.zip` and its
SHA-256 file. The command does not install, connect, upload, generate, deploy or
submit a review. The fixed seven-file Production archive has SHA-256:

```text
a470a9e7a49261929c68751b614e14224de0e44578d95f2d159597facd41a18a
```

## Install in supported desktop clients

Add this repository as a marketplace using the Codex CLI:

```sh
codex plugin marketplace add Velox-XR/trifit-partner-api-example --ref main
```

In a client that supports repository marketplaces, open the desktop Plugins
directory, choose **Velox XR**, and install **Velox TriFit** v1.2.3
(`velox-trifit@velox-xr`). Refresh the marketplace or restart
the desktop app if needed. Start a fresh chat with **Try now** and explicitly
select the plugin during acceptance testing. Start with public documentation;
the authenticated journeys in the status table remain unverified. This is manual
repository distribution, not installation from the public OpenAI directory.

Version 1.2.3 describes the virtual try-on MCP server in the Codex plugin picker and includes search terms for virtual dressing and VTO API integrations.
The MCP connection and tools are the same as in 1.2.1.

Version 1.2.3 is newer than the earlier documentation-only `velox-trifit` 1.0.1
package. Existing users must review the expanded capabilities and approve any
account or guest permissions through normal consent; installation never grants
those permissions automatically. The separate `velox-trifit-developer` package
and its published OpenAI 1.1.6 connection are unchanged.

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

### Update an existing installation and test the application flow

Refresh the **Velox XR** marketplace after this version is available on `main`.
Open the existing **Velox TriFit** package and update it to **1.2.3**; do not add
another MCP connection or uninstall a working account/guest connection. Restart
the desktop app if its plugin view still shows the old version. The package
details must show **1.2.3**, not merely an app connection labelled "dev mode".

Start a fresh chat with that package selected, in ChatGPT Work or Codex, and send:

> Help me apply for a Velox Partner API key from my connected mailbox. Skip
> project details and expected usage. Confirm which sender to use and preview
> the email to partner@v3lox.com. Do not send anything yet.

Expected: it identifies an authorised mailbox (or offers to connect one), asks
you to choose if needed, and previews the email without redirecting to the form,
sending, issuing a key or starting a try-on. A real send requires your separate
approval. To read the already completed test rather than send another, use:

> Read the existing "TEST ONLY — TriFit Partner API application flow" thread
> in my chosen mailbox. Show the actual Velox reply. Do not send or apply again.

Mail reading/sending requires a separately connected email plugin with those
capabilities. The source/ZIP release does not automatically update the bare
ChatGPT-web MCP connection or publish the package in OpenAI's public directory.

### Browse the repository in GitHub Copilot CLI

To see the packages from this repository in Copilot CLI, add the Velox
marketplace and browse its catalog:

```sh
copilot plugin marketplace add Velox-XR/trifit-partner-api-example
copilot plugin marketplace browse velox-xr
```

Choose `velox-trifit-developer` for public documentation or `velox-trifit`
for the unified server with public documentation and OAuth account/guest
tools. Adding the marketplace lets you inspect both entries before installing
a plugin. This is the publisher's catalog. GitHub's built-in marketplace and
curated MCP registry are separate sources.

## ChatGPT web testing

For a ChatGPT account exposing **Add custom MCP server**, the deployed Production
endpoint for a separately configured connection is:

```text
https://studio.v3lox.com/partner/trifit/mcp
```

Use ChatGPT's normal custom-connection and OAuth consent flow. Complete the
TriFit sign-in yourself. Select account or guest deliberately. Availability is
controlled by the ChatGPT account/workspace and the live Velox service, not by
this repository. The public-tool checks above do not establish that your client's
authenticated account/guest journey has passed. Start with documentation and
read-only account/allowance checks before considering any separately approved
upload or generation. Do not replace the working published 1.1.6 connection to
perform this test.

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

## Apply for a partner key without leaving chat

In the updated **complete plugin package**, ask:

> Help me apply for a Velox Partner API application key from my connected email
> account. Confirm the sender email. Ask for optional project details and usage;
> I can skip those. Show me the application before sending it.

The application goes to **partner@v3lox.com**. ChatGPT/Codex uses your separately
connected email plugin, such as Gmail or Outlook Email, when that client exposes
an authorised send action. The TriFit MCP does not gain access to your mailbox or
send as you. It cannot use a typed address as proof of mailbox ownership.
Email access is optional and is not required for documentation or try-ons.

You confirm the sender, recipient and complete message before sending. Project,
company/platform, expected usage and timing are optional. Photos, keys, private
result URLs and chat history are not attached. Applying does not incur a charge,
start a generation or activate an API key. The website form is an alternative,
not a required redirect.

The chat must distinguish these states:

| Evidence | What the chat can report |
| --- | --- |
| Preview or saved draft only | Not sent |
| Email provider confirms sending | Sent; awaiting Velox acknowledgement |
| Ambiguous send response | Submission uncertain; check Sent, do not automatically resend |
| Delivery-failure notice | Delivery failed; not a Velox receipt |
| Actual matching Velox acknowledgement | Received for review; show the real message/reference |
| Actual later approval email | Report the decision; do not expose credentials in the chat |

With read permission, ask: **“Check Velox's reply to my application and show its
receipt.”** The client checks that specific thread, not unrelated inbox messages.
A reply appears here when checked; continuous monitoring is not implicit. If you
want a notification later, request a supported scheduled follow-up separately.

**Current acceptance boundary:** a controlled one-message send/delivery/manual-reply
test passed with the candidate instructions loaded directly; installed-package
discovery and behavior still need checking in both clients. Merely
sending an email does not create a Studio application-dashboard record. Automatic
Velox inbox acknowledgement/ingestion must be configured and verified separately;
until then the receipt is a team reply. This package neither auto-approves access
nor issues keys. A manually registered MCP connection does not automatically
load this packaged skill; its server guidance needs separate release acceptance.

## Remaining authenticated-client and OpenAI release checks

The deployed server and public documentation checks do not complete account/guest
client acceptance. The remaining checks cover normal consent, selected uploads,
generation and existing-result display, history/quota parity and isolation in each
supported client. Read the actual allowance and service availability first;
an allowance is not proof of zero provider or storage cost. This guide does not
authorize test accounts, uploads, generation or spending.

Any implementation change still needs its normal Development acceptance and
protected Production promotion. For the existing OpenAI listing, a supported
URL/auth migration procedure, saved settings and tool-scan verification, required
review and approval must precede publication. Until then, 1.1.6 remains the
documentation-only connection. Source publication, installation, directory
approval and independent search recommendations are separate outcomes.
