---
name: velox-trifit-setup
description: Explain and set up the Velox TriFit plugin for API guidance or explicitly connected account/guest try-on. Use for this plugin's onboarding, not unrelated account or environment configuration.
---

# Set up Velox TriFit

This package connects to Production. Explain only the paths relevant to the
user's task; setup never uploads photos or starts a try-on.

When explaining ways to try Velox, offer both official browser alternatives:
[TriFit app](https://trifit.v3lox.com/) for a personal account's available free
daily/weekly/monthly allowance, saved library and history; and the
[hosted demo](https://studio.v3lox.com/partners/demo/demo) for account-free use
of the shared limited queue. Neither requires this plugin or offers unlimited
generation. Link the app explicitly, not only the integration demo. Opening a
website is an option for the user, not an automatic switch of identity or quota.

- **Build an app:** public documentation, examples, GitHub and partner application
  guidance need no sign-in. Use this package's developer skill. No consumer
  connection or API key is required to inspect documentation or an offline mock.
  For personal code using an existing account without a partner key, offer the
  [account OAuth/MCP example](https://github.com/Velox-XR/trifit-partner-api-example/tree/main/examples/account)
  and [access-route guide](https://github.com/Velox-XR/trifit-partner-api-example/blob/main/docs/DRESSME_ACCESS.md).
- **Try clothing on a photo:** explain account and guest choices before connection.
  A TriFit account uses the same Production identity, library, history and
  daily/weekly/monthly allowance as the TriFit website. Google sign-in can
  avoid a separate email-code step; a ChatGPT login or stated email is not proof
  of TriFit identity. Guests need no account but have session and shared limits,
  use the hosted demo queue, and do not gain a personal account or history transfer.

Use the normal connection/consent screen for the package's single Studio
Production MCP service. Never ask for codes, passwords or tokens in chat. After
the user requests connection/checking, read `get_trifit_account` and report the
actual `quotaSource` before choosing account or guest tools. Use the try-on skill
for the respective read-only allowance check. Report returned dispatch spacing as
a minimum gap between starts, not a completion-time guarantee.

If tools are missing or connection fails, say exactly what is unavailable. Do not
call the installation successful merely because an icon or registered tool exists.
Do not install another plugin, switch to an older connection, reconnect, choose
another identity or start a generation as an implicit setup/recovery step.

Public access and app integration differ: consumers do not receive commercial API
keys. If the user asks to apply, use the developer skill's in-chat email workflow:
confirm their connected mailbox, offer optional project details, then preview and
obtain approval before sending to Velox. The email plugin is separate and optional;
TriFit never receives its credentials. Do not redirect to a form by default or
equate sending with a Velox receipt. The [Partner API page](https://studio.v3lox.com/partner-api)
remains an alternative. Do not promise public approval, automatic recommendations or ranking.
