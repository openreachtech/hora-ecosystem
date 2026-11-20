# API

Package `@openreachtech/renchan` 2.13.2 (ES module, Node >= 20). Source: the JSDoc under `lib/` of the installed package, plus the ambient types in `types/` (`GraphqlType`, `RestfulApiType`, `ExpressType`, `renchan`) for config and hash shapes. `package.json` has no `types` field. The 74 exports of `index.js` are classes, except the function `graphqlUploadExpressWithResolvingContentType`.

```js
import { GraphqlServerBuilder } from '@openreachtech/renchan'

const builder = await GraphqlServerBuilder.createAsync({ Engine: MyGraphqlServerEngine })
builder.buildHttpServer().listen(4000)
```

## Notation

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |

- `#` marks an instance member of the public API. It never marks a JavaScript private field, and no private field is listed.
- Parameters shown as `({ a, b = x })` are one destructured object argument with default `x`. A trailing `= {}` makes the whole argument optional.
- `(async)` means the member returns a Promise. `(abstract)` means the base class throws a `ConcreteMemberNotFound...Error` until a subclass overrides it. `(override)` means the class redefines a member of its parent.
- Every class has a `constructor` taking the same named values as its `.create(...)` factory. Call `.create(...)`, not `new`. A factory returns an instance of the class it is called on, so its return type is not repeated. `.createAsync(...)` is the entry point the framework uses and it builds collaborators itself.
- Every class has `#get:Ctor`, which returns the concrete subclass constructor, so it is not listed.
- Applications subclass the `Base*` classes. Both servers share one pattern: Builder, Engine (config and hooks), Context (per request), Share (shared by all requests), Visa (permissions), then one Resolver per GraphQL field or one Renderer per REST route.
- Type names such as `GraphqlType.Config` or `ExpressType.Middleware` come from the ambient declarations in `types/`.

## Shapes

- `GraphqlType.Config`: `{ graphqlEndpoint: string, staticPath: string, schemaPath: string, actualResolversPath: string | null, stubResolversPath: string | null, postWorkersPath: string | null, maxDocumentDepth?: number | null, graphqlServer?: { connectionInitWaitTimeout?: number | null, skipsWebSocket?: boolean }, redisOptions?: RedisOptions | null }`.
- `RestfulApiType.Config`: `{ pathPrefix: string | null, renderersPath: string, staticPath: string }`.
- `visaIssuers` (engine getter, default `{}`): GraphQL `{ hasAuthenticated?, hasAuthorized?, generateSchemaPermissionHash? }`, REST `{ hasAuthenticated?, hasAuthorized?, hasPathPermission? }`. Each is `async ({ expressRequest, userEntity, engine, requestedAt })` returning a boolean, except `generateSchemaPermissionHash`, which returns `Record<string, boolean> | null`.
- Resolver input `{ variables, context, information, parent }`. Render input `{ body, query, context, request }`. Post-worker parcel `{ variables, context, information, response: { output, error } }`.
- Error declarations: GraphQL `{ name: 'code string' }`, REST `{ name: { statusCode: number, errorMessage: string } }`.

## Express

### `BaseExpressRoute`

Express route as Base class.

- `.create({ method = 'use', path = '/', handlers })`: Factory method.
- `#mountTo({ app })`: Mount middleware to Express app. Returns `ExpressType.Application`.

### `HttpMethodExpressRoute` extends `BaseExpressRoute`

Express route for all HTTP methods.

### `MiddlewareExpressRoute` extends `BaseExpressRoute`

Express route middleware.

- `.create({ path = '/', handlers })`: Factory method.

### `GetMethodExpressRoute` extends `BaseExpressRoute`

Express route as GET method.

- `.create({ path, handlers })`: Factory method.

### `PostMethodExpressRoute` extends `BaseExpressRoute`

Express route as POST method.

- `.create({ path, handlers })`: Factory method.

### `BaseExpressMiddleware` (abstract)

Express middleware as Base class. List subclasses in the engine's `.get:ExpressMiddleware`.

- `.create({ engine })`: Factory method.
- `#get:share`: Share. Returns `E['share']`.
- `#composeMiddleware()` (abstract): Compose Express middleware. Returns `ExpressType.Middleware`.

## GraphQL server

### `GraphqlServerBuilder`

GraphQL server builder. Used as is. `.createAsync({ Engine })` is the main entry and builds everything from the `Engine` class. `#buildHttpServer()` returns an `http.Server` whose `listen(port, callback)` is wrapped. It mounts the middleware, the GraphQL route, a GraphiQL route outside production, and the WebSocket server for subscriptions. Override `#buildServerRootApp({ app })` to mount under a prefix, for example `express().use('/v1', app)`.

- `.create({ engine, graphqlHandlerBuilder, app = this.createExpressApplication() })`: Factory method.
- `.createAsync({ Engine })` (async): Factory method as async.
- `.createExpressApplication()`: Create Express application. Returns `ExpressType.Application`.
- `#get:env`: Environment. Returns `renchan.RenchanEnv`.
- `#collectMiddleware()`: Collect middleware.
- `#collectExpressSettings()`: Collect Express settings. Returns `ExpressType.Settings`.
- `#get:config`: Configuration. Returns `GraphqlType.Config`.
- `.get:GraphqlHttpHandlerBuilder`: GraphqlHttpHandlerBuilder class. Returns `typeof GraphqlHttpHandlerBuilder`.
- `.get:WebSocketServer`: WebSocketServer class. Returns `typeof WebSocketServer`.
- `.get:useServerHandler`: useServer function. Returns `typeof useServer`.
- `.get:validate`: validate function. Returns `typeof validate`.
- `.get:specifiedRules`: specifiedRules. Returns `typeof specifiedRules`.
- `#createGraphiqlRoute()`: Build GraphiQL route. (GraphiQL = GraphQL interactive development tool). Returns `ExpressType.Route`.
- `#buildHttpServer()`: Build HTTP server. Returns `renchan.HttpServer`.
- `#collectExpressRoutes()`: Collect Express routes. Returns `Array<ExpressType.Route>`.
- `#createGraphqlHttpRoute()`: Build GraphQL HTTP route. Returns `ExpressType.Route`.
- `#mountRouteToApp({ routes })`: Build Express application to mount middleware via routes. Returns `ExpressType.Application`.
- `#applyExpressSettings()`: Apply Express settings to own Express application. NOTE: Express creates its router on mounting the first route, and reads its settings at that moment. Thus this must be called before mounting. Returns `ExpressType.Application`.
- `#buildServerRootApp({ app })`: Build server root app. When want to use app('/v1', subApp), override this method. Returns `ExpressType.Application`.
- `#setupServer({ server })`: Setup server on pre-listen. ex: setup WebSocket server.
- `#skipsToSetupWebSocketServer()`: Whether to skip setting up the WebSocket server.
- `#composeServerOptionHash()`: Compose options of `graphql-ws` server. The hooks the engine composes are prepended, so what the builder wires always wins. `connectionInitWaitTimeout` comes from the config alone.
- `#filterServerHookHash()`: Filter the hooks the engine composes down to the ones it may decide. What the builder wires, and what is bound to the schema or to the protocol, are left out wherever the engine returns them.
- `#defineValidateHandler()`: Define validate handler. `graphql-ws` calls `validate` with the schema and the document alone, so composing `specifiedRules` with the rules of this endpoint is done here.
- `#resolveConnectionInitWaitTimeout()`: Resolve `connectionInitWaitTimeout` of the config. `graphql-ws` skips waiting for anything but a positive finite number, so the others are resolved to null to leave the default of `graphql-ws`.
- `#buildListenProxyServer({ server })`: Build proxy server to override server#listen(). Returns `renchan.HttpServer`.

