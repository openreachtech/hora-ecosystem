# API

Source: `lib/server/graphql/GraphqlServerBuilder.js`, `lib/server/graphql/BaseGraphqlServerEngine.js`, `lib/server/graphql/contexts/BaseGraphqlContext.js`, `lib/server/graphql/contexts/BaseGraphqlShare.js`, `lib/server/graphql/resolvers/BaseResolver.js` (and its `BaseQueryResolver`/`BaseMutationResolver`/`BaseSubscriptionResolver` subclasses), `lib/server/restfulapi/RestfulApiServerBuilder.js`, `lib/server/restfulapi/BaseRestfulApiServerEngine.js`, `lib/server/restfulapi/contexts/BaseRestfulApiContext.js`, `lib/server/restfulapi/contexts/BaseRestfulApiShare.js`, `lib/server/restfulapi/renderers/BaseRenderer.js` (no `.d.ts` shipped in `package.json`'s `"types"` field — there is a `types/` folder with hand-written ambient `.d.ts` files, but they only declare JSDoc type-namespaces such as `GraphqlType`/`RestfulApiType`/`renchan`, not a public API surface — so this reference is extracted from JSDoc on the classes themselves). Members are not consistently tagged `@public`; the surface below follows the class-structure tables in the package's own README, which documents the GraphQL side of the framework in depth (the RESTful API side mirrors the same builder/engine/context/share/render pattern but isn't covered by the README's own usage examples, so it is documented here more lightly).

## Exports (`index.js`)

Everything is a named, default-re-exported class (or, for one entry, a function). Grouped as in `index.js`:

**Express**
- `BaseExpressRoute`, `HttpMethodExpressRoute`, `MiddlewareExpressRoute`, `GetMethodExpressRoute`, `PostMethodExpressRoute`

**GraphQL server** (primary/most-documented surface — see below)
- `GraphqlServerBuilder`, `BaseGraphqlServerEngine`, `GraphqlHttpHandlerBuilder`, `GraphqlSchemaBuilder`
- `BaseGraphqlContext`, `BaseGraphqlShare`, `GraphqlVisa`
- `BaseResolver`, `BaseQueryResolver`, `BaseMutationResolver`, `BaseSubscriptionResolver`
- `BaseGraphqlPostWorker`, `GraphqlPostWorkerHashBuilder`, `GraphqlPostWorkersLoader`, `GraphqlResolvedParcelPorter`
- `FilterSchemaHashBuilder`, `GraphqlResolversBuilder`, `GraphqlResolversLoader`, `ResolverSchemaHashBuilder`
- `ExceptionCatchingProxyBuilder`
- `SchemaFilesLoader`
- `ScalarHashBuilder`, `BaseScalar`, `BigNumberScalar`, `DateTimeScalar`
- `graphqlUploadExpressWithResolvingContentType` (a function, not a class)

**Subscription**
- `BasePubSub`, `LocalPubSub`, `RedisPubSub`, `EventHub`, `ChannelGenerator`, `SubscriptionBroker`, `TopicReceiver`

**RESTful API server** (secondary surface, structurally parallel to the GraphQL side)
- `RestfulApiServerBuilder`, `BaseRestfulApiServerEngine`, `RestfulApiRoutesBuilder`
- `BaseRestfulApiContext`, `BaseRestfulApiShare`, `RestfulApiVisa`
- `BaseRenderer`, `BaseGetRenderer`, `BasePostRenderer`, `BaseRequestBodyRenderer`, `BaseConnectRenderer`, `BaseDeleteRenderer`, `BaseHeadRenderer`, `BaseOptionsRenderer`, `BasePatchRenderer`, `BasePutRenderer`, `BaseTraceRenderer`
- `BaseRestfulApiResponseFlusher`, `JsonRestfulApiResponseFlusher`, `HtmlRestfulApiResponseFlusher`, `CsvRestfulApiResponseFlusher`
- `RestfulApiRequest`, `RestfulApiResponse`
- `RenchanRestfulApiError`, `ConcreteMemberNotFoundRestfulApiError`

**Redis**
- `BaseRedisClerk`, `LocalRedis`

**Modules / tools**
- `DeepBulkClassLoader`, `RootPath`, `ValueTemplateHydrator`

**GraphQL errors**
- `RenchanGraphqlError`, `ConcreteMemberNotFoundGraphqlError`

All application code is expected to subclass the `Base*` classes below (`BaseGraphqlServerEngine`, `BaseGraphqlContext`, `BaseGraphqlShare`, `BaseResolver` family, and their RESTful counterparts) rather than instantiate them directly — most of their template methods/getters throw `ConcreteMemberNotFoundGraphqlError` / `ConcreteMemberNotFoundRestfulApiError` (`@abstract`) until overridden.

## Class: `GraphqlServerBuilder`

The bootstrap entry point for a GraphQL + Express server. Not abstract — used as-is (see Usage).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ engine, graphqlHandlerBuilder, app = this.createExpressApplication() })` — static factory method. Returns an instance holding the engine, the `GraphqlHttpHandlerBuilder`, and an Express `app`.
- `.createAsync({ Engine })` — static async factory method, **the main way applications construct a server**. Calls `Engine.createAsync()`, then `GraphqlHttpHandlerBuilder.createAsync({ engine })`, then `.create(...)`.
- `.createExpressApplication()` — static method. Returns `express()`.
- `#get:Ctor` — instance getter. Returns `this.constructor` (typed as the concrete subclass).
- `#get:env` — instance getter. Proxies to `this.engine.env`.
- `#get:config` — instance getter. Proxies to `this.engine.config`.
- `#collectMiddleware()` — instance method. Proxies to `this.engine.collectMiddleware()`.
- `.get:GraphqlHttpHandlerBuilder` — static getter. Returns the `GraphqlHttpHandlerBuilder` class (overridable hook).
- `.get:WebSocketServer` — static getter. Returns `ws`'s `WebSocketServer` class.
- `.get:useServerHandler` — static getter. Returns `graphql-ws`'s `useServer` function.
- `#buildHttpServer()` — instance method, **the other main entry point**. Assembles middleware routes, the GraphQL HTTP route (and, outside production, a GraphiQL route mounted *before* the GraphQL route at the same path), wraps the resulting Express app in a `http.Server`, wires up the GraphQL-over-WebSocket subscription server (`setupServer`), and returns a server object whose `.listen(port)` also logs `Server is running on http://localhost:${port}${endpoint}`.
- `#createGraphiqlRoute()` — instance method. Builds the GraphiQL (interactive playground) route at the GraphQL endpoint path with `graphql` replaced by `graphiql`.
- `#collectExpressRoutes()` — instance method. Returns `[middlewareRoutes]` in production, or `[middlewareRoutes, graphiqlRoute]` otherwise (checked via `this.env.isProduction()`).
- `#createGraphqlHttpRoute()`, `#mountRouteToApp({ routes })`, `#buildServerRootApp({ app })` (override point for e.g. mounting under a path prefix), `#setupServer({ server })`, `#buildListenProxyServer({ server })` — supporting instance methods used internally by `#buildHttpServer()`.

