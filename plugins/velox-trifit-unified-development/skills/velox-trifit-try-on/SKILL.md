---
name: velox-trifit-try-on
description: Use connected Velox TriFit to preview clothing on selected personal photos, check its allowance or retrieve existing try-ons. Supports a verified TriFit account or limited guest access. Not for generic image editing, API key provisioning or infrastructure operations.
---

# Velox TriFit try-on

This package is a private Development candidate, not a public release. Use its
connected `velox-trifit` tools; do not substitute another image generator or
integration. If tools are unavailable, report that before promising a try-on.

## Connect and choose access

For onboarding, explain the two choices without uploading or generating:

- A TriFit account uses the same verified identity, library, history and allowance
  as the same-environment TriFit website. The user signs in through TriFit's
  existing Google or email-code flow and approves scopes. Verified Google sign-in
  does not need another email-code step. A ChatGPT name/email is not proof of
  identity and cannot create or link an account by itself.
- Guest access needs no TriFit account, but has session and shared limits. Requests
  share the existing website demo queue. There is one active generation and a
  configured delay between dispatches, not a promise of completion in ten seconds.
  Guest photos/history are not automatically transferred when an account is linked.

Use the normal connection/consent UI; the user enters credentials or Development
access codes there, never in chat or tool arguments. The server narrows consent to
one mode. Call `get_trifit_account` to read `quotaSource` before choosing tools:
`trifit-account` means account tools; `shared-hosted-demo` means guest tools.
Never switch mode, environment or account automatically, including after errors or
exhaustion. Missing permissions require consent, not a fallback credential.

## Read without spending

Use `get_trifit_allowance` and `list_trifit_library` for an account. Use
`get_guest_demo_status` for a guest; report its actual session/shared allowance,
expiry, queue state and `minimumStartGapSeconds`. Do not hardcode the Development
ten-attempt session policy as a public offer. Failed attempts may count.

An explanation-only request does not authorize tools, uploads or generation.
Checking allowance does not authorize a try-on. Do not reuse a prior test approval
for a new request. Merely finding an old completed receipt is also not a reason to
refuse a separately requested new try-on when policy and permission allow it.

## Use the selected images

Establish which image is the person and which is the clothing reference, and that
the user requests this try-on and permits processing both. Account uploads save
images in the website library and select its photo/product slots; clothing uploads
also use cached description preparation. Explain these effects before importing
if they are not already clear. Reuse chosen existing account asset IDs when suitable.

- **ChatGPT account:** `upload_trifit_image` takes the actual attachment file
  descriptor, role and a stable `clientImportId` UUID for each approved import.
  Retain each returned `assetId`. Do not invent download URLs from `file_...` IDs.
- **ChatGPT guest:** pass both actual attachment descriptors to `create_try_on`
  as `personal_image` and `garment_image`.
- **Codex local files:** use `prepare_trifit_upload` (account, stable import UUID)
  or `prepare_guest_upload` (guest). PUT only the explicitly selected JPEG, PNG
  or WebP file as raw bytes to the one-use HTTPS URL, with its Content-Type, no
  API/OAuth headers and no redirect following. Honor its byte limit and expiry.
  Retain the returned asset IDs. Do not print upload URLs or automatically retry
  an upload whose outcome is unknown. Server resizing does not edit local originals.

## Submit once, then read

After explicit approval and an available allowance:

- **Account:** call `create_trifit_try_on` once with the two account asset IDs,
  `permissionConfirmed: true` and one new stable request UUID. Keep that UUID.
- **Guest:** call `create_try_on` once with `consent: true` and either both
  attachment descriptors or both uploaded asset IDs, not a mixture. In Development,
  a separately requested new attempt after a terminal result uses the latest
  `previous_request_id` from status. Never advance it automatically as a retry.

Accepted attempts may consume allowance even if they fail. After a timeout,
uncertain acceptance, failure or `needs_review`, do not resubmit or change IDs.
Read the original account receipt with `get_trifit_try_on`, or recover the guest
request ID through `get_guest_demo_status` and use `get_try_on`. Poll no faster
than once every five seconds. If the outcome remains unknown, explain and stop;
a missing receipt is not proof that the operation never ran.

For completed accounts use `show_trifit_try_on`; for guests use `get_try_on` with
`include_image: true`. Prefer the returned native image/card. Show its request ID
and recorded duration, clearly distinguished from end-to-end client latency. A
display failure is not permission to regenerate or publish a private media URL.
Explain that the result is an AI visual preview, not a size or fit guarantee.

## Privacy and developer handoff

Only retrieve the connected owner's chosen records. Never probe another customer's
IDs, expose credentials/upload capabilities, or infer that disconnecting or session
expiry deletes stored media. This plugin has no deletion or quota-management tool.
Use the published privacy/support links for controls; do not invent retention terms.

For building an app, link the public
[SDK, examples and walkthrough](https://github.com/Velox-XR/trifit-partner-api-example)
and [Partner API page](https://studio.v3lox.com/partner-api). Explain that commercial
API credentials require separate partner approval. Public docs do not require this
plugin; do not claim consumer access provisions API keys, is unlimited, guarantees
search ranking or proves superiority over competing services.