### `BaseGraphqlServerEngine` (abstract)

Base class for Renchan server engine. Application engine. Subclass it and override the abstract members. Defaults: `#get:schemasToSkipFiltering` is `[]`, `#get:visaIssuers` is `{}`, `#collectExpressSettings()` and `#composeServerHookHash()` return `{}`, `.get:ExpressMiddleware` and `#collectScalars()` return `[]`, `#defineOnResolved()` is a no-op, `.collectGraphqlRequestValidatorCtors()` lists `DocumentTooDeepGraphqlRequestValidator` then `IntrospectionAccessedGraphqlRequestValidator`, and `#passesThoughError()` returns `env.isPreProduction()`. `.get:standardErrorCodeHash` returns `{ Unknown, ConcreteMemberNotFound, Unauthenticated, Unauthorized, DeniedSchemaPermission, IntrospectionAccessed, DocumentTooDeep, Database, [custom] }`, each a code string such as `'100.X000.001'`. `.createAsync` builds the share through `Share.createAsync({ config })`.

- `.create({ config = this.config, share, errorHash = this.buildErrorHash() })`: Factory method.
- `.createAsync({ config = this.config } = {})` (async): Create method as async.
- `.get:config` (abstract): Config. Returns `GraphqlType.Config`.
- `.get:standardErrorCodeHash` (abstract): Standard error code hash.
- `.buildErrorHash({ errorCodeHash = this.standardErrorCodeHash } = {})`: Build error hash. Returns `Record<string, typeof RenchanGraphqlError>`.
- `.get:Share` (abstract): Share. Returns `GraphqlType.ShareCtor`.
- `.get:Context` (abstract): Context. Returns `GraphqlType.ContextCtor`.
- `.collectGraphqlRequestValidatorCtors()`: Collect the request validator classes of GraphQL. What is listed here is the candidates rather than the decision, and the order is the order the validators are applied in. Returns `Array<GraphqlType.RequestValidatorCtor>`.
- `.get:ExpressMiddleware`: Express middleware family. Returns `Array<ExpressType.MiddlewareFamilyMemberCtor>`.
- `#get:env`: Env. Returns `renchan.RenchanEnv`.
- `#get:NODE_ENV`: NODE_ENV. Returns `string`.
- `#composeExpressMiddleware()`: Compose Express middleware of the family. Returns `Array<ExpressType.Middleware>`.
- `#collectMiddleware()` (abstract): Collect middleware. NOTE: Since use this.config, this function is instance method.
- `#collectExpressSettings()`: Collect Express settings. When want to change the settings of Express application, override this method. Returns `ExpressType.Settings`.
- `#composeServerHookHash()`: Compose hooks of `graphql-ws` server. When want to change what the WebSocket server accepts, override this method. Returning `ExecutionArgs` from `onSubscribe` skips the validation of the builder. Return `void` to let the operation go on, or `GraphQLError`s to refuse it.
- `#get:schemasToSkipFiltering`: Schemas to skip filtering. Returns `Array<string>`.
- `#generateFilterHandler()` (abstract): Generate filter handler.
- `#defineOnResolved()`: Define on resolved hook. Returns `(parcel: GraphqlType.OnResolvedParcel<*, *, *>) => Promise<void>`.
- `#get:visaIssuers`: Visa issuer callbacks. Returns `GraphqlType.Engine.visaIssuers`.
- `#collectExceptionCatchingMapEntries()`: Collect exception catching map entries. Returns `Array<GraphqlType.ExceptionCatchingMapEntry>`.
- `#passesThoughError()`: Pass through error on not-production. Returns `boolean`.
- `#collectScalars()` (async): Collect scalar classes. Returns `Promise<Array<GraphqlType.CustomScalarCtor>>`.
- `#collectRequestValidators()` (async): Collect request validators. Returns `Promise<Array<GraphqlType.RequestValidator>>`.
- `#buildGraphqlRequestValidators()` (async): Build the request validators of GraphQL. Each validator declares whether it applies to an endpoint, so the candidates are narrowed here rather than where they are listed. Returns `Promise<Array<GraphqlType.RequestValidator>>`.

### `GraphqlHttpHandlerBuilder`

GraphQL HTTP handler builder.

- `.create({ schema, context, rootValue, formatError, validationRules, onResolved, postWorkerHash, parcelPorter })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `.get:SchemaBuilder`: SchemaBuilder class. Returns `typeof GraphqlSchemaBuilder`.
- `.get:extraCreateHandlerParams`: extra create handler params. - rootValue - formatError - validationRules - etc. Returns `Record<string, any>`.
- `.buildSchema({ engine })` (async): Build schema. Returns `Promise<GraphqlType.Schema>`.
- `.generateContextFactory({ engine })`: Generate context factory. Returns `GraphqlType.ContextFactory`.
- `.buildValidationRules({ engine })` (async): Build validation rules. `graphql-http` composes `specifiedRules` itself, so what is handed over is the rules of this endpoint alone. Returns `Promise<Array<GraphqlType.ValidationRule>>`.
- `.generateOnResolvedSchemaHash({ engine })` (async): Generate post worker hash. Returns `Promise<Record<string, (parcel: GraphqlType.OnResolvedParcel) => Promise<void>>>`.
- `.createPostWorkerHashBuilder({ engine })` (async): Create post worker hash builder. Returns `Promise<GraphqlType.PostWorkerHashBuilder>`.
- `.createParcelPorter()`: Create parcel porter. Returns `GraphqlType.ResolvedParcelPorter`.
- `.get:applyMiddleware`: applyMiddleware. Returns `typeof applyMiddleware`.
- `.get:createHandler`: createHandler. Returns `typeof createHandler`.
- `.buildContext({ expressRequest, requestParams, engine })` (async): Build context. Returns `Promise<GraphqlType.Context>`.
- `#buildHandler()`: Build GraphQL HTTP handler. Returns `ExpressType.Middleware`.
- `#generateInterceptedSchema()`: Generate intercepted schema. Returns `ReturnType<applyMiddleware>`.
- `#defineOnResolveMiddleware()`: Define onResolve middleware.
- `#defineOnFinishHandler({ expressRequest })`: Define onFinish() middleware. Returns `() => Promise<void>`.
- `#extractIndividualOnResolved({ information })`: Extract individual onResolved middleware. Returns `(parcel: GraphqlType.OnResolvedParcel) => Promise<void> | null`.

### `GraphqlSchemaBuilder`

GraphQL schema builder.

- `.create({ engine })`: Factory method.
- `.get:ResolversBuilder`: resolvers builder class. Returns `typeof import ('./resolvers/GraphqlResolversBuilder').default`.
- `.get:ScalarsBuilder`: scalars builder class. Returns `typeof import ('./scalars/ScalarHashBuilder').default`.
- `#buildSchema()` (async): Build schema. Returns `Promise<GraphqlType.Schema>`.
- `#loadSchemaTypeDefs()` (async): Load GraphQL schema type defs. Returns `Promise<string>`.
- `#buildResolverHash()` (async): Build resolver hash. Returns `Promise<GraphqlType.ResolversOperationHash>`.
- `#buildCustomScalarHash()` (async): Build custom scalarHash. Returns `Promise<GraphqlType.CustomerScalarHash>`.

