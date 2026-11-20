# API

Source: `lib/**/*.js` (JSDoc) of `@openreachtech/furo` 2.0.0. `package.json` has no `"types"` field, so everything below is extracted from the JSDoc in `lib/`. A `types/*.d.ts` directory ships in the package but is not wired up as the type entry point, so it is not used as the contract.

This package is a front-end toolkit for ES modules (`"type": "module"`): a GraphQL client (HTTP and WebSocket subscription), a RESTful API client, an HTTP fetcher layer, `<form>` element inspection and validation, an IndexedDB wrapper, and small utilities. Most classes are abstract bases named `Base*`. You subclass them and override the abstract static getters.

## Notation

- `.name()` is a static method, `.get:name` a static getter, `#name()` an instance method, `#get:name` an instance getter, and `#name` an instance property. Entries sit under their class heading, so the class name is not repeated. Getters are read as properties, without call parentheses.
- `abstract` marks a member a subclass must override (the base throws `Error` otherwise). `@public` marks a member the source tags as the main entry point. JavaScript private fields (declared with `#` in the source) are not listed, and neither are internal step methods that no subclass is expected to call or override.
- `BooleanLike` means any value, read as truthy or falsy.
- `{ a, b? }` is a destructured params object, and `b?` is optional.

## Conventions shared by (almost) every class

- Each class has a constructor that takes one destructured params object. Always build instances with the static factory `.create(params)`, which returns an instance of the class it is called on (`this`), so a subclass gets a subclass instance.
- Each class has `#get:Ctor`, a getter that returns the constructor of the instance's own class. Code calls `this.Ctor.staticMember` to reach static members through subclasses.
- Dependencies are exposed as static getters (for example `HttpFetcherCtor`, `AbortControllerCtor`) so tests and subclasses can swap them.

## Exports (`index.js`)

All 51 exports are named re-exports of each module's `default` export, except `RESTFUL_API_METHOD`, which is a named constant. `FormControlElementClerk` is the same class as `FormControlElementInspector` under an older name.

- **GraphQL client**: `BaseGraphqlCapsule`, `BaseGraphqlLauncher`, `BaseGraphqlPayload`, `BaseGraphqlSubscriber`, `BaseSubscriptionGraphqlPayload`, `BaseSubscriptionGraphqlCapsule`, `SubscriptionConnector`
- **Client tools**: `BaseHttpFetcher`, `FetchHttpFetcher`, `XMLHttpFetcher`, `XMLHttpRequestClerk`, `AbortTimer`, `ResponseTextConverter`, `CharsetResolver`, `BaseHttpParcel`, `FetchHttpParcel`, `XMLHttpParcel`, `HeadersParser`, `PathnameBuilder`, `BaseRequestBodyConverter`, `FormDataRequestBodyConverter`, `JsonRequestBodyConverter`, `BaseResponseBodyParser`, `JsonResponseBodyParser`
- **RESTful API client**: `BaseRestfulApiCapsule`, `BaseRestfulApiLauncher`, `BaseRestfulApiPayload`, `BaseRenchanRestfulApiCapsule`, `BaseRenchanRestfulApiLauncher`, `BaseRenchanRestfulApiPayload`, `RESTFUL_API_METHOD`
- **DOM tools**: `FormElementInspector`, `FormControlElementInspector`, `HashBuilder`, `UploadingPropertyPathBuilder`, `BaseLegacyFormElementClerk`, `FieldValidator`, `ValueHashValidator`, `DomInflator`
- **Backward compatibility**: `BaseFormElementClerk`, `FormControlElementClerk`
- **Dynamic class declaration tools**: `AnonymousClassNameAssigner`, `DerivedClassNameGenerator`, `DynamicDerivedCtorPool`, `BaseDerivedCtorRegistry`, `RestMethodRestfulApiPayloadDerivedCtorRegistry`
- **Local storage**: `StorageClerk`
- **IndexedDB**: `IndexedDbClient`, `BaseDatabase`, `BaseDatabaseMigration`, `BaseStore`

## How the pieces fit

- A GraphQL or REST call uses three subclasses: a Launcher (sends), a Payload (describes the request), and a Capsule (wraps the result). The launcher's abstract `Payload` and `Capsule` getters point at your subclasses. Call `#launchRequest({ payload, hooks })`. It always resolves with a capsule and never rejects. Failures show up as capsule predicates such as `hasNetworkError()`.
- The launcher sends through an HTTP fetcher (`XMLHttpFetcher` by default, `FetchHttpFetcher` as an alternative). The fetcher resolves an HTTP parcel (`BaseHttpParcel`), which carries the response or the failure and is read with `toJson()`, `toText()`, and similar methods.

---

## GraphQL client

### `BaseGraphqlLauncher`

Sends one GraphQL request. Subclass and override `graphqlConfig`, `Payload`, `Capsule`.

