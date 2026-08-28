# renchan-core

# Overview

A framework based on Express that generates template-style endpoints for both GraphQL servers and RESTful API servers.

# Installation

Node.js is required. If you haven't installed it yet, please do so first.

| Tool | Version |
| :-- | :-- |
| Node.js | ^20.19.2 |
| npm | ^10.9.0 |

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
| .collectMiddleware() | static method | Defines Express middleware to be attached to GraphQL endpoints |
| #get:schemasToSkipFiltering | instance getter | Specifies schema fields to skip authorization/authentication checks |
| #generateFilterHandler() | instance method | Defines logic for authorization/authentication before all schema fields |
| #get:visaIssuers () | instance getter | Defines logic for authentication, authorization, and permission checking per schema field |
| #collectScalars() | instance method | Specifies custom scalar classes |

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
| `redisOptions` | When using Redis for Subscription, specify host and port in this field |

### `GraphqlContext`

A class that inherits from `BaseGraphqlContext`. Used when generating context instances passed to all Resolvers.

Override `BaseGraphqlContext.findUser()` to generate user entities for authentication/authorization per GraphQL API request.

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

## License

This project is released under the MIT License.

See [LICENSE](./LICENSE) for details.

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

[Open Reach Tech inc.](https://openreach.tech)

## Copyright

© 2024 Open Reach Tech Inc.
