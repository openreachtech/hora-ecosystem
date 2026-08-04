# API

Source: no `.d.ts` shipped for the export surface (`package.json` has no `"types"` field; `types/furo-nuxt.d.ts` only augments the global `furo` namespace with a few shared type aliases and is not a description of this package's exports). Extracted from JSDoc in `lib/**/*.js`.

No members are tagged `@public` across most of the package; `BaseFormClerk` and `FuroPaginationContext` do tag a subset of their methods `@public`. Elsewhere, the surface below is the natural consumer-facing API — i.e. what a Nuxt app is expected to call from components/pages/plugins, as opposed to internal helpers used only by the class itself.

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
- `FuroAccessControlLayoutContext` ← `lib/contexts/concretes/FuroAccessControlLayoutContext.js`
- `FuroButtonDialogContext` ← `lib/contexts/concretes/FuroButtonDialogContext.js`
- `FuroDialogContext` ← `lib/contexts/concretes/FuroDialogContext.js`
- `FuroLoadingLayoutContext` ← `lib/contexts/concretes/FuroLoadingLayoutContext.js`
- `FuroOffCanvasMenuLayoutContext` ← `lib/contexts/concretes/FuroOffCanvasMenuLayoutContext.js`
- `FuroPageItemContext` ← `lib/contexts/concretes/FuroPageItemContext.js`
- `FuroPaginationContext` ← `lib/contexts/concretes/FuroPaginationContext.js`
- `FuroTabItemContext` ← `lib/contexts/concretes/FuroTabItemContext.js`
- `FuroTabLayoutContext` ← `lib/contexts/concretes/FuroTabLayoutContext.js`

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

## Class: `BaseFormClerk`

Orchestrates a `furo` `FormElementInspector` (value extraction) and `ValueHashValidator` (validation) for a `<form>` bound via a Vue `ShallowRef`. Meant to be subclassed per form, overriding `.validationRules`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ formElementShallowRef?, validationRef? } = {})` — static factory method. Defaults come from `.createFormElementShallowRef()` (`shallowRef(null)`) and `.createValidationRef()` (`ref({ valid: {}, invalid: {}, messages: {}, message: {} })`).
- `.get:validationRules` — static getter, `@abstract`. Returns `[]` by default; subclasses override with an array of `furo` field-validator-factory params.
- `#formElementShallowRef` — instance property, a `ShallowRef<HTMLFormElement | null>`.
- `#validationRef` — instance property, a `Ref` of the validation hash.
- `#validateFormValueHash({ valueHash? })` — instance method, `@public`. Validates `valueHash` (default: `this.extractValueHash()`) against `Ctor.validationRules`, writes the resulting validation hash into `validationRef`, and returns whether it's valid.
- `#isValid({ validationHash? })` / `#isInvalid({ validationHash? })` — instance methods, `@public`. Check `validationHash.valid` (default: current `validationRef.value`); every value truthy = valid.
- `#extractValueHash()` — instance method, `@public`. Returns the `<form>`'s current value hash via a `furo` `FormElementInspector`. Throws `Error('no mounted form element')` if `formElementShallowRef.value` is null.
- `#createFormElementInspector()` — instance method. Builds the `FormElementInspector` used by `extractValueHash()`.

## Class: `NuxtFuroEnvLoader`

Loads a dotenv-style `.furo-env[.<NODE_ENV>]` file from the process's current working directory (distinct from Nuxt's own `.env`).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ processEnv = process.env } = {})` — static factory method.
- `.get:dotenv` — static getter. Returns the `dotenv` module (for stubbing in tests).
- `#processEnv` — instance property.
- `#get:Ctor` — instance getter. The constructor of `this`.
- `#loadEnv()` — instance method. Loads and parses the resolved `.furo-env*` file with `dotenv.config()`; returns `{}` on any error (including file-not-found).
- `#resolveFilePath()` / `#resolveFileName()` — instance methods. File name is `.furo-env` for `NODE_ENV === 'production'`, otherwise `.furo-env.<NODE_ENV>`.
- `#resolveNodeEnv()` — instance method. `processEnv.NODE_ENV ?? 'development'`.

## Class: `AccessTokenClerk`

