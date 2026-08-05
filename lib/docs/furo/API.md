# API

Source: `lib/**/*.js` (JSDoc). `package.json` has no `"types"` field — although a `types/*.d.ts` directory ships in the package (`furo.d.ts`, `graphql.d.ts`, `restfulapi.d.ts`, `jest.d.ts`), it is not wired up as the package's type entry point, so it is not treated as the authoritative contract here; everything below is extracted from the JSDoc in `lib/`.

This package is a broad front-end toolkit (~35 exported classes) covering a GraphQL client, a RESTful API client, `<form>` element inspection/validation, and an IndexedDB wrapper. Only some methods are tagged `@public` in the source (confirmed via `grep -rn @public lib/`); where a class has `@public` members, this doc lists those plus static factory methods and the abstract members a subclass **must** override (the class throws `Error` otherwise). Where a class has no `@public` tags at all, this doc says so and documents the natural consumer-facing surface by design judgement.

## Exports (`index.js`)

All exports are named re-exports of each module's `default` export, except `RESTFUL_API_METHOD` (a named export). Grouped as in `index.js`'s own section comments:

- **GraphQL client**: `BaseGraphqlCapsule`, `BaseGraphqlLauncher`, `BaseGraphqlPayload`, `BaseGraphqlSubscriber`, `BaseSubscriptionGraphqlPayload`, `BaseSubscriptionGraphqlCapsule`, `SubscriptionConnector`
- **Client tools** (supporting plumbing, used internally by the launchers/payloads above and below): `ProgressHttpFetcher`, `HeadersParser`, `PathnameBuilder`, `BaseResponseBodyParser`, `JsonResponseBodyParser`
- **RESTful API client**: `BaseRestfulApiCapsule`, `BaseRestfulApiLauncher`, `BaseRestfulApiPayload`, `BaseRenchanRestfulApiCapsule`, `BaseRenchanRestfulApiLauncher`, `BaseRenchanRestfulApiPayload`, `RESTFUL_API_METHOD` (named export, not a default)
- **DOM tools**: `FormElementInspector`, `FormControlElementInspector`, `HashBuilder`, `UploadingPropertyPathBuilder`, `BaseLegacyFormElementClerk`, `FieldValidator`, `ValueHashValidator`, `DomInflator`
- **Backward compatibility**: `BaseFormElementClerk` (from `lib/domClerks/BaseFormElementClerk.js`), `FormControlElementClerk` (re-export of `FormControlElementInspector` under an older name)
- **Dynamic class declaration tools** (internal plumbing used by `BaseRestfulApiPayload.asGetMethod`/`.asPostMethod`): `AnonymousClassNameAssigner`, `DerivedClassNameGenerator`, `DynamicDerivedCtorPool`, `BaseDerivedCtorRegistry`, `RestMethodRestfulApiPayloadDerivedCtorRegistry`
- **Local storage**: `StorageClerk`
- **IndexedDB**: `IndexedDbClient`, `BaseDatabase`, `BaseDatabaseMigration`, `BaseStore`

## Notation

Used consistently across every class section below.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

All of these classes are meant to be **subclassed** (they are named `Base*`), except the plain utility classes (`HashBuilder`, `PathnameBuilder`, `FieldValidator`, `ValueHashValidator`, `DomInflator`, `StorageClerk`, `FormElementInspector`, `FormControlElementInspector`, `UploadingPropertyPathBuilder`, `HeadersParser`, `ProgressHttpFetcher`, `SubscriptionConnector`, `JsonResponseBodyParser`, `IndexedDbClient`), which are used directly or composed.

---

## GraphQL Client

### Class: `BaseGraphqlLauncher`

Orchestrates a single GraphQL request/response cycle over `fetch`. A concrete subclass must override `.graphqlConfig`, `.Payload`, and `.Capsule`.

