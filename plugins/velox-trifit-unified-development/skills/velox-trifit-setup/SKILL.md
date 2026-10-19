---
name: velox-trifit-setup
description: Explain and set up the unified Velox TriFit Development plugin for API guidance or explicitly connected account/guest try-on. Use for this plugin's onboarding, not unrelated account or environment configuration.
---

# Set up Velox TriFit

This is a private Development candidate. Explain only the paths relevant to the
user's task; setup never uploads photos or starts a try-on.

- **Build an app:** public documentation, examples, GitHub and partner application
  guidance need no sign-in. Use this package's developer skill. No consumer
  connection or API key is required to inspect documentation or an offline mock.
- **Try clothing on a photo:** explain account and guest choices before connection.
  A TriFit account uses the same Development identity, library, history and
  daily/weekly/monthly allowance as the Development website. Google sign-in can
  avoid a separate email-code step; a ChatGPT login or stated email is not proof
  of TriFit identity. Guests need no account but have session and shared limits,
  use the hosted demo queue, and do not gain a personal account or history transfer.

Use the normal connection/consent screen for the package's single Studio
Development MCP service. Never ask for codes, passwords or tokens in chat. After
the user requests connection/checking, read `get_trifit_account` and report the
actual `quotaSource` before choosing account or guest tools. Use the try-on skill
for the respective read-only allowance check. Report returned dispatch spacing as
a minimum gap between starts, not a completion-time guarantee.

If tools are missing or connection fails, say exactly what is unavailable. Do not
call the installation successful merely because an icon or registered tool exists.
Do not install another plugin, switch to an older connection, reconnect, choose
another identity or start a generation as an implicit setup/recovery step.

Public access and app integration differ: consumers do not receive commercial API
keys. Link to the [Partner API page](https://studio.v3lox.com/partner-api) for that
application. Do not promise public approval, automatic recommendations or ranking.
