# renchan-core

# Overview

A framework based on Express that generates template-style endpoints for both GraphQL servers and RESTful API servers.

# Installation

Node.js is required. If you haven't installed it yet, please do so first.

| Tool | Version |
| :-- | :-- |
| Node.js | >=20.0.0 |
| npm | >=11.16.0 |

## Command

You can install `renchan` with the following command:

```
npm install @openreachtech/renchan
```

# GraphQL Server

The GraphQL Server provides templates for necessary implementation points in your application.

The file structure required to build a single GraphQL endpoint is shown below.

Structure when the endpoint is `https://example.com/graphql-my-app`:

```
server/
└── graphql/
    ├── context/
    │   ├── MyAppGraphqlContext.js
    │   └── MyAppGraphqlShare.js
    ├── resolvers/
    │   └── my-app/
    │       ├── AlphaQueryResolver.js
    │       ├── BetaQueryResolver.js
    │       ├── GammaMutationResolver.js
    │       ├── DeltaMutationResolver.js
    │       └── ︙
    ├── schemas/
    │   └── my-app.graphql
    └── MyAppGraphqlServerEngine.js
```

## Class Structure

### `GraphqlServerEngine`

A class that inherits from `BaseGraphqlServerEngine`. It allows template-style implementation of essential processes for Express + GraphQL server.

| Members | Kind of | Description |
| :-- | :-- | :-- |
| .get:config | static getter | Defines configuration used in Express + GraphQL server |
| .get:standardErrorCodeHash | static getter | Defines error codes for built-in errors returned to the frontend |
| .get:Context | static getter | Specifies the class for context instances passed to all Resolvers |
| .get:Share | static getter | Specifies the class for instances shared across all Resolvers |
| .get:ExpressMiddleware | static getter | Specifies the `BaseExpressMiddleware` classes composed by `#composeExpressMiddleware()` |
| #collectMiddleware() | instance method | Defines Express middleware to be attached to GraphQL endpoints |
| #composeExpressMiddleware() | instance method | Returns the Express middleware composed from `.get:ExpressMiddleware`, to be spread into `#collectMiddleware()` |
| #collectExpressSettings() | instance method | Defines settings of the Express application, such as `case sensitive routing` |
| #composeServerHookHash() | instance method | Composes the hooks of the `graphql-ws` server mounted on GraphQL endpoints, such as `onSubscribe`. Returns an empty object as default |
| #get:schemasToSkipFiltering | instance getter | Specifies schema fields to skip authorization/authentication checks |
| #generateFilterHandler() | instance method | Defines logic for authorization/authentication before all schema fields |
| #get:visaIssuers | instance getter | Defines logic for authentication, authorization, and permission checking per schema field |
| #collectScalars() | instance method | Specifies custom scalar classes |
| #collectRequestValidators() | instance method | Specifies the request validators applied before a document is executed, and which of them this endpoint carries |

### `GraphqlServerEngine.get:config`

The GraphQL server environment settings are defined within the ServerEngine class.

```js
class MyAppGraphqlServerEngine extends BaseGraphqlServerEngine {
  ...

  .get:config () {
    return {
      graphqlEndpoint: '/graphql-my-app',
      staticPath: rootPath.to('public/'),
      schemaPath: rootPath.to('app/server/graphql/schemas/my-app.graphql'),
      actualResolversPath: rootPath.to('app/server/graphql/resolvers/my-app/'),
      stubResolversPath: null,
      redisOptions: null,
    }
  }

  ...
}
```

| Field | Description |
| :-- | :-- |
| `graphqlEndpoint` | Specifies the path that becomes the GraphQL endpoint |
| `staticPath` | Specifies the folder for static files accessible from the same origin as the GraphQL server |
| `schemaPath` | Specifies the GraphQL schema file<br>When specifying a folder, it reads the concatenated schema files within |
| `actualResolversPath` | Specifies the folder path where Resolver classes are defined<br>Files in the folder are imported recursively |
| `stubResolversPath` | Specifies the folder path for stub Resolver classes<br>Files in the folder are imported recursively |
| `maxDocumentDepth` | Specifies the depth a GraphQL document may reach<br>Counted per top-level selection, from the selection itself down to its deepest field<br>Watched on production alone by default, and only where it is an integer of one or more<br>When omitted, the depth is not capped |
| `graphqlServer` | Specifies the settings of the GraphQL server mounted on the endpoint over WebSocket<br>`connectionInitWaitTimeout`: the milliseconds to wait for `ConnectionInit` after a connection opens; when omitted, `null`, or not a positive finite number, it is 3000<br>`skipsWebSocket`: whether to leave the WebSocket server unmounted; when omitted, it is `false` |
| `redisOptions` | When using Redis for Subscription, specify host and port in this field |