- `.create({ config = this.graphqlConfig } = {})` — static factory method. Returns `new this({ config })`.
- `.get:graphqlConfig` — **abstract**, must be overridden by subclass (throws `Error` otherwise). Returns the `{ [key]: string }` config hash (expects at least `ENDPOINT_URL`).
- `.get:Payload` — **abstract**, must return the concrete `BaseGraphqlPayload` subclass for this launcher.
- `.get:Capsule` — **abstract**, must return the concrete `BaseGraphqlCapsule` subclass for this launcher.
- `.get:Launcher` — returns `this` (the launcher class); overridable.
- `.get:fetch` — returns the global `fetch` function.
- `.createHttpFetcher()` — static, returns `ProgressHttpFetcher.create()`.
- `.createPayload(...)` / `.createPayloadWithValueHash(...)` / `.createPayloadWithFormValueHash(...)` — static convenience wrappers delegating to `.Payload.create()` / `.createWithValueHash()` / `.createWithFormValueHash()`.
- `.createCapsule(...)` / `.createCapsuleAsPending()` / `.createCapsuleAsInvalidVariablesError({ payload })` / `.createCapsuleAsAbortedByHooks({ payload })` / `.createCapsuleAsNetworkError({ payload })` / `.createCapsuleAsJsonParseError({ rawResponse, payload })` — static convenience wrappers delegating to `.Capsule`.
- `#get:Ctor` — instance getter, own constructor.
- `#get:endpointUrl` — reads `this.config.ENDPOINT_URL`.
- `#launchRequest({ payload, hooks: { beforeRequest, afterRequest, onUploadProgress, onDownloadProgress } = {} })` — **`@public`** instance method (async). The primary entry point applications call. Order of operations: (1) if `payload.isInvalidVariables()` → resolves a capsule via `createCapsuleAsInvalidVariablesError` without ever calling `beforeRequest`; (2) calls `beforeRequest(payload)` — if it resolves truthy, resolves a capsule via `createCapsuleAsAbortedByHooks` without firing the network request; (3) otherwise fetches via `ProgressHttpFetcher`, reporting `onUploadProgress`/`onDownloadProgress`; a thrown/failed fetch resolves a network-error capsule; a JSON-parse failure resolves a JSON-parse-error capsule; (4) on success resolves a capsule with the parsed body, then calls `afterRequest(capsule)`. Always resolves (never rejects) with an instance of `.Capsule`.
- `#extendRequestHooks(...)` / `#extendBeforeRequestHook(...)` / `#extendAfterRequestHook(...)` / `#extendOnUploadProgressHook(...)` / `#extendOnDownloadProgressHook(...)` / `#invokeFetchQuery(...)` / `#retrieveCapsule(...)` / `#generateFetchResult(...)` — internal instance methods implementing the pipeline above; override points for advanced customization, not tagged `@public`.

### Class: `BaseGraphqlPayload`

Builds the outgoing GraphQL `Request`. A concrete subclass must override `.document` (the GraphQL query/mutation string).

- `.create({ variables = {}, options = {} } = {})` — static factory. `queryTemplate` is taken from `this.document`.
- `.createWithValueHash({ valueHash, options = {} })` — static. Wraps `valueHash` via `.generateVariables()` (default: `{ input: valueHash }`), then calls `.create()`.
- `.createWithFormValueHash({ valueHash, extraValueHash = {}, options = {} })` — static. Merges `valueHash` and `extraValueHash` via `.buildFormBasedValueHash()`, then calls `.createWithValueHash()`.
- `.get:document` — **abstract**, must be overridden (throws `Error` otherwise). The GraphQL document string.
- `.get:fieldHash` — default `{}`. Maps a schema/variables-root name to its required field names; used by `isValidVariables()`.
- `.generateVariables({ valueHash })` — static, default `{ input: valueHash }`; override to customize.
- `.collectBasedHeadersOptions()` / `.collectBasedFetchOptions()` — static, default `[]`; override to inject default headers/fetch options merged in at request build time.
- `#get:Ctor` — instance getter, own constructor.
- `#createFetchRequest({ url })` — **`@public`** instance method. Builds a `Request`. **Non-obvious behavior:** the request is **always** sent as `multipart/form-data` (via `#buildFormDataBody()`), never as JSON — the GraphQL `operations`/`map` fields follow the [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec), with `File`/`Blob` leaf values in `variables` extracted via `UploadingPropertyPathBuilder` and appended as separate form fields.
- `#isValidVariables()` / `#isInvalidVariables()` — instance methods. Valid iff, for every schema key in `.fieldHash`, the set of `variables[schema]` keys plus the required field list, deduplicated, has the same length as the required field list (i.e. every required field is present; extra fields are tolerated).
- `#extractFilteredVariables()` — instance method, default returns `this.variables` unchanged; override point to strip fields before sending.

### Class: `BaseGraphqlCapsule`

The result object produced from a request (pending, success, or one of several typed error states). Not tagged `@public` itself, but its getters/predicates are the natural surface returned by `BaseGraphqlLauncher#launchRequest()`.

- `.create({ rawResponse, payload, result, abortedReason = LAUNCH_ABORTED_REASON.NONE })` — static factory.
- `.createAsPending()` / `.createAsInvalidVariablesError({ payload })` / `.createAsAbortedByHooks({ payload })` / `.createAsNetworkError({ payload })` / `.createAsJsonParseError({ rawResponse, payload })` — static factories for each launch outcome.
- `.get:unknownErrorCode` (`'190.X000.001'`) / `.get:invalidVariablesErrorCode` (`'191.X000.001'`) / `.get:networkErrorCode` (`'192.X000.001'`) / `.get:jsonParseErrorCode` (`'192.X000.002'`) — static getters, fixed error-code strings.
- `#get:Ctor` — instance getter, own constructor.
- `#get:content` — `result?.data ?? null`.
- `#get:errors` — `result?.errors ?? []`.
- `#hasContent()` — `Boolean(content)`.
- `#isPending()` — `payload === null`.
- `#hasInvalidVariablesError()` / `#hasNetworkError()` / `#hasJsonParseError()` / `#hasQueryError()` — instance predicates.
- `#hasError()` — `hasQueryError() || hasNetworkError() || hasJsonParseError()`.
- `#getErrorMessage()` — instance method. **Non-obvious precedence order:** pending → `null`; else invalid-variables → `invalidVariablesErrorCode`; else network error → `networkErrorCode`; else JSON-parse error → `jsonParseErrorCode`; else no query error → `null`; else the first GraphQL error's `.message` (fallback `unknownErrorCode` if the errors array is empty).
- `#extractErrors()` — returns `errors`. `#extractContent()` — returns `null` if `hasError()`, else `content`.