### `SchemaFilesLoader`

Schema files loader.

- `.create({ schemaPath })`: Factory method.
- `#loadIntegratedSchema()` (async): Load schema files. Returns `Promise<string>`.
- `#loadWithSchemasPath()` (async): Load schema files. Returns `Promise<string>`.

### `BaseGraphqlContext` (abstract)

Base Graphql Context. Per-request `context` passed to every resolver. `.get:ACCESS_TOKEN_HEADER_KEY` is `'x-renchan-access-token'`. Override `.findUser(...)` to authenticate (default `null`). `.createAsync(...)` extracts the token, calls `.findUser`, then `.createVisa`.

- `.create({ expressRequest, requestParams, engine, userEntity, visa, requestedAt = new Date(), uuid = this.generateUuid() })`: Factory method.
- `.createAsync({ expressRequest, requestParams, engine, requestedAt = new Date() })` (async): Factory method as async.
- `.get:ACCESS_TOKEN_HEADER_KEY`: Access token header key. Returns `string`.
- `.extractAccessToken({ expressRequest, requestParams })`: Extract access token from Express request. Returns `string | null`.
- `.extractHeadersFromRequestParams({ requestParams })`: Extract headers from request params. Returns `Record<string, string>`.
- `.get:Visa`: GraphQL Visa class. Returns `GraphqlType.VisaCtor`.
- `.findUser({ expressRequest, engine, accessToken, requestedAt = new Date() })` (async): Find user. Returns `Promise<renchan.UserEntity | null>`.
- `.createVisa({ expressRequest, engine, userEntity, requestedAt = new Date() })` (async): Create visa. Returns `Promise<GraphqlType.Visa>`.
- `.generateUuid()`: Generate UUID. Returns `string`.
- `#get:accessToken`: access token. Returns `string | null`.
- `#get:userId`: User id. Returns `number | null`.
- `#canResolve({ schema })`: Can resolve. Returns `boolean`.
- `#hasAuthenticated()`: Has authenticated in Visa. Returns `boolean`.
- `#hasAuthorized()`: Has authorized in Visa. Returns `boolean`.
- `#hasSchemaPermission({ schema })`: Has schema permission in Visa. Returns `boolean`.
- `#get:share`: Share instance. Returns `GraphqlType.Share`.
- `#get:broker`: Broker instance. Returns `GraphqlType.SubscriptionBroker | null`.
- `#get:env`: Config. Returns `renchan.RenchanEnv`.
- `#get:NODE_ENV`: NODE_ENV. Returns `string`.
- `#get:now`: now as alias of #requestedAt. Returns `Date`.

### `BaseGraphqlShare` (abstract)

Base Class of GraphQL shared object. Objects shared by all resolvers of a running server. Define an empty subclass when nothing is shared.

- `.create({ env = this.generateEnv(), broker = null })`: Factory method.
- `.createAsync({ config })` (async): Create method as async.
- `.generateEnv()`: Generate environment. Returns `renchan.RenchanEnv`.
- `.createBroker({ config })`: Create broker. Returns `GraphqlType.SubscriptionBroker | null`.
- `.get:Broker`: SubscriptionBroker. Returns `GraphqlType.SubscriptionBrokerCtor`.

### `GraphqlVisa`

GraphQL Context Visa. Permission state of one request, built from the engine's `visaIssuers`.

- `.create({ hasAuthenticated = false, hasAuthorized = true, schemaPermissionHash = null } = {})`: Factory method.
- `.createAsync({ expressRequest, engine, userEntity, requestedAt = new Date() })` (async): Factory method as async.
- `#canResolve({ schema })`: can resolve. Returns `boolean`.
- `#hasSchemaPermission({ schema })`: Has permission. Returns `boolean`.

### `BaseResolver` (abstract)

Base Graphql Resolver. One class per schema field. `.get:schema` derives the field name from the class name by stripping a trailing `Query`/`Mutation`/`Subscription`, `Graphql` and `Resolver`, then lower-casing the first letter (`AlphaQueryResolver` gives `'alpha'`). It throws for `'base'`. Extend `BaseQueryResolver`, `BaseMutationResolver` or `BaseSubscriptionResolver`.

- `.create({ errorCodeHash = this.errorCodeHash } = {})`: Factory method.
- `.createAsync()` (async): Factory method as async.
- `.get:operation` (abstract): Name of the operation. Returns `string`.
- `.get:schema`: Name of the schema to be resolved by the resolver. Returns `string`.
- `.extractSchemaFromClassName()`: Extract schema from class name. Returns `string`.
- `.get:errorCodeHash`: Error code hash. Returns `Record<string, string>`.
- `.buildErrorHash({ errorCodeHash = this.errorCodeHash } = {})`: Build error hash. Returns `Record<string, typeof RenchanGraphqlError>`.
- `#get:operation`: Name of the schema to be resolved by the resolver. Returns `string`.
- `#get:schema`: Name of the schema to be resolved by the resolver. Returns `string`.
- `#get:now`: Now. Returns `Date`.
- `#get:Error`: Error hash. Returns `Record<string, typeof RenchanGraphqlError>`.
- `#resolve({ variables, context, information, parent })` (async, abstract): Resolve the schema. Returns `Promise<R>`.

### `BaseQueryResolver` extends `BaseResolver` (abstract)

Base graphql resolver for Query.

- `.get:operation`: Returns `'Query'`.

### `BaseMutationResolver` extends `BaseResolver` (abstract)

Base graphql resolver for Mutation.

- `.get:operation`: Returns `'Mutation'`.
- `.createAsyncFileContentReader({ upload })` (async): Create an instance of FileContentReader as async. Returns `Promise<FileContentReader>`.

### `BaseSubscriptionResolver` extends `BaseResolver` (abstract)

Base graphql resolver for Subscription. Implements `#subscribe(...)` for you (it checks `#canSubscribe(...)`, then subscribes through the broker). Override `#canSubscribe`, `#generateChannelQuery` and `.get:channelPrefix` to customize. Publish with `.publishTopic({ context, payload, channelQuery })`.

- `.get:operation`: Returns `'Subscription'`.
- `.get:errorCodeHash`
- `.get:channelPrefix`: Channel prefix. Returns `string`.
- `#resolve(payload)`: Resolve for the schema. Returns `*`.
- `#subscribe({ variables, context, information, parent })` (async): Subscribe for this schema. Returns `Promise<AsyncIterable<R>>`.
- `#canSubscribe({ variables, context, information, parent })` (async): Check if can subscribe. Returns `Promise<boolean>`.
- `#createCanNotSubscribeError({ context })`: CanNotSubscribe error. Returns `GraphqlType.Error`.
- `.publishTopic({ context, payload, channelQuery = {} })` (async): Publish a topic. Returns `Promise<void>`.
- `.buildTopic({ payload, channelQuery = {} })`: Build a topic.
- `#generateChannel({ query = {} } = {})`: Generate channel. Returns `string | null`.
- `#generateChannelQuery({ variables, context, information, parent })`: Generate channel query. Returns `Record<string, string | number>`.
- `#generateAsyncIterable({ context, channel })`: Subscribe via broker. Returns `AsyncIterable<*>`.