## Class: `BaseGraphqlServerEngine`

Abstract base for the application's GraphQL server engine — the class referred to as `GraphqlServerEngine` in the README's "Class Structure" section. Subclass this and override the `@abstract`-tagged members.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ config = this.config, share, errorHash = this.buildErrorHash() })` — static factory method.
- `.createAsync({ config = this.config } = {})` — static async factory method. Builds `share` via `this.Share.createAsync({ config })`, then calls `.create(...)`.
- `.get:config` *(abstract)* — static getter. Must return the `GraphqlType.Config` object: `graphqlEndpoint`, `staticPath`, `schemaPath`, `actualResolversPath`, `stubResolversPath`, `redisOptions`. Throws `ConcreteMemberNotFoundGraphqlError` if not overridden.
- `.get:standardErrorCodeHash` *(abstract)* — static getter. Must return a hash of standard error codes (`Unknown`, `ConcreteMemberNotFound`, `Unauthenticated`, `Unauthorized`, `DeniedSchemaPermission`, `Database`, plus any custom keys).
- `.buildErrorHash({ errorCodeHash = this.standardErrorCodeHash } = {})` — static method. Maps each `{ errorName: code }` entry to `RenchanGraphqlError.declareGraphqlError({ code })`.
- `.get:Share` *(abstract)* — static getter. Must return the application's `Share` class (subclass of `BaseGraphqlShare`).
- `.get:Context` *(abstract)* — static getter. Must return the application's `Context` class (subclass of `BaseGraphqlContext`).
- `#get:Ctor` — instance getter. Returns the concrete subclass constructor.
- `#get:env` — instance getter. Proxies to `this.share.env`.
- `#get:NODE_ENV` — instance getter. Returns `this.env.NODE_ENV`.
- `#collectMiddleware()` *(abstract)* — instance method. Must return an array of Express middleware; throws if not overridden (kept an instance method, not static, because it needs `this.config`).
- `#get:schemasToSkipFiltering` — instance getter. Defaults to `[]`; override to list schema field names exempt from the filter handler.
- `#generateFilterHandler()` *(abstract)* — instance method. Must return an async function `({ variables, context, information, parent }) => Promise<*>` run before every schema field.
- `#defineOnResolved()` — instance method. Default no-op hook; override to receive a post-resolve "parcel" callback.
- `#get:visaIssuers` — instance getter. Defaults to `{}`; override to define authentication/authorization/permission-check logic per schema field.
- `#collectExceptionCatchingMapEntries()` — instance method. Returns `[]` if `#passesThoughError()` is true (i.e. pre-production); otherwise returns an ordered array of `[predicate, mapper]` pairs that convert `ConcreteMemberNotFoundGraphqlError` → `errorHash.ConcreteMemberNotFound`, `RenchanGraphqlError` → itself, Sequelize `DatabaseError` → `errorHash.Database`, and anything else → `errorHash.Unknown`.
- `#passesThoughError()` — instance method. Returns `this.env.isPreProduction()` — i.e. real errors are only masked behind the standard error hash in production.
- `#collectScalars()` — instance async method. Defaults to `[]`; override to return custom GraphQL scalar classes.

