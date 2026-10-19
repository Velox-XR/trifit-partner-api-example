# Choose how to run DressMe

There are two runnable code examples, the TriFit app and a hosted no-code demo. Signing in a person
is different from authorising a partner's application. Choose the flow you need:

| Route | Sign-in/key | Whose allowance? | Start here |
| --- | --- | --- | --- |
| **Example 1: your partner app/backend** | Your Velox-issued backend application key; your app authenticates its shoppers | Your assigned partner integration | [Partner walkthrough](../WALKTHROUGH.md), then `npm start` with your private config |
| **Example 2: your existing TriFit account** | Normal TriFit sign-in + OAuth consent; **no Partner API key** | That same account's current daily/weekly/monthly allowance | [Account tutorial](../examples/account/README.md), `npm run account:example -- --actions` |
| **Velox-hosted demo** | No visitor API key or TriFit account | Shared hosted-demo limits and availability | [Open the demo](https://studio.v3lox.com/partners/demo/demo) |
| **TriFit app in your browser** | Sign in/create a TriFit account; no plugin or Partner API key | Your available free daily/weekly/monthly account allowance; saved personal library and history | [Open TriFit](https://trifit.v3lox.com/) |
| **Velox TriFit plugin: account** | Install/connect in a supported client, choose your TriFit account and approve permissions | Same account allowance/history as the Production TriFit website | [Plugin setup](TRIFIT_PLUGIN.md) |
| **Velox TriFit plugin: guest** | Explicit limited guest consent; no TriFit account | Guest session/shared caps plus hosted-demo availability | [Plugin setup and limits](TRIFIT_PLUGIN.md#start-without-spending-an-attempt) |
| **Local preview / mock** | No credentials | None: **does not generate real images** | `npm run preview` / `npm run demo:mock` |

## Which example should I copy?

**“I already have a TriFit account and want a real try-on from my own code.”**
Use Example 2. Sign in in the browser, then explicitly approve chosen uploads and
one DressMe request. Existing free allowance can be used while it remains available.
There is no new or unlimited free balance, and no need to ask for a partner key
just for this personal-account example. A typed email alone cannot authorise it.

**“I am integrating VTO into my commercial app for shoppers.”**
Use Example 1. In the updated plugin package you can ask to
[apply through your connected mailbox](TRIFIT_PLUGIN.md#apply-for-a-partner-key-without-leaving-chat).
The [website application](https://studio.v3lox.com/partner-api#apply) remains an alternative.
Velox supplies the app's own private, environment-specific configuration after
approval. Keep its key on your backend; never distribute Velox's hosted-demo key.
The published key is deliberately invalid. Local preview/mock commands cannot
turn that placeholder into real access.

**“I want to try it immediately without building or connecting an account.”**
Use the hosted demo. It has a shared slow queue: one active generation and at least
10 seconds between dispatches. That is not a promise of a result within 10 seconds.
Check the displayed limits/availability. Plugin guests use that existing queue,
with additional session/shared guest caps; these are not the personal-account quotas.
Guest history is not automatically transferred to a subsequently linked account.

## Using the connected plugin

Select **Velox TriFit** for the actual message. First ask:

> Check my environment, whether I am using my TriFit account or guest access, and
> my remaining allowance. Do not upload or generate anything.

Then attach two permitted images (person first, garment second) and ask:

> Use Velox TriFit to create exactly one DressMe try-on. The first image is the
> person; the second is the clothing. I approve processing these two images.
> Check allowance first. Show the result, request ID and recorded duration.
> Do not automatically retry or use another image generator.

To view it again:

> Show my existing Velox TriFit result for request [my saved request ID]. Do not
> upload or generate anything.

An installed icon or a successful allowance check does not prove generation works.
Client support, consent, live service availability and remaining allowance still
apply. Repository distribution is not an OpenAI public-directory approval.

## Do not confuse the two email/account flows

The older Partner SDK `requestCode` / `verifyCode` and linked-identity methods are
still **partner-scoped** and require an integration credential. They are not the
key-free personal account example. Example 2 instead uses the existing consumer
OAuth/MCP tools, the verified account and the website's own allowance system.

No route grants unlimited calls, publishes a real shared key, resets allowances,
or permits retries of an uncertain paid request. Read the saved receipt instead.
