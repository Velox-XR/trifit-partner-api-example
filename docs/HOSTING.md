# Hosting the same GitHub demo

The portable `createDemoHandler` export in `src/demo-server.mjs` serves the demo,
visitor dashboard, public ZIP and session-scoped requests. Velox mounts this same
source at `/partners/demo` inside its Studio host. It is not a partner operator workbench.

Public pages: `/partners/demo/demo` and `/partners/demo/admin`. No public traffic
lab or operator administration is mounted here. The dashboard is a visitor's own
request history and developer downloads only.

## Required host bindings

- Exact HTTPS origin and fixed mount prefix, no wildcard CORS.
- Environment-specific backend credential and session-signing secret in private
  host configuration. The public template is invalid and cannot enable real mode.
- A dedicated integration: Production `demo`; a separate Development identity.
- One durable dispatcher with verified exclusive ownership. Never run independent
  queues sharing the same application key. Losing ownership must stop admissions
  and dispatch. Persist submission intent before the single API call.
- Persistent receipt storage; accepted jobs resume by GET, never by another POST.
- Separate page publication and paid-generation activation switches. Unconfigured
  pages show preview mode; a missing key must not fall back to another partner or a mock.

The handler signs 48-hour visitor cookies, scopes them to the demo path, uses
HttpOnly/SameSite=Strict/Secure on HTTPS, rejects wrong Host/Origin, bounds bodies
to 14 MiB and permits at most two simultaneous input uploads. New session issuance
is capped at 500/hour per single host process. The personal and product transfers
run concurrently within that two-upload bound. Both provisional and completed
asset IDs are persisted; a failed transfer waits for its peer to settle before
the request is marked failed. Neither upload nor generation is automatically
replayed. The queue limits one pending request
per visitor and 25 pending globally. These controls reduce accidental abuse; they
are not strong bot authentication or a spend budget. Add approved ingress bot/rate
controls and operational alerts before widening public use.

The existing upstream quota remains authoritative. This release does not increase
the current Production demo allowance, change GPU capacity or run paid tests.
Media retention and deletion must follow Velox's approved privacy process; cookie
expiry alone does not delete assets. No result or personal-image gallery is public.

## Studio rollout gate

Feature branch and CI → reviewed main → Studio Development deployment and functional
acceptance → protected main-to-release promotion → Studio Production deployment and
verification. Keep generation disabled until the specific demo credential, privacy,
abuse and usage configuration has been accepted. Do not mark the README links live
until the public pages and credential-free ZIP actually work at those URLs.

No website launch automatically authorizes a paid test, key publication, budget
increase, worker change, or a deployment of a sibling application.
