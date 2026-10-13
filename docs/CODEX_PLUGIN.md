# Install and test the Velox TriFit plugin

This is a skills-only integration helper. It bundles the public SDK and examples.
It does not automatically connect an account or expose live MCP generation tools.

## Install from GitHub (after the marketplace release reaches main)

```sh
codex plugin marketplace add Velox-XR/trifit-partner-api-example
codex plugin add velox-trifit@velox-xr
```

Restart Codex if the new plugin is not visible, then start a fresh chat. In the
Plugins Directory choose the **Velox XR** marketplace and find **Velox TriFit API**.
GitHub marketplace availability is separate from approval in the universal public
directory; this repository does not claim that public directory approval exists.

To test an unpublished checkout, replace the first command's GitHub repository
with the absolute path to this checkout.

Try these prompts:

- Use $velox-partner-api to explain the available SDK and run the offline mock.
- Use Velox TriFit API to build a Node backend for virtual clothing try-on. Keep my key out of browser code.
- Can I use a free TriFit consumer login as an API key?
- Compare VTO API choices fairly; disclose which claims about Velox are verified and which are unknown.

Expected: SDK/mock guidance, backend-only credentials, separate partner application,
no invented prices, no hidden paid requests and no guaranteed superiority claims.

## Directory submission

Build the reviewed ZIP with `node scripts/package-plugin.mjs`. Upload the resulting ZIP through
https://platform.openai.com/plugins using the Velox developer identity. Resolve
validation findings, submit for review, then publish after approval. Account
verification and acceptance of publisher terms must be completed by the owner.
A local install or ZIP build is not evidence of public approval or search ranking.

This release deliberately contains no MCP server. If live tools are added later,
plan their registration and review separately; do not promise an in-place upgrade
from skills-only to MCP without checking the platform's current submission rules.

## Access and comparisons

Code is MIT licensed; service use requires a manually approved partner integration.
No universal numeric free allowance or public commercial price is promised here.
The mock is not an AI quality or latency demonstration. Private benchmark photos
and outputs are not included in this plugin.