Persists an access token string via a `furo` `StorageClerk` (defaults to `localStorage`).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ storage?, key? } = {})` — static factory method. `storage` defaults to `.createStorageClerk()` (`StorageClerk.createAsLocal()`); `key` defaults to `.STORAGE_KEY`.
- `.get:STORAGE_KEY` — static getter. `'access_token'`.
- `#storage` / `#key` — instance properties.
- `#saveToken({ token })` — instance method. If `token` is falsy, calls `clearToken()` and returns `false`; otherwise stores it via `recordToken()` and returns `true`.
- `#clearToken()` — instance method. Removes the key from storage. Returns `this` (chainable).
- `#recordToken({ token })` — instance method. Sets the key in storage. Returns `this` (chainable).
- `#retrieveToken()` — instance method. Returns the stored token, or `null`.
- `#existsToken()` — instance method. `retrieveToken() !== null`.

## Class: `FuroMeta`

Reads Nuxt-specific route metadata (`route.meta.$furo`) inside route middleware.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ routeTo })` — static factory method. `routeTo` is the first parameter Nuxt passes to a `RouteMiddleware`. Extracts `routeTo.meta.$furo ?? {}` and stores it.
- `.extractFuroMetaFromRoute({ routeTo })` — static method used internally by `.create()`.
- `#get:pageTitle` — instance getter. `furo.pageTitle ?? null`.
- `#get:skipFilter` — instance getter. `furo.skipFilter ?? false`.

## Class: `BaseFuroContext`