## Class: `BaseGraphqlContext`

Abstract base for the per-request `Context` class passed to every Resolver — the class referred to as `GraphqlContext` in the README. Override `.findUser()` to authenticate the request.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ expressRequest, requestParams, engine, userEntity, visa, requestedAt = new Date(), uuid = this.generateUuid() })` — static factory method.
- `.createAsync({ expressRequest, requestParams, engine, requestedAt = new Date() })` — static async factory method, **the way the framework actually builds a context per request**: extracts the access token, calls `.findUser(...)`, calls `.createVisa(...)`, then `.create(...)`.
- `.get:ACCESS_TOKEN_HEADER_KEY` — static getter. Returns `'x-renchan-access-token'`.
- `.extractAccessToken({ expressRequest, requestParams })` — static method. Reads the header from `expressRequest.headers`, falling back to `requestParams.payload.context.headers` for WebSocket (Subscription) requests.
- `.get:Visa` — static getter. Returns `GraphqlVisa` (override to use a custom Visa class).
- `.findUser({ expressRequest, accessToken, requestedAt = new Date() })` *(override point)* — static async method. Default returns `null`; override to resolve and return a user entity.
- `.createVisa({ expressRequest, engine, userEntity, requestedAt = new Date() })` — static async method. Calls `this.Visa.createAsync(...)`.
- `.generateUuid()` — static method. Returns `crypto.randomUUID()`.
- `#userEntity` — instance property. The entity returned by `.findUser()`.
- `#uuid` — instance property. Per-request UUID.
- `#get:Ctor` — instance getter. Concrete subclass constructor.
- `#get:accessToken` — instance getter. Re-extracts the access token via `Ctor.extractAccessToken`.
- `#get:userId` — instance getter. Returns `this.userEntity?.id ?? null`.
- `#canResolve({ schema })` — instance method. Proxies to `this.visa.canResolve({ schema })`.
- `#hasAuthenticated()` / `#hasAuthorized()` — instance methods. Proxy to `this.visa.hasAuthenticated` / `this.visa.hasAuthorized`.
- `#hasSchemaPermission({ schema })` — instance method. Proxies to `this.visa.hasSchemaPermission({ schema })`.
- `#get:share` — instance getter. Returns `this.engine.share`.
- `#get:broker` — instance getter. Returns `this.share.broker`.
- `#get:env` — instance getter. Returns `this.engine.env`.
- `#get:NODE_ENV` — instance getter. Returns `this.env.NODE_ENV`.
- `#get:now` — instance getter. Alias of `this.requestedAt`.