### `GraphqlServerEngine#collectRequestValidators()`

Before a GraphQL document is executed, the request validators below are applied to it. Both are watched on production alone by default.

| Validator | What it refuses | Error name |
| :-- | :-- | :-- |
| `IntrospectionAccessedGraphqlRequestValidator` | Every field resolving to an introspection type, such as `__schema` and `__type` | `IntrospectionAccessed` |
| `DocumentTooDeepGraphqlRequestValidator` | A document deeper than `maxDocumentDepth` of `.get:config`<br>Applied only where `maxDocumentDepth` is declared | `DocumentTooDeep` |

Introspection is therefore refused on production.

To watch `maxDocumentDepth` in other environments as well, override `DocumentTooDeepGraphqlRequestValidator.shouldSkipValidation()` in a derived class to return `false`, and list that class in `.collectGraphqlRequestValidatorCtors()` of the engine.

```js
class EveryEnvironmentDocumentTooDeepGraphqlRequestValidator extends DocumentTooDeepGraphqlRequestValidator {
  static shouldSkipValidation ({ engine }) {
    return false
  }
}

class MyAppGraphqlServerEngine extends BaseGraphqlServerEngine {
  ...

  static collectGraphqlRequestValidatorCtors () {
    return [
      EveryEnvironmentDocumentTooDeepGraphqlRequestValidator,
      IntrospectionAccessedGraphqlRequestValidator,
    ]
  }

  ...
}
```

A refusal is returned with the error code declared under its error name in `.get:standardErrorCodeHash`. When the name is not declared there, the code of `Unknown` is returned.

```js
class MyAppGraphqlServerEngine extends BaseGraphqlServerEngine {
  ...

  static get standardErrorCodeHash () {
    return {
      Unknown: '100.X000.001',
      ...
      IntrospectionAccessed: '103.X000.002',
      DocumentTooDeep: '103.X000.003',
    }
  }

  ...
}
```

### `GraphqlContext`

A class that inherits from `BaseGraphqlContext`. Used when generating context instances passed to all Resolvers.

Override `BaseGraphqlContext.findUser()` to generate user entities for authentication/authorization per GraphQL API request. It receives `expressRequest`, `engine` and `accessToken`.

The following can be obtained from the `context` instance passed to all Resolvers:

| Features | Kind of | Description |
| :-- | :-- | :-- |
| #userEntity | property | Stores the user entity obtained from `.findUser()` |
| #uuid | property | Returns UUID generated per request |
| #get:env | instance getter | Returns: 1. Variables set in `.env`<br>2. Environment variables defined in terminal |
| #get:NODE_ENV | instance getter | Returns `#get:env.NODE_ENV` |
| #get:userId | instance getter | Returns `#userEntity.id` |
| #get:now | instance getter | Returns the timestamp when the GraphQL API was requested |
| #get:share | instance getter | Returns the shared instance of the `Share` class |

### `GraphqlShare`

A class that inherits from `BaseGraphqlShare`. Acts as a hub for instances that need to be shared across all Resolvers.

For example, storing a `PubSub` class instance (commonly used in Subscriptions) as a Share class property allows it to be shared across Resolver calls.

If your application doesn't need to share any instances, define an empty class that inherits from `BaseGraphqlShare`.

### `ExpressMiddleware`

A class that inherits from `BaseExpressMiddleware`. Composes one Express middleware in `#composeMiddleware()`, and reaches the engine through `#engine` and its share through `#get:share`.

```js
class CorsExpressMiddleware extends BaseExpressMiddleware {
  composeMiddleware () {
    return cors()
  }
}

class MyAppGraphqlServerEngine extends BaseGraphqlServerEngine {
  static get ExpressMiddleware () {
    return [
      CorsExpressMiddleware,
    ]
  }

  collectMiddleware () {
    return [
      ...this.composeExpressMiddleware(),
    ]
  }
}
```

