# API

Source: `lib/MailgunClient.js`, `lib/MailgunConfig.js`, `lib/MailgunSendHtmlMailPayload.js`, `lib/MailgunSendHtmlMailResult.js` (no `.d.ts` shipped, no `"types"` field in `package.json`; extracted from JSDoc). No members are tagged `@public`, so the surface below is the natural consumer-facing surface: everything reachable starting from the four `index.js` exports.

This package is at version `0.0.1` and is an early-stage, thin wrapper around [`mailgun.js`](https://www.npmjs.com/package/mailgun.js) for sending a single kind of message (a raw-HTML email). It does not (yet) wrap other Mailgun API operations (attachments, templates, batch sending, validation, etc.).

## Exports (`index.js`)

CommonJS only (`module.exports = { ... }`; no default export, no `.mjs`):

- `MailgunClient` — the main entry point; wraps the configured `mailgun.js` client and sends email.
- `MailgunConfig` — resolves Mailgun credentials (from environment variables) into the shape `mailgun.js` expects.
- `MailgunSendHtmlMailPayload` — wraps the input parameters of a send-email call.
- `MailgunSendHtmlMailResult` — wraps the outcome (success or failure) of a send-email call.

## Class: `MailgunClient`

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create(params = {})` — static factory method. Returns `new MailgunClient(params)`.
- constructor `({ mailgunConfig = MailgunConfig.create(), mailgun = new Mailgun(FormData) } = {})` — builds a `mailgun.js` client from `mailgunConfig.config` (see `MailgunConfig#get:config` below).
- `#mailgun` — instance property. The `mailgun.js` library instance (`new Mailgun(FormData)` by default).
- `#mailgunClient` — instance property. The result of `mailgun.client(mailgunConfig.config)` — the actual `mailgun.js` API client used to send messages.
- `#mailgunConfig` — instance property. The `MailgunConfig` instance passed in (or the default one).
- `#sendEmailWithRawHtml(payload)` — instance method, `async`. Takes a `MailgunSendHtmlMailPayload` instance, calls `mailgunClient.messages.create(mailgunConfig.domain, payload.buildParams())`, and resolves to a `MailgunSendHtmlMailResult`:
  - on success: `MailgunSendHtmlMailResult.create({ payload, rawResult })`
  - on failure: `MailgunSendHtmlMailResult.create({ payload, error })` (the promise never rejects — failures are captured in the returned result object instead)

  **Note:** the package's own `README.md` shows usage as `mailgunClient.sendEmail(payload)`, but the method actually shipped in `lib/MailgunClient.js` (version `0.0.1`) is `sendEmailWithRawHtml(payload)` — there is no `sendEmail` method on the class. Use `sendEmailWithRawHtml`.

## Class: `MailgunConfig`

Resolves Mailgun API credentials for `MailgunClient`, defaulting to environment variables loaded via `@openreachtech/renchan-env`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create(params = {})` — static factory method. Returns `new MailgunConfig(params)`.
- `.get:CREDENTIAL_USERNAME` — static getter. Always returns the fixed string `'api'` (the username Mailgun's HTTP Basic Auth expects).
- constructor `({ username = MailgunConfig.CREDENTIAL_USERNAME, apiKey = env.MAILGUN_API_KEY, domain = env.MAILGUN_DOMAIN } = {})` — `env` here is `require('@openreachtech/renchan-env').createEnv()`, evaluated once at module load. `apiKey` and `domain` therefore default from the `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` environment variables (see the package's `README.md` "Configuration" section) unless overridden.
- `#username` / `#apiKey` / `#domain` — instance properties.
- `#get:config` — instance getter. Returns `{ username: this.username, key: this.apiKey }` — the exact shape passed to `mailgun.client(...)` in `MailgunClient`.

## Class: `MailgunSendHtmlMailPayload`

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create(params)` — static factory method. Returns `new MailgunSendHtmlMailPayload(params)`.
- constructor `({ sendFromName, sendToEmail, subject, content })` — all four params are required (no defaults); assigned directly to the four instance properties below.
- `#sendFromName` — instance property. Sender address, used as the message's `from`.
- `#sendToEmail` — instance property. Recipient address(es); comma-separated for multiple recipients (e.g. `"Bob <bob@host.com>"`).
- `#subject` — instance property. Message subject.
- `#content` — instance property. HTML body of the message.
- `#buildParams()` — instance method. Returns `{ from: sendFromName, to: sendToEmail, subject, html: content }` — the `mailgun.js` `MailgunMessageData` shape consumed directly by `MailgunClient#sendEmailWithRawHtml()`.

## Class: `MailgunSendHtmlMailResult`

Wrapper of a send-email outcome (success or failure), always constructed by `MailgunClient#sendEmailWithRawHtml()`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create(params = {})` — static factory method. Returns `new MailgunSendHtmlMailResult(params)`.
- constructor `({ payload, rawResult = null, error = null })` — `payload` is the originating `MailgunSendHtmlMailPayload`; exactly one of `rawResult` / `error` is populated by `MailgunClient`, never both.
- `#payload` — instance property. The `MailgunSendHtmlMailPayload` that produced this result.
- `#rawResult` — instance property. On success, the raw `mailgun.js` response (`MessagesSendResult`-shaped: `status`, `id`, `message`, `details`); `null` on failure.
- `#error` — instance property. The caught `Error` on failure; `null` on success.
- `#get:isSuccess` — instance getter. `true` when `error === null`.
- `#get:isFailure` — instance getter. `true` when `!isSuccess` (i.e. `error !== null`).

## Usage

```js
const {
  MailgunClient,
  MailgunSendHtmlMailPayload,
} = require('@openreachtech/renchan-tools-mailgun-client')

// Reads MAILGUN_API_KEY / MAILGUN_DOMAIN from the environment (via @openreachtech/renchan-env)
const mailgunClient = MailgunClient.create()

const payload = MailgunSendHtmlMailPayload.create({
  sendFromName: 'Sender <sender@example.com>',
  sendToEmail: 'Bob <bob@example.com>',
  subject: 'Hello',
  content: '<p>Hello, world.</p>',
})

const result = await mailgunClient.sendEmailWithRawHtml(payload)

if (result.isSuccess) {
  console.log(result.rawResult) // { status, id, message, details }
} else {
  console.error(result.error)
}
```
