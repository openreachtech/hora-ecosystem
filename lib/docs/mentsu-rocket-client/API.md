# API

Source: `lib/**/*.js` (no `.d.ts` wired via `package.json`'s `"types"` field — a `types/rocket-client.d.ts` ambient declaration file ships in the package but is not referenced by `package.json`, so it was used only as cross-reference, not as the primary source; extracted from JSDoc). Only 4 methods in the whole package carry an `@public` tag (`BasePayload#createFetchRequest`, `BaseLauncher#launchRequest`, `BaseAuthorizationBuilder#buildHeaders`, `RequestOptionHash#toRequestOptionHash`) — these are called out below, but the rest of the surface is the natural consumer-facing API inferred from the class design (a subclass-and-override framework), following the same judgment call used for `mentsu-logger`.

## Exports (`index.js`)

All 25 exports are named exports (no default export):

- Core: `BasePayload`, `BaseCapsule`, `BaseLauncher`
- Request: `RequestPathParameterHash`, `RequestQuery`, `RequestBody`, `RequestOptionHash`, `SnakeCasedKeyRequestQuery`, `SnakeCasedKeyRequestBody`
- Authorization builders: `BaseAuthorizationBuilder`, `BasicAuthorizationBuilder`, `BearerAuthorizationBuilder`
- Body stringifiers: `BaseRequestBodyStringifier`, `JsonRequestBodyStringifier`, `NdjsonRequestBodyStringifier`
- Response: `ResponseBody`, `CamelCasedKeyResponseBody`
- Body parsers: `BaseResponseBodyParser`, `BlobResponseBodyParser`, `JsonResponseBodyParser`
- Tools: `HeadersBuilder`, `PathnameBuilder`, `BaseEntity`
- Constants: `REST_METHOD`, `LAUNCH_ABORTED_REASON`

## Architecture

This package is a framework for building typed `fetch`-based REST API clients, built around three abstract base classes meant to be subclassed **per endpoint**:

- **`BasePayload`** describes one request (method, pathname, body/query schema, auth) and builds a native `Request`.
- **`BaseLauncher`** owns `clientConfig` (incl. `BASE_URL`) plus which `Payload`/`Capsule` classes to use, and performs the actual `fetch`.
- **`BaseCapsule`** wraps the raw `Response` into a normalized result with uniform error-checking methods.

The remaining exports are the value objects and strategy classes these three collaborate with (request/response body & query handling, authorization header building, key-case conversion, path templating).

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Class: `BasePayload`

Abstract base for one API request's shape (method, pathname, body/query, auth, content-type). Subclass per endpoint.

- `.create({ pathParameterHash = {}, query = {}, body = {}, optionHash = {} } = {})` — static factory method. Builds `requestPathParameterHash` / `requestQuery` / `requestBody` / `requestOptionHash` value objects (via the `*Ctor` getters below, after running the `enrich*` hooks) and returns `new this(...)`.
- `.via(EntityCtor)` — static method. Returns a subclass (memoized via `@openreachtech/mentsu-bound-ctor-registry`) whose `.get:EntityCtor` returns `EntityCtor`; returns `this` unchanged if `EntityCtor` is falsy. **Note:** nothing in this package's `BasePayload`/`BaseLauncher`/`BaseCapsule` actually reads `EntityCtor` back out to construct an entity — it is stored but otherwise unused in this version.
- `.get:EntityCtor` / `.get:RequestPathParameterHashCtor` / `.get:RequestQueryCtor` / `.get:RequestBodyCtor` / `.get:RequestOptionHashCtor` / `.get:AuthorizationBuilderCtor` / `.get:BodyStringifierCtor` — static getters returning the collaborator constructor to use; override in a subclass to swap implementations (e.g. `AuthorizationBuilderCtor` → `BearerAuthorizationBuilder`, `BodyStringifierCtor` → `NdjsonRequestBodyStringifier`). Defaults: `EntityCtor` and `AuthorizationBuilderCtor` are `null` (no entity binding, no auth header); `BodyStringifierCtor` is `JsonRequestBodyStringifier`.
- `.get:contentType` / `.get:method` / `.get:pathname` — **abstract** static getters; each throws `Error` (`` `${name}.get:X must be inherited` ``) unless overridden. Every concrete Payload must define these three.
- `.get:authorizationApiKey` — static getter, `null` by default; override to return the credential/token/key source passed as `source` to `AuthorizationBuilderCtor.create({ source })`.
- `.querySchema` / `.bodySchema` — static properties (`{}` by default) consumed by `mentsu-schema` for validating/(de)normalizing the query and body.
- `.enrichPathParameterHash({ pathParameterHash })` / `.enrichBody({ body })` / `.enrichQuery({ query })` — static hook methods, identity by default; override to inject extra values before the request value objects are built.
- `.isBodyRequiredMethod()` — static method; `true` for `post`/`put`/`patch` (case-insensitive).
- `#createFetchRequest({ baseUrl })` — instance method, tagged `@public`. Builds and returns a native `Request` for this payload against `baseUrl`.
- `#hasInvalidParameterHash()` — instance method; `true` if the path parameter hash, query, or body fails schema validation.
- `#hasAuthorization()` — instance method; `true` if no `AuthorizationBuilderCtor` is configured on this Payload's constructor, or if the built option hash actually carries an `Authorization` header.
- `#isHeadMethod()` — instance method; `true` when `method` (case-insensitive) is `'HEAD'`.

## Class: `BaseCapsule`

Wraps a raw `fetch` `Response` (or a pre-fetch failure) into a normalized result with uniform error-checking. Subclass per endpoint (often left as a thin, empty subclass).

- `.create({ payload, rawResponse, rawBody, abortedReason = LAUNCH_ABORTED_REASON.NONE })` — static factory method. Builds `responseBody` from `rawBody` via `ResponseBodyCtor` and returns `new this(...)`.
- `.createAsPending()` — static factory for a pre-fetch placeholder capsule (`payload`/`rawResponse`/`rawBody` all `null`).
- `.createAsNoAuthorizationError({ payload })` / `.createAsInvalidInputError({ payload })` / `.createAsAbortedByHooks({ payload })` — static factories for the matching error case; each sets `rawResponse`/`rawBody` to `null` and `abortedReason` to the corresponding `LAUNCH_ABORTED_REASON` value.
- `.createAsNetworkError({ payload })` / `.createAsResponseBodyParseError({ payload, rawResponse })` — static factories for a failed `fetch()` and an unparseable response body, respectively (neither sets a specific `abortedReason`, so it stays `NONE`).
- `.via(EntityCtor)` — static method, same binding pattern as `BasePayload.via()` (same "stored but unused" caveat applies).
- `.get:ResponseBodyCtor` — static getter, defaults to `ResponseBody`.
- `.get:unknownErrorCode` / `.get:noAuthorizationErrorCode` / `.get:invalidParameterHashErrorCode` / `.get:networkErrorCode` / `.get:responseBodyParseErrorCode` — static getters returning fixed error-code strings (e.g. `'191.X000.002'`) surfaced by `#getErrorMessage()`.
- `.bodySchema` — static property (`{}` by default), passed to `ResponseBodyCtor.as()`.
- `#body` — instance getter. `responseBody.normalizedBody`, or `null` if there is no response body.
- `#statusCode` — instance getter. `rawResponse.status`, or `null`.
- `#requestMethod` — instance getter. `payload.method`, or `null`.
- `#isPending()` — instance method; `true` when `payload === null` (i.e. built via `createAsPending()`).
- `#hasError()` — instance method; `false` while pending, otherwise `true` if any of: no authorization, invalid parameter hash, network error, response-body-parse error, or HTTP status `>= 400`.
- `#getErrorMessage()` — instance method. Returns the error-code string for whichever `has*Error()` check matches first (in the order: authorization, invalid input, network, body-parse, status code), or `null` if there is no error. For status-code errors it returns `` `193.X000.${statusCode}` `` via `#generateErrorCodeByStatusError()`, falling back to `unknownErrorCode` only if `statusCode` is falsy.
- `#isHeadMethod()` — instance method; delegates to `payload.isHeadMethod()`, or `false` if `payload` is `null`.

## Class: `BaseLauncher`

Orchestrates one endpoint's request/response cycle: owns config (base URL) plus which `Payload`/`Capsule` classes to use, and performs the `fetch`. Subclass per API (or per endpoint group).

- `.create({ config = this.clientConfig } = {})` — static factory method.
- `.via(EntityCtor)` — static method. Binds a subclass whose `.get:Payload` and `.get:Capsule` are each further bound to `EntityCtor` via their own `.via()`.
- `.get:clientConfig` — **abstract** static getter; throws unless overridden. The default `config` passed to `create()` — must include the key named by `baseUrlKey` (`'BASE_URL'` by default).
- `.get:Payload` / `.get:Capsule` — **abstract** static getters; throw unless overridden. Must return the concrete `BasePayload`/`BaseCapsule` subclasses for this launcher.
- `.get:ResponseBodyParser` — static getter, defaults to `JsonResponseBodyParser`.
- `.get:fetch` — static getter, defaults to the global `fetch` function (overridable for testing/instrumentation).
- `.get:baseUrlKey` — static getter, defaults to `'BASE_URL'` — the key read from `config` by the instance `#baseUrl` getter.
- `.createPayload({ pathParameterHash, body, query, optionHash } = {})` — static method; shorthand for `this.Payload.create(...)`.
- `.createCapsule({ rawResponse, payload, rawBody, abortedReason })` / `.createCapsuleAsPending()` / `.createCapsuleAsNoAuthorizationError({ payload })` / `.createCapsuleAsInvalidInputError({ payload })` / `.createCapsuleAsAbortedByHooks({ payload })` / `.createCapsuleAsNetworkError({ payload })` / `.createCapsuleAsResponseBodyParseError({ rawResponse, payload })` — static methods; each is a thin shorthand for the matching `this.Capsule.create*` factory.
- `.createResponseBodyParser({ response })` — static method; shorthand for `this.ResponseBodyParser.create({ response })`.
- `#baseUrl` — instance getter. `this.config[this.Ctor.baseUrlKey]`.
- `#launchRequest({ payload, hooks: { beforeRequest, afterRequest } = {} })` — instance method, tagged `@public`. **The main entry point.** In order: (1) returns a no-authorization-error capsule if `payload.hasAuthorization()` is false; (2) returns an invalid-input-error capsule if `payload.hasInvalidParameterHash()`; (3) awaits `beforeRequest(payload)` and returns an aborted-by-hooks capsule if it resolves truthy; (4) otherwise performs the `fetch`, parses the response body, builds the resulting capsule, awaits `afterRequest(capsule)`, then returns the capsule. Both `beforeRequest` and `afterRequest` default to no-ops (`async () => false` / `async () => {}`). Network errors and response-body-parse errors are caught internally and turned into the matching error capsule — `launchRequest()` itself never throws/rejects for those cases.
- `#extendBeforeRequestHook({ beforeRequest })` / `#extendAfterRequestHook({ afterRequest })` / `#extendOnUploadProgressHook({ onUploadProgress })` / `#extendOnDownloadProgressHook({ onDownloadProgress })` — instance extension points, identity by default (return the hook unchanged); override in a subclass to wrap/replace the hook the caller passed in. **Note:** the upload/download progress hooks are declared as extension points but are never actually invoked anywhere inside `launchRequest()` — they exist for subclasses to wire up manually (e.g. if a subclass replaces `fetch` with `XMLHttpRequest`), not as part of the built-in flow.
- `#invokeFetchQuery({ payload })` / `#retrieveCapsule({ payload, response })` / `#generateFetchBody({ response })` — internal instance methods backing `launchRequest()`; documented because subclasses commonly override them (e.g. to add logging/retries). `invokeFetchQuery()` swallows any thrown error from `fetch()` and returns `null` in that case; `generateFetchBody()` swallows any parse error and returns `null`.

## Class: `RequestPathParameterHash`

Wraps a template path (e.g. `/users/[userId]`) plus the values to substitute into it.

- `.create({ templatePath, pathParameterHash })` — static factory method.
- `.createPathnameBuilder({ templatePathname })` — static method; returns `PathnameBuilder.create({ templatePathname })`.
- `#isValid()` / `#isInvalid()` — instance methods. Extracts every `[name]` placeholder from `templatePath` via regex and checks that each one exists as a key in `pathParameterHash` (an empty/no-placeholder template is always valid).
- `#buildPathname({ path = this.templatePath } = {})` — instance method. Delegates to a `PathnameBuilder` to substitute `[name]` placeholders in `path` using `pathParameterHash`.

## Class: `RequestQuery`

Schema-validated URL query builder.

- `.create({ query = null })` — static factory method; builds a `SchemaReifier` from `.boundSchema`.
- `.as(schema)` — static method. Returns a subclass (memoized) whose `.get:boundSchema` returns `schema` — this is how `BasePayload` attaches `querySchema` (`RequestQueryCtor.as(this.querySchema)`).
- `.get:boundSchema` — static getter, `{}` by default; set via `.as()`.
- `.get:SchemaReifierCtor` / `.get:DeepSchemaInflaterCtor` — static getters into `@openreachtech/mentsu-schema` (`SchemaReifier`, `DeepSchemaInflater`).
- `#isValid()` / `#isInvalid()` — instance methods; delegate to the schema reifier's `isFulfilledNormalizedValue()`.
- `#toRequestQuery()` — instance method. Denormalizes `query` through the schema reifier, converts its keys (identity unless overridden), builds a `URLSearchParams`, sorts its entries, and returns the query string (no leading `?`). Returns `''` if `query` is `null`.
- `#convertQueryKeys({ query })` — instance hook, identity by default; overridden by `SnakeCasedKeyRequestQuery`.

## Class: `RequestBody`

Schema-validated request body builder.

- `.create({ body = null })` — static factory method; builds a `SchemaReifier` from `.boundSchema`.
- `.as(schema)` — static method, same pattern as `RequestQuery.as()`; sets `.get:boundSchema`.
- `.use(StringifierCtor)` — static method. Returns a subclass whose `.get:BodyStringifierCtor` returns `StringifierCtor` — this is how `BasePayload.inflateRequestBodyCtor()` attaches its `BodyStringifierCtor`.
- `.via(EntityCtor)` — static method, same binding pattern as elsewhere (sets `.get:EntityCtor`; also not read back anywhere).
- `.get:BodyStringifierCtor` — static getter, defaults to `JsonRequestBodyStringifier`.
- `.defineJsonReplacer()` — static method, returns `null` by default (no `JSON.stringify` replacer); overridden by `SnakeCasedKeyRequestBody`.
- `#isValid()` / `#isInvalid()` — instance methods; delegate to the schema reifier.
- `#toRequestBody()` — instance method. Denormalizes `body`, converts its keys (identity unless overridden), then stringifies the result via `#stringifyBody()`.
- `#convertBodyKeys({ body })` — instance hook, identity by default. **`SnakeCasedKeyRequestBody` does not override this** — see its entry below for how it actually converts case.
- `#stringifyBody({ body, replacer })` — instance method. **Its JSDoc is marked `@abstract` with `@throws {Error} ... must be inherited`, but the implementation is fully functional and never throws** — it delegates to `this.Ctor.createBodyStringifier({ replacer }).stringifyBody({ value: body })` (i.e. `JsonRequestBodyStringifier` by default). Treat the `@abstract`/`@throws` tags as stale documentation, not actual behavior.

## Class: `RequestOptionHash`

Merges an ordered list of `RequestInit`-shaped hashes (headers + the rest of `fetch`'s options) into one.

- `.create({ requestOptionHashes })` — static factory method.
- `.get:HeadersBuilderCtor` / `.createHeadersBuilder()` — static getter/method, default `HeadersBuilder`.
- `#hasAuthorization()` — instance method; `true` if the merged headers include an `Authorization` key.
- `#toRequestOptionHash()` — instance method, tagged `@public`. Merges all `requestOptionHashes` into a single `RequestInit`-shaped object: `{ ...mergedRestOptions, headers: mergedHeaders }`.
- `#buildMergedHeaders()` — instance method. Collects the `headers` of every entry (in array order) through `HeadersBuilder`, which lower-cases header names — **later entries in `requestOptionHashes` win on a header-name collision.**
- `#buildMergedRestOptions()` — instance method. Merges the non-`headers` keys of every entry via `Object.fromEntries` (in array order) — later entries win on key collision here too.

## Class: `SnakeCasedKeyRequestQuery extends RequestQuery`

- `.get:DeepKeyCaseConverterCtor` / `.createDeepKeyCaseConverter()` — static getter/method; uses `DeepKeyCaseConverter` from `@openreachtech/mentsu-text-case-tools` with `delimiter: '_'`.
- `#convertQueryKeys({ query })` — instance method (`@override`). Deep-converts every key of `query` to `snake_case`.

## Class: `SnakeCasedKeyRequestBody extends RequestBody`

- `.get:DeepKeyCaseConverterCtor` / `.createDeepKeyCaseConverter()` — static getter/method, same converter setup as above.
- `.defineJsonReplacer()` — static method (`@override`). Returns a `JSON.stringify` replacer function that deep-converts keys to `snake_case` via the same converter. **Note the asymmetry with `SnakeCasedKeyRequestQuery`: this class does not override `convertBodyKeys()` — key conversion instead happens later, during `#stringifyBody()`'s call to `JSON.stringify(body, replacer)`.**

## Class: `BaseAuthorizationBuilder`

Builds an `Authorization` header value from a credential source.

- `.create({ source })` — static factory method. Calls the abstract `.generateCredential({ source })` and constructs `new this({ scheme: this.schema, credential })`.
- `.get:schema` — **abstract** static getter; throws unless overridden (e.g. `'Basic'`, `'Bearer'`).
- `.generateCredential({ source })` — **abstract** static method; throws unless overridden.
- `#buildHeaders()` — instance method, tagged `@public`. Returns `{ Authorization: this.generateHeaderValue() }`.
- `#generateHeaderValue()` — instance method. `` `${scheme} ${credential}` ``.

## Class: `BasicAuthorizationBuilder extends BaseAuthorizationBuilder`

- `.get:schema` → `'Basic'`. `.get:btoa` — static getter, defaults to global `btoa`. `.generateCredential({ source })` → `this.btoa(source)`. Use when `source` is the raw `"user:password"` string to Base64-encode.

## Class: `BearerAuthorizationBuilder extends BaseAuthorizationBuilder`

- `.get:schema` → `'Bearer'`. `.generateCredential({ source })` → returns `source` unchanged, i.e. `source` should already be the bearer token itself.

## Class: `BaseRequestBodyStringifier`

- `.create({ replacer = null } = {})` — static factory method.
- `#stringifyBody({ value })` — **abstract** instance method; throws `Error` unless overridden.

## Class: `JsonRequestBodyStringifier extends BaseRequestBodyStringifier`

- `#stringifyBody({ value })` → `JSON.stringify(value, this.replacer)`.

## Class: `NdjsonRequestBodyStringifier extends BaseRequestBodyStringifier`

- `#stringifyBody({ value })` — expects `value` to be an `Array`; maps each element through `JSON.stringify(item, this.replacer)`, appends `'\n'` to each stringified element, and joins them with no separator (i.e. newline-delimited JSON / NDJSON).

## Class: `ResponseBody`

Wraps a raw response body plus its schema-normalized form.

- `.create({ rawBody = null } = {})` — static factory method; builds `normalizedBody` via `.buildNormalizedBody({ rawBody })`.
- `.as(schema)` — static method, same binding pattern as `RequestQuery.as()`; sets `.get:boundSchema`.
- `.via(EntityCtor)` — static method; sets `.get:EntityCtor` (present, not read back anywhere in this package).
- `.buildNormalizedBody({ rawBody })` — static method. `deepNormalizeValuesBody(deepNormalizeKeysBody({ body: rawBody }))` — first normalizes keys (identity by default; overridden by `CamelCasedKeyResponseBody`), then normalizes values through the schema reifier's `normalizeValue()` (the inverse of `RequestQuery`/`RequestBody`'s `denormalizeValue()`).
- `#body` — instance getter, alias for `normalizedBody`.

## Class: `CamelCasedKeyResponseBody extends ResponseBody`

- `.deepNormalizeKeysBody({ body })` — static method (`@override`). Deep-converts every key of `body` to `camelCase` via `DeepKeyCaseConverter` (`delimiter: '_'`, i.e. it un-snake-cases incoming keys).

## Class: `BaseResponseBodyParser`

- `.create({ response })` — static factory method.
- `#parseBody()` — **abstract** async instance method; throws `Error` unless overridden.

## Class: `BlobResponseBodyParser extends BaseResponseBodyParser`

- `#parseBody()` → `response.blob()`.

## Class: `JsonResponseBodyParser extends BaseResponseBodyParser`

- `#parseBody()` → `response.json()`. This is `BaseLauncher`'s default `ResponseBodyParser`.

## Class: `HeadersBuilder`

- `.create({ headersPool = [] } = {})` — static factory method (shallow-copies the array).
- `#addHeadersHash(...headersPool)` — instance method. Pushes the given `HeadersInit` values onto the pool; returns `this` (chainable).
- `#buildHeaders()` — instance method. Converts every pooled `HeadersInit` to a `Headers` instance, flattens all entries, **lower-cases every header name**, and folds them into a single `Headers` object — later pool entries win on a name collision.

## Class: `PathnameBuilder`

- `.create({ templatePathname })` — static factory method.
- `#buildPathname({ valueHash })` — instance method. Replaces every `[key]` placeholder in `templatePathname` with `valueHash[key]`, or `''` if that key is missing/`null`/`undefined`. **Unlike `RequestPathParameterHash#isValid()`, this method performs no validation** — it silently substitutes an empty string for any unresolved placeholder.

## Class: `BaseEntity`

- `.create({ id = null } = {})` — static factory method.
- `#id` — instance property, set at construction.
- Serves as the marker/base type for the `EntityCtor` binding point exposed by `BasePayload.via()`, `BaseCapsule.via()`, `BaseLauncher.via()`, `RequestBody.via()`, and `ResponseBody.via()`. **In this version of the package, none of those classes actually read `EntityCtor` back out to construct or attach an entity anywhere** — the value is stored (retrievable via each class's `.get:EntityCtor`) but has no other effect on behavior.

## Constant: `REST_METHOD`

Plain object enum mapping each HTTP method name to itself as a string: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `TRACE`, `CONNECT` (e.g. `REST_METHOD.GET === 'GET'`). Intended for use as a `BasePayload.get:method` return value.

## Constant: `LAUNCH_ABORTED_REASON`

Plain object enum of unique `Symbol` values: `NONE`, `NO_AUTHENTICATION`, `NO_AUTHORIZATION`, `INVALID_INPUT`, `BEFORE_REQUEST_HOOK`, `UNKNOWN`. `BaseCapsule` sets `abortedReason` to `NONE` by default and to `NO_AUTHORIZATION` / `INVALID_INPUT` / `BEFORE_REQUEST_HOOK` from the matching `createAsX()` factory. **`NO_AUTHENTICATION` and `UNKNOWN` are declared but never assigned by any code in this package** — they appear reserved for future or subclass use.

## Usage

```js
import {
  BasePayload,
  BaseCapsule,
  BaseLauncher,
  REST_METHOD,
  BearerAuthorizationBuilder,
} from '@openreachtech/mentsu-rocket-client'

class GetUserPayload extends BasePayload {
  static get method () {
    return REST_METHOD.GET
  }

  static get pathname () {
    return '/users/[userId]'
  }

  static get contentType () {
    return 'application/json'
  }

  static get authorizationApiKey () {
    return process.env.EXAMPLE_API_TOKEN
  }

  static get AuthorizationBuilderCtor () {
    return BearerAuthorizationBuilder
  }
}

class GetUserCapsule extends BaseCapsule {
}

class ExampleApiLauncher extends BaseLauncher {
  static get clientConfig () {
    return {
      BASE_URL: process.env.EXAMPLE_API_BASE_URL,
    }
  }

  static get Payload () {
    return GetUserPayload
  }

  static get Capsule () {
    return GetUserCapsule
  }
}

const launcher = ExampleApiLauncher.create()

const payload = ExampleApiLauncher.createPayload({
  pathParameterHash: {
    userId: '42',
  },
})

const capsule = await launcher.launchRequest({
  payload,
})

if (capsule.hasError()) {
  console.error(capsule.getErrorMessage())
} else {
  console.log(capsule.body)
}
```