### `Resolver`

Define one Resolver class per schema field.

Define the following members:

| Members | kind of | Description |
| :-- | :-- | :-- |
| .get:schema | static getter | Defines the schema field name this Resolver corresponds to |
| .get:errorCodeHash | static getter | Defines errors that can be thrown within the Resolver |
| #resolve() | instance method | Defines logic to return the schema field value |

## Setting up the GraphQL Server

Implementation example of a bootstrap file to start the server:

```js
import {
  GraphqlServerBuilder,
} from '@openreachtech/renchan'

import MyAppGraphqlServerEngine from './server/graphql/MyAppGraphqlServerEngine.js'

const builder = await GraphqlServerBuilder.createAsync({
  Engine: MyAppGraphqlServerEngine,
})

builder.buildHttpServer()
  .listen(4000)
```

# RESTful API Server

The RESTful API Server provides templates for necessary implementation points in your application.

The file structure required to build a group of RESTful API endpoints is shown below.

Structure when the endpoints are served under `https://example.com/v1`:

```
server/
└── restfulapi/
    ├── contexts/
    │   ├── MyAppRestfulApiContext.js
    │   └── MyAppRestfulApiShare.js
    ├── renderers/
    │   └── v1/
    │       ├── get/
    │       │   ├── AlphaGetRenderer.js
    │       │   └── BetaGetRenderer.js
    │       ├── post/
    │       │   ├── GammaPostRenderer.js
    │       │   └── DeltaPostRenderer.js
    │       └── ︙
    └── MyAppRestfulApiServerEngine.js
```

## Class Structure

### `RestfulApiServerEngine`

A class that inherits from `BaseRestfulApiServerEngine`. It allows template-style implementation of essential processes for Express + RESTful API server.

| Members | Kind of | Description |
| :-- | :-- | :-- |
| .get:config | static getter | Defines configuration used in Express + RESTful API server |
| .get:standardErrorEnvelopHash | static getter | Defines status codes and messages of built-in errors returned to the frontend |
| .get:Context | static getter | Specifies the class for context instances passed to all Renderers |
| .get:Share | static getter | Specifies the class for instances shared across all Renderers |
| .get:ExpressMiddleware | static getter | Specifies the `BaseExpressMiddleware` classes composed by `#composeExpressMiddleware()` |
| #collectMiddleware() | instance method | Defines Express middleware to be attached to all routes |
| #composeExpressMiddleware() | instance method | Returns the Express middleware composed from `.get:ExpressMiddleware`, to be spread into `#collectMiddleware()` |
| #collectExpressSettings() | instance method | Defines settings of the Express application, such as `case sensitive routing` |
| #generateFilterHandler() | instance method | Defines logic for authorization/authentication before all Renderers |
| #get:visaIssuers | instance getter | Defines logic for authentication, authorization, and path permission checking |
| #passesThoughError() | instance method | Specifies whether the message of an unexpected error is returned as it is |

### `RestfulApiServerEngine.get:config`

The RESTful API server environment settings are defined within the ServerEngine class.

```js
class MyAppRestfulApiServerEngine extends BaseRestfulApiServerEngine {
  ...

  static get config () {
    return {
      pathPrefix: '/v1',
      renderersPath: rootPath.to('app/server/restfulapi/renderers/v1/'),
      staticPath: rootPath.to('public/'),
    }
  }

  ...
}
```

| Field | Description |
| :-- | :-- |
| `pathPrefix` | Specifies the path that prefixes the route path of every Renderer<br>Specify `null` when the routes take no prefix |
| `renderersPath` | Specifies the folder path where Renderer classes are defined<br>Files in the folder are imported recursively |
| `staticPath` | Specifies the folder for static files accessible from the same origin as the RESTful API server<br>Attach it with `express.static()` in `#collectMiddleware()` |

### `RestfulApiContext`

A class that inherits from `BaseRestfulApiContext`. Used when generating context instances passed to all Renderers.

Override `BaseRestfulApiContext.findUser()` to generate user entities for authentication/authorization per RESTful API request. It receives `expressRequest`, `engine` and `accessToken`.

The following can be obtained from the `context` instance passed to all Renderers:

