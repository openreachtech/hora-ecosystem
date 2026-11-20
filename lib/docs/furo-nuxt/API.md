# API

Package: `@openreachtech/furo-nuxt` 3.0.0. The package ships no `.d.ts` for its exports (`package.json` has no `"types"` field), so this document is extracted from the JSDoc in `lib/**/*.js`. `types/furo-nuxt.d.ts` only declares shared aliases in the global `furo` namespace (see the last section).

The package is ESM (`"type": "module"`) and has no default export. Every name below is a named export of `index.js`, except the two composables marked "not exported".

## Notation

Class members use this notation. A leading `#` marks an instance member, and it does not mean a JavaScript private field. Every member listed is public.

- `#name` is an instance property, `#name()` an instance method, and `#get:name` an instance getter.
- `.name` is a static property, `.name()` a static method, and `.get:name` a static getter.
- `.create(params)` is the static factory of every class. It runs `new this(params)`, so subclasses inherit it. Prefer `create()` over `new`.
- `?` marks an optional property. `= x` marks a default value.
- A getter marked **abstract** returns a placeholder on the base class. A subclass must override it.

## Exports of `index.js` (15)

Composables:

- `useFormClerk`
- `useGraphqlClient`
- `useFuroSetup`
- `useSubscriptionConnector`

Vue helper:

- `buildDefineComponent`

Tools:

- `NuxtFuroEnvLoader`
- `AccessTokenClerk`
- `FuroMeta`

Form clerk:

- `BaseFormClerk`

Furo context:

- `BaseFuroContext`
- `BaseFuroContextAccessor`

Furo share:

- `FuroShare`
- `FuroGraphqlShare`

RESTful API:

- `RestfulApiClient`
- `BaseRestfulApiSubmitter`

Not exported from `index.js` (the export lines are commented out because the files import `nuxt/app`): `useSubscriptionGraphqlClient` and `useRedirect`. They ship in `lib/composables/` and are documented below for reference.

## Composable: `useFormClerk({ FormElementClerk, invokeRequestWithFormValueHash })`

Wires a `furo` `BaseFormElementClerk` subclass to a request function. Call it inside a Vue `setup()`.

- `FormElementClerk` is a `BaseFormElementClerk` subclass from `@openreachtech/furo` (the constructor, not an instance). It must offer `.create({ formElement })`, and its instances must offer `generateValidationHash()`, `isInvalid()` and `extractValueHash()`.
- `invokeRequestWithFormValueHash({ valueHash, extraValueHash?, hooks?, options? })` is an async function called with the form value hash once validation passes. Typically it is the same-named function returned by `useGraphqlClient()`.
- Returns `{ validationRef, submitForm }`.
- `validationRef` is a Vue `Ref` initialized to `{ valid: {}, invalid: {}, messages: {}, message: {} }`.
- `submitForm({ formElement, extraValueHash? = {}, hooks?, options? })` is async and returns `Promise<boolean>`. It builds `FormElementClerk.create({ formElement })` and writes `generateValidationHash()` into `validationRef.value`. When the form is invalid it returns `false` without calling the request function. Otherwise it calls `invokeRequestWithFormValueHash({ valueHash, extraValueHash, hooks, options })` with the extracted value hash and returns `true`.

## Composable: `useGraphqlClient({ Launcher })`

Wires a `furo` GraphQL launcher to a reactive capsule. Call it inside a Vue `setup()`.

- `Launcher` is a GraphQL launcher constructor. It must offer `.createCapsuleAsPending()`, `.createPayload({ variables, options })`, `.createPayloadWithFormValueHash({ valueHash, extraValueHash, options })` and `.create()`. The JSDoc also lists a `Capsule` parameter, but only `Launcher` is read at runtime.
- Returns `{ capsuleRef, invokeRequestOnEvent, invokeRequestOnMounted, invokeRequestWithFormValueHash }`.
- `capsuleRef` is a Vue `Ref` initialized with `Launcher.createCapsuleAsPending()` and replaced with the response capsule after each request.
- `invokeRequestOnEvent(args?)` is async. `args` is `{ variables? = {}, options? = {}, hooks? = {} }`. It sends the request now and stores the capsule in `capsuleRef`.
- `invokeRequestOnMounted(args?)` takes the same `args`, returns `void`, and registers the request inside Vue's `onMounted()`.
- `invokeRequestWithFormValueHash({ valueHash, extraValueHash? = {}, options? = {}, hooks? = {} })` is async. It builds the payload from the form value hash instead of `variables`.

