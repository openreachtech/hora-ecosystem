# API

Source: no `.d.ts` shipped for the export surface (`package.json` has no `"types"` field; `types/furo-nuxt.d.ts` only augments the global `furo` namespace with a few shared type aliases and is not a description of this package's exports). Extracted from JSDoc in `lib/**/*.js`.

No members are tagged `@public` across most of the package; `BaseFormClerk` does tag a subset of its methods `@public`. Elsewhere, the surface below is the natural consumer-facing API — i.e. what a Nuxt app is expected to call from components/pages/plugins, as opposed to internal helpers used only by the class itself.

## Exports (`index.js`)

`furo-nuxt` re-exports plain functions (Vue composables), classes, and one factory function. There is no default export from the package itself — every export below is named.

Composables:

- `useFormClerk` ← `lib/composables/useFormClerk.js`
- `useGraphqlClient` ← `lib/composables/useGraphqlClient.js`
- `useFuroSetup` ← `lib/composables/useFuroSetup.js`
- `useSubscriptionConnector` ← `lib/composables/useSubscriptionConnector.js`

Not exported from `index.js` (present in `lib/composables/` but commented out, because they import from `nuxt/app` and cannot be Jest-tested): `useSubscriptionGraphqlClient`, `useRedirect`. They are documented below anyway since they ship in the package and can be imported by their file path.

Vue helper:

- `buildDefineComponent` ← `lib/vue/buildDefineComponent.js`

Tools:

- `NuxtFuroEnvLoader` ← `lib/tools/NuxtFuroEnvLoader.js`
- `AccessTokenClerk` ← `lib/tools/AccessTokenClerk.js`
- `FuroMeta` ← `lib/tools/FuroMeta.js`

DOM Clerks:

- `BaseFormClerk` ← `lib/clerks/BaseFormClerk.js`

Furo Context (per-component "presenter" objects passed to Vue `setup()`):

- `BaseFuroContext` ← `lib/contexts/BaseFuroContext.js`
- `BaseFuroContextAccessor` ← `lib/contexts/BaseFuroContextAccessor.js`

The package ships **no concrete context subclasses**. `lib/contexts/concretes/` does not exist, and an application defines its own subclasses of `BaseFuroContext`.

Furo Share (app-wide singletons, typically installed as `$furo` in a Nuxt plugin):

- `FuroShare` ← `lib/shares/FuroShare.js`
- `FuroGraphqlShare` ← `lib/shares/FuroGraphqlShare.js`

RESTful API:

- `RestfulApiClient` ← `lib/clients/RestfulApiClient.js`
- `BaseRestfulApiSubmitter` ← `lib/submitters/BaseRestfulApiSubmitter.js`

Class members are written with the following notation throughout this document.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Composable: `useFormClerk({ FormElementClerk, invokeRequestWithFormValueHash })`

Wires a `furo` `BaseFormElementClerk` subclass to a request-invoking function, for use inside a Vue `setup()`.

- `FormElementClerk` — a `furo` `BaseFormElementClerk` subclass (constructor, not instance).
- `invokeRequestWithFormValueHash({ valueHash, extraValueHash?, hooks?, options? })` — async function called with the extracted form value hash once validation passes (typically `useGraphqlClient(...).invokeRequestWithFormValueHash`).

Returns `{ validationRef, submitForm }`:

- `validationRef` — a Vue `Ref` initialized to `{ valid: {}, invalid: {}, messages: {}, message: {} }`, updated on every `submitForm()` call.
- `submitForm({ formElement, extraValueHash?, hooks?, options? })` — async. Builds a `FormElementClerk` instance from `formElement`, writes its validation hash into `validationRef`, and returns `false` without calling `invokeRequestWithFormValueHash` if the form is invalid. Otherwise extracts the value hash, calls `invokeRequestWithFormValueHash`, and returns `true`.

## Composable: `useGraphqlClient({ Launcher })`

Wires a `furo` GraphQL `Launcher` to a reactive capsule, for use inside a Vue `setup()`.

- `Launcher` — a `furo`/GraphQL launcher constructor exposing `.createCapsuleAsPending()`, `.createPayload()`, `.createPayloadWithFormValueHash()`, `.create()`.

Returns `{ capsuleRef, invokeRequestOnEvent, invokeRequestOnMounted, invokeRequestWithFormValueHash }`:

- `capsuleRef` — a Vue `Ref` initialized via `Launcher.createCapsuleAsPending()`, replaced with the response capsule after each request.
- `invokeRequestOnEvent(args?)` — async. `args: { variables?, options?, hooks? }`. Runs the request immediately and writes the result into `capsuleRef`.
- `invokeRequestOnMounted(args?)` — same as above but deferred inside Vue's `onMounted()`.
- `invokeRequestWithFormValueHash({ valueHash, extraValueHash?, options?, hooks? })` — async. Builds the payload from a form value hash via `Launcher.createPayloadWithFormValueHash()` instead of `variables`.

## Composable: `useFuroSetup({ STORAGE_KEY })`

App-bootstrap composable that persists the Nuxt public runtime config into session storage so it is reachable outside of the Nuxt context (e.g. by plain `furo` classes).

- `STORAGE_KEY` — a hash of storage keys; must contain a `FURO_ENV` key.

Returns `{ setupFuroEnv }`:

- `setupFuroEnv({ runtimeConfig })` — creates a `furo` `StorageClerk` (`.createAsSession()`) and `JSON.stringify`s `runtimeConfig.public` into it under `STORAGE_KEY.FURO_ENV`. No return value.

## Composable: `useSubscriptionConnector({ graphqlConfig })`

Creates a `furo` `SubscriptionConnector` (WebSocket) from a GraphQL config, for use in a Nuxt plugin. Returns `{ subscriptionConnector }`.

## Composable: `useSubscriptionGraphqlClient({ Subscriber, Capsule })`

*Not exported from `index.js`* (imports `nuxt/app`); import from its file path directly if needed. Wires a `furo` GraphQL `Subscriber` (WebSocket subscription) to a reactive capsule. Reads `$furo` off `useNuxtApp()` and creates the subscriber against `$furo.websocketConnector`.

Returns `{ capsuleRef, invokeSubscribe, invokeUnsubscribe }`:

- `capsuleRef` — a Vue `Ref` initialized via `Capsule.createAsPending()`.
- `invokeSubscribe({ hooks, valueHash?, operationName?, extensions?, context? })` — async. Subscribes and writes each published capsule into `capsuleRef`, then calls `hooks.onPublish(capsule)`. Also forwards `hooks.onDisconnected` / `hooks.onTerminate` if provided.
- `invokeUnsubscribe()` — unsubscribes and resets `capsuleRef` back to `Capsule.createAsPending()`.

## Composable: `useRedirect({ defaultPath = '/' } = {})`

*Not exported from `index.js`* (imports `nuxt/app`); import from its file path directly if needed. Reads a `redirect` query parameter off the current route (via `vue-router`'s `useRoute()`) and redirects to it, falling back to `defaultPath`.

Returns `{ redirectTo }`:

- `redirectTo({ path } = {})` — async. `path` defaults to the resolved redirect path (`route.query.redirect`, first entry if an array, else `defaultPath`). Calls Nuxt's `navigateTo(path)`.

## Function: `buildDefineComponent({ options })`

- `options: Array<ComponentOptions>` — a list of partial Vue component option objects, each optionally containing a `setup` function.
- Returns a `defineComponent`-shaped function. When called with `{ setup, ...restOptions }`, it merges `setup` together with every `options[].setup` into one integrated `setup()` that calls all of them and shallow-merges their returned objects, then calls Vue's real `defineComponent()` with `restOptions` plus the integrated `setup`.
- Used to compose multiple concerns (e.g. multiple contexts/mixins) into a single component's `setup()`.

## Class: `NuxtFuroEnvLoader`

Loads a furo environment file with `dotenv`, choosing the file by `NODE_ENV`.

- `.create({ processEnv = process.env } = {})` — factory. Returns an instance.
- `.get:dotenv` — the `dotenv` module.
- `#processEnv` — the process environment hash the instance reads `NODE_ENV` from.
- `#get:Ctor` — the constructor of the instance.
- `#loadEnv()` — parses the resolved file and returns its key/value hash. Returns `{}` when the file is missing or `dotenv` throws.
- `#resolveFilePath()` — `path.join(process.cwd(), <resolved file name>)`.
- `#resolveFileName()` — the base name when `NODE_ENV` is `production`, otherwise the base name suffixed with `.<NODE_ENV>`.
- `#resolveNodeEnv()` — `processEnv.NODE_ENV`, defaulting to `'development'`.

## Class: `AccessTokenClerk`

Reads and writes an access token through a `furo` `StorageClerk` (local storage by default).

- `.create({ storage = <StorageClerk.createAsLocal()>, key = <.STORAGE_KEY> } = {})` — factory.
- `.createStorageClerk()` — `StorageClerk.createAsLocal()`.
- `.get:STORAGE_KEY` — `'access_token'`.
- `#storage` — the storage clerk.
- `#key` — the storage key.
- `#saveToken({ token })` — clears and returns `false` when `token` is falsy; otherwise records it and returns `true`.
- `#clearToken()` — removes the key. Returns `this`.
- `#recordToken({ token })` — writes the token. Returns `this`.
- `#retrieveToken()` — returns the stored token or `null`.
- `#existsToken()` — `true` when `#retrieveToken()` is not `null`.

## Class: `FuroMeta`

Reads the `$furo` meta hash off a Nuxt route, for use in route middleware.

- `.create({ routeTo })` — factory. Extracts the meta hash from the route first.
- `.extractFuroMetaFromRoute({ routeTo })` — `routeTo.meta.$furo`, defaulting to `{}`.
- `#furo` — the extracted meta hash (`{ pageTitle?, skipFilter? }`).
- `#get:pageTitle` — `furo.pageTitle`, defaulting to `null`.
- `#get:skipFilter` — `furo.skipFilter`, defaulting to `false`.

## Class: `BaseFormClerk`

Orchestrates a `furo` `FormElementInspector` and `ValueHashValidator` against a `<form>` element held in a Vue shallow ref. Intended to be subclassed, overriding `.get:validationRules`.

- `.create({ formElementShallowRef = <.createFormElementShallowRef()>, validationRef = <.createValidationRef()> } = {})` — factory.
- `.get:ref` / `.get:shallowRef` — Vue's `ref` / `shallowRef`, exposed as seams for testing.
- `.get:validationRules` — **abstract**; returns `[]` on the base class. A subclass returns an array of `furo.FieldValidatorFactoryParams`.
- `.createFormElementShallowRef()` — `shallowRef(null)`.
- `.createValidationRef()` — `ref({ valid: {}, invalid: {}, messages: {}, message: {} })`.
- `#formElementShallowRef` — the `<form>` element ref.
- `#validationRef` — the validation hash ref, replaced on every `#validateFormValueHash()` call.
- `#get:Ctor` — the constructor of the instance.
- `#validateFormValueHash({ valueHash = <#extractValueHash()> } = {})` — `@public`. Validates against `.get:validationRules`, writes the result into `#validationRef`, and returns whether it is valid.
- `#isValid({ validationHash = <#validationRef.value> } = {})` — `@public`. `true` when every entry of `validationHash.valid` is truthy.
- `#isInvalid({ validationHash } = {})` — `@public`. Negation of `#isValid()`.
- `#extractValueHash()` — `@public`. Returns the form control value hash via `FormElementInspector`.
- `#createFormElementInspector()` — throws `Error('no mounted form element')` when the shallow ref holds no element.

## Class: `BaseFuroContext`

The per-component "presenter" object handed to a Vue `setup()`. Intended to be subclassed.

- `.create({ props, componentContext })` — factory.
- `.get:ContextAccessor` — the `BaseFuroContextAccessor` subclass paired with this context, or `null` (the base class returns `null`).
- `.get:EMIT_EVENT_NAME` — **abstract**; returns `{}` on the base class. A subclass returns a hash of `emit()` event names.
- `.createMutationObserver({ handler })` — `new MutationObserver(handler)`.
- `#props` — the component props.
- `#componentContext` — the Vue `SetupContext`.
- `#accessor` — the context accessor instance, built in the constructor.
- `#get:Ctor` — the constructor of the instance.
- `#createContextAccessor()` — returns `null` when `.get:ContextAccessor` is `null`, else `ContextAccessor.create({ context: this })`.
- `#get:$` — the context accessor instance (shorthand for `#accessor`).
- `#get:EMIT_EVENT_NAME` — delegates to `.get:EMIT_EVENT_NAME`.
- `#get:attrs` / `#get:slots` / `#get:emit` / `#get:expose` — the matching members of the Vue `SetupContext`.
- `#get:watch` — Vue's `watch`.
- `#setupComponent(args = {})` — hook for subclasses; returns `this` for chaining. The base implementation does nothing.
- `#generateExposeHash()` — hook for subclasses; returns `{}` on the base class.

Typedefs: `BaseFuroContextParams<P>` and `BaseFuroContextFactoryParams<P>`, both `{ props: P, componentContext: SetupContext }`.

## Class: `BaseFuroContextAccessor`

A thin wrapper giving a template restricted access to a context.

- `.create({ context })` — factory.
- `#context` — the `BaseFuroContext` instance it wraps.

Typedefs: `BaseFuroContextAccessorParams<C>` (`{ context: C }`) and `BaseFuroContextAccessorFactoryParams`.

## Class: `FuroShare`

App-wide singleton, typically installed as `$furo` in a Nuxt plugin.

- `.create({ graphqlShare })` — factory.
- `#graphqlShare` — the `FuroGraphqlShare` instance.
- `#get:graphqlConfig` — `graphqlShare.config`.
- `#get:websocketConnector` — `graphqlShare.websocketConnector`.

Typedefs: `FuroShareParams` (`{ graphqlShare: furo.GraphqlShare }`) and `FuroShareFactoryParams`.

## Class: `FuroGraphqlShare`

The GraphQL half of the app-wide share.

- `.create({ config, websocketConnector })` — factory.
- `#config` — the `furo.GraphqlConfig`.
- `#websocketConnector` — the `furo.Connector` used for subscriptions.

Typedefs: `FuroGraphqlShareParams` (`{ config, websocketConnector }`) and `FuroGraphqlShareFactoryParams`.

## Class: `RestfulApiClient`

Wires a `furo` RESTful API `Launcher` to a reactive capsule. Unlike the GraphQL side, this is a class rather than a composable.

- `.create({ Launcher })` — factory. Builds `capsuleRef` via `.generateCapsuleRef()`.
- `.generateCapsuleRef({ Launcher })` — `ref(Launcher.createCapsuleAsPending())`.
- `.get:onMounted` / `.get:ref` — Vue's `onMounted` / `ref`, exposed as seams for testing.
- `#Launcher` — the launcher constructor.
- `#capsuleRef` — the capsule ref, replaced after each request.
- `#get:Ctor` — the constructor of the instance.
- `#invokeRequestOnEvent({ query?, body?, pathParameterHash?, options?, hooks? } = {})` — async. Delegates to `#invokeRequest()`.
- `#invokeRequestOnMounted({ ... } = {})` — same arguments, deferred inside `onMounted()`.
- `#invokeRequestWithFormValueHash({ valueHash, extraValueHash?, options?, hooks? })` — async. Builds the payload via `Launcher.createPayloadWithFormValueHash()`.
- `#invokeRequest({ query?, body?, pathParameterHash?, options?, hooks? } = {})` — async. Builds the payload via `Launcher.createPayload()` and writes the capsule into `#capsuleRef`.
- `#retrieveCapsule({ payload, hooks? })` — async. Runs `Launcher.create().launchRequest()` and returns the capsule.

Typedefs: `RestfulApiClientParams<C>`, `RestfulApiClientFactoryParams<C>`, and `RestfulApiRequestParams` (`{ query?, body?, pathParameterHash?, options?, hooks? }`).

## Class: `BaseRestfulApiSubmitter`

Pairs a `BaseFormClerk` with a `RestfulApiClient` so a `<form>` submits to a RESTful endpoint. Intended to be subclassed, overriding the two abstract static getters.

- `.create({ formClerk = <.createFormClerk()>, restfulApiClient = <.createRestfulApiClient()> } = {})` — factory.
- `.createFormClerk()` — `FormClerkCtor.create()`.
- `.createRestfulApiClient()` — `RestfulApiClient.create(RestfulApiLauncherCtor)`.
- `.get:FormClerkCtor` — **abstract**; throws `Error('.get:FormClerkCtor must be inherited')`.
- `.get:RestfulApiLauncherCtor` — **abstract**; throws `Error('.get:RestfulApiLauncherCtor must be inherited')`.
- `#formClerk` — the form clerk instance.
- `#restfulApiClient` — the RESTful API client instance.
- `#get:formElementShallowRef` — delegates to `formClerk.formElementShallowRef`.
- `#get:validationRef` — delegates to `formClerk.validationRef`.
- `#get:capsuleRef` — delegates to `restfulApiClient.capsuleRef`.
- `#submitForm({ extraValueHash?, hooks?, options?, submitEvent? })` — async. Extracts and validates the form value hash; returns `false` without a request when invalid. Otherwise calls `restfulApiClient.invokeRequestWithFormValueHash()` and returns `true`.

Typedefs: `BaseRestfulApiSubmitterParams<FV>` and `BaseRestfulApiSubmitterFactoryParams<FV>`.

## Global types (`types/furo-nuxt.d.ts`)

Declared into the global `furo` namespace rather than exported from `index.js`.

- `furo.GraphqlClient` — `{ capsuleRef, invokeRequestOnEvent, invokeRequestOnMounted, invokeRequestWithFormValueHash? }`.
- `furo.FormClerk` — `{ validationRef, submitForm }`.
- `furo.GraphqlConfig` — `{ ENDPOINT_URL: string, WEBSOCKET_URL: string }`.
- `furo.Share` — alias of `FuroShare`.
- `furo.GraphqlShare` — alias of `FuroGraphqlShare`.

`types/jest.d.ts` also ships, and carries Jest matcher declarations for the package's own test suite rather than any consumer-facing type.
