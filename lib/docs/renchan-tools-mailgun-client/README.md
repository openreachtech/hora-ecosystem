# Overview

* Renchan tools mailgun client is built with node.js.
* Calling this module allows you to easily send email.
* Learn how to send email from your app,  we’ll explain it all here.

# Use Guide

  - [Install](#install)
  - [Configuration](#configuration)
  - [Setup Client](#setup-client)
  - Methods
    - [Send Email](#send-email)

## Install

```console
  npm install @openreachtech/renchan-tools-mailgun-client
```

## Configuration

Please register [Mailgun](https://mailgun.com/signup) first. Then configure your credentials in environment variables.

`.env`<`.`your-node-environment>  (e.g. `.env.development`)

```ini
  MAILGUN_API_KEY=app_api_key
  MAILGUN_DOMAIN=app_mailgun_domain
```

## Setup Client

```js
  const {
    MailgunClient,
    MailgunConfig,
    MailgunSendHtmlMailPayload,
    MailgunSendHtmlMailResult,
  } = require('@openreachtech/renchan-tools-mailgun-client')

  const mailgunClient = MailgunClient.create()
```

## Methods

### Send Email

```js
  mailgunClient.sendEmail(payload)
```

- request:

```js
  {
    from: "sender address",
    to: "receiver address",
    subject: "subject",
    html: "HTML content"
  }
```

- response:

```js
  {
    status: 200,
    id: "xxx",
    message: "success",
    details: "message details"
  }
```

- payload (wrapper for request)

  [MailgunSendHtmlMailPayload](#mailgunsendhtmlmailpayload)

- return type (wrapper for response)

  [MailgunSendHtmlMailResult](#mailgunsendhtmlmailresult)

## Types

### MailgunSendHtmlMailPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| sendFromName | string  | 〇 | Email address for From header  |
| sendToEmail | string  | 〇 | Email address of the recipient(s). Example: "Bob <bob@host.com>". You can use commas to separate multiple recipients. |
| subject | string  | 〇 | Message subject |
| content | string  | 〇 | Body of the message. (HTML version) |

### MailgunSendHtmlMailResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| isSuccess | boolean | - | Indicate whether send email success.|
| isFailure | boolean | - | Indicate whether send email failure. |   |
| payload |[MailgunSendHtmlMailPayload](#mailgunsendhtmlmailpayload) | 〇 |  |
| rawResult|[MessagesSendResult](#messagessendresult) |  |   |
| error | Error |  |  |

### MessagesSendResult
| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
|status| number | 〇 |  |
| id | string| |  |
| message | string| |  |
| details | string| |  |