- `.create({ config? })`: factory. `config` is `{ [key: string]: string }` and defaults to `this.graphqlConfig`. Constructor params: `{ config }`.
- `.get:graphqlConfig`: abstract. Returns `{ [key: string]: string }`. Expects an endpoint under `ENDPOINT_URL` (read by `endpointUrl`).
- `.get:Payload`: abstract. Returns the payload class.
- `.get:Capsule`: abstract. Returns the capsule class.
- `.get:Launcher`: returns `this`.
- `.get:fetch`: returns the global `fetch`.
- `.get:HttpFetcherCtor`: returns `XMLHttpFetcher`. Override to use another fetcher class.
- `.createHttpFetcher({ request, config })`: returns an HTTP fetcher built with `.create`.
- `.createPayload({ variables?, options? } = {})`, `.createPayloadWithValueHash({ valueHash, options? })`, `.createPayloadWithFormValueHash({ valueHash, extraValueHash?, options? })`: wrappers that build a payload through `this.Payload`.
- `.createCapsule(params)`, `.createCapsuleAsPending()`, `.createCapsuleAsInvalidVariablesError({ payload })`, `.createCapsuleAsAbortedByHooks({ payload })`, `.createCapsuleAsNetworkError({ responseParcel, payload })`, `.createCapsuleAsJsonParseError({ responseParcel, payload })`: wrappers that build a capsule through `this.Capsule`.
- `#get:endpointUrl`: returns `RequestInfo | URL` (from `config.ENDPOINT_URL`).
- `#launchRequest({ payload, hooks? })` (`@public`, async): returns `Promise<Capsule>`. `hooks` is `{ beforeRequest?, afterRequest?, onUploadProgress?, onDownloadProgress? }`.
  - `beforeRequest: (payload) => Promise<boolean>`. Resolving `true` aborts the request, and the result is an aborted-by-hooks capsule.
  - `afterRequest: (capsule) => Promise<void>`, called with the final capsule.
  - `onUploadProgress` and `onDownloadProgress: ({ request, progressEvent }) => void`.
  - Order: if the payload's `#isInvalidVariables()` is true it returns an invalid-variables capsule without calling any hook. Then it calls `beforeRequest`. Then it fetches, builds the capsule, calls `afterRequest`, and returns the capsule.
- `#extendRequestHooks(hooks)`, `#extendBeforeRequestHook({ beforeRequest })`, `#extendAfterRequestHook({ afterRequest })`, `#extendOnUploadProgressHook({ onUploadProgress })`, `#extendOnDownloadProgressHook({ onDownloadProgress })`: override points that receive each hook and return the hook to use. Override them to wrap hooks for every request (for example to add shared behavior).
- `#invokeFetchQuery({ payload, sink? })`: async. Returns the HTTP parcel of the request.
- `#retrieveCapsule({ payload, httpParcel })`: async. Turns a parcel into a capsule.
- `#generateFetchResult({ httpParcel })`: async. Returns the parsed JSON body or `null`.

### `BaseGraphqlPayload`

Describes one GraphQL request. Subclass and override `document`. Generic over the variables type.

- `.create({ variables?, options? } = {})`: factory. `variables` defaults to `{}`. `options` is `RequestInit` and defaults to `{}`. The constructor reads `{ queryTemplate, variables, options }`.
- `.createWithValueHash({ valueHash, options? })`: builds variables with `generateVariables({ valueHash })`, then calls `create`.
- `.createWithFormValueHash({ valueHash, extraValueHash?, options? })`: merges the form value hash with the extra hash through `buildFormBasedValueHash`, then calls `createWithValueHash`.
- `.generateVariables({ valueHash })`: returns the variables object. Override to change the variables shape.
- `.buildFormBasedValueHash({ valueHash, extraValueHash })` and `.normalizeFormBasedValueHash({ valueHash })`: helpers for the form-based factory.
- `.get:timeoutMilliseconds`: number of milliseconds to wait for the response. `0` is the default.
- `.get:document`: abstract. Returns the GraphQL document string.
- `.get:fieldHash`: returns `Record<string, Array<string>>` (variables root name to its required field names). Default is empty. Used by `isValidVariables()`.
- `.collectBasedHeadersOptions()`: returns `Array<Record<string, string>>` of default headers. Override to add headers.
- `.collectBasedFetchOptions()`: returns `Array<RequestInit>` of default fetch options. Override to add options.
- `#get:timeoutMilliseconds`: milliseconds to wait for the response.
- `#createFetchRequest({ url })` (`@public`): returns a `Request`. The request is a `POST` with a `FormData` body (the operations are sent as multipart form data and `File` or `Blob` values in the variables are sent as separate parts).
- `#createMergedHeaders()`, `#generateMergedFetchOptionHash()`, `#buildFormDataBody()`, `#createFormDataInstance()`, `#createUploadingPropertyPathBuilder({ value })`: request-building steps.
- `#extractFilteredVariables()`: marked abstract in the JSDoc. Returns the variables to send, typed as the variables type.
- `#isValidVariables()` and `#isInvalidVariables()`: return `boolean`. Valid means every field listed in `fieldHash` is present under its variables root name (extra fields are allowed).

### `BaseGraphqlCapsule`

Wraps the outcome of one request. Generic over the content type `D`.

- `.create({ responseParcel, payload, result, abortedReason? })`: factory. `result` is `{ data?, errors? } | null`.
- `.createAsPending()`, `.createAsInvalidVariablesError({ payload })`, `.createAsAbortedByHooks({ payload })`, `.createAsNetworkError({ responseParcel, payload })`, `.createAsJsonParseError({ responseParcel, payload })`: factories for each outcome.
- Static error code getters, each returns a `string`:
  - `.get:unknownErrorCode` is `'190.X000.001'`.
  - `.get:invalidVariablesErrorCode` is `'191.X000.001'`.
  - `.get:networkErrorCode` is `'192.X000.001'`.
  - `.get:jsonParseErrorCode` is `'192.X000.002'`.
  - `.get:timeoutErrorCode` is `'192.X000.003'`.
  - `.get:abortErrorCode` is `'192.X000.004'`.
- Instance properties: `#responseParcel`, `#payload`, `#result`, `#abortedReason`.
- `#get:content`: `result.data` or `null`. `#get:errors`: `Array<{ message, ... }>` from `result.errors`.
- `#hasContent()`: `boolean`.
- `#isPending()`, `#hasInvalidVariablesError()`, `#hasAbortError()`, `#hasTimeoutError()`, `#hasNetworkError()` (any fetcher failure other than abort and timeout), `#hasJsonParseError()`, `#hasQueryError()`, `#hasError()`: return `BooleanLike`.
- `#getErrorMessage()`: returns `string | null`. Checked in this order: pending gives `null`, then the invalid-variables, abort, timeout, network, and JSON-parse error codes, then `null` when there is no query error, otherwise the first GraphQL error's `message` (or `unknownErrorCode`).
- `#extractErrors()`: returns the `errors` array. `#extractContent()`: returns the content (`D | null`).