Base class for all "Context" objects — the object a Furo component's `setup()` builds and returns, wrapping `props`/`componentContext` (Vue's `SetupContext`) with convenience accessors. Meant to be subclassed per component.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ props, componentContext })` — static factory method.
- `.get:ContextAccessor` — static getter, `@abstract`. `null` by default; subclasses may return a `BaseFuroContextAccessor` subclass constructor.
- `.get:EMIT_EVENT_NAME` — static getter, `@abstract`. `{}` by default; subclasses override with a hash of `emit()` event names.
- `.createMutationObserver({ handler })` — static method. `new MutationObserver(handler)`.
- `#props` / `#componentContext` — instance properties (constructor inputs).
- `#accessor` — instance property, result of `createContextAccessor()`, set in the constructor.
- `#get:Ctor` — instance getter. The constructor of `this`.
- `#createContextAccessor()` — instance method. Returns `null` if `Ctor.ContextAccessor` is unset, otherwise `Ctor.ContextAccessor.create({ context: this })`.
- `#get:$` — instance getter. The context-accessor instance (or `null`).
- `#get:EMIT_EVENT_NAME` — instance getter. Proxies `Ctor.EMIT_EVENT_NAME`.
- `#get:attrs` / `#get:emit` / `#get:expose` / `#get:slots` — instance getters. Proxy the corresponding members of `componentContext`.
- `#get:watch` — instance getter. Returns Vue's `watch` function.
- `#setupComponent(args = {})` — instance method, meant to be overridden by subclasses (called from a component's `setup()`); base implementation just returns `this`.
- `#generateExposeHash()` — instance method, meant to be overridden; base implementation returns `{}`.

## Class: `BaseFuroContextAccessor`

Base class for a context's `$` accessor object (`context.$`), used to expose a narrower/renamed API of a context to templates. Meant to be subclassed.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `.staticMethod()` | static method |

- `.create({ context })` — static factory method.
- `#context` — instance property, the owning `BaseFuroContext` instance.

## Class: `FuroAccessControlLayoutContext` (extends `BaseFuroContext`)

Context for a role-based access-control layout component.

- `#get:role` / `#get:allowedRoles` / `#get:kickedRoles` — instance getters, read `props.role` / `props.allowed` / `props.kicked`.
- `#canShowContent()` — instance method, `@public`. `Boolean(role) && isAllowed() && !isKicked()`.
- `#isAllowed()` — `true` if `role` is set and (`allowedRoles` is empty or contains `role`).
- `#isKicked()` — `true` if `role` is unset, or `kickedRoles` is non-empty and contains `role`.

## Class: `FuroButtonDialogContext` (extends `BaseFuroContext`)

Context for a button that opens/controls a `FuroDialog` component (constructor takes an extra `dialogComponentRef`).

- `.get:EMIT_EVENT_NAME` — `{ CLICK_POSITIVE_BUTTON: 'clickPositiveButton', CLICK_NEGATIVE_BUTTON: 'clickNegativeButton', CLICK_NEUTRAL_BUTTON: 'clickNeutralButton' }`.
- `#get:dialogComponent` — instance getter. `dialogComponentRef.value` (the `FuroDialog` child component instance).
- `#showDialog()` / `#dismissDialog()` — instance methods. Delegate to `dialogComponent?.showDialog()` / `.dismissDialog()`.
- `#generateExposeHash()` — overrides base; exposes `{ showDialog, dismissDialog }` (called automatically from `setupComponent()`).
- `#clickPositiveButton()` / `#clickNegativeButton()` / `#clickNeutralButton()` — instance methods. Each emits the matching event, then calls `dismissDialog()`.

## Class: `FuroDialogContext` (extends `BaseFuroContext`)

Context for a native `<dialog>`-backed modal component (constructor takes an extra `dialogElementRef`).

- `.get:EMIT_EVENT_NAME` — `{ SHOW_DIALOG: 'showDialog', DISMISS_DIALOG: 'dismissDialog', CLICK_BACKDROP: 'clickBackdrop' }`.
- `#get:dialogElement` — instance getter. `dialogElementRef.value`.
- `#showDialog()` / `#dismissDialog()` — instance methods. Call the native `dialogElement.showModal()` / `.close()`.
- `#generateExposeHash()` — overrides base; exposes `{ showDialog, dismissDialog }`.
- `#clickInInner({ event })` — instance method. Emits `CLICK_BACKDROP` if the click landed outside the dialog's own box (computed via `getBoundingClientRect()`), i.e. on the `::backdrop`.
- `setupComponent()` additionally installs a `MutationObserver` (via the inherited `.createMutationObserver()`) watching the `<dialog>`'s `open` attribute, emitting `SHOW_DIALOG`/`DISMISS_DIALOG` automatically as it toggles.

## Class: `FuroLoadingLayoutContext` (extends `BaseFuroContext`)

Minimal context exposing a loading flag. `#get:isLoading` — instance getter, `props.isLoading`.

## Class: `FuroOffCanvasMenuLayoutContext` (extends `BaseFuroContext`)

Context for an off-canvas (slide-in) navigation menu (constructor takes extra `route` and `rootElementRef`).

- `#get:rootElement` — instance getter. `rootElementRef.value`.
- `#clickInMainBackdrop({ pointerEvent })` — closes the navigation; always returns `false`.
- `#closeNavigation()` — removes the `open-nav` class from the root element.
- `#clickToggleNavigation()` — toggles the `open-nav` class.
- `#isShowedNavigation()` — `true` if the root element has the `open-nav` class.
- `#clickInNav({ event })` — closes the navigation if the click landed to the right of the `<nav>` element's bounding box (i.e. on its backdrop).
- `setupComponent()` additionally watches the current route's `fullPath` and auto-closes the navigation on every route change.

## Class: `FuroPageItemContext`

Value object for a single page link (not a `BaseFuroContext` subclass — no `props`/`componentContext`).

- `.create({ pageNumber, searchParams, pageKey, isCurrent = false })` — static factory method.
- `#pageNumber` / `#searchParams` / `#pageKey` / `#isCurrent` — instance properties.
- `#generateHref()` — instance method. `null` if `pageNumber` is falsy, otherwise `?<searchParams with pageKey=pageNumber>`.
- `#generateText()` — instance method. `null` if `pageNumber` is falsy, otherwise its string form.

## Class: `FuroPaginationContext` (extends `BaseFuroContext`)

Context for a pagination component; computes the visible page range and per-page links (constructor takes an extra `route`).

- `.get:EMIT_EVENT_NAME` — `{ CHANGE_PAGE: 'changePage' }`.
- `#get:pageKey` — `props.pageKey ?? 'page'`.
- `#get:maxPageRange` — `props.maxPageRange ?? 5`.
- `#get:pagination` — `props.pagination ?? {}` (`{ limit?, totalRecords? }`).
- `#get:pageLimit` — `pagination.limit ?? 20`.
- `#get:totalRecordNumber` — `pagination.totalRecords ?? 0`.
- `#calculateLastPage()` — `1` if `pageLimit <= 0`, else `ceil(totalRecordNumber / pageLimit)`.
- `#changePage({ event, page })` — instance method, `@public`. Emits `CHANGE_PAGE` with `{ event, page }` (`page` is a `FuroPageItemContext`).
- `#resolveCurrentPage()` — reads the current page number from `route.query[pageKey]`, defaulting to `1`.
- `#createRangePages({ rangePages? })` — instance method, `@public`. Returns an `Array<FuroPageItemContext>` for the visible page range (default: `generateRangePages()`).
- `#generatePreviousPageHref()` / `#generateNextPageHref()` / `#generateFirstPageHref()` / `#generateLastPageHref()` — instance methods, `@public`. Href strings for the corresponding page (`null` if not applicable, e.g. no previous page).
- `#generateFirstPageLinkLabel()` / `#generateLastPageLinkLabel()` — instance methods, `@public`. Label strings (page numbers) for the first/last page.
- `#isDisabledPreviousPage()` / `#isDisabledNextPage()` — instance methods, `@public`. Whether the prev/next link should be disabled.
- `#isHiddenFirstPage()` / `#isHiddenLastPage()` / `#isHiddenFirstPageDash()` / `#isHiddenLastPageDash()` — instance methods, `@public`. Whether the first/last page (or its "..." dash) is already included in the visible range and should be hidden from a separate "jump to first/last" control.
- `#generateRangePages()`, `#calculateRangeStartedPage()`, `#createPreviousPage()`, `#createNextPage()`, `#createFirstPage()`, `#createLastPage()`, `#createURLSearchParamsFromRoute()` — internal instance methods backing the `@public` ones above.

## Class: `FuroTabItemContext`

Value object for a single tab (not a `BaseFuroContext` subclass).

- `.create({ tabKey, slotName, label, index })` — static factory method. Normalizes `slotName` via `.generateSlotName()`.
- `.generateSlotName({ name })` — static method. `name` falsy → `'tabControl'`, else `` `${name}TabControl` ``.
- `#tabKey` / `#slotName` / `#label` / `#index` — instance properties.
- `#isTargetTab({ tabKey })` — instance method. `this.tabKey === tabKey`.

## Class: `FuroTabLayoutContext` (extends `BaseFuroContext`)

Context for a tab layout component; builds one `FuroTabItemContext` per configured tab (constructor/factory take extra `tabElementsRef`; `.create()` also derives `tabContexts` and `activeTabKey` from `props`).

- `.get:EMIT_EVENT_NAME` — `{ CHANGE_TAB: 'changeTab' }`.
- `.createTabContext({ tab, index })` — static method used internally by `.create()` to build each `FuroTabItemContext`.
- `#get:tabElements` — instance getter. `tabElementsRef.value`.
- `#isActiveTab({ tab })` — instance method. `activeTabKey === tab.tabKey`.
- `#onClickTab({ event: { currentTarget } })` — instance method. Emits `CHANGE_TAB` with `{ fromTab, toTab }` (both `FuroTabItemContext | null`, resolved from the currently-`active`-classed element and the clicked element), then swaps the `active` CSS class between them.

## Class: `FuroShare`

App-wide Furo facade, typically installed as Nuxt's `$furo` in a plugin.

- `.create({ graphqlShare })` — static factory method.
- `#get:graphqlConfig` — instance getter. `graphqlShare.config`.
- `#get:websocketConnector` — instance getter. `graphqlShare.websocketConnector`.

## Class: `FuroGraphqlShare`

Holds the GraphQL config and WebSocket connector referenced by `FuroShare`.

- `.create({ config, websocketConnector })` — static factory method.
- `#config` / `#websocketConnector` — instance properties.

## Class: `RestfulApiClient`

RESTful-API counterpart of the GraphQL client used by `useGraphqlClient` — a plain class (not a composable) wired to a Vue `Ref` capsule.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ Launcher })` — static factory method. Builds `capsuleRef` via `.generateCapsuleRef()` (`ref(Launcher.createCapsuleAsPending())`).
- `.generateCapsuleRef({ Launcher })` — static method used internally by `.create()`.
- `.get:onMounted` / `.get:ref` — static getters returning Vue's `onMounted` / `ref` (for stubbing in tests).
- `#Launcher` / `#capsuleRef` — instance properties.
- `#get:Ctor` — instance getter. The constructor of `this`.
- `#invokeRequestOnEvent(params?)` — async. `params: { query?, body?, pathParameterHash?, options?, hooks? }`. Runs the request immediately.
- `#invokeRequestOnMounted(params?)` — same params; deferred inside `onMounted()`.
- `#invokeRequestWithFormValueHash({ valueHash, extraValueHash?, options?, hooks? })` — async. Builds the payload from a form value hash instead of `query`/`body`.
- `#invokeRequest(params?)` — async. Internal implementation shared by `invokeRequestOnEvent`/`invokeRequestOnMounted`; builds the payload via `Launcher.createPayload()`, retrieves the capsule, and writes it into `capsuleRef`.
- `#retrieveCapsule({ payload, hooks? })` — async. Creates a `Launcher` instance and calls `.launchRequest({ payload, hooks })`.