| Features | Kind of | Description |
| :-- | :-- | :-- |
| #userEntity | property | Stores the user entity obtained from `.findUser()` |
| #uuid | property | Returns UUID generated per request |
| #get:env | instance getter | Returns: 1. Variables set in `.env`<br>2. Environment variables defined in terminal |
| #get:NODE_ENV | instance getter | Returns `#get:env.NODE_ENV` |
| #get:userId | instance getter | Returns `#userEntity.id` |
| #get:now | instance getter | Returns the timestamp when the RESTful API was requested |
| #get:share | instance getter | Returns the shared instance of the `Share` class |
| #hasAuthenticated() | instance method | Returns the result of the `hasAuthenticated` visa issuer |
| #hasAuthorized() | instance method | Returns the result of the `hasAuthorized` visa issuer |
| #hasPathPermission() | instance method | Returns the result of the `hasPathPermission` visa issuer |

### `RestfulApiShare`

A class that inherits from `BaseRestfulApiShare`. Acts as a hub for instances that need to be shared across all Renderers.

If your application doesn't need to share any instances, define an empty class that inherits from `BaseRestfulApiShare`.

### `ExpressMiddleware`

A class that inherits from `BaseExpressMiddleware`. Composes one Express middleware in `#composeMiddleware()`, and reaches the engine through `#engine` and its share through `#get:share`.

```js
class CorsExpressMiddleware extends BaseExpressMiddleware {
  composeMiddleware () {
    return cors()
  }
}

class MyAppRestfulApiServerEngine extends BaseRestfulApiServerEngine {
  static get ExpressMiddleware () {
    return [
      CorsExpressMiddleware,
    ]
  }

  collectMiddleware () {
    return [
      ...this.composeExpressMiddleware(),
    ]
  }
}
```

### `Renderer`

Define one Renderer class per route.

A Renderer inherits from the base class of the HTTP method it answers on — `BaseGetRenderer`, `BasePostRenderer`, `BasePutRenderer`, `BasePatchRenderer`, `BaseDeleteRenderer`, `BaseHeadRenderer`, `BaseOptionsRenderer`, `BaseConnectRenderer`, `BaseTraceRenderer` — and that base class is what defines `.get:method`.

Define the following members:

| Members | Kind of | Description |
| :-- | :-- | :-- |
| .get:method | static getter | Defines the HTTP method of the route<br>Defined by the base class of each HTTP method |
| .get:routePath | static getter | Defines the route path this Renderer answers on |
| .get:errorStructureHash | static getter | Defines errors that can be returned within the Renderer |
| .get:FlusherCtor | static getter | Specifies the class that writes the response<br>`JsonRestfulApiResponseFlusher` unless overridden |
| .buildPreExpressHandlers() | static method | Defines Express middleware to be attached to this route only |
| #render() | instance method | Defines logic to return the response of the route |

Renderer classes are registered nowhere. Every class under `.get:config.renderersPath` that inherits from `BaseRenderer` is imported recursively, and each of them is mounted on the route `.get:config.pathPrefix` + `.get:routePath`, with the HTTP method of `.get:method`.

So the Renderer below answers `GET /v1/alpha/:id` when `pathPrefix` is `/v1`. The folder a Renderer sits in takes no part in its route.

```js
import {
  BaseGetRenderer,
  RestfulApiResponse,
} from '@openreachtech/renchan'

export default class AlphaGetRenderer extends BaseGetRenderer {
  static get routePath () {
    return '/alpha/:id'
  }

  async render ({
    body,
    query,
    context,
    request,
  }) {
    return RestfulApiResponse.create({
      statusCode: 200,
      content: {
        id: request.pathParameterHash.id,
      },
    })
  }
}
```

## Setting up the RESTful API Server

Implementation example of a bootstrap file to start the server:

```js
import {
  RestfulApiServerBuilder,
} from '@openreachtech/renchan'

import MyAppRestfulApiServerEngine from './server/restfulapi/MyAppRestfulApiServerEngine.js'

const builder = await RestfulApiServerBuilder.createAsync({
  Engine: MyAppRestfulApiServerEngine,
})

builder.buildHttpServer()
  .listen(4000)
```

## License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

## Contributing

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-core.git
cd renchan-core
npm install
npm run lint
npm test
```

## Developers

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2024 Open Reach Tech Inc.