### `BaseGraphqlSubscriber`

WebSocket subscription counterpart of the launcher. Subclass and override `Subscriber`, `Payload`, `Capsule`.

- `.create({ connector })`: factory. `connector` is a `SubscriptionConnector`.
- `.get:Subscriber`: abstract. Returns the subscriber class. `.get:Payload`: abstract, returns the subscription payload class. `.get:Capsule`: abstract, returns the subscription capsule class.
- `.createPayload(params)`, `.createPayloadWithValueHash({ valueHash, operationName?, extensions?, context? })`: wrappers through `this.Payload`.
- `.createCapsule(params)`, `.createCapsuleAsPending()`, `.createCapsuleAsInvalidVariablesError({ payload })`, `.createCapsuleAsAbortedByHooks({ payload })`, `.createCapsuleAsNetworkError({ payload })`: wrappers through `this.Capsule`.
- Instance properties: `#unconnectHandler`, `#resubscribeAttemptCount`.
- `#subscribe({ payload, hooks })` (`@public`): returns `void`. `hooks` is `{ onPublish, onDisconnected?, onTerminate? }`.
  - `onPublish: (capsule) => void`, called for each message.
  - `onDisconnected: ({ payload, error }) => void`.
  - `onTerminate: ({ payload }) => void`.
- `#unsubscribe()` (`@public`): returns `void`.
- `#buildSubscriptionHooks({ payload, hooks })`: returns the sink handed to the connector.
- `#resubscribeAfterDelay({ handler, delayMilliseconds? })` and `#calculateResubscribeDelayMilliseconds()`: reconnect scheduling. The second returns a `number`.
- `#addConnectorLifecycleListener({ eventName, handler, options? })` and `#removeConnectorLifecycleListener({ eventName, handler, options? })`: return the subscriber for chaining. The JSDoc marks them abstract.

### `BaseSubscriptionGraphqlPayload`

Describes one subscription. Subclass and override `document`.

- `.create({ variables?, operationName?, extensions?, context? } = {})`: factory. `context` is `{ headers?: HeadersInit, [key]: unknown }`.
- `.createWithValueHash({ valueHash, operationName?, extensions?, context? })`: builds variables through `generateVariables({ valueHash })`, then calls `create`.
- `.generateVariables({ valueHash })`.
- `.get:document`: abstract. `.get:fieldHash`: `Record<string, Array<string>>`.
- `.collectBasedSubscriptionPayloadOptions()`, `.collectBasedSubscriptionContextOptions()`: return `Array<Record<string, unknown>>`. `.collectBasedHeadersOptions()`: returns `Array<Record<string, string>>`. All are override points.
- `#buildSubscriptionPayload()` (`@public`): returns `{ query, variables, operationName, extensions, context }`, the object passed to the WebSocket client.
- `#buildSubscriptionPayloadOptions()`, `#buildSubscriptionContext()`, `#createMergedHeaders()`, `#extractFilteredVariables()`.
- `#isValidVariables()` and `#isInvalidVariables()`: same rule as `BaseGraphqlPayload`.

### `BaseSubscriptionGraphqlCapsule`

Result of one subscription message. Shape follows `BaseGraphqlCapsule` without the response parcel and without abort, timeout, and JSON-parse errors.

- `.create({ payload, result, abortedReason? })`, `.createAsPending()`, `.createAsInvalidVariablesError({ payload })`, `.createAsAbortedByHooks({ payload })`, `.createAsNetworkError({ payload })`.
- Static error codes: `.get:unknownErrorCode` (`'190.X000.001'`), `.get:invalidVariablesErrorCode` (`'191.X000.001'`), `.get:networkErrorCode` (`'192.X000.001'`).
- Instance properties: `#payload`, `#result`, `#abortedReason`.
- `#get:content`, `#get:errors`, `#hasContent()`, `#isPending()`, `#hasInvalidVariablesError()`, `#hasNetworkError()`, `#hasQueryError()`, `#hasError()`, `#getErrorMessage()`, `#extractErrors()`, `#extractContent()`: same meaning as in `BaseGraphqlCapsule`.

### `SubscriptionConnector`

Wraps a WebSocket client and re-emits its lifecycle events on an `EventTarget`.

- `.create({ config })`: factory. `config` is `{ [key: string]: string }`. Constructor params: `{ websocketClient, eventTarget }`.
- `.createEventTarget()`, `.createWebSocketClient({ url, eventTarget })`, `.generateWebSocketSink({ eventTarget })`, `.createCustomEvent({ eventName, detail })`: helpers used by `create`.
- `.get:graphqlWsCore`: returns `{ createClient }` (override point to swap the WebSocket library).
- `#subscribe({ webSocketPayload, sink? })`: returns an unsubscribe function `() => void`.
- `#unsubscribe()` (`@public`): returns `void`.
- `#addLifecycleListener({ eventName, handler, options? })` and `#removeLifecycleListener({ eventName, handler, options? })`: return the connector for chaining.

---

## Client tools (HTTP layer)

### `BaseHttpFetcher`

Abstract. Sends a request and resolves an HTTP parcel. Subclasses: `FetchHttpFetcher`, `XMLHttpFetcher`.