## Class: `BaseRestfulApiSubmitter`

Orchestrates a `BaseFormClerk` and a `RestfulApiClient` for a `<form>` that submits to a RESTful endpoint. `@abstract` — subclasses must override `.FormClerkCtor` and `.RestfulApiLauncherCtor`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ formClerk?, restfulApiClient? } = {})` — static factory method. Defaults come from `.createFormClerk()` / `.createRestfulApiClient()`.
- `.createFormClerk()` — static method. `this.FormClerkCtor.create()`.
- `.createRestfulApiClient()` — static method. `RestfulApiClient.create(this.RestfulApiLauncherCtor)`.
- `.get:FormClerkCtor` — static getter, `@abstract`. Throws `Error('.get:FormClerkCtor must be inherited')` unless overridden; must return a `BaseFormClerk` subclass.
- `.get:RestfulApiLauncherCtor` — static getter, `@abstract`. Throws `Error('.get:RestfulApiLauncherCtor must be inherited')` unless overridden; must return a RESTful-API launcher constructor.
- `#formClerk` / `#restfulApiClient` — instance properties.
- `#get:formElementShallowRef` — instance getter. `formClerk.formElementShallowRef`.
- `#get:validationRef` — instance getter. `formClerk.validationRef`.
- `#get:capsuleRef` — instance getter. `restfulApiClient.capsuleRef`.
- `#submitForm({ extraValueHash?, hooks?, options?, submitEvent? })` — async. Extracts and validates the form value hash; if invalid, returns `false` without submitting. Otherwise calls `restfulApiClient.invokeRequestWithFormValueHash()` and returns `true`.