## Composable: `useFuroSetup({ STORAGE_KEY })`

Persists the Nuxt public runtime config into session storage, so plain `furo` classes can read it outside the Nuxt context.

- `STORAGE_KEY` is a `Record<string, string>` that must contain a `FURO_ENV` key.
- Returns `{ setupFuroEnv }`.
- `setupFuroEnv({ runtimeConfig })` stores `JSON.stringify(runtimeConfig.public)` under `STORAGE_KEY.FURO_ENV` through `StorageClerk.createAsSession()`. It returns `void`.

## Composable: `useSubscriptionConnector({ graphqlConfig })`

Creates a WebSocket `SubscriptionConnector` from `@openreachtech/furo`. The JSDoc says it is used in a Nuxt plugin that sets up GraphQL.

- `graphqlConfig` is a `furo.GraphqlConfig` (`{ ENDPOINT_URL, WEBSOCKET_URL }`), passed as `SubscriptionConnector.create({ config: graphqlConfig })`.
- Returns `{ subscriptionConnector }`, a `furo.Connector`. Pass it to `FuroGraphqlShare.create({ config, websocketConnector })`.

## Composable: `useSubscriptionGraphqlClient({ Subscriber, Capsule })`

Not exported from `index.js` (imports `nuxt/app`). Wires a GraphQL subscriber to a reactive capsule. It reads `$furo` from `useNuxtApp()` and creates `Subscriber.create({ connector: $furo.websocketConnector })`, so a `FuroShare` instance must be installed as `$furo`.

- `Subscriber` is a GraphQL subscriber constructor. It must offer `.create({ connector })` and `.createPayloadWithValueHash({ valueHash, operationName, extensions, context })`. Its instances must offer `subscribe({ payload, hooks })` and `unsubscribe()`.
- `Capsule` is a subscription capsule constructor that must offer `.createAsPending()`.
- Returns `{ capsuleRef, invokeSubscribe, invokeUnsubscribe }`.
- `capsuleRef` is a Vue `Ref` initialized with `Capsule.createAsPending()`.
- `invokeSubscribe({ hooks, valueHash? = {}, operationName? = null, extensions? = {}, context? = {} })` is async. `hooks.onPublish(capsule)` is required. `hooks.onDisconnected` and `hooks.onTerminate` are optional. Each published capsule is written into `capsuleRef` before `hooks.onPublish` runs. `context` is `{ headers?: HeadersInit, [key]: unknown }`.
- `invokeUnsubscribe()` returns `void`. It unsubscribes and resets `capsuleRef` to `Capsule.createAsPending()`.

## Composable: `useRedirect({ defaultPath? = '/' } = {})`

Not exported from `index.js` (imports `nuxt/app` and `vue-router`). Reads the `redirect` query parameter of the current route.

- Returns `{ redirectTo }`.
- `redirectTo({ path? } = {})` is async. `path` defaults to `route.query.redirect` (the first entry when it is an array), or `defaultPath` when the query is absent. It calls Nuxt's `navigateTo(path)`.

## Function: `buildDefineComponent({ options })`

Builds a replacement for Vue's `defineComponent` that merges extra `setup` functions into every component.

- `options` is `Array<import('vue').ComponentOptions>`. Each entry may have a `setup` function.
- Returns a function typed as `typeof defineComponent`. Call it with the usual component options, including an optional `setup`.
- The returned function runs every `options[].setup` first, then the component's own `setup`, each as `setup(props, context)`. It shallow-merges the returned objects into one (later keys win) and passes the result to Vue's `defineComponent()` together with the remaining component options.

## Class: `NuxtFuroEnvLoader`

Loads a `.furo-env` file with `dotenv`. It runs in Node (for example in `nuxt.config`), not in the browser.

- `.create({ processEnv? = process.env } = {})` returns an instance object.
- `.get:dotenv` returns the `dotenv` module.
- `#processEnv` is the environment hash that supplies `NODE_ENV`.
- `#get:Ctor` returns the constructor of the instance object.
- `#loadEnv()` loads the resolved file and returns its parsed key/value hash. It returns `{}` when nothing is parsed or `dotenv` throws.
- `#resolveFilePath()` returns `path.join(process.cwd(), <file name>)`.
- `#resolveFileName()` returns `.furo-env` when `NODE_ENV` is `production`, otherwise `.furo-env.<NODE_ENV>`.
- `#resolveNodeEnv()` returns `processEnv.NODE_ENV`, or `'development'` when unset.

