# Security

This repository contains the local evaluator and the source for Velox's public
demo and visitor dashboard. Publishing it does not launch or approve a hosted
service; the README records the hosting release status. Its real mode
can upload images and incur paid generation charges when configured. Its mock and
preview modes are explicitly separate and cannot use the real configuration.

Keep `partner.config.json` and `.demo-state/` private and outside Git. The first
contains credentials; the second contains private request/asset IDs. Restrict local
filesystem permissions (including Windows ACLs). Configure a strong random session
secret through Velox onboarding; changing it invalidates existing queue ownership.
Never reuse the demo key in other processes, deployments or client-side code.

The public dashboard is not an operator admin. History and results are bound to
the visitor's signed, HttpOnly browser cookie, scoped to the demo path and marked
Secure on HTTPS. Cookies expire after 48 hours; this does not delete stored media.
The public ZIP is built from an explicit source-file allowlist and never includes
private partner configuration, uploaded images or request journals. The bundled
`partner.config.example.json` contains an intentionally invalid key.

The shared 10-second queue and one-active limit apply to this dedicated demo only.
They do not make anonymous public use abuse-proof or free. Before public launch,
review TLS, secure sessions, ingress/bot controls, distributed locking if scaled,
media validation/moderation, spending alerts, operator recovery, retention/deletion
and privacy notices. Do not expose the loopback evaluator through a public tunnel.

On an uncertain submission, corrupt journal or stale lock, stop and reconcile the
saved request with the operator. Never delete receipts, change idempotency keys or
automatically retry a paid POST to get past a blocked queue.

Never put real credentials, customer images, signed URLs or private SDK bundles in
issues or pull requests. For a security concern, use your existing Velox partner
contact or [request private contact](https://studio.v3lox.com/#contact)
without including sensitive details. Do not post an exploit or secret publicly.