- `.create({ request, config })` (`@public`): factory. `request` is a `Request`. `config` is `{ timeoutMilliseconds? }` or the subclass's config type.
- `.get:HttpParcelCtor`: abstract. Returns the parcel class.
- `.get:AbortTimerCtor`: returns `AbortTimer`.
- `.createHttpParcel({ request, config, response, responseUrl })`.
- `#get:timeoutMilliseconds`: `0` means no limit.
- `#fetchResponse({ sink? })` (`@public`, async): returns `Promise<parcel>`. It never rejects. A failure is a parcel that reports the cause. `sink` is `{ onUploadProgress, onDownloadProgress }` where each is `({ request, progressEvent }) => void` (all members optional).
- Subclass hooks: `#receiveResponse({ sink?, signal })` (abstract, returns `Promise<Response>`), `#resolveResponseUrl({ response })` (abstract, returns `string`), `#receiveHttpParcel({ sink?, signal })`, `#createHttpParcelByUnnamedFailure({ error })`.
- Parcel factories: `#createHttpParcelByResponse({ response })`, `#createHttpParcelByFailure({ error })`, `#createHttpParcelAsNetworkError()`, `#createHttpParcelAsTimeoutError()`, `#createHttpParcelAsAbortError()`, `#createHttpParcelAsError()`.
- Other steps: `#fetchResponseUnderTimer({ sink? })`, `#resolveFailure({ error, signal })`, `#createAbortTimer()`.

### `FetchHttpFetcher`

Extends `BaseHttpFetcher`. Sends with `fetch()`. `fetch()` reports no progress, so the sink is never called.

- Config: `{ timeoutMilliseconds?, optionHash? }`, where `optionHash` is `RequestInit` without `signal`.
- `.get:HttpParcelCtor`: returns `FetchHttpParcel`.
- `.get:fetch`: returns `(request, optionHash) => Promise<Response>`.
- `#buildOptionHash({ signal })`, `#invokeFetch({ request, optionHash })`, plus the overrides `#receiveResponse`, `#receiveHttpParcel`, `#resolveResponseUrl`, `#createHttpParcelByUnnamedFailure`.

### `XMLHttpFetcher`

Extends `BaseHttpFetcher`. Sends with `XMLHttpRequest` and supports upload and download progress. An instance is disposable: it fetches once, so a repeated request needs a new instance.

- `.create({ request, config, requestClerk? })` (`@public`): factory. `config` is `{ timeoutMilliseconds? }`.
- `.get:XMLHttpRequestClerkCtor` and `.get:HeadersParserCtor`: dependency getters. `.get:HttpParcelCtor` returns `XMLHttpParcel`.
- `.createXMLHttpRequestClerk()`, `.createHeadersParser({ haystack })`.
- `.createRequestBody({ request })`: async. Returns `Promise<Blob | null>`.
- `.isBodyRequiredMethod({ request })` and `.isNullBodyStatus({ status })`: return `BooleanLike`.
- `#setupRequestClerk()`, `#shouldSendCredentials()`, `#buildClerkSink({ sink?, signal, resolve, reject })`, `#createResponse()`, `#extractResponseBody()`, `#invokeSend({ requestBody })`, plus the overrides `#receiveResponse` and `#resolveResponseUrl`.

### `XMLHttpRequestClerk`

Keeps every operation on an `XMLHttpRequest` in one class. Mutating methods return the clerk, so they chain.

- `.create({ xmlHttpRequest? } = {})` (`@public`): factory.
- `.get:XMLHttpRequestCtor`, `.get:requestSinkEventNameLookup`, `.get:uploadSinkEventNameLookup`, `.createXMLHttpRequest()`.
- `#get:status`, `#get:statusText`, `#get:response`, `#get:responseUrl`, `#extractAllResponseHeadersText()`.
- Chainable (all `@public`): `#openRequest({ method, url })`, `#setResponseType({ responseType })`, `#setTimeoutMilliseconds({ timeoutMilliseconds })`, `#setWithCredentials({ withCredentials })`, `#setRequestHeaders({ headers })` (a `Headers`), `#addEventListener({ eventName, listener })`, `#addUploadEventListener({ eventName, listener })`, `#addSink({ sink })`, `#sendRequest({ requestBody })` (`Blob | null`), `#abortRequest()`.
- Also `#addRequestSink({ sink })` and `#addUploadSink({ sink })`. A sink is `Record<string, (event) => void>`.

### `AbortTimer`

Cancellable timer that aborts a request after a timeout. An instance is disposable and starts counting when created.

- `.create({ requestSignal, timeoutMilliseconds })` (`@public`): factory. Returns a timer that has started counting.
- `.get:MAX_DELAY_MILLISECONDS`, `.get:AbortControllerCtor`, `.get:AbortSignalCtor`, `.get:DOMExceptionCtor`, `.get:setTimeout`, `.get:clearTimeout`: dependency getters.
- `.createAbortController()`, `.createSignal({ requestSignal, controller })`, `.createTimeoutReason()` (a `DOMException` named `TimeoutError`), `.startTimer({ controller, timeoutMilliseconds })`, `.resolveDelayMilliseconds({ timeoutMilliseconds })`.
- `#clear()` (`@public`): stops the timer. Returns `void`. Constructor params: `{ signal, timerId }`.

### `ResponseTextConverter`

Decodes a response body into text with the response's charset, falling back to the default charset.

- `.create({ responseParcel })` (`@public`): factory.
- `.get:DEFAULT_CHARSET`, `.get:CharsetResolverCtor`, `.get:TextDecoderCtor`, `.createCharsetResolver({ headerHash })`, `.createTextDecoder({ charset })`.
- `#toText()` (`@public`, async): returns `Promise<string | null>`. `null` when no response was received.
- `#resolveCharset()`: returns `string`.

### `CharsetResolver`

Resolves the charset declared by the `Content-Type` header.