Typedefs: `NuxtFuroEnvLoaderParams` (`{ processEnv: NodeJS.ProcessEnv }`) and `NuxtFuroEnvLoaderFactoryParams` (`{ processEnv?: NodeJS.ProcessEnv }`).

## Class: `AccessTokenClerk`

Stores an access token in a `furo` `StorageClerk`.

- `.create({ storage? = AccessTokenClerk.createStorageClerk(), key? = AccessTokenClerk.STORAGE_KEY } = {})` returns an instance object.
- `.createStorageClerk()` returns `StorageClerk.createAsLocal()`.
- `.get:STORAGE_KEY` returns `'access_token'`.
- `#storage` is the storage clerk. `#key` is the storage key.
- `#saveToken({ token })` takes `string | null`. A falsy token clears the stored value and returns `false`. Otherwise it records the token and returns `true`.
- `#clearToken()` removes the key and returns the instance object.
- `#recordToken({ token })` writes the token and returns the instance object.
- `#retrieveToken()` returns `string | null`.
- `#existsToken()` returns `true` when `retrieveToken()` is not `null`.

Typedefs: `AccessTokenClerkParams` (`{ storage: StorageClerk, key: string }`) and `AccessTokenClerkFactoryParams` (`{ storage?: StorageClerk, key?: string }`).

## Class: `FuroMeta`

Reads the `$furo` meta hash of a Nuxt route. Use it in route middleware.

- `.create({ routeTo })` takes the `to` route of a Nuxt `RouteMiddleware` and returns an instance object.
- `.extractFuroMetaFromRoute({ routeTo })` returns `routeTo.meta.$furo`, or `{}` when absent.
- `#furo` is the meta hash `{ pageTitle?: string, skipFilter?: boolean }`.
- `#get:pageTitle` returns `furo.pageTitle`, or `null`.
- `#get:skipFilter` returns `furo.skipFilter`, or `false`.

The constructor takes `{ furo: { pageTitle?: string, skipFilter?: boolean } }`. `.create()` builds it from the route.

## Class: `BaseFormClerk`

Orchestrates a `furo` `FormElementInspector` and `ValueHashValidator` for a `<form>` element held in a Vue shallow ref. Subclass it and override `.get:validationRules`. Generic parameter: `FV` (form value hash type).

- `.create({ formElementShallowRef? = this.createFormElementShallowRef(), validationRef? = this.createValidationRef() } = {})` returns an instance object.
- `.get:ref` returns Vue's `ref`. `BaseFormClerk.get:shallowRef` returns Vue's `shallowRef`.
- `.get:validationRules` is **abstract** and returns `[]`. A subclass returns `Array<furo.FieldValidatorFactoryParams>`.
- `.createFormElementShallowRef()` returns `shallowRef(null)`, typed `Ref<HTMLFormElement | null>`.
- `.createValidationRef()` returns `ref({ valid: {}, invalid: {}, messages: {}, message: {} })`.
- `#formElementShallowRef` is the ref that must receive the mounted `<form>` element (bind it as a template ref).
- `#validationRef` is the validation hash ref. `validateFormValueHash()` replaces its value.
- `#get:Ctor` returns the constructor of the instance object.
- `#validateFormValueHash({ valueHash? = #extractValueHash() } = {})` is tagged `@public`. It validates against `Ctor.validationRules`, writes the result into `validationRef.value`, and returns `true` when valid.
- `#isValid({ validationHash? = validationRef.value } = {})` is tagged `@public`. It returns `true` when every value in `validationHash.valid` is truthy.
- `#isInvalid({ validationHash? = validationRef.value } = {})` is tagged `@public`. It returns the negation of `isValid()`.
- `#extractValueHash()` is tagged `@public`. It returns the form control value hash (type `FV`).
- `#createFormElementInspector()` returns a `FormElementInspector` for the held element. It throws `Error('no mounted form element')` when the shallow ref is empty.

Typedefs: `BaseFormClerkParams` (`{ formElementShallowRef: ShallowRef<HTMLFormElement | null>, validationRef: Ref<furo.ValidatorHashType> }`) and `BaseFormClerkFactoryParams` (`Partial<BaseFormClerkParams>`).

## Class: `BaseFuroContext`

The per-component context object created from a Vue `setup()`. Subclass it. Generic parameters: `A` (context accessor class, default `null`), `P` (props, default `{}`), `EE` (emit event names, default `null`).

