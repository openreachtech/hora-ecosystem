# @openreachtech/mentsu-rocket-client

A small, class-based REST client framework for building type-safe HTTP API clients.

Each API endpoint is modeled as three cooperating classes — a **Payload** (what to send),
a **Launcher** (how to send it), and a **Capsule** (what came back) — so that request
building, transport, and response handling stay separated and easy to extend.

## Table of contents

- [Concept](#concept)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contribution](#contribution)
- [License](#license)
- [Developer](#developer)
- [Copyright](#copyright)

## Concept

An API call is described by three classes you extend:

| Class | Responsibility |
| :-- | :-- |
| `BasePayload` | Describes one endpoint: HTTP method, pathname (with path parameters), query, body, `Content-Type`, and authorization. Builds the `fetch` `Request`. |
| `BaseLauncher` | Holds the client configuration (base URL), wires a `Payload` to a `Capsule`, and runs the request through `fetch` with optional lifecycle hooks. |
| `BaseCapsule` | Wraps the raw `Response`: exposes the parsed body and status code, and answers whether the call succeeded or which error occurred. |

Optionally, a `BaseEntity` can be bound to the triad with `.via(EntityCtor)` so that
responses are materialized into your own domain objects.

## Installation

Requires Node.js 20.x (the version the CI builds against).

This package is published to GitHub Packages under the `@openreachtech` scope. Before
installing, the following two steps are required:

1. Add the registry to your project's `.npmrc`:

   ```
   @openreachtech:registry=https://npm.pkg.github.com
   ```

2. Authenticate with `npm login`:

   ```sh
   npm login --registry https://npm.pkg.github.com
   ```

Then install:

```sh
npm install @openreachtech/mentsu-rocket-client
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### 1. Define an endpoint

Extend `BasePayload`, `BaseCapsule`, and `BaseLauncher` to describe one endpoint.

```js
import {
  BaseLauncher,
  BasePayload,
  BaseCapsule,
  REST_METHOD,
} from '@openreachtech/mentsu-rocket-client'

class GetCustomerPayload extends BasePayload {
  /** @override */
  static get method () {
    return REST_METHOD.GET
  }

  /** @override */
  static get pathname () {
    return '/customers/[customerId]' // [customerId] is filled from pathParameterHash
  }

  /** @override */
  static get contentType () {
    return 'application/json'
  }
}

class GetCustomerCapsule extends BaseCapsule {}

class GetCustomerLauncher extends BaseLauncher {
  /** @override */
  static get clientConfig () {
    return {
      BASE_URL: 'https://api.example.com',
    }
  }

  /** @override */
  static get Payload () {
    return GetCustomerPayload
  }

  /** @override */
  static get Capsule () {
    return GetCustomerCapsule
  }
}
```

### 2. Launch a request

```js
const launcher = GetCustomerLauncher.create()

const payload = GetCustomerLauncher.createPayload({
  pathParameterHash: {
    customerId: 10001,
  },
  query: {
    includesDeleted: false,
  },
})

const capsule = await launcher.launchRequest({
  payload,
})

if (capsule.hasError()) {
  console.error(capsule.getErrorMessage()) // error code string
} else {
  console.log(capsule.statusCode) // e.g. 200
  console.log(capsule.body) // parsed response body
}
```

### 3. Lifecycle hooks

`beforeRequest` can abort the request (return `true`); `afterRequest` observes the
resolved capsule.

```js
const capsule = await launcher.launchRequest({
  payload,
  hooks: {
    async beforeRequest (payload) {
      return false // return true to abort the request
    },
    async afterRequest (capsule) {
      // inspect the resolved capsule
    },
  },
})
```

### 4. Authorization

Set an authorization builder and the API key on the payload. `BearerAuthorizationBuilder`
and `BasicAuthorizationBuilder` are provided.

```js
import {
  BasePayload,
  BearerAuthorizationBuilder,
  REST_METHOD,
} from '@openreachtech/mentsu-rocket-client'

class CreateOrderPayload extends BasePayload {
  /** @override */
  static get method () {
    return REST_METHOD.POST
  }

  /** @override */
  static get pathname () {
    return '/orders'
  }

  /** @override */
  static get contentType () {
    return 'application/json'
  }

  /** @override */
  static get AuthorizationBuilderCtor () {
    return BearerAuthorizationBuilder
  }

  /** @override */
  static get authorizationApiKey () {
    return process.env.API_TOKEN // credential source
  }
}
```

### Notes

- **Validation**: assign a schema to the static `querySchema` / `bodySchema` fields of a
  `Payload`, or to `bodySchema` of a `Capsule`, to validate inputs and normalize the
  response body. A payload with an invalid query, body, or path parameter resolves to a
  capsule whose `hasError()` is `true`.
- **Key casing**: use `SnakeCasedKeyRequestQuery` / `SnakeCasedKeyRequestBody` to send
  `snake_case` keys over the wire, and `CamelCasedKeyResponseBody` to receive
  `camelCase` keys in JavaScript.
- **Body format**: the default request body is JSON. Set `BodyStringifierCtor` to
  `NdjsonRequestBodyStringifier` for NDJSON.
- **Response parsing**: override `ResponseBodyParser` on the launcher to change how the
  response body is parsed (`JsonResponseBodyParser` by default, `BlobResponseBodyParser`
  for binary responses).

## API

Detailed API references for the base classes are split by class:

[API references](https://github.com/openreachtech/mentsu-rocket-client/blob/main/docs/en/api/index.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-rocket-client.git
cd mentsu-rocket-client
npm install
npm run lint
npm test
```

## License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