- `.create({ headerHash })` (`@public`): factory. `headerHash` is `Record<string, string> | null`.
- `.get:DEFAULT_CHARSET`: the fallback charset label.
- `#resolveCharset()` (`@public`): returns `string`. `#extractDeclaredCharset({ contentType })`: returns `string | null`.

### `BaseHttpParcel`

Carries a request, its config, and either the response or the failure that prevented a response. `FetchHttpParcel` and `XMLHttpParcel` extend it.

- `.create({ request, config, response?, responseUrl?, fetcherError? })` (`@public`): factory. `fetcherError` is one of the `HTTP_FETCHER_ERROR` symbols or `null`.
- `.createAsError({ request, config, fetcherError? })`, `.createAsNetworkError({ request, config })`, `.createAsTimeoutError({ request, config })`, `.createAsAbortError({ request, config })` (all `@public`): factories for a parcel without a response.
- `.get:HTTP_FETCHER_ERROR`: `{ NETWORK, TIMEOUT, ABORT, UNKNOWN }`, each a `Symbol`.
- `.get:ResponseTextConverterCtor`, `.createResponseTextConverter({ responseParcel })`.
- Instance properties: `#request`, `#config`, `#response`, `#responseUrl`, `#fetcherError`.
- `#get:requestUrl` (`string`), `#get:status` (`number | null`), `#get:statusText` (`string | null`), `#get:ok` (`BooleanLike`, true for 200 to 299).
- `#extractHeaderHash()` (`@public`): `Record<string, string> | null` with lower-case names.
- Error predicates (all `@public`, return `BooleanLike`): `#hasError()`, `#hasNetworkError()`, `#hasTimeoutError()`, `#hasAbortError()`, `#hasUnknownError()`.
- Body readers (all `@public`, async, read a clone so the parcel can be read again): `#toJson()` (parsed JSON or `null`), `#toText()` (`string | null`), `#toArrayBuffer()` (`ArrayBuffer | null`), `#toBlob()` (`Blob | null`). They give `null` when no response was received.
- `#cloneResponse()` (`@public`): `Response | null`. `#parseJson({ text })`.
- `#isRedirected()` and `#extractResponseType()` (`@public`): abstract in the base. Return `BooleanLike` and `ResponseType | null`.

### `FetchHttpParcel`

Extends `BaseHttpParcel`.

- `#awaitBody()` (`@public`, async): resolves when the whole body has arrived.
- `#isRedirected()` and `#extractResponseType()` (`@public`): implemented.

### `XMLHttpParcel`

Extends `BaseHttpParcel`. Redirect and type are derived from the response URL.

- `#isRedirected()` and `#extractResponseType()` (`@public`): implemented. The type is `basic` for the page's origin and `cors` otherwise.

### `HeadersParser`

- `.create({ haystack })`: factory. `haystack` is the raw headers text.
- `#parseHeaderEntries()`: returns `Array<[string, string]>`. `#createHeaders()`: returns `Headers`.

### `PathnameBuilder`

- `.create({ templatePathname })`: factory, for example a template with `:id`.
- `#buildPathname({ valueHash })`: returns the interpolated pathname as a `string`.

### `BaseRequestBodyConverter`

Abstract. Converts a request body object into what `Request` sends.

- `.create({ body, headerEntries? })` (`@public`): factory.
- `.collectHeaderEntries()`: abstract. Returns `Array<[string, string]>`.
- `#convertBody()` (`@public`): abstract. Returns the converted body.

### `FormDataRequestBodyConverter`

Extends `BaseRequestBodyConverter`. Converts to `FormData`. An array value becomes one part per element under the same key.

- `.createFormDataInstance()`, `.collectHeaderEntries()` (returns none, the `Request` sets the multipart header).
- `#convertBody()`: returns `FormData`. `#appendBodyTo({ formDataHub })`: returns the given `FormData`.

### `JsonRequestBodyConverter`

Extends `BaseRequestBodyConverter`. Converts to JSON text.

- `.collectHeaderEntries()`: returns the JSON content type entry.
- `#convertBody()`: returns the JSON `string`.

### `BaseResponseBodyParser`

Abstract. Parses a parcel's response body.

- `.create({ responseParcel })`: factory.
- `#parseBody()`: abstract, async. Returns `Promise<object | null>`.

### `JsonResponseBodyParser`

Extends `BaseResponseBodyParser`. `#parseBody()` returns the parsed JSON object, or `null` if the body is not JSON.

---

## RESTful API client

Same Launcher, Payload, Capsule structure as the GraphQL client, with query, body, and path parameters in place of GraphQL variables.

### `BaseRestfulApiLauncher`

Subclass and override `restfulApiConfig`, `Payload`, `Capsule`.

- `.create({ config? })`: factory. `config` is `{ [key: string]: string }` and defaults to `this.restfulApiConfig`.
- `.get:restfulApiConfig`: abstract. Expects a base URL under `BASE_URL` (read by `baseUrl`).
- `.get:Payload` and `.get:Capsule`: abstract. `.get:Launcher`: returns `this`.
- `.get:ResponseBodyParser`: returns the response body parser class, `JsonResponseBodyParser` by default. Override to parse another format.
- `.get:fetch`, `.get:HttpFetcherCtor` (`XMLHttpFetcher`), `.createHttpFetcher({ request, config })`.
- `.createPayload({ query?, body?, pathParameterHash?, options? } = {})`, `.createPayloadWithFormValueHash({ valueHash, extraValueHash?, options? })`.
- `.createCapsule({ responseParcel, payload, result, abortedReason? })`, `.createCapsuleAsPending()`, `.createCapsuleAsInvalidParametersError({ payload })`, `.createCapsuleAsAbortedByHooks({ payload })`, `.createCapsuleAsNetworkError({ responseParcel, payload })`, `.createCapsuleAsResponseBodyParseError({ responseParcel, payload })`.
- `.createResponseBodyParser({ responseParcel })`.
- `#get:baseUrl`: returns `string`.
- `#launchRequest({ payload, hooks? })` (`@public`, async): returns `Promise<Capsule>`. Hooks are the same four as in `BaseGraphqlLauncher`. If the payload's `#isInvalidAllParameterHash()` is true it returns an invalid-parameters capsule without calling hooks, then it calls `beforeRequest` (resolving `true` aborts), fetches, and calls `afterRequest`.
- `#extendRequestHooks(hooks)`, `#extendBeforeRequestHook(...)`, `#extendAfterRequestHook(...)`, `#extendOnUploadProgressHook(...)`, `#extendOnDownloadProgressHook(...)`, `#invokeFetchQuery({ payload, sink? })`, `#retrieveCapsule({ payload, httpParcel })`, `#generateFetchResult({ responseParcel })`: same roles as in `BaseGraphqlLauncher`.