- `.create({ props, componentContext })` returns an instance object. `componentContext` is the Vue `SetupContext`.
- `.get:ContextAccessor` returns `null` on the base class. A subclass returns its `BaseFuroContextAccessor` subclass.
- `.get:EMIT_EVENT_NAME` is **abstract** and returns `{}`. A subclass returns a `Record<string, string>` of `emit()` event names.
- `.createMutationObserver({ handler })` returns `new MutationObserver(handler)`.
- `#props` holds the component props. `#componentContext` holds the `SetupContext`.
- `#accessor` is the result of `createContextAccessor()`, built in the constructor.
- `#get:Ctor` returns the constructor of the instance object.
- `#createContextAccessor()` returns `null` when `Ctor.ContextAccessor` is `null`, otherwise `Ctor.ContextAccessor.create({ context: this })`.
- `#get:$` returns `accessor` (the accessor instance).
- `#get:EMIT_EVENT_NAME` returns `Ctor.EMIT_EVENT_NAME`.
- `#get:attrs`, `#get:slots`, `#get:emit` and `#get:expose` return the same-named member of `componentContext`.
- `#get:watch` returns Vue's `watch`.
- `#setupComponent(args = {})` is a hook for subclasses. The base version does nothing and returns `this` for chaining. A subclass override typically calls `this.expose(this.generateExposeHash())`, registers `watch` handlers, and returns `this`.
- `#generateExposeHash()` returns `{}` on the base class. A subclass returns a `Record<string, Function>` for `expose()`.

Typedefs: `BaseFuroContextParams<P>` (`{ props: P, componentContext: SetupContext }`, where `P` extends `ComponentCustomProps | {}` and defaults to `{}`) and `BaseFuroContextFactoryParams<P>` (an alias of `BaseFuroContextParams<P>`).

## Class: `BaseFuroContextAccessor`

A base class for the accessor object that gives templates access to a context. Subclass it and return the subclass from the static getter `.get:ContextAccessor` of `BaseFuroContext`. Generic parameter: `C` (the context type).

- `.create({ context })` returns an instance object.
- `#context` is the wrapped `BaseFuroContext` instance object.

Typedefs: `BaseFuroContextAccessorParams<C>` (`{ context: C }`) and `BaseFuroContextAccessorFactoryParams` (an alias of `BaseFuroContextAccessorParams<*>`).

## Class: `FuroShare`

The app-wide share object, typically installed as `$furo` in a Nuxt plugin.

- `.create({ graphqlShare })` returns an instance object.
- `#graphqlShare` is the `FuroGraphqlShare` instance object.
- `#get:graphqlConfig` returns `graphqlShare.config`.
- `#get:websocketConnector` returns `graphqlShare.websocketConnector`.

Typedefs: `FuroShareParams` (`{ graphqlShare: furo.GraphqlShare }`) and `FuroShareFactoryParams` (an alias of `FuroShareParams`).

## Class: `FuroGraphqlShare`

The GraphQL part of the share.

- `.create({ config, websocketConnector })` returns an instance object.
- `#config` is a `furo.GraphqlConfig`.
- `#websocketConnector` is a `furo.Connector` used for subscriptions.

Typedefs: `FuroGraphqlShareParams` (`{ config: furo.GraphqlConfig, websocketConnector: furo.Connector }`) and `FuroGraphqlShareFactoryParams` (an alias of `FuroGraphqlShareParams`).

## Class: `RestfulApiClient`

Wires a `furo` RESTful API launcher to a reactive capsule. Unlike the GraphQL side, this is a class. Generic parameter: `C` (capsule constructor type).