### Class: `BaseGraphqlSubscriber`

WebSocket subscription counterpart to the launcher. A concrete subclass must override `.Payload` and `.Capsule`.

- `.create({ connector })` — static factory. `connector` is a `SubscriptionConnector` instance.
- `.get:Subscriber` — returns `this`; overridable.
- `.get:Payload` / `.get:Capsule` — **abstract**, must return the concrete subscription payload/capsule classes.
- `.createPayload(...)` / `.createPayloadWithValueHash(...)` — static wrappers delegating to `.Payload`.
- `.createCapsule(...)` / `.createCapsuleAsPending()` / `.createCapsuleAsInvalidVariablesError({ payload })` / `.createCapsuleAsAbortedByHooks({ payload })` / `.createCapsuleAsNetworkError({ payload })` — static wrappers delegating to `.Capsule`.
- `#get:Ctor` — instance getter.
- `#unsubscribe()` — **`@public`** instance method. Invokes the currently-stored unconnect handler (no-op the first time, since it defaults to `() => {}`).
- `#subscribe({ payload, hooks: { onPublish, onDisconnected, onTerminate } })` — **`@public`** instance method. If `payload.isInvalidVariables()`, immediately calls `hooks.onPublish(capsule)` with an invalid-variables capsule and returns (never touches the socket). Otherwise unsubscribes any prior subscription, then subscribes on the underlying `SubscriptionConnector`, wiring `onPublish` to each message, `onDisconnected` + auto-reconnect (via `#resubscribeAfterDelay`) to socket errors, and `onTerminate` to `complete`.
- `#resubscribeAfterDelay({ handler, delayMilliseconds = this.calculateResubscribeDelayMilliseconds() })` — schedules `handler` via `setTimeout`; resets the attempt counter once the connector reconnects.
- `#calculateResubscribeDelayMilliseconds()` — exponential backoff: `min(32000, 3000 + 2^attempt * 1000)` ms.
- `#addConnectorLifecycleListener(...)` / `#removeConnectorLifecycleListener(...)` — instance methods, delegate to the connector's `EventTarget`; return `this` for chaining.

### Class: `BaseSubscriptionGraphqlPayload`

Builds the WebSocket subscription payload (analogous to `BaseGraphqlPayload` but for subscriptions). A concrete subclass must override `.document`.

- `.create({ variables = {}, operationName = null, extensions = {}, context = { headers: new Headers() } } = {})` — static factory.
- `.createWithValueHash({ valueHash, operationName, extensions, context })` — static, wraps via `.generateVariables()` then `.create()`.
- `.get:document` — **abstract**, must be overridden.
- `.get:fieldHash` — default `{}`, same role as in `BaseGraphqlPayload`.
- `.collectBasedSubscriptionPayloadOptions()` / `.collectBasedSubscriptionContextOptions()` / `.collectBasedHeadersOptions()` — static, default `[]`; override points.
- `#get:Ctor` — instance getter.
- `#buildSubscriptionPayload()` — **`@public`** instance method. Returns `{ ...payloadOptions, query, variables, operationName, extensions, context }`, the object handed to `graphql-ws`'s `subscribe()`.
- `#isValidVariables()` / `#isInvalidVariables()` — same rule as `BaseGraphqlPayload`.

### Class: `BaseSubscriptionGraphqlCapsule`