### `BaseRestfulApiPayload`

Describes one endpoint. Generic over query `QP`, body `BP`, and path parameters `PP`. Subclass and override `method` and `pathname`.

- `.create({ query?, body?, pathParameterHash?, options? })`: factory.
- `.createWithFormValueHash({ valueHash, extraValueHash?, options? })`: splits a form value hash into query, body, and path parameters through `generateRequestParameterHash`.
- `.generateRequestParameterHash({ valueHash })`: abstract. Returns the request value hash (query, body, and path parameter parts).
- `.buildFormBasedValueHash({ valueHash, extraValueHash })`, `.normalizeFormBasedValueHash({ valueHash })`.
- `.get:method`: abstract. Returns an HTTP method string (see `RESTFUL_API_METHOD`).
- `.get:pathname`: abstract. Returns the path, for example `'/amounts'` or `'/profile/:id'` (path parameter).
- `.get:prefixPathname`: returns `string`, default `''`.
- `.get:queryRequiredFields`, `.get:bodyRequiredFields`, `.get:pathParameterRequiredFields`: return `Array<string>`.
- `.get:timeoutMilliseconds`: `0` is the default.
- `.get:RequestBodyConverterCtor`: returns the request body converter class.
- `.createRequestBodyConverter({ body })`.
- `.collectBasedHeadersOptions()` (returns `Array<HeadersInit>`) and `.collectBasedFetchOptions()` (returns `Array<RequestInit>`): override points.
- `.isBodyRequiredMethod()`: true for `post`, `put`, `patch`. `.isValidValueHash({ requiredFields, valueHash })`: returns `boolean`.
- `.get:asGetMethod` and `.get:asPostMethod` (`@public`): return a dynamically derived payload class with the method fixed to GET or POST. Use them as the base: `class Foo extends BaseRestfulApiPayload.asGetMethod`. Also `.declareRestMethodCtor({ method })`, `.createDerivedCtorRegistry({ method })`, `.get:FIXED_CLASS_NAME_PREFIX`.
- Instance properties: `#query`, `#body`, `#pathParameterHash`, `#options`.
- `#createFetchRequest({ baseUrl })` (`@public`): returns a `Request`.
- `#createRequestURL({ baseUrl })`, `#buildRequestUri()`, `#buildPathname()`, `#generateSearchQuery()`, `#generateRequestOptionHash()`, `#createMergedHeaders()`, `#collectRequestBodyHeaderEntries()`, `#generateBodyEntry()`, `#buildRequestBody()`, `#createRequestBodyConverter()`.
- `#extractFilteredRequestBody()`: abstract in the JSDoc. Returns the body to send.
- `#isValidAllParameterHash()` and `#isInvalidAllParameterHash()`: return `boolean`. Valid means the query, body, and path parameters each contain their required fields.

### `BaseRestfulApiCapsule`

Wraps the outcome of one request. Generic over the result type `R` and the payload type `P`.

- `.create({ responseParcel, payload, result, abortedReason? })`: factory.
- `.createAsPending()`, `.createAsInvalidParametersError({ payload })`, `.createAsAbortedByHooks({ payload })`, `.createAsNetworkError({ responseParcel, payload })`, `.createAsResponseBodyParseError({ responseParcel, payload })`.
- Static error code getters (`string`): `.get:unknownErrorCode` (`'190.X000.001'`), `.get:invalidParameterHashErrorCode` (`'191.X000.001'`), `.get:networkErrorCode` (`'192.X000.001'`), `.get:responseBodyParseErrorCode` (`'192.X000.002'`), `.get:timeoutErrorCode` (`'192.X000.003'`), `.get:abortErrorCode` (`'192.X000.004'`).
- Instance properties: `#responseParcel`, `#payload`, `#result`, `#abortedReason`.
- `#get:requestMethod` (`string | null`), `#get:statusCode` (`number | null`), `#get:statusText` (`string | null`).
- `#isPending()`, `#hasInvalidParameterHashError()`, `#hasAbortError()`, `#hasTimeoutError()`, `#hasNetworkError()`, `#hasResponseBodyParseError()`, `#hasStatusCodeError()` (a status of 400 or more), `#hasResultError()` (the base returns `false`), `#hasError()`: return `BooleanLike`.
- `#getErrorMessage()`: returns `string | null`. Checked in this order: pending gives `null`, then the invalid-parameter, abort, timeout, network, and body-parse codes, then a status error (`generateErrorCodeByStatusError()`), then a result error (`generateResultErrorCode()`), otherwise `null`.
- `#generateErrorCodeByStatusError()`: returns `'193.X000.<statusCode>'`, or `unknownErrorCode` without a status.
- `#generateResultErrorCode()`: abstract. Returns the error code of the result error.

### `RESTFUL_API_METHOD`

Named export (not a default). A constant object whose keys equal its values: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `TRACE`, `CONNECT`.