- `.create({ Launcher })` returns an instance object. It builds `capsuleRef` with `RestfulApiClient.generateCapsuleRef({ Launcher })`. The `RestfulApiClientFactoryParams` typedef also lists `Capsule`, but only `Launcher` is read.
- `.generateCapsuleRef({ Launcher })` returns `ref(Launcher.createCapsuleAsPending())`.
- `.get:onMounted` returns Vue's `onMounted`. `RestfulApiClient.get:ref` returns Vue's `ref`.
- `#Launcher` is the launcher constructor. It must offer `.createCapsuleAsPending()`, `.createPayload({ query, body, pathParameterHash, options })`, `.createPayloadWithFormValueHash({ valueHash, extraValueHash, options })` and `.create()`. Launcher instances must offer `launchRequest({ payload, hooks })`.
- `#capsuleRef` is a Vue `Ref` holding the capsule. Each request replaces its value.
- `#get:Ctor` returns the constructor of the instance object.
- `#invokeRequestOnEvent({ query? = {}, body? = {}, pathParameterHash? = {}, options? = {}, hooks? = {} } = {})` is async. It calls `invokeRequest()` now.
- `#invokeRequestOnMounted({ ...same properties } = {})` returns `void`. It registers the request inside Vue's `onMounted()`.
- `#invokeRequestWithFormValueHash({ valueHash, extraValueHash? = {}, options? = {}, hooks? = {} })` is async. It builds the payload from the form value hash and stores the capsule in `capsuleRef`.
- `#invokeRequest({ query?, body?, pathParameterHash?, options?, hooks? } = {})` is async. It builds the payload with `Launcher.createPayload()` and stores the capsule in `capsuleRef`.
- `#retrieveCapsule({ payload, hooks? = {} })` is async. It runs `Launcher.create().launchRequest({ payload, hooks })` and returns the capsule without storing it.

Typedefs: `RestfulApiClientParams<C>` (`{ Launcher, capsuleRef }`), `RestfulApiClientFactoryParams<C>` (`{ Launcher, Capsule }`) and `RestfulApiRequestParams` (`{ query?, body?, pathParameterHash?, options?: RequestInit, hooks? }`).

## Class: `BaseRestfulApiSubmitter`

Pairs a `BaseFormClerk` with a `RestfulApiClient`, so a `<form>` submits to a RESTful endpoint. Subclass it and override the two abstract static getters. Generic parameter: `FV` (form value hash type).

- `.create({ formClerk? = this.createFormClerk(), restfulApiClient? = this.createRestfulApiClient() } = {})` returns an instance object.
- `.createFormClerk()` returns `this.FormClerkCtor.create()`.
- `.createRestfulApiClient()` returns `RestfulApiClient.create(this.RestfulApiLauncherCtor)`. It passes the launcher constructor itself as the only argument, while `RestfulApiClient.create()` destructures `{ Launcher }` from its argument, so `.create()` throws a `TypeError` unless the caller passes `restfulApiClient: RestfulApiClient.create({ Launcher })`.
- `.get:FormClerkCtor` is **abstract**. The base version throws `Error('.get:FormClerkCtor must be inherited')`. A subclass returns a `BaseFormClerk` subclass.
- `.get:RestfulApiLauncherCtor` is **abstract**. The base version throws `Error('.get:RestfulApiLauncherCtor must be inherited')`. A subclass returns a RESTful API launcher constructor.
- `#formClerk` is the form clerk. `#restfulApiClient` is the RESTful API client.
- `#get:formElementShallowRef` returns `formClerk.formElementShallowRef`.
- `#get:validationRef` returns `formClerk.validationRef`.
- `#get:capsuleRef` returns `restfulApiClient.capsuleRef`.
- `#submitForm({ extraValueHash? = {}, hooks?, options?, submitEvent? })` is async and returns `Promise<boolean>`. The params object is required (pass `{}` when no option applies). It extracts the value hash with `formClerk.extractValueHash()` and validates it with `formClerk.validateFormValueHash()`. When invalid it returns `false` without a request. Otherwise it calls `restfulApiClient.invokeRequestWithFormValueHash({ valueHash, extraValueHash, hooks, options })` and returns `true`. `submitEvent` is accepted but the method body does not use it.

Typedefs: `BaseRestfulApiSubmitterParams<FV>` (`{ formClerk: BaseFormClerk<FV>, restfulApiClient: RestfulApiClient }`) and `BaseRestfulApiSubmitterFactoryParams<FV>` (`Partial<BaseRestfulApiSubmitterParams<FV>>`).

## Global types (`types/furo-nuxt.d.ts`)

Declared in the global `furo` namespace, not exported from `index.js`.

- `furo.GraphqlClient` is `{ capsuleRef, invokeRequestOnEvent, invokeRequestOnMounted, invokeRequestWithFormValueHash? }`, the shape returned by `useGraphqlClient()`.
- `furo.FormClerk` is `{ validationRef, submitForm }`, the shape returned by `useFormClerk()`.
- `furo.GraphqlConfig` is `{ ENDPOINT_URL: string, WEBSOCKET_URL: string }`.
- `furo.Share` is an alias of `FuroShare`.
- `furo.GraphqlShare` is an alias of `FuroGraphqlShare`.

`types/jest.d.ts` also ships. It declares Jest matchers for the package's own tests and is not a consumer-facing type.