## Class: `BaseGraphqlShare`

Abstract base for the `Share` class — a hub of instances shared across all Resolvers within a running server (e.g. a `PubSub`/`SubscriptionBroker` for Subscriptions). If nothing needs sharing, define an empty subclass.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ env = this.generateEnv(), broker = null })` — static factory method.
- `.createAsync({ config })` — static async factory method. Builds `broker` via `this.createBroker({ config })`, then `.create({ broker })` (note: `env` is *not* passed through here, so it falls back to `this.generateEnv()`).
- `.generateEnv()` — static method. Returns the `@openreachtech/renchan-env` singleton.
- `.createBroker({ config })` — static method. Returns `this.Broker.create({ config })`.
- `.get:Broker` — static getter. Returns `SubscriptionBroker` (override to customize).
- `#env` — instance property. The environment object.
- `#broker` — instance property. The `SubscriptionBroker` instance (or `null`).

## Class: `BaseResolver` (and `BaseQueryResolver` / `BaseMutationResolver` / `BaseSubscriptionResolver`)

Abstract base for a single schema field's Resolver — one Resolver class per GraphQL schema field, per the README's file-structure convention. Applications extend one of the three operation-specific subclasses, not `BaseResolver` directly.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ errorCodeHash = this.errorCodeHash } = {})` — static factory method. Builds `errorHash` via `this.buildErrorHash({ errorCodeHash })`.
- `.createAsync()` — static async factory method. Calls `.create()`.
- `.get:operation` *(abstract on `BaseResolver`)* — static getter. Fixed per subclass: `BaseQueryResolver` → `'Query'`, `BaseMutationResolver` → `'Mutation'`, `BaseSubscriptionResolver` → `'Subscription'`.
- `.get:schema` — static getter. Derived automatically from the class name by stripping a trailing `Query`/`Mutation`/`Subscription` and/or `Graphql` + `Resolver` suffix and lower-casing the first letter (e.g. `AlphaQueryResolver` → `'alpha'`). Throws `ConcreteMemberNotFoundGraphqlError` if the derived name is `'base'` (i.e. called directly on a `Base*Resolver`).
- `.get:errorCodeHash` — static getter. Defaults to `{}`; override to declare errors this Resolver can throw.
- `.buildErrorHash({ errorCodeHash = this.errorCodeHash } = {})` — static method. Same pattern as on the server engine.
- `#get:Ctor` — instance getter. Concrete subclass constructor.
- `#get:operation` / `#get:schema` — instance getters. Proxy to the static equivalents.
- `#get:now` — instance getter. Returns `new Date()`.
- `#get:Error` — instance getter. Returns `this.errorHash`.
- `#resolve({ variables, context, information, parent })` *(abstract)* — instance async method, **the method every Query/Mutation Resolver implements**. Must return the schema field's value; throws `ConcreteMemberNotFoundGraphqlError` if not overridden.

`BaseMutationResolver` additionally provides:
- `.createAsyncFileContentReader({ upload })` — static async method. Returns `FileContentReader.createAsync({ upload })`, for reading a `graphql-upload` file upload.