### `BaseRenchanRestfulApiLauncher`

Extends `BaseRestfulApiLauncher` with no added members. Use it as the launcher base for a Renchan backend.

### `BaseRenchanRestfulApiPayload`

Extends `BaseRestfulApiPayload`. Adds an access token header taken from session storage.

- `.get:ACCESS_TOKEN_HEADER_KEY`: abstract. Returns the header name.
- `.get:ACCESS_TOKEN_STORAGE_KEY`: abstract. Returns the session storage key.
- `.loadAccessToken()`: returns `string | null`, read from session storage.
- `.collectBasedHeadersOptions()`: overridden. Appends `{ [ACCESS_TOKEN_HEADER_KEY]: token }` when a token is stored.

### `BaseRenchanRestfulApiCapsule`

Extends `BaseRestfulApiCapsule`. The result has the shape `{ content?: Record<string, *> | null, error?: { code: string } | null }`.

- `#get:content`: `result.content` or `null`. `#get:error`: `result.error` or `null`.
- `#hasResultContent()` and `#hasResultError()`: return `boolean`.
- `#generateResultErrorCode()`: returns `error.code`, or `unknownErrorCode` when absent.

---

## DOM tools

### `FormElementInspector`

Reads values from an `HTMLFormElement`.

- `.create({ formElement })`: factory.
- `#extractValueHash()` (`@public`): returns `Record<string, *>` of control values by name.
- `#extractEnabledElements()`, `#extractAllElements()`, `#extractControlElements()` (returns `Record<string, control | RadioNodeList>`), `#extractNames()` (returns `Array<string>`).

### `FormControlElementInspector`

Reads the value of one control. `FormControlElementClerk` is the same class.

- `.create({ control })`: factory. `control` is an input, select, textarea, button, option, or `RadioNodeList`.
- `#extractFormControlValue()`: returns `string | number | Array<string> | File | Array<File> | null`.
- Per-type extractors: `#extractValueFromInputElement({ inputElement })`, `#extractValueFromFileTypeInputElement({ inputElement })`, `#extractValueFromNumberTypeInputElement({ inputElement })` (number or `null`), `#extractValueFromSelectElement({ selectElement })`, `#extractValueFromRadioNodes({ radioNodes })`, `#extractValueFromRadioInputElements({ inputElements })` (`string | null`), `#extractValueFromCheckboxInputElements({ inputElements })` (`Array<string>`), `#extractValueFromMultipleInputElements({ inputElements })` (`Array<string>`).

### `BaseFormElementClerk`

Form validation and value extraction. Subclass and override `rules`. Kept for backward compatibility.

- `.create({ formElement })`: factory.
- `.get:rules`: abstract. Returns `Array<{ field, ok, message? }>`, the params of `.create`.
- `#get:controlElements`.
- `#generateValidationHash()` (`@public`): returns `{ valid, invalid, messages, message }` (see `ValueHashValidator`).
- `#isValid()` and `#isInvalid()`: return `boolean`.
- `#extractValueHash()` (`@public`): returns the form value hash.
- `#createFormElementInspector()`: returns a `FormElementInspector`.

### `BaseLegacyFormElementClerk`

Older form clerk with the same `.create({ formElement })`, `.get:rules` (abstract), `#get:controlElements`, `#generateValidationHash()` (`@public`), `#isValid()`, `#isInvalid()`, and `#extractValueHash()`. It also has `#extractControlElements()` and `#extractNames()` of its own.

### `HashBuilder`

Builds a nested object from dot-separated names, for example the name `'a.b'` sets `core.a.b`.

- `.create({ core? } = {})`: factory. `core` is the object to fill.
- `#setValues({ values })`: `values` is `Array<[string, *]>`. `#setValue({ name, value })`: `name` is a dot-separated path. Both return the builder for chaining.
- `#fulfillHash({ keysPath })`: creates the intermediate objects for a dot-separated path and returns the builder.
- `#extractValue({ key })`, `#assignValueToCore({ key, value })`, `#resolveChildHash({ key })`, `#createChildHashBuilder({ key })`, `#createHashBuilder({ core })`.
- `#buildHash()` (`@public`): returns `Record<string, *>`, the built object.

### `UploadingPropertyPathBuilder`

Finds `File` and `Blob` values in a nested value and builds the multipart upload map for them.

- `.create({ value })`: factory.
- `.buildNodes({ value, properties? })`, `.isNodeValue({ value })`.
- `#generateUploadingPathMap()`: returns `{ [key: string]: [string] }`.
- `#generateUploadingEntries()`: returns `Array<[string, File | Blob]>`.
- `#extractUploadingNodes()`: returns `Array<{ value, path }>`.

### `FieldValidator`

Validates one field.

- `.create({ field, ok, message? })`: factory. `ok` is `(it, valueHash) => boolean` (a rule). `message` is `string | null`.
- `#accepts({ field })` and `#rejects({ field })`: tell whether the validator handles the field.
- `#isValid({ target, variables })` and `#isInvalid({ target, variables })`: return `boolean`.
- `#getMessage()`: returns `string | null`.

### `ValueHashValidator`

Validates a whole value hash with a list of rules.

- `.create({ valueHash, rules })`: factory. `rules` is `Array<{ field, ok, message? }>`.
- Instance properties: `#valueHash`, `#validators`.
- `#isValid()` and `#isInvalid()`: return `boolean`.
- `#generateValidationHash()` (`@public`): returns `{ valid: Record<string, boolean>, invalid: Record<string, boolean>, messages: Record<string, Array<string>>, message: Record<string, string | null> }`.
- `#generateIsValidHash()`, `#generateIsInvalidHash()`, `#generateAllMessagesHash()`, `#generateOneMessageHash()`.
- `#isValidField({ field })`, `#isInvalidField({ field })`, `#extractFieldNames()`, `#extractValidators({ field })`, `#getAllMessages({ field })` (`Array<string>`), `#getOneMessage({ field })` (`string | null`).