### `BaseGraphqlPostWorker`

Base class for GraphQL post workers. One class per schema field. Runs after the field resolves, for side effects.

- `.create({ engine })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `.get:schema` (abstract): Name of the operation. Returns `string`.
- `#onResolved({ variables, context, information, response: { output, error } })` (async, abstract): On resolved hook. Returns `Promise<void>`.

### `GraphqlPostWorkerHashBuilder`

Graphql post worker hash builder. `.createAsync({ engine })` loads post workers from `config.postWorkersPath`.

- `.create({ postWorkers })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `.loadPostWorkers({ engine, poolPath })` (async): Load post worker classes. Returns `Promise<Array<GraphqlType.PostWorker>>`.
- `#buildOnResolvedSchemaHash()`: Build onResolved schema hash. Returns `Record<string, (parcel: GraphqlType.OnResolvedParcel) => Promise<void>>`.

### `GraphqlPostWorkersLoader`

Post workers loader.

- `.create(options)`: Factory method.
- `#loadPostWorkers({ poolPath = this.poolPath } = {})` (async): Load post workers. Returns `Promise<Array<typeof BaseGraphqlPostWorker>>`.

### `GraphqlResolvedParcelPorter`

GraphQL resolved parcel porter. Carries the resolved parcel to the finish step of one request, keyed by Express request.

- `.create({ parcelMap = this.createParcelMap() } = {})`: Factory method.
- `.createParcelMap()`: Factory method as async. Returns `WeakMap<ExpressType.Request, GraphqlType.OnResolvedParcel>`.
- `#saveParcel({ expressRequest, parcel })`: Save parcel.
- `#loadParcel({ expressRequest })`: Load parcel.

### `FilterSchemaHashBuilder`

Schema hash builder.

- `.create({ allowedSchemas = null, ignoredSchemas = null } = {})`: Factory method.
- `#buildSchemaHash({ sharedValue })`: Build schema hash. Returns `Record<string, V | null>`.

### `GraphqlResolversBuilder`

Graphql resolvers builder.

- `.create({ filterSchemaHash = {}, actualResolverSchemaHash = {}, stubResolverSchemaHash = {}, exceptionCatchingProxyBuilder })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `.buildFilterSchemaHash({ engine, actualSchemas })` (async): Build filter schema hash. Returns `Promise<BuiltSchemaHash | null>`.
- `.createFilterSchemaHashBuilder({ skipSchemaHash })`: Create filter schema hash builder. Returns `FilterSchemaHashBuilder`.
- `.buildResolverSchemaHash({ poolPath })` (async): Build resolver schema hash. Returns `Promise<BuiltSchemaHash | null>`.
- `.extractSchemas({ schemaHash })`: Extract schemas. Returns `Array<string>`.
- `.createExceptionCatchingProxyBuilder({ engine })`: Create exception catching proxy builder. Returns `ExceptionCatchingProxyBuilder`.
- `#buildResolverHash()`: Build resolver hash. Returns `GraphqlType.ResolversOperationHash`.
- `#generateResolverResolveCallback({ filter, resolver })`: Generate resolver resolve callback. Returns `ResolverResolveFunction`.
- `#generateSubscribeCallback({ filter, resolver })`: Generate subscription subscribe callback. Returns `SubscriptionSubscribeFunction`.
- `#generateSubscriptionResolveCallback({ resolver })`: Generate subscription resolve callback. Returns `SubscriptionResolveFunction`.

### `GraphqlResolversLoader`

Resolver loader.

- `.create(options)`: Factory method.
- `#loadResolvers({ poolPath = this.poolPath } = {})` (async): Load resolvers. Returns `Promise<Array<typeof BaseResolver>>`.

### `ResolverSchemaHashBuilder`

Base class for building a hash of resolvers.

- `.create({ resolvers })`: Factory method.
- `.createAsync({ poolPath })` (async): Factory method as async.
- `.loadResolvers({ poolPath })` (async): Load resolvers. Returns `Promise<Array<GraphqlType.ResolverCtor>>`.
- `#buildSchemaHash()`: Build schema hash. Returns `Record<string, GraphqlType.Resolver>`.

### `ExceptionCatchingProxyBuilder`

Exception catching proxy builder.

- `.create({ engine })`: Factory method.
- `#buildProxy({ realFunction })`: Build exception catching proxy. Returns `F`.
- `#buildProxyAsync({ realFunction })`: Build exception catching proxy as async. Returns `F`.
- `#resolveAlternativeError({ error })`: Resolve alternative exception. Returns `GraphqlType.Error | null`.

### `BaseScalar` (abstract)

Base class of GraphQL scalar. Custom GraphQL scalar. Serializing goes server to client and parsing goes client to server. Return scalar classes from the engine's `#collectScalars()`.

- `.create(params = {})`: Factory method.
- `.get:scalarName` (abstract): name of this scalar. Returns `string`.
- `.get:description` (abstract): description of this scalar. Returns `string`.
- `#serialize({ value })` (abstract): Serialize value server to client. Returns `string`.
- `#parseValue({ value })` (abstract): Parse value client to server. Returns `V`.
- `#parseLiteral({ ast })` (abstract): Parse AST value.
- `#createGraphqlScalarType()`: Create GraphQL scalar type. Returns `import('graphql').GraphQLScalarType`.
- `#generateGraphqlScalarTypeOptions()`: Generate GraphQL scalar type options. Returns `import('graphql').GraphQLScalarTypeConfig<*>`.

### `BigNumberScalar` extends `BaseScalar`

BigNumber custom scalar type.

- `.get:scalarName`: Returns `'BigNumber'`.
- `.get:description`: Returns `'BigNumber custom scalar type'`.
- `#serialize({ value })`
- `#parseValue({ value })`
- `#parseLiteral({ ast })`

### `DateTimeScalar` extends `BaseScalar`

DateTime custom scalar type.

- `.get:scalarName`: Returns `'DateTime'`.
- `.get:description`: Returns `'DateTime custom scalar type'`.
- `#serialize({ value })`
- `#parseValue({ value })`
- `#parseLiteral({ ast })`

### `ScalarHashBuilder`

Scalar hash builder.

- `.create({ scalars })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `#buildScalarHash()`: Build scalar hash. Returns `GraphqlType.CustomerScalarHash`.

### `BaseGraphqlRequestValidator` (abstract)