`BaseSubscriptionResolver` overrides `#resolve()` to return `payload[this.schema]` and additionally provides:
- `.get:channelPrefix` — static getter. Defaults to `this.schema`.
- `#subscribe({ variables, context, information, parent })` — instance async method, **the method Subscription Resolvers implement instead of `#resolve()`**. Checks `#canSubscribe(...)` (throwing via `#createCanNotSubscribeError` if denied), then builds a channel query/channel and returns `#generateAsyncIterable(...)`.
- `#canSubscribe(...)` — instance async method. Defaults to `true`; override to gate subscriptions.
- `.publishTopic({ context, payload, channelQuery = {} })` — static async method. Builds a topic via `.buildTopic(...)` and publishes it through `context.broker.publish(topic)`.
- `.buildTopic({ payload, channelQuery = {} })` — static method. Returns `{ channel, message: { [schema]: payload } }`.
- `#generateChannel({ query = {} } = {})`, `#generateChannelQuery(...)`, `#generateAsyncIterable({ context, channel })` — supporting instance methods.

## RESTful API server (secondary surface)

The RESTful counterpart mirrors the GraphQL classes one-for-one but is not walked through in the package README's own usage examples:

- **`RestfulApiServerBuilder`** — same role as `GraphqlServerBuilder`. `.createAsync({ Engine })` builds the engine then a `RestfulApiRoutesBuilder`; `#buildHttpServer()` mounts middleware + renderer routes and returns a `.listen`-wrapped `http.Server` (no GraphiQL/WebSocket concerns, since REST has none).
- **`BaseRestfulApiServerEngine`** — same shape as `BaseGraphqlServerEngine`: abstract `.get:config`, `.get:standardErrorEnvelopHash` (analogous to `standardErrorCodeHash`, but each entry is a `{ statusCode, errorMessage }` envelope rather than just a code), `.get:Share`, `.get:Context`, `#collectMiddleware()`, `#generateFilterHandler()`, `#get:visaIssuers`, `#passesThoughError()`.
- **`BaseRestfulApiContext`** — same shape as `BaseGraphqlContext` (`.createAsync`, `.findUser`, `.createVisa`, `#userId`, `#canRender()`, `#hasAuthenticated()`/`#hasAuthorized()`/`#hasPathPermission()`, `#share`, `#env`, `#now`), minus the GraphQL-specific `requestParams`/`broker`/`canResolve`.
- **`BaseRestfulApiShare`** — same shape as `BaseGraphqlShare` but with no broker (no Subscriptions in REST).
- **`BaseRenderer`** (and its per-HTTP-method subclasses `BaseGetRenderer`, `BasePostRenderer`, etc.) — the RESTful equivalent of a Resolver, one per route. Abstract `.get:method` and `.get:routePath`; `.get:errorStructureHash` declares `{ statusCode, message }` per error name (built into `#errorResponseHash` via `RestfulApiResponse.declareErrorRestfulApiResponse`); `#render({ body, query, context, request })` *(abstract)* is the method every Renderer implements, returning a `RestfulApiType.RenderResponse`; `#flushResponse({ expressResponse, renderResponse })` sends it out via a `FlusherCtor` (default `JsonRestfulApiResponseFlusher`, overridable via `.get:FlusherCtor`).

## Usage

From the package's own README (GraphQL server bootstrap):

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

A minimal `MyAppGraphqlServerEngine` (per the README's "Class Structure" section):

```js
import { BaseGraphqlServerEngine } from '@openreachtech/renchan'
import rootPath from './globals/root-path.js'

export default class MyAppGraphqlServerEngine extends BaseGraphqlServerEngine {
  static get config () {
    return {
      graphqlEndpoint: '/graphql-my-app',
      staticPath: rootPath.to('public/'),
      schemaPath: rootPath.to('app/server/graphql/schemas/my-app.graphql'),
      actualResolversPath: rootPath.to('app/server/graphql/resolvers/my-app/'),
      stubResolversPath: null,
      redisOptions: null,
    }
  }

  static get Context () {
    return MyAppGraphqlContext
  }

  static get Share () {
    return MyAppGraphqlShare
  }

  collectMiddleware () {
    return []
  }
}
```

A Query Resolver (schema field name is derived from the class name, `AlphaQueryResolver` → `alpha`):

```js
import { BaseQueryResolver } from '@openreachtech/renchan'

export default class AlphaQueryResolver extends BaseQueryResolver {
  async resolve ({ variables, context, information, parent }) {
    return {
      /* ... */
    }
  }
}
```