### `DomInflator`

- `.create({ html })`: factory.
- `.get:htmlDocument`: returns the `Document`.
- `#inflateElements()`: returns `Array<Element>` parsed from the HTML.

---

## Dynamic class declaration tools

Used by `.get:asGetMethod` and `.get:asPostMethod` of `BaseRestfulApiPayload` to declare and cache derived classes.

### `AnonymousClassNameAssigner`

- `.create({ AnonymousCtor })`: factory.
- `#assignClassName({ name })`: names the anonymous class and returns it.

### `DerivedClassNameGenerator`

- `.create({ className, fixedPrefix? })`: factory.
- `#generateClassName({ prefix })`: returns the generated class name as a `string`.

### `DynamicDerivedCtorPool`

Registry of derived constructors by name.

- `.create({ pool? } = {})`: factory. `pool` is a `Map<string, Function>`.
- `#bulkRegisterCtors({ CtorHash })`, `#registerCtor({ name, Ctor })`: return the pool for chaining.
- `#retrieveCtor({ name })`: returns the constructor or `null`. `#containsCtor({ name })`: returns `boolean`.

### `BaseDerivedCtorRegistry`

Abstract. Declares and caches one derived constructor.

- `.create({ SuperCtor, pool?, fixedPrefix? })`: factory.
- `.createDynamicDerivedCtorPool()`, `.createDerivedClassNameGenerator({ className, fixedPrefix? })`.
- `#obtainCtor()`: returns the derived constructor.
- `#generateClassName()`, `#retrieveCtor({ className })`, `#registerDeclaredCtor({ className })`.
- `#generatePrefix()` and `#declareCtor()`: abstract.

### `RestMethodRestfulApiPayloadDerivedCtorRegistry`

Extends `BaseDerivedCtorRegistry`. Declares a RESTful payload class for one HTTP method.

- `.create({ SuperCtor, method, pool?, fixedPrefix? })`: factory.
- `#generatePrefix()` and `#declareCtor()`: implemented.

---

## Local storage

### `StorageClerk`

Thin wrapper over a `Storage`.

- `.create({ storage })`: factory.
- `.createAsLocal()` (uses `localStorage`) and `.createAsSession()` (uses `sessionStorage`).
- `#get(key)`: returns `string | null`.
- `#set(key, value)`, `#remove(key)`, `#clearAll()`: return the clerk for chaining.

## IndexedDB

### `IndexedDbClient`

- `.create({ db })`: factory. `db` is `IDBDatabase | null`.
- `.createAsync({ config, callbacks })`: async factory. `config` is `{ dbName, dbVersion }`. `callbacks` is `{ onUpgradeNeeded, onSuccess, onError }`.
- `.get:indexedDbHandler`: returns the `IDBFactory`.
- `.createDatabase({ config, callbacks })`: async. Returns `Promise<IDBDatabase | null>`.
- `#createObjectStore({ storeName, primaryKeyPath?, storeOptions? })`: returns `IDBObjectStore`.
- `#beginTransaction({ storeNames, transactionMode?, transactionOptions? })`: returns `IDBTransaction`.
- `#takeStore({ storeName })`: returns `IDBObjectStore`.

### `BaseDatabase`

Describes one database. Subclass and override `dbName` and `MigrationCtor`.

- `.create({ dbClient })`: factory. `.createAsync()`: async factory that opens the database and returns an instance.
- `.get:dbName`: abstract. `.get:dbVersion`: returns `number`. `.get:MigrationCtor`: abstract, returns the migration class. `.get:IndexedDbClientCtor`: returns `IndexedDbClient`. `.get:config`: returns `{ dbName, dbVersion }`.
- `.createDbClient()`: async. Returns `Promise<IndexedDbClient>`.
- `.generateCallbacks()`: returns `{ onSuccess, onError, onUpgradeNeeded }`. `.defineOnSuccess()`, `.defineOnError()`, `.defineOnUpgradeNeeded()`: return the individual handlers. `onUpgradeNeeded` receives `{ dbClient, newVersion, oldVersion }`.

### `BaseDatabaseMigration`

Subclass and override `generateObjectStoreArgs()` and `migrate()`.

- `.create({ dbClient })`: factory.
- `#migrate({ newVersion, oldVersion })` (`@public`, async): returns `Promise<void>`. The base throws, so override it.
- `#generateObjectStoreArgs()`: abstract. Returns `Array<{ storeName, primaryKeyPath, storeOptions?, indexArgs: Array<{ indexName, indexKeyPath, indexOptions? }> }>`.
- `#createObjectStores(...createArgs)`: returns `Array<{ store, indexes }>`.
- `#validatesCreatedStores({ createResults })`: returns `boolean`.

### `BaseStore`

One object store. Subclass and override `storeName`. Generic over the value type `V`.

- `.create({ dbClient })`: factory.
- `.get:storeName`: abstract. Returns `string`.
- `#get:objectStore`: returns the `IDBObjectStore`.
- `#findAll({ query?, count? } = {})`: async. Returns `Promise<Array<V>>`.
- `#findByKey({ key })`: async. Returns `Promise<V>`.
- `#findByIndex({ indexName, value, direction?, limit? })`: async. `direction` is `'next' | 'prev'`. Returns `Promise<Array<V>>`.
- `#save({ value, key? })`: async. Returns `Promise<IDBValidKey>`.
- `#bulkSave({ values })`: async. `values` is `Array<{ value, key? }>`. Returns `Promise<Array<V>>`.
- `#normalizeIndexQuery({ dbIndex, value })` and `#createKeyRange({ keyPath, value })`: helpers.