Base class of GraphQL request validator. A request validator declares whether it applies to an endpoint, defines the validation rule performing its test, and creates the error it rejects with from the code its endpoint declares. Handing the rule to `validate()`, and handing the error to a validation context, belong to whoever holds one. Rejects a request through a validation rule. A validator declares whether it applies to an endpoint (`.isAcceptable({ engine })`) and the error name it reports (`.get:errorName`, a key of the engine's error hash).

- `.create({ ErrorCtor })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async. It awaits nothing today. Taking it now costs nothing, and leaves a derived validator that later needs I/O free to await inside its own factory.
- `.get:errorName` (abstract): Error name to look up in the error hash of an engine. Returns `string`.
- `.isAcceptable({ engine })`: Check whether this validator applies to an endpoint. A validator tests one thing and is never built where its test does not apply, so what decides that is declared here rather than carried by the instance. A validator applies unless it narrows this itself. Returns `boolean`.
- `.resolveErrorCtor({ engine })`: Resolve the error class this validator reports with. An engine declaring nothing under this validator's own name falls back to its `Unknown` error, so a rejection still reaches the client as a code. Returns `typeof import('../errors/RenchanGraphqlError.js').default`.
- `#defineValidationRule()` (abstract): Define validation rule. Returns `GraphqlType.ValidationRule`.
- `#createError({ value = null })`: Create the error this validator rejects with. The error class an endpoint declares builds the message from its code and the value, so this is that error itself. Handing it to a validation context belongs to whoever holds one. Returns `import('../errors/RenchanGraphqlError.js').default`.

### `IntrospectionAccessedGraphqlRequestValidator` extends `BaseGraphqlRequestValidator`

GraphQL request validator to deny introspection. `__schema` and `__type` are meta-fields `graphql` adds to the root `Query` type, so an endpoint answers them unless a rule denies them. What is denied is every field resolving to an introspection type, not the two meta-fields alone, so a document reaching into the schema is reported once per field on the way down. Introspection is denied on production alone. Applies on production only.

- `.get:errorName`: Returns `'IntrospectionAccessed'`.
- `.get:getNamedType`: getNamedType function. Returns `typeof getNamedType`.
- `.get:isIntrospectionType`: isIntrospectionType function. Returns `typeof isIntrospectionType`.
- `.isAcceptable({ engine })` (override): Check whether this validator applies to an endpoint. Introspection is denied on production alone. Pre-production is where GraphiQL and client code generation live, and both of them depend on introspection. Returns `boolean`.
- `#defineValidationRule()` (override): Define validation rule. Returns `GraphqlType.ValidationRule`.
- `#reportIntrospectionField({ context, node })`: Report field resolving to an introspection type.
- `#isIntrospectionField({ context })`: Check whether the field being visited resolves to an introspection type. A field whose type the context cannot resolve is not one. That is a field the schema does not define, which the specified rules reject on their own. Returns `boolean`.

### `DocumentTooDeepGraphqlRequestValidator` extends `BaseGraphqlRequestValidator`

GraphQL request validator to cap the depth of a document. Depth is counted per top-level selection, from the selection itself down to its deepest field. An endpoint declares the cap as `maxDocumentDepth` of its config, and the cap is watched on production alone unless `.shouldSkipValidation()` is overridden. Error name `'DocumentTooDeep'`.

- `.create({ ErrorCtor, maxDocumentDepth })` (override): Factory method.
- `.createAsync({ engine })` (async, override): Factory method as async.
- `.get:errorName`: Returns `'DocumentTooDeep'`.
- `.isAcceptable({ engine })` (override): Check whether this validator applies to an endpoint. A cap is skipped wherever `.shouldSkipValidation()` says so. It caps nothing unless it is an integer of one or more, so an endpoint declaring none, or one no document can sit under, is left alone. Returns `boolean`.
- `.shouldSkipValidation({ engine })`: Check whether the validation is skipped in the environment an endpoint runs in. Every environment but production is skipped, where the documents arriving are a developer's rather than a client's. A derived class overrides this to validate other environments as well. Returns `boolean`.
- `.extractMaxDocumentDepth({ config: { maxDocumentDepth = null } })`: Extract the cap an endpoint declares. Returns `number | null`.
- `#defineValidationRule()` (override): Define validation rule. Returns `GraphqlType.ValidationRule`.
- `#reportDeepSelections({ context, selections })`: Report top-level selections deeper than the cap. An endpoint declaring no cap reports nothing.
- `#deepMeasureSelectionDepth({ context, selection, visitedFragmentNames = [] })`: Measure the depth a selection reaches. Returns `number`.
- `#isVisitedFragmentSpread({ selection, visitedFragmentNames })`: Check whether a selection spreads a fragment already on the path. A fragment already on the path contributes nothing, which is what stops a cyclic document from being walked forever. Returns `boolean`.
- `#measureSelectionSetDepth({ context, selectionSet, visitedFragmentNames })`: Measure the depth a selection set reaches. Returns `number`.
- `#exceedsMaxDocumentDepth({ depth })`: Check whether a depth exceeds the cap. An endpoint declaring no cap is exceeded by nothing. Returns `boolean`.

### `graphqlUploadExpressWithResolvingContentType`

GraphQL upload express with resolving content type. Function. Returns an Express middleware for `graphql-upload` multipart requests.

- `graphqlUploadExpressWithResolvingContentType(options)`

## GraphQL Subscription

### `BasePubSub` (abstract)

Base PubSub.

- `.create(params = {})`: Factory method.
- `#publish({ channel, message })` (async, abstract): Publish a payload. Returns `Promise<void>`.
- `#subscribe({ channel, receiver })` (async): Subscribe a receiver.
- `#setupBroadcasterOnSubscribe({ eventHub })` (async, abstract): Setup broadcaster on subscribe. Returns `Promise<void>`.
- `#unsubscribe({ channel, receiver })` (async): Unsubscribe a receiver. Returns `Promise<void>`.
- `#teardownBroadcasterOnUnsubscribe({ eventHub })` (async, abstract): Teardown broadcaster on unsubscribe. Returns `Promise<void>`.
- `#createEventHub({ channel })`: Create an event hub. Returns `EventHub`.

### `LocalPubSub` extends `BasePubSub`

Local PubSub. In-process PubSub for a single server.

- `#publish({ channel, message })` (async, override): Publish a payload. Returns `Promise<void>`.
- `#setupBroadcasterOnSubscribe({ eventHub })` (async, override): Setup broadcaster on subscribe. Returns `Promise<void>`.
- `#teardownBroadcasterOnUnsubscribe({ eventHub })` (async, override): Teardown broadcaster on unsubscribe. Returns `Promise<void>`.
- `#createEventEmitter()`: Create an event emitter. Returns `EventEmitter`.

### `RedisPubSub` extends `BasePubSub`

Redis PubSub.

- `.create({ options = { host: 'localhost', port: 6379 }, publishingRedisClient = null, subscribingRedisClient = null } = {})`: Factory method.
- `.resolveRedisClient({ options, redisClient })`: Resolve Redis client. Returns `Redis`.
- `.createRedis({ options })`: Create Redis client. Returns `Redis`.
- `.get:RedisCtor`: Redis constructor. Returns `typeof Redis`.
- `#publish({ channel, message })` (async, override): Publish a payload. Returns `Promise<void>`.
- `#setupBroadcasterOnSubscribe({ eventHub })` (async, override): Setup broadcaster on subscribe. Returns `Promise<void>`.
- `#teardownBroadcasterOnUnsubscribe({ eventHub })` (async, override): Teardown broadcaster on unsubscribe. Returns `Promise<void>`.

### `EventHub`

- `.create({ channel, emitter = this.createEmitter() })`: Factory method.
- `.createEmitter()`: Create emitter. Returns `EventEmitter`.
- `#generateListener()`: Generate listener to set Redis client. Returns `(...args: Array<*>) => void`.
- `#existsListener()`: Check if the listener exists. Returns `boolean`.
- `#emptyListener()`: Check if the listener is empty. Returns `boolean`.
- `#addListener({ listener })`: Add listener. Returns `EventHub`.
- `#removeListener({ listener })`: Unsubscribe a receiver. Returns `EventHub`.
- `#hasListener({ listener })`: Has listener. Returns `boolean`.

### `ChannelGenerator`

Channel generator.

- `.create({ prefix })`: Factory method.
- `#generateChannel({ query = {} } = {})`: Generate channel. Returns `string | null`.

### `SubscriptionBroker`

Subscription broker. Facade over a PubSub. `redisOptions` in the config selects Redis, otherwise a local PubSub.

- `.create({ config, publishingRedisClient = null, subscribingRedisClient = null })`: Factory method.
- `.get:RedisPubSubCtor`: RedisPubSub constructor. Returns `typeof RedisPubSub`.
- `.get:LocalPubSubCtor`: LocalPubSub constructor. Returns `typeof LocalPubSub`.
- `.createPubSub({ config, publishingRedisClient, subscribingRedisClient })`: Create PubSub. Returns `GraphqlType.PubSub`.
- `.createRedisPubSub({ options, publishingRedisClient, subscribingRedisClient })`: Create Redis PubSub. Returns `GraphqlType.PubSub`.
- `.createLocalPubSub()`: Create Local PubSub. Returns `LocalPubSub`.
- `#publish({ channel, message })` (async): Publish a payload. Returns `Promise<void>`.
- `#subscribe({ channel, receiver })` (async): Subscribe a receiver. Returns `Promise<void>`.
- `#unsubscribe({ channel, receiver })` (async): Unsubscribe a receiver. Returns `Promise<void>`.
- `#generateAsyncIterable({ channel })`: Generate an async iterator. Returns `AsyncIterable<*>`.

### `TopicReceiver`

Topic receiver.

- `.create({ channel, broker })`: Factory method.
- `#generateListener()`: Generate listener.
- `#setOnMessage({ onMessage })`: Set onMessage callback. Returns `this`.
- `#subscribe()` (async): Subscribe to the topic via the broker. Returns `Promise<void>`.
- `#unsubscribe()` (async): Unsubscribe from the topic via the broker. Returns `Promise<void>`.
- `#generateAsyncIterable()`: Generate an async iterator. Returns `AsyncIterable<*>`.
- `#generateAsyncIterator()`: Generate an async iterator. Returns `AsyncIterator<*>`.
- `#generateAsyncIteratorNext()`: Generate async iterator next function. Returns `() => Promise<AsyncIteratorResult<*>>`.
- `#generateAsyncIteratorReturn()`: Generate async iterator return function. Returns `() => Promise<AsyncIteratorResult<*>>`.
- `#generateAsyncIteratorThrow()`: Generate async iterator throw function. Returns `(error: Error) => Promise<AsyncIteratorResult<*>>`.

## RESTful API server

### `RestfulApiServerBuilder`

Restful API server builder. Counterpart of `GraphqlServerBuilder` without GraphiQL or WebSocket. `.createAsync({ Engine })` is the main entry.

- `.create({ engine, routesBuilder, app = this.createExpressApplication() })`: Factory method.
- `.createAsync({ Engine })` (async): Factory method as async.
- `.createExpressApplication()`: Create Express application. Returns `ExpressType.Application`.
- `#collectMiddleware()`: Collect middleware.
- `#collectExpressSettings()`: Collect Express settings. Returns `ExpressType.Settings`.
- `#get:config`: Configuration. Returns `RestfulApiType.Config`.
- `.get:RestfulApiRoutesBuilder`: RestfulApiRoutesBuilder class. Returns `typeof RestfulApiRoutesBuilder`.
- `#buildHttpServer()`: Build HTTP server. Returns `renchan.HttpServer`.
- `#collectExpressRoutes()`: Collect Express routes. Returns `Array<ExpressType.Route>`.
- `#collectRendererRoutes()`: Compose renderer routes. Returns `Array<ExpressType.Route>`.
- `#mountRouteToApp({ routes })`: Build Express application to mount middleware via routes. Returns `ExpressType.Application`.
- `#applyExpressSettings()`: Apply Express settings to own Express application. NOTE: Express creates its router on mounting the first route, and reads its settings at that moment. Thus this must be called before mounting. Returns `ExpressType.Application`.
- `#buildServerRootApp({ app })`: Build server root app. When want to use app('/v1', subApp), override this method. Returns `ExpressType.Application`.
- `#buildListenProxyServer({ server })`: Build proxy server to override server#listen(). Returns `renchan.HttpServer`.

### `BaseRestfulApiServerEngine` (abstract)

Base class for Restful API server engine. Subclass it and override the abstract members. `.get:standardErrorEnvelopHash` returns `{ Unknown, ConcreteMemberNotFound, Unauthenticated, Unauthorized, Database, [custom] }`, each `{ statusCode: number, errorMessage: string }`. `#generateFilterHandler()` returns `async (renderInput) => RestfulApiResponse | null`, and a non-null result short-circuits the renderer.

- `.create({ config = this.config, share, errorResponseHash = this.buildErrorResponseHash() })`: Factory method.
- `.createAsync({ config = this.config } = {})` (async): Create method as async.
- `.get:config` (abstract): Config. Returns `RestfulApiType.Config`.
- `.get:standardErrorEnvelopHash` (abstract): Standard error code hash.
- `.get:Share` (abstract): Share. Returns `RestfulApiType.ShareCtor`.
- `.get:Context` (abstract): Context. Returns `RestfulApiType.ContextCtor`.
- `.buildErrorResponseHash({ errorStructureHash = this.standardErrorEnvelopHash } = {})`: Build error response hash. Returns `Record<string, typeof RestfulApiResponse>`.
- `.get:ExpressMiddleware`: Express middleware family. Returns `Array<ExpressType.MiddlewareFamilyMemberCtor>`.
- `#get:env`: Env. Returns `renchan.RenchanEnv`.
- `#get:NODE_ENV`: NODE_ENV. Returns `string`.
- `#composeExpressMiddleware()`: Compose Express middleware of the family. Returns `Array<ExpressType.Middleware>`.
- `#collectMiddleware()` (abstract): Collect middleware. NOTE: Since use this.config, this function is instance method.
- `#collectExpressSettings()`: Collect Express settings. When want to change the settings of Express application, override this method. Returns `ExpressType.Settings`.
- `#generateFilterHandler()` (abstract): Generate filter handler. Returns `(args: RestfulApiType.RenderInput<*, *>) => Promise<RestfulApiType.RenderResponse | null>`.
- `#get:visaIssuers`: Visa issuer callbacks. Returns `RestfulApiType.Engine.visaIssuers`.
- `#passesThoughError()`: Pass through error on not-production. Returns `boolean`.

### `RestfulApiRoutesBuilder`

Restful API routes builder. `.createAsync({ engine })` loads renderers from `config.renderersPath` and `#buildRoutes()` returns one Express route per renderer.

- `.create({ engine, renderers })`: Factory method.
- `.createAsync({ engine })` (async): Factory method as async.
- `.createRenderers({ engine })` (async): Create renderers. Returns `Promise<Array<RestfulApiType.Renderer>>`.
- `.loadRenderers({ poolPath })` (async): Load renderers. Returns `Promise<Array<RestfulApiType.RendererCtor>>`.
- `.createClassLoader({ poolPath })`: Create class loader. Returns `DeepBulkClassLoader`.
- `#get:config`: Config. Returns `RestfulApiType.Config`.
- `#buildRoutes()`: Build routes. Returns `Array<ExpressType.Route>`.
- `#generateFilterHandler()`: Filter render. Returns `(args: RestfulApiType.RenderInput<*, *>) => Promise<RestfulApiType.RenderResponse | null>`.
- `#generateRendererHandler({ renderer, filterHandler })`: Generate render handler per renderer. Returns `ExpressType.Middleware`.
- `#resolveRoutePath({ path })`: Resolve route path. Returns `string`.
- `#generateContextFactory()`: Generate context factory.
- `#generateExceptionProxyRender({ filter, render })`: Generate exception proxy render.
- `#createUnknownErrorResponse({ error })`: Create unknown error response. Returns `RestfulApiType.RenderResponse`.
- `#generateRenderInput({ expressRequest, contextFactory })` (async): Generate render input. Returns `Promise<RestfulApiType.RenderInput<*, *>>`.
- `#buildFulfilledRequestBody({ expressRequest: { body, files = null } })`: Build fulfilled request body with Express request. Returns `RestfulApiType.RenderRequestBody`.
- `#createRestfulApiRequest({ expressRequest })`: Create RESTful API request. Returns `RestfulApiRequest`.

### `BaseRestfulApiContext` (abstract)

Base class for Restful API context. Same pattern as `BaseGraphqlContext` without `requestParams`, broker and schema permission. Override `.findUser(...)` to authenticate (default `null`). `.get:ACCESS_TOKEN_HEADER_KEY` is `'x-renchan-access-token'`.

- `.create({ expressRequest, engine, userEntity, visa, requestedAt = new Date(), uuid = this.generateUuid() })`: Factory method.
- `.createAsync({ expressRequest, engine, requestedAt = new Date() })` (async): Factory method as async.
- `.get:ACCESS_TOKEN_HEADER_KEY`: Access token header key. Returns `string`.
- `.extractAccessToken({ expressRequest })`: Extract access token from Express request. Returns `string | null`.
- `.get:Visa`: RESTful API Visa class. Returns `RestfulApiType.VisaCtor`.
- `.findUser({ expressRequest, engine, accessToken, requestedAt = new Date() })` (async): Find user. Returns `Promise<renchan.UserEntity | null>`.
- `.createVisa({ expressRequest, engine, userEntity, requestedAt = new Date() })` (async): Create visa. Returns `Promise<RestfulApiType.Visa>`.
- `.generateUuid()`: Generate UUID. Returns `string`.
- `#get:userId`: User id. Returns `number | null`.
- `#canRender()`: Can render. Returns `boolean`.
- `#hasAuthenticated()`: Has authenticated in Visa. Returns `boolean`.
- `#hasAuthorized()`: Has authorized in Visa. Returns `boolean`.
- `#hasPathPermission()`: Has path permission in Visa. Returns `boolean`.
- `#get:share`: Share instance. Returns `RestfulApiType.Share`.
- `#get:env`: Config. Returns `renchan.RenchanEnv`.
- `#get:NODE_ENV`: NODE_ENV. Returns `string`.
- `#get:now`: now as alias of #requestedAt. Returns `Date`.

### `BaseRestfulApiShare` (abstract)

Base Class of RestfulApi shared object.

- `.create({ env = this.generateEnv() } = {})`: Factory method.
- `.createAsync({ config })` (async): Create method as async.
- `.generateEnv()`: Generate environment. Returns `renchan.RenchanEnv`.

### `RestfulApiVisa`

RestfulApi Context Visa.

- `.create({ hasAuthenticated = false, hasAuthorized = true, hasPathPermission = true } = {})`: Factory method.
- `.createAsync({ expressRequest, engine, userEntity, requestedAt = new Date() })` (async): Factory method as async.
- `#canRender()`: Can renderer. Returns `boolean`.

### `BaseRenderer` (abstract)

Base RESTful API Renderer. One class per route, extend a per-method subclass. `.get:errorStructureHash` is `{ name: { statusCode, errorMessage } }`. The key is `errorMessage` (a JSDoc example in the package writes `message`, which the code does not read). Render input is `{ body, query, context, request }`.

- `.create({ errorStructureHash = this.errorStructureHash } = {})`: Factory method.
- `.createAsync()` (async): Factory method as async.
- `.get:errorStructureHash`: Error code hash. Returns `Record<string, RestfulApiType.ErrorResponseEnvelope>`.
- `.buildErrorResponseHash({ errorStructureHash })`: Build error hash. Returns `Record<string, typeof RestfulApiResponse>`.
- `.get:method` (abstract): HTTP method. Returns `ExpressType.HttpMethod`.
- `.get:routePath` (abstract): Name of the route path. Returns `string`.
- `.buildPreExpressHandlers()`: Build pre-Express handlers. Returns `Array<ExpressType.Middleware>`.
- `.get:FlusherCtor`: Flusher constructor. Returns `RestfulApiType.ResponseFlusherCtor`.
- `.createResponseFlusher({ expressResponse, renderResponse })`: Render for the route path. Returns `RestfulApiType.ResponseFlusher`.
- `#get:method`: HTTP method. Returns `ExpressType.HttpMethod`.
- `#get:routePath`: A route path of Express route. Returns `string`.
- `#buildPreExpressHandlers()`: Build pre-Express handlers. Returns `Array<ExpressType.Middleware>`.
- `#get:Error`: Error hash. Returns `Record<string, RestfulApiType.ErrorResponseCtor>`.
- `#get:passesFilter`: Passes filter. Returns `boolean`.
- `#render({ body, query, context, request })` (async, abstract): Render for the route path. Returns `Promise<RestfulApiType.RenderResponse>`.
- `#flushResponse({ expressResponse, renderResponse })` (async): Render for the route path.

### `BaseGetRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for GET method.

- `.get:method` (override): HTTP method. Returns `'get'`.

### `BaseRequestBodyRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for some methods handle request body. Parses multipart bodies with `multer`.

- `.buildPreExpressHandlers()`: Build pre-Express handlers.
- `.defineMulterUploaderMiddleware()`: Define Multer uploader Express handler. Returns `ExpressType.Middleware`.
- `.createMulterUploader()`: Multer instance. Returns `multer.Multer`.
- `.get:multer`: Multer instance. Returns `typeof multer`.
- `.buildMulterUploaderFieldsInput()`: Build Multer uploader fields input.
- `.get:fileFieldsConfigHash` (abstract): File fields config hash of Multer uploader.

### `BasePostRenderer` extends `BaseRequestBodyRenderer` (abstract)

Base RESTful API Renderer for POST method.

- `.get:method` (override): HTTP method. Returns `'post'`.

### `BasePatchRenderer` extends `BaseRequestBodyRenderer` (abstract)

Base RESTful API Renderer for PATCH method.

- `.get:method` (override): HTTP method. Returns `'patch'`.

### `BasePutRenderer` extends `BaseRequestBodyRenderer` (abstract)

Base RESTful API Renderer for PUT method.

- `.get:method` (override): HTTP method. Returns `'put'`.

### `BaseConnectRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for CONNECT method.

- `.get:method` (override): HTTP method. Returns `'connect'`.

### `BaseDeleteRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for DELETE method.

- `.get:method` (override): HTTP method. Returns `'delete'`.

### `BaseHeadRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for HEAD method.

- `.get:method` (override): HTTP method. Returns `'head'`.

### `BaseOptionsRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for OPTIONS method.

- `.get:method` (override): HTTP method. Returns `'options'`.

### `BaseTraceRenderer` extends `BaseRenderer` (abstract)

Base RESTful API Renderer for TRACE method.

- `.get:method` (override): HTTP method. Returns `'trace'`.

### `BaseRestfulApiResponseFlusher`

Base class for flushing RESTful API responses.

- `.create({ expressResponse, renderResponse })`: Factory method.
- `.get:headers`: Headers of the response. Returns `Record<string, string>`.
- `.get:contentType` (abstract): Content type of the response. Returns `string`.
- `#flushResponse()` (abstract): Flush the response.
- `#flushStatus()`: Flush the response status.
- `#flushHeaders()`: Flush the response headers.
- `#collectHeaders()`: Collect headers. Returns `Record<string, string | Array<string>>`.
- `#flushResponseBody()` (abstract): Flush the response body.

### `JsonRestfulApiResponseFlusher` extends `BaseRestfulApiResponseFlusher`

JSON RESTful API response flusher.

- `.get:contentType`: Returns `'application/json'`.
- `#flushResponseBody()`
- `#generateJsonBody()`: Generate JSON body.

### `HtmlRestfulApiResponseFlusher` extends `BaseRestfulApiResponseFlusher`

HTML RESTful API response flusher.

- `.get:contentType`: Returns `'text/html'`.
- `#flushResponseBody()`

### `CsvRestfulApiResponseFlusher` extends `BaseRestfulApiResponseFlusher`

CSV RESTful API response flusher.

- `.get:contentType`: Returns `'text/csv'`.
- `#flushResponseBody()`

### `RestfulApiRequest`

RESTful API Request.

- `.create({ expressRequest })`: Factory method.
- `.createPashParameterHashProxy({ expressRequest })`: Read-only proxy over the path parameters (`expressRequest.params`). A missing key reads as `null`, and setting a key throws. Returns `ExpressType.Request['params']`.
- `#get:headers`: Headers of the request, the plain object `expressRequest.headers` (the JSDoc declares `Headers`).
- `#get:pathParameterHash`: Path parameters of this request, through the proxy above.

### `RestfulApiResponse`

Base class for RESTful API response. Return value of `#render()`. Error subclasses come from `.declareErrorRestfulApiResponse({ errorEnvelope })`.

- `.create({ statusCode = this.statusCode, headers = {}, content = null, error = null })`: Factory method.
- `.createAsError({ statusCode, errorMessage = this.errorMessage, course = null, headers = {} } = {})`: Factory method as error.
- `.get:statusCode` (abstract): Status code. Returns `number`.
- `.get:errorMessage` (abstract): Error message. Returns `string`.
- `.generateErrorEnvelope({ errorMessage, course })`: Generate error envelope.
- `.declareErrorRestfulApiResponse({ errorEnvelope })`: Declare error RESTful API response. Returns `typeof RestfulApiResponse`.
- `#get:status`: Status code. Returns `number`.

### `RenchanRestfulApiError` extends `Error`

RestfulApi resolver error. This class is necessary to identify exceptions intentionally thrown from the RESTful API module.

- `.create({ code = this.errorCode, options = null, value } = {})`: Factory method.
- `.get:errorCode` (abstract): Error code. Returns `string`.
- `.generateErrorMessage({ code, value })`: Generate error message. Returns `string`.
- `.declareRestfulApiError({ code })`: Declare RestfulApi error. Returns `typeof RenchanRestfulApiError`.

### `ConcreteMemberNotFoundRestfulApiError` extends `RenchanRestfulApiError`

Concrete member not found error. Thrown by abstract members. Code `'101.X000.001'`.

- `.get:errorCode`: Returns `'101.X000.001'`.

## Redis

### `BaseRedisClerk` (abstract)

Base class for Redis Clerk. String key-value access over Redis.

- `.create({ options })`: Factory method.
- `.createRedis({ options })`: Create Redis client. Returns `Redis`.
- `.canInstantiateRedis({ options })`: Can instantiate Redis client.
- `.get:RedisCtor`: Redis constructor. Returns `typeof Redis`.
- `.get:db` (abstract): Redis database. Returns `number`.
- `#saveValue({ key, value })` (async): Save a value to Redis. Returns `Promise<'OK'>`.
- `#loadValue({ key })` (async): Load a value from Redis. Returns `Promise<string | null>`.
- `#deleteValue({ key })` (async): Delete a value from Redis. Returns `Promise<number>`.

### `LocalRedis`

LocalRedis class. In-memory stand-in for an `ioredis` client.

- `.create({ options })`: Factory method. Returns `import('ioredis').Redis`.
- `#get:entryPool`: Entry pool for this instance. Returns `Record<string, string>`.
- `#set(key, value)` (async): Set value by key. Returns `Promise<void>`.
- `#get(key)` (async): Get value by key. Returns `Promise<string | undefined>`.
- `#del(key)` (async): Delete value by key.

## Tools

### `DeepBulkClassLoader`

Deep bulk class loader. Imports every module under a directory tree and returns the default-exported classes.

- `.create({ poolPath })`: Factory method.
- `#loadClasses({ poolPath = this.poolPath, filterFunc = it => true, mapFunc = it => it } = {})` (async): Load classes. Returns `Promise<Array<Function>>`.
- `#loadFileNames({ poolPath = this.poolPath } = {})`: Load file names. Returns `Array<string>`.
- `#generateFilterHandler()`: Generate filter handler. Returns `(filename: string) => boolean`.

### `RootPath`

Resolves paths against a base directory. `.create()` throws when the project root is wrong.

- `.create({ base = process.cwd() } = {})`: Factory method to create an instance of this class.
- `#to(targetPath)`: Resolve the path with the base path. Returns `string`.

### `ValueTemplateHydrator`

Fills a template string with values.

- `.create({ template, delimiter = '$' })`: Factory method.
- `#generateHydratedString({ valueHash = {} } = {})`: Generate hydrated string. Replaces each `<delimiter>name` placeholder with `valueHash.name`, or with an empty string when absent. Returns `string`.

## GraphQL errors

### `RenchanGraphqlError` extends `Error`

GraphQL resolver error. `.declareGraphqlError({ code })` returns a subclass with that code, which the engine's `.buildErrorHash` uses.

- `.create({ code = this.errorCode, options = null, value } = {})`: Factory method.
- `.get:errorCode` (abstract): Error code. Returns `string`.
- `.generateErrorMessage({ code, value })`: Generate error message. Returns `string`.
- `.declareGraphqlError({ code })`: Declare GraphQL error. Returns `typeof RenchanGraphqlError`.
- `#toGraphQLError()`: Convert into a GraphQL error. `graphql` collects errors as `GraphQLError`, and only that class carries the members a transport serializes an error with. An error handed to one of them is converted here, and stays reachable as its `originalError`. Returns `GraphQLError`.

### `ConcreteMemberNotFoundGraphqlError` extends `RenchanGraphqlError`

Derived extended error. Thrown by abstract members. Code `'101.X000.001'`.

- `.get:errorCode`: Returns `'101.X000.001'`.