## Usage

```js
// plugins/010.furo.js
import {
  FuroShare,
  FuroGraphqlShare,
  useSubscriptionConnector,
} from '@openreachtech/furo-nuxt'

export default defineNuxtPlugin(nuxtApp => {
  const graphqlConfig = {
    ENDPOINT_URL: useRuntimeConfig().public.GRAPHQL_ENDPOINT_URL,
    WEBSOCKET_URL: useRuntimeConfig().public.GRAPHQL_WEBSOCKET_URL,
  }

  const { subscriptionConnector } = useSubscriptionConnector({
    graphqlConfig,
  })

  const graphqlShare = FuroGraphqlShare.create({
    config: graphqlConfig,
    websocketConnector: subscriptionConnector,
  })

  nuxtApp.provide(
    'furo',
    FuroShare.create({ graphqlShare })
  )
})
```

```js
// components/UserCreateForm.vue <script>
import {
  useFormClerk,
  useGraphqlClient,
} from '@openreachtech/furo-nuxt'

import UserCreateFormElementClerk from '~/app/clerks/UserCreateFormElementClerk.js'
import CreateUserGraphqlLauncher from '~/app/graphql/CreateUserGraphqlLauncher.js'

export default {
  setup () {
    const {
      capsuleRef,
      invokeRequestWithFormValueHash,
    } = useGraphqlClient({
      Launcher: CreateUserGraphqlLauncher,
    })

    const {
      validationRef,
      submitForm,
    } = useFormClerk({
      FormElementClerk: UserCreateFormElementClerk,
      invokeRequestWithFormValueHash,
    })

    return {
      capsuleRef,
      validationRef,
      submitForm,
    }
  },
}
```

```js
// A pagination component's setup()
import { FuroPaginationContext } from '@openreachtech/furo-nuxt'
import { useRoute } from 'vue-router'

export default {
  props: {
    pagination: { type: Object, required: true },
    pageKey: { type: String, default: 'page' },
    maxPageRange: { type: Number, default: 5 },
  },
  setup (props, componentContext) {
    const context = FuroPaginationContext.create({
      props,
      componentContext,
      route: useRoute(),
    })

    return {
      pages: context.createRangePages(),
      changePage: args => context.changePage(args),
      isDisabledPreviousPage: () => context.isDisabledPreviousPage(),
    }
  },
}
```