Result object for a subscription message; near-identical shape to `BaseGraphqlCapsule` but without JSON-parse-error handling (subscriptions don't parse raw HTTP bodies) and `hasNetworkError()` is a stub (`return false // TODO`).

- `.create({ payload, result, abortedReason = SUBSCRIBE_ABORTED_REASON.NONE })`, `.createAsPending()`, `.createAsInvalidVariablesError({ payload })`, `.createAsAbortedByHooks({ payload })`, `.createAsNetworkError({ payload })` — static factories, same pattern as `BaseGraphqlCapsule`.
- `.get:unknownErrorCode` / `.get:invalidVariablesErrorCode` / `.get:networkErrorCode` — static error-code getters.
- `#get:Ctor`, `#get:content`, `#get:errors`, `#hasContent()`, `#isPending()`, `#hasInvalidVariablesError()`, `#hasQueryError()`, `#hasError()` (`hasQueryError() || hasNetworkError()`), `#getErrorMessage()`, `#extractErrors()`, `#extractContent()` — same semantics as `BaseGraphqlCapsule`, minus JSON-parse handling.

### Class: `SubscriptionConnector`

Wraps a `graphql-ws` client and rebroadcasts its lifecycle events (`connecting`, `opened`, `message`, `connected`, `closed`, `error`, `ping`, `pong`) as `CustomEvent`s on an internal `EventTarget`.

- `.create({ config })` — static factory. Builds the `EventTarget` and the `graphql-ws` client (`config.WEBSOCKET_URL`, `retryAttempts: -1` i.e. infinite retries).
- `.createEventTarget()` / `.createWebSocketClient({ url, eventTarget })` / `.generateWebSocketSink({ eventTarget })` / `.createCustomEvent({ eventName, detail })` — static helpers used by `.create()`.
- `.get:graphqlWsCore` — returns `{ createClient }` from the `graphql-ws` package (override point for testing).
- `#subscribe({ webSocketPayload, sink })` — unsubscribes any prior subscription then calls the underlying `graphql-ws` client's `subscribe()`; returns its unconnect callback.
- `#unsubscribe()` — **`@public`** instance method; default no-op, replaced with the real unconnect handler after `#subscribe()` runs.
- `#addLifecycleListener({ eventName, handler, options = {} })` / `#removeLifecycleListener({ eventName, handler, options = {} })` — proxy to the internal `EventTarget`; return `this` for chaining.

---

## RESTful API Client

Structurally parallel to the GraphQL client above (`Launcher` → `Payload` → `Capsule`), but for plain REST endpoints with a query/body/path-parameter split instead of GraphQL variables.

### Class: `BaseRestfulApiLauncher`

- `.create({ config = this.restfulApiConfig } = {})` — static factory.
- `.get:restfulApiConfig` — **abstract**, must be overridden (expects at least `BASE_URL`).
- `.get:Payload` / `.get:Capsule` — **abstract**, must return the concrete payload/capsule classes.
- `.get:ResponseBodyParser` — defaults to `JsonResponseBodyParser`; override to parse a different body format.
- `.get:fetch`, `.createHttpFetcher()`, `.get:Launcher` — same roles as in `BaseGraphqlLauncher`.
- `.createPayload(...)` / `.createPayloadWithFormValueHash(...)` — static wrappers delegating to `.Payload`.
- `.createCapsule(...)` / `.createCapsuleAsPending()` / `.createCapsuleAsInvalidParametersError({ payload })` / `.createCapsuleAsAbortedByHooks({ payload })` / `.createCapsuleAsNetworkError({ payload })` / `.createCapsuleAsResponseBodyParseError({ rawResponse, payload })` — static wrappers delegating to `.Capsule`.
- `.createResponseBodyParser({ response })` — static, delegates to `.ResponseBodyParser.create()`.
- `#get:Ctor`, `#get:baseUrl` (`this.config.BASE_URL`).
- `#launchRequest({ payload, hooks })` — **`@public`** instance method (async). Same pipeline/precedence as `BaseGraphqlLauncher#launchRequest`, with `payload.isInvalidAllParameterHash()` in place of `isInvalidVariables()`, and a body-parse failure resolving via `createCapsuleAsResponseBodyParseError` (parsed through `.ResponseBodyParser`, not hardcoded JSON).
- `#extendRequestHooks(...)` and friends, `#invokeFetchQuery(...)`, `#retrieveCapsule(...)`, `#generateFetchResult(...)` — same internal pipeline shape as the GraphQL launcher.

### Class: `BaseRestfulApiPayload`

- `.create({ query = {}, body = {}, pathParameterHash = {}, options = {} } = {})` — static factory.
- `.createWithFormValueHash({ valueHash, extraValueHash = {}, options = {} })` — static. Merges value hashes, then calls the **abstract** `.generateRequestParameterHash({ valueHash })` (must be overridden — throws otherwise) to split the merged hash into `{ query, body, pathParameterHash }`, then `.create()`.
- `.get:method` — **abstract**, must be overridden (HTTP method string, e.g. `'GET'`).
- `.get:pathname` — **abstract**, must be overridden. Supports path parameters via bracket placeholders, e.g. `'/profile/[id]'` (interpolated by `PathnameBuilder`).
- `.get:prefixPathname` — default `''`.
- `.get:queryRequiredFields` / `.get:bodyRequiredFields` / `.get:pathParameterRequiredFields` — default `[]`; declare which keys are required for `isValidAllParameterHash()`.
- `.collectBasedHeadersOptions()` / `.collectBasedFetchOptions()` — default `[]`; override points.
- `.get:asGetMethod` — **`@public`** static getter. Returns a *dynamically declared* subclass (cached per-class via `DynamicDerivedCtorPool`) whose `.method` is `'GET'`, generated through `RestMethodRestfulApiPayloadDerivedCtorRegistry`.
- `.get:asPostMethod` — **`@public`** static getter, same mechanism for `'POST'`.
- `#get:Ctor`.
- `#createFetchRequest({ baseUrl })` — **`@public`** instance method. Builds the request URL (`baseUrl` + interpolated pathname + sorted query string via `URLSearchParams`) and, for `POST`/`PUT`/`PATCH`, a `multipart/form-data` body built from `body`.
- `#isValidAllParameterHash()` / `#isInvalidAllParameterHash()` — instance methods; valid iff `query`, `body`, and `pathParameterHash` each satisfy their respective `*RequiredFields` list (every required key present).

### Class: `BaseRestfulApiCapsule`

Same shape as `BaseGraphqlCapsule`, adapted for HTTP status codes.

- `.create(...)`, `.createAsPending()`, `.createAsInvalidParametersError({ payload })`, `.createAsAbortedByHooks({ payload })`, `.createAsNetworkError({ payload })`, `.createAsResponseBodyParseError({ rawResponse, payload })` — static factories.
- `.get:unknownErrorCode` / `.get:invalidParameterHashErrorCode` / `.get:networkErrorCode` / `.get:responseBodyParseErrorCode` — static error-code getters.
- `#get:Ctor`, `#get:requestMethod` (from `payload.Ctor.method`, or `null` if pending), `#get:statusCode` / `#get:statusText` (from `rawResponse`, or `null`).
- `#hasInvalidParameterHashError()`, `#hasNetworkError()`, `#hasResponseBodyParseError()`, `#hasStatusCodeError()` (HTTP status `>= 400` and not `ok`), `#hasResultError()` (default `false`, override point) — instance predicates.
- `#hasError()` — OR of all five predicates above.
- `#getErrorMessage()` — **non-obvious precedence order**: pending → `null`; invalid-parameter-hash → `invalidParameterHashErrorCode`; network error → `networkErrorCode`; response-body-parse error → `responseBodyParseErrorCode`; status-code error → `` `193.X000.${statusCode}` `` (via `#generateErrorCodeByStatusError()`); result error → `#generateResultErrorCode()` (**abstract**, throws unless overridden); else `null`.

### Class: `BaseRenchanRestfulApiCapsule` (extends `BaseRestfulApiCapsule`)

Adds Renchan's `{ content, error }` response envelope convention on top of `BaseRestfulApiCapsule`.

- `#get:content` — `result?.content ?? null` (overrides base `content`, which doesn't exist on the base class — this is the Renchan-specific accessor).
- `#get:error` — `result?.error ?? null`.
- `#hasResultContent()` / `#hasResultError()` (override) — `Boolean(content)` / `Boolean(error)`.
- `#generateResultErrorCode()` (override) — `error?.code ?? Ctor.unknownErrorCode`.

### Class: `BaseRenchanRestfulApiLauncher` (extends `BaseRestfulApiLauncher`)

No additional members (`// noop`) — exists purely so consumers have a Renchan-specific base to subclass, keeping `instanceof` distinct from plain `BaseRestfulApiLauncher`.

### Class: `BaseRenchanRestfulApiPayload` (extends `BaseRestfulApiPayload`)

Adds bearer-token-style auth header injection sourced from `sessionStorage`.

- `.get:ACCESS_TOKEN_HEADER_KEY` — **abstract**, must be overridden (the HTTP header name to send the token under).
- `.get:ACCESS_TOKEN_STORAGE_KEY` — **abstract**, must be overridden (the `sessionStorage` key the token is read from).
- `.collectBasedHeadersOptions()` (override) — if `.loadAccessToken()` returns a value, appends `{ [ACCESS_TOKEN_HEADER_KEY]: accessToken }` to the base headers options; otherwise unchanged.
- `.loadAccessToken()` — static. Reads `ACCESS_TOKEN_STORAGE_KEY` via `StorageClerk.createAsSession().get(key)`.

### `RESTFUL_API_METHOD` (constant, named export)

`{ GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, TRACE, CONNECT }` — each key maps to its own uppercase string. Used as the `method:` argument to `RestMethodRestfulApiPayloadDerivedCtorRegistry` / referenced by `BaseRestfulApiPayload.asGetMethod`/`.asPostMethod`.

---

## Form Element Clerk (DOM / validation utilities)

### Class: `BaseFormElementClerk` (exported under "backward compatibility" in `index.js`, from `lib/domClerks/BaseFormElementClerk.js`)

The nested-fieldset-aware form clerk. Delegates value extraction to `FormElementInspector`.

- `.create({ formElement })` — static factory.
- `.get:rules` — default `[]`; **abstract-by-convention** (not enforced), override to return an array of `FieldValidator`-constructor argument objects (`{ field, ok, message }`).
- `#get:Ctor`, `#get:controlElements` (`[...formElement.elements]`).
- `#generateValidationHash()` — **`@public`** instance method. Builds a `ValueHashValidator` from `extractValueHash()` and `.rules`, returns its `.generateValidationHash()` (`{ valid, invalid, messages, message }`, each keyed by field name).
- `#isValid()` / `#isInvalid()` — instance methods derived from `generateValidationHash().valid`.
- `#extractValueHash()` — **`@public`** instance method. Delegates to `FormElementInspector#extractValueHash()` (see below) — supports nested `<fieldset name="...">` grouping (dot-joined names) and repeated/array-style controls (trailing `[]` names).
- `#createFormElementInspector()` — returns `FormElementInspector.create({ formElement: this.formElement })`.

### Class: `BaseLegacyFormElementClerk` (from `lib/domClerks/BaseLegacyFormElementClerk.js`, "DOM tools" group)

Simpler, flat-name form clerk kept for backward compatibility — reads controls directly by `formElement[name]` (does **not** support nested fieldset grouping or array-style repeated controls the way `BaseFormElementClerk`/`FormElementInspector` do).

- `.create({ formElement })` — static factory.
- `.get:rules` — default `[]`, same role as above.
- `#get:Ctor`, `#get:controlElements`.
- `#generateValidationHash()` — **`@public`** instance method, same shape as `BaseFormElementClerk`'s.
- `#isValid()` / `#isInvalid()`.
- `#extractValueHash()` — flat extraction: for each unique `name` attribute among the form's controls, reads `formElement[name]` directly and runs it through `FormControlElementInspector`.

### Class: `FormElementInspector`

The nested/grouped value-hash extractor used by `BaseFormElementClerk`.

- `.create({ formElement })` — static factory.
- `#get:Ctor`.
- `#extractValueHash()` — **`@public`** instance method. Walks the form's enabled `<input>`/`<select>`/`<textarea>` controls, resolves each one's containing `<fieldset>` chain to build a dot-joined path name (fieldset names become path segments), resolves repeated-sibling indexes for names ending in `[]`, groups `radio`/`checkbox` controls into their `RadioNodeList`, extracts each control's value via `FormControlElementInspector`, and assembles the whole thing into a nested object/array via `HashBuilder`. Disabled controls are excluded.
- `#extractEnabledElements()` / `#extractAllElements()` / `#extractControlElements()` / `#extractNames()` — internal helpers backing the above.

### Class: `FormControlElementInspector`

Extracts a single form control's typed value.

- `.create({ control })` — static factory. `control` is an `HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement | RadioNodeList`.
- `#extractFormControlValue()` — instance method. Type-dispatches: `<input type="file">` → `File` or `File[]` (if `multiple`) or `null`; `<input type="number">` → parsed float or `null` if `NaN`; other `<input>`/`<option>`/`<textarea>` → string value (`null` if disabled, for textarea/option); `<select multiple>` → array of selected, non-disabled option values; `<select>` → single value or `null`; `RadioNodeList` → checked-and-enabled radio value, checked-and-enabled checkbox values (array), or generic multi-value fallback.
- `#extractValueFromInputElement(...)`, `#extractValueFromFileTypeInputElement(...)`, `#extractValueFromNumberTypeInputElement(...)`, `#extractValueFromSelectElement(...)`, `#extractValueFromRadioNodes(...)`, `#extractValueFromRadioInputElements(...)`, `#extractValueFromCheckboxInputElements(...)`, `#extractValueFromMultipleInputElements(...)` — the type-specific helpers backing the dispatch above.

Also exported as **`FormControlElementClerk`** (backward-compatible alias, same class).

### Class: `HashBuilder`

Builds a nested object/array from `(dotted.path.name, value)` pairs; trailing `[]` on a path segment marks that segment as an array.

- `.create({ core = {} } = {})` — static factory.
- `#get:Ctor`.
- `#setValues({ values })` — reduces an array of `[name, value]` pairs through `#setValue()`.
- `#setValue({ name, value })` — splits `name` on `.`, creates intermediate object/array nodes as needed (`[]`-suffixed segments become arrays), and assigns `value` at the leaf. No-ops if `name` is falsy. Returns `this` for chaining.
- `#buildHash()` — **`@public`** instance method. Recursively resolves nested `HashBuilder` nodes into plain objects/arrays (stripping `[]` suffixes from keys) and returns the final hash.
- `#fulfillHash(...)`, `#extractValue(...)`, `#assignValueToCore(...)`, `#resolveChildHash(...)`, `#createChildHashBuilder(...)`, `#createHashBuilder(...)` — internal helpers backing the above.

### Class: `UploadingPropertyPathBuilder`

Finds `File`/`Blob` leaf values inside an arbitrarily nested object and records their dotted property paths — used to build the GraphQL multipart `map` field.

- `.create({ value })` — static factory; walks `value` via `.buildNodes()` into a flat list of `{ value, path }` nodes (a node is a "leaf" if it's not a plain object, or is `null`/`File`/`Blob`/`Date`).
- `.isNodeValue({ value })` — static predicate for the leaf test above.
- `#generateUploadingPathMap()` — returns `{ [index]: [path] }` for every `File`/`Blob` leaf node, keyed by its position among upload nodes (this is the GraphQL multipart `map` field shape).
- `#generateUploadingEntries()` — returns `[[String(index), fileOrBlob], ...]` — ready to `FormData.append(...)` pairs.
- `#extractUploadingNodes()` — filters `#nodes` down to `File`/`Blob` values.

### Class: `FieldValidator`

A single named validation rule.

- `.create(params)` — static factory; `params` is `{ field, ok, message = null }` where `ok(target, valueHash) => boolean`.
- `#accepts({ field })` / `#rejects({ field })` — does this validator apply to `field`?
- `#isValid({ target, variables })` — calls the stored `ok(target, variables)`. `#isInvalid(...)` — negation.
- `#getMessage()` — returns the stored message (or `null`).

### Class: `ValueHashValidator`

Runs an array of `FieldValidator` rules against a value hash.

- `.create({ valueHash, rules })` — static factory; builds one `FieldValidator` per rule via `FieldValidator.create(rule)`.
- `#isValid()` / `#isInvalid()` — true iff every field's every matching validator passes.
- `#generateValidationHash()` — **`@public`** instance method. Returns `{ valid, invalid, messages, message }`, each an object keyed by field name: `valid`/`invalid` are booleans; `messages` is the array of failing validators' messages (nulls filtered out); `message` is just the first one (or `null`).
- `#isValidField({ field })` / `#isInvalidField({ field })` / `#extractFieldNames()` / `#extractValidators({ field })` / `#getAllMessages({ field })` / `#getOneMessage({ field })` — the per-field helpers backing `generateValidationHash()`.

### Class: `DomInflator`

Parses an HTML string into live `Element`s via a `<template>`.

- `.create({ html })` — static factory.
- `.get:htmlDocument` — returns `window.document`; override point (e.g. for testing with a different document).
- `#get:Ctor`.
- `#inflateElements()` — instance method. Creates a `<template>`, sets its `innerHTML` to `this.html`, and returns `[...template.content.children]`.

---

## Storage Clerk

### Class: `StorageClerk`

Thin wrapper over the Web Storage API (`localStorage`/`sessionStorage`).

- `.create({ storage })` — static factory (`storage` is any `Storage`-like object).
- `.createAsLocal()` — static, `storage: window.localStorage`.
- `.createAsSession()` — static, `storage: window.sessionStorage`.
- `#get(key)` — returns `storage.getItem(key)`.
- `#set(key, value)` — calls `storage.setItem(key, value)`; returns `this` for chaining.
- `#remove(key)` — calls `storage.removeItem(key)`; returns `this`.
- `#clearAll()` — calls `storage.clear()`; returns `this`.

---

## IndexedDB

A small abstract-class kit: subclass `BaseDatabase` (schema/version) and `BaseDatabaseMigration` (per-store schema definitions), and subclass `BaseStore` per object store for CRUD.

### Class: `IndexedDbClient`

Thin wrapper over a raw `IDBDatabase` connection.

- `.create({ db })` — static factory (synchronous, wraps an already-open `IDBDatabase | null`).
- `.createAsync({ config: { dbName, dbVersion }, callbacks: { onUpgradeNeeded, onSuccess, onError } })` — static (async) factory. Opens/upgrades the database via `indexedDB.open()`; `onUpgradeNeeded` receives `{ dbClient, newVersion, oldVersion }` (a **new** `IndexedDbClient` wrapping the in-progress connection) and should perform schema creation there; on `onerror`, resolves the instance with `db: null` rather than rejecting.
- `.get:indexedDbHandler` — returns the global `indexedDB`.
- `#get:Ctor`.
- `#createObjectStore({ storeName, primaryKeyPath = null, storeOptions = {} })` — calls `db.createObjectStore(storeName, { ...storeOptions, keyPath: primaryKeyPath })`. Only valid inside an `onupgradeneeded` handler.
- `#beginTransaction({ storeNames, transactionMode = 'readwrite', transactionOptions = {} })` — calls `db.transaction(...)`.
- `#takeStore({ storeName })` — begins a single-store transaction and returns its `objectStore(storeName)`.

### Class: `BaseDatabase`

- `.create({ dbClient })` — static factory.
- `.createAsync()` — static (async) factory. Calls `.createDbClient()` (which calls `IndexedDbClientCtor.createAsync()` with `.config` and `.generateCallbacks()`), then `.create({ dbClient })`.
- `.get:IndexedDbClientCtor` — defaults to `IndexedDbClient`.
- `.get:dbName` — **abstract**, must be overridden.
- `.get:dbVersion` — default `1`.
- `.get:MigrationCtor` — **abstract**, must be overridden (a `BaseDatabaseMigration` subclass).
- `.get:config` — `{ dbName, dbVersion }`.
- `.generateCallbacks()` — `{ onSuccess, onError, onUpgradeNeeded }`, built from the three `.define*` static methods below.
- `.defineOnUpgradeNeeded()` — returns a handler that constructs `MigrationCtor.create({ dbClient })` and calls `migration.migrate({ newVersion, oldVersion })`. This is where schema creation actually happens.
- `.defineOnSuccess()` / `.defineOnError()` — default handlers that just `console.log`/`console.error`; override to customize.
- `#get:Ctor`.

### Class: `BaseDatabaseMigration`

- `.create({ dbClient })` — static factory.
- `#migrate({ oldVersion, newVersion })` — **`@public`** instance method (async). Calls the **abstract** `#generateObjectStoreArgs()` (throws unless overridden) to get an array of store/index definitions, creates them via `#createObjectStores(...)`, and throws `Error('Failed to create object stores')` if `#validatesCreatedStores()` fails. **Note:** the method does not yet branch on `oldVersion`/`newVersion` to perform incremental migrations — the source has a `TODO` acknowledging this; every call currently just (re-)declares the full schema.
- `#generateObjectStoreArgs()` — **abstract**, must be overridden. Returns `Array<{ storeName, primaryKeyPath, storeOptions?, indexArgs: Array<{ indexName, indexKeyPath, indexOptions? }> }>`.
- `#createObjectStores(...createArgs)` — creates each store (via `dbClient.createObjectStore`) and its indexes; returns `Array<{ store, indexes }>`.
- `#validatesCreatedStores({ createResults })` — `true` iff every result's `store` is an `IDBObjectStore` and every index is an `IDBIndex`.

### Class: `BaseStore`

Per-object-store CRUD helper. A concrete subclass must override `.storeName`.

- `.create({ dbClient })` — static factory.
- `.get:storeName` — **abstract**, must be overridden.
- `#get:Ctor`, `#get:objectStore` — `dbClient.takeStore({ storeName: Ctor.storeName })` (a fresh transaction+store per access).
- `#findAll({ query = null, count } = {})` — instance method (async). Wraps `objectStore.getAll(query, count)` in a `Promise`.
- `#findByKey({ key })` — instance method (async). Wraps `objectStore.get(key)`.
- `#findByIndex({ indexName, value, direction = 'prev', limit = Infinity })` — instance method (async). Opens a cursor on the named index (via `#normalizeIndexQuery()`, which turns a plain `value` into an `IDBKeyRange` via `#createKeyRange()` unless it's already a range or `null`), accumulates up to `limit` matching records, and resolves the array.
- `#createKeyRange({ keyPath, value })` — returns `IDBKeyRange.bound([value, ''], [value, '￿'])` — a prefix-style range.
- `#save({ value, key })` — instance method (async). Wraps `objectStore.put(value, key)`; resolves `null` instead of rejecting on error.
- `#bulkSave({ values })` — instance method (async). Runs `objectStore.put(...)` for every `{ value, key }` entry in parallel via `Promise.all`.

---

## Supporting / internal tooling (exported, but no `@public` tags — used mainly by the classes above)

- **`ProgressHttpFetcher`** — `.create({ httpRequest = new XMLHttpRequest() } = {})`; `#fetchRequest({ request, sink: { onUploadProgress, onDownloadProgress } })` performs the given `fetch` `Request` over `XMLHttpRequest` instead of `fetch()` so upload/download `progress` events can be observed, and resolves a standard `Response`. Used internally by both `BaseGraphqlLauncher` and `BaseRestfulApiLauncher`.
- **`HeadersParser`** — `.create({ haystack })`; `#createHeaders()` parses a raw `XMLHttpRequest.getAllResponseHeaders()` string into a `Headers` instance. Used by `ProgressHttpFetcher#createResponse()`.
- **`PathnameBuilder`** — `.create({ templatePathname })`; `#buildPathname({ valueHash })` replaces `[key]` placeholders in the template with `valueHash[key]`. Used by `BaseRestfulApiPayload#buildPathname()`.
- **`BaseResponseBodyParser`** (abstract) / **`JsonResponseBodyParser`** (concrete, `.parseBody()` → `response.json()`) — pluggable response-body parsing strategy, set via `BaseRestfulApiLauncher.get:ResponseBodyParser` (defaults to `JsonResponseBodyParser`).
- **`AnonymousClassNameAssigner`** / **`DerivedClassNameGenerator`** / **`DynamicDerivedCtorPool`** / **`BaseDerivedCtorRegistry`** / **`RestMethodRestfulApiPayloadDerivedCtorRegistry`** — the machinery behind `BaseRestfulApiPayload.asGetMethod`/`.asPostMethod`: it dynamically declares (and caches, so repeated access returns the same class) a subclass whose `.method` getter is fixed to the given HTTP method. Not expected to be used directly by application code.

## Usage

GraphQL request:

```js
import {
  BaseGraphqlLauncher,
  BaseGraphqlPayload,
  BaseGraphqlCapsule,
} from '@openreachtech/furo'

class SignInPayload extends BaseGraphqlPayload {
  static get document () {
    return `
      mutation SignIn ($input: SignInInput!) {
        signIn (input: $input) { token }
      }
    `
  }

  static get fieldHash () {
    return {
      input: ['email', 'password'],
    }
  }
}

class SignInCapsule extends BaseGraphqlCapsule {
  // inherits content / errors / hasError() / getErrorMessage() as-is
}

class SignInLauncher extends BaseGraphqlLauncher {
  static get graphqlConfig () {
    return {
      ENDPOINT_URL: 'https://api.example.com/graphql',
    }
  }

  static get Payload () {
    return SignInPayload
  }

  static get Capsule () {
    return SignInCapsule
  }
}

const launcher = SignInLauncher.create()
const payload = SignInLauncher.createPayloadWithValueHash({
  valueHash: {
    email: 'user@example.com',
    password: 'secret',
  },
})

const capsule = await launcher.launchRequest({
  payload,
})

if (capsule.hasError()) {
  console.error(capsule.getErrorMessage())
} else {
  console.log(capsule.content) // { signIn: { token: '...' } }
}
```

Form value extraction + validation, then storing a token:

```js
import {
  BaseFormElementClerk,
  StorageClerk,
} from '@openreachtech/furo'

class SignInFormClerk extends BaseFormElementClerk {
  static get rules () {
    return [
      {
        field: 'email',
        ok: value => Boolean(value),
        message: 'Email is required.',
      },
    ]
  }
}

const clerk = SignInFormClerk.create({
  formElement: document.querySelector('form#sign-in'),
})

if (clerk.isValid()) {
  const valueHash = clerk.extractValueHash() // nested per <fieldset>/[] naming

  StorageClerk.createAsSession()
    .set('accessToken', 'issued-token-value')
}
```
