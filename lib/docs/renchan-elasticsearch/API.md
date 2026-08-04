# API

Source: `lib/**/*.js` (no `.d.ts` shipped via `package.json`'s `"types"` field — there is
no such field; a `types/*.d.ts` directory exists in the installed package but is not
wired up as the package's type entry point, so this reference is extracted from JSDoc in
`lib/`). Only two methods in the whole package (`QueryReifier#reifyQueryClause`,
`AggregationsReifier#reifyAggregationsClause`) are tagged `@public`; there is no
package-wide `@public` convention, so the surface below is chosen by judgment as the
natural consumer-facing API — the classes and members an application actually
instantiates/calls/subclasses to talk to Elasticsearch.

## Exports (`index.js`)

All exports are named (no default export). Grouped as in `index.js`:

- Indices: `AbstractCoreIndex`, `AbstractWorkflowIndex`, `BaseIndex`
- Rocket-client base classes: `BaseElasticsearchPayload`, `BaseElasticsearchCapsule`, `BaseElasticsearchLauncher`
- Request/response support: `ElasticsearchRequestBody`, `ElasticsearchRequestQuery`, `ElasticsearchResponseBody`
- Concrete client triads (`*Payload` / `*Capsule` / `*Launcher`, one triad per operation): `BulkDocumentsElasticsearch*`, `InsertDocumentElasticsearch*`, `SearchDocumentsElasticsearch*`, `CreateIndexElasticsearch*`, `DeleteIndicesElasticsearch*`, `BulkFetchDocumentsElasticsearch*`, `ExistsDocumentElasticsearch*`
- Parcels (request-side wrappers): `BaseParcel`, `BulkDocumentsActionParcel`, `SearchDocumentsQueryParcel`, `SearchDocumentsAggregationsParcel`
- Cargoes (response-side wrappers): `BaseCargo`, `SentinelCargo`, `BulkDocumentsOutcomeCargo`
- Documents: `BaseDocument`, `SentinelDocument`
- Scalars: `SearchClauseScalar`, `SearchAggregationsClauseScalar`
- Schema: `ScalarHash` (a plain object; see below)
- Query DSL: `QueryReifier`, `BaseQueryClause`, `BaseCompoundQueryClause`, `BaseLeafQueryClause`, `BoolCompoundQueryClause`, `NestedCompoundQueryClause`, 13 leaf clause classes (see table below), `SentinelLeafQueryClause`, `CLAUSE_CTORS`
- Aggregations DSL: `AggregationsReifier`, `BaseAggregationsClause`, `SentinelAggregationsClause`, `AGGREGATIONS_CLAUSE_CTORS`
- Tools: `UuidGenerator`

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Architecture overview

This package layers on top of `@openreachtech/mentsu-rocket-client`'s
Payload/Capsule/Launcher client pattern:

- A **Launcher** (`BaseElasticsearchLauncher` subclass) sends one HTTP request and
  returns a **Capsule** wrapping the response.
- A **Payload** (`BaseElasticsearchPayload` subclass) builds the request (method,
  pathname with `[bracket]` path parameters, body, query, headers).
- A **Capsule** (`BaseElasticsearchCapsule` subclass) normalizes/validates the response
  body against a `bodySchema` and exposes read accessors (`documents`, `total`,
  `isOk()`, `hasError()`, `getErrorMessage()`, etc.).
- An **Index** (`BaseIndex` subclass, application-defined) is the facade applications
  actually use: one subclass per Elasticsearch index, wiring together a **Document**
  subclass (mappings + schema), the connection `config`, and high-level operations
  (`createIndex`, `insertDocuments`, `searchDocuments`, ...).
- **Parcel**/**Cargo** classes wrap structured request/response fragments (e.g. a bulk
  action line, a search query clause) with `@openreachtech/mentsu-schema` validation.
- The **Query DSL** and **Aggregations DSL** turn plain JS objects (e.g.
  `{ match: { title: 'x' } }`) into `Clause` instances that know how to serialize
  themselves back into the Elasticsearch request body shape.

Connection config (an instance property, `this.config`, threaded through every layer)
must provide two keys, read by `AbstractCoreIndex`/`BaseLauncher`:

| key | used by |
| :-- | :-- |
| `BASE_URL` | `BaseLauncher#baseUrl` (base URL for `fetch`) |
| `AUTHORIZATION_KEY` | `AbstractCoreIndex#generateAuthorizationSeed()` → `BasicAuthorizationBuilder` (from `@openreachtech/mentsu-rocket-client`), used to build the `Authorization` header |

## Class group: Index facade — `AbstractCoreIndex` → `AbstractWorkflowIndex` → `BaseIndex`

Applications subclass `BaseIndex` (or, for lower-level control, `AbstractWorkflowIndex`/
`AbstractCoreIndex`) once per Elasticsearch index, overriding the `@abstract` static
getters `indexName` and `DocumentCtor`.

- `.create({ config = this.config } = {})` — static factory method. Returns an instance
  bound to `config` (see connection config above). `config` defaults to the class's own
  static `config` getter (`@abstract`, throws unless overridden) if not passed.
- `.get:indexName` — static getter (`@abstract`). Must be overridden: the Elasticsearch
  index name.
- `.get:DocumentCtor` — static getter (`@abstract`). Must be overridden: the `BaseDocument`
  subclass for this index.
- `.get:AuthorizationBuilderCtor` — static getter. Defaults to `BasicAuthorizationBuilder`
  (from `@openreachtech/mentsu-rocket-client`).
- `.createDocument({ source })` — static method. `DocumentCtor.create({ source })`.
- `.get:QueryReifierCtor` / `.get:AggregationsReifierCtor` — static getters. Default to
  `QueryReifier` / `AggregationsReifier`; override to customize clause resolution.
- `.staticProperty aliasesIndexDefinition` / `.staticProperty settingsIndexDefinition` —
  static properties (default `{}`). Override to add `aliases`/`settings` to the index
  definition built by `.buildIndexDefinition()`.
- `.buildIndexDefinition()` — static method. Returns `{ aliases, settings, mappings }`,
  where `mappings` comes from `DocumentCtor.buildMappingsIndexDefinition()`.
- `#createIndex({ definition = Ctor.buildIndexDefinition(), requestInput = {} } = {})` —
  instance method. Creates the index (`PUT /[indexName]`). Returns a
  `CreateIndexElasticsearchCapsule`.
- `#deleteIndex({ name = Ctor.indexName, requestInput = {} } = {})` — instance method.
  Deletes one index by name (`DELETE /[indexNames]`). Returns a
  `DeleteIndicesElasticsearchCapsule`.
- `#insertDocuments({ sources, requestInput = {} })` — instance method. `sources` is
  `Array<{ source }>`. Bulk-inserts (Elasticsearch bulk `create` action per source, via
  `_bulk`). Returns a `BulkDocumentsElasticsearchCapsule`.
- `#updateDocuments({ sources, requestInput = {} })` — instance method. `sources` is
  `Array<{ uuid, source }>`. Bulk-updates (bulk `update` action, `{ doc: <document> }`).
- `#putDocuments({ sources, requestInput = {} })` — instance method. `sources` is
  `Array<{ uuid?, source }>`. Bulk-upserts (bulk `index` action — replaces the whole
  document).
- `#deleteDocuments({ uuids, requestInput = {} })` — instance method. Bulk-deletes by
  UUID (bulk `delete` action).
- `#existsDocument({ uuid, requestInput = {} })` — instance method. `HEAD /[indexName]/_doc/[uuid]`.
  Returns an `ExistsDocumentElasticsearchCapsule` (`.existsDocument()` → `statusCode === 200`).
- `#existsDocuments({ uuids, requestInput = {} })` — instance method. Bulk-existence
  check via `_mget` with `Source: false`.
- `#searchDocuments({ clause, requestInput = {} })` — instance method. `clause` is
  `{ query, aggs?/aggregations?, ...rest }` (plain-object query/aggregations, reified
  through the Query DSL / Aggregations DSL — see below). `POST /[indexName]/_search`.
  Returns a `SearchDocumentsElasticsearchCapsule` (`.documents`, `.total`).
- Lower-level instance methods also available on `AbstractWorkflowIndex` (used
  internally by the `BaseIndex` methods above, and available directly for finer
  control): `#createIndexFromDefinition()`, `#deleteIndicesByNames({ names })`,
  `#insertDocumentFromSource({ source })` (single-document insert, not bulk),
  `#bulkInsertDocumentsFromSources()`, `#bulkUpsertDocumentsWithScript({ sources })`
  (bulk update via a painless `script` + `upsert` body), `#bulkUpdateDocumentsWithSources()`,
  `#bulkPutDocumentsFromSources()`, `#bulkDeleteDocumentsByUuid()`,
  `#existsDocumentByUuid()`, `#bulkExistsDocumentsByUuids()`,
  `#bulkFetchDocumentsByUuids({ uuids })`, `#searchDocumentsByClause({ clause })`.
- Lowest-level instance methods on `AbstractCoreIndex` (build/dispatch a single request;
  rarely called directly): `#invokeLaunchRequest({ LauncherCtor, requestInput })`,
  `#invokeCreateIndex()`, `#invokeDeleteIndices()`, `#invokeInsertDocument()`,
  `#invokeBulkDocuments()`, `#invokeExistsDocument()`, `#invokeBulkFetchDocuments()`,
  `#invokeSearchDocuments()`. Of these, `#invokeInsertDocument`, `#invokeBulkDocuments`,
  `#invokeBulkFetchDocuments` and `#invokeSearchDocuments` bind their Launcher to
  `Ctor.DocumentCtor` via `LauncherCtor.via(DocumentCtor)` (see below) so the returned
  Capsule deserializes `hits`/`docs` into `DocumentCtor` instances;
  `#invokeCreateIndex`/`#invokeDeleteIndices`/`#invokeExistsDocument` do not.

## Class group: Elasticsearch client base classes

- **`BaseElasticsearchPayload`** (extends `mentsu-rocket-client`'s `BasePayload`) —
  `.get:DocumentCtor` (`@abstract`, defaults to `SentinelDocument`), `.get:RequestBodyCtor`
  → `ElasticsearchRequestBody`, `.get:RequestQueryCtor` → `ElasticsearchRequestQuery`,
  `.get:AuthorizationBuilderCtor` → `BasicAuthorizationBuilder`,
  `.get:BodyStringifierCtor` → `JsonRequestBodyStringifier`, `.get:contentType` →
  `'application/json'`.
- **`BaseElasticsearchCapsule`** (extends `BaseCapsule`) —
  `.get:DocumentCtor` (defaults to `SentinelDocument`), `.get:ResponseBodyCtor` →
  `ElasticsearchResponseBody`, `.get:DeepKeyCaseConverterCtor` →
  `@openreachtech/mentsu-text-case-tools`'s `DeepKeyCaseConverter`,
  `.normalizeResponse({ rawResponse })` — deep-converts response keys to camelCase.
  `#get:statusCode`, `#get:error`, `#get:responseTime` (`body.took`, ms), `#isHeadMethod()`,
  `#isOk()` (`body.acknowledged ?? true`, or `null` if pending), `#hasError()`,
  `#hasBodyError()`, `#getErrorMessage()`, `#extractBodyErrorMessage()` (defaults to
  `error.reason`).
- **`BaseElasticsearchLauncher`** (extends `BaseLauncher`) — no members of its own; all
  behavior (`launchRequest()`, `.via(DocumentCtor)`, etc.) comes from
  `@openreachtech/mentsu-rocket-client`'s `BaseLauncher`.

## Request/response support classes

- **`ElasticsearchRequestBody`** (extends `SnakeCasedKeyRequestBody`) — serializes the
  request body with snake_case keys; `.get:schemaInflatingLookup` maps `DocumentScalar`
  → `.get:DocumentCtor`.
- **`ElasticsearchRequestQuery`** (extends `SnakeCasedKeyRequestQuery`) — no members of
  its own (snake_case query-string serialization).
- **`ElasticsearchResponseBody`** (extends `CamelCasedKeyResponseBody`) —
  deserializes the response body with camelCase keys; `.get:schemaInflatingLookup` maps
  `DocumentScalar` → `.get:DocumentCtor`; `#get:statusCode`, `#get:error`.

## Concrete client triads

One `*ElasticsearchPayload` / `*ElasticsearchCapsule` / `*ElasticsearchLauncher` triad
per Elasticsearch operation. Each `*ElasticsearchLauncher` just points `.get:Payload`
and `.get:Capsule` at its matching Payload/Capsule class. These are what `AbstractCoreIndex`'s
`#invoke*` methods launch — most applications call the `Index` facade instead of these
directly.

| Operation | Method | Pathname | Capsule notes |
| :-- | :-- | :-- | :-- |
| `CreateIndex` | `PUT` | `/[indexName]` | — |
| `DeleteIndices` | `DELETE` | `/[indexNames]` | — |
| `InsertDocument` | `POST` | `/[indexName]/_doc/[documentId]` | — |
| `BulkDocuments` | `POST` | `/[indexName]/_bulk` | `bodySchema.items: [Cargo.as(BulkDocumentsOutcomeCargo)]` |
| `ExistsDocument` | `HEAD` | `/[indexName]/_doc/[documentId]` | `#existsDocument()` → `statusCode === 200` |
| `BulkFetchDocuments` | `POST` | `/[indexName]/_mget` | — |
| `SearchDocuments` | `POST` | `/[indexName]/_search` (`bodySchema.query: Parcel`, `.from`/`.size` pagination, `.sort`, `.Source` fields) | `#get:documents` (`hits.hits`), `#get:total` (`hits.total.value`) |

## Class: `BaseDocument` (+ `SentinelDocument`)

Base class for one Elasticsearch document type; drives both index mappings and
request/response (de)serialization.

- `.staticProperty mappingsIndexDefinition` — default `{ dateDetection: false, dynamic: 'strict' }`.
- `.staticProperty schema` — default `{}`; validation/normalization schema for `source`
  (via `@openreachtech/mentsu-schema`'s `SchemaReifier`).
- `.create({ source, uuid = null })` — static factory method. Resolves `uuid` from
  `source?.Id` ?? `uuid` ?? `.generateUuid()` (a fresh `crypto.randomUUID()`); sets
  `isNew` to `true` only when both `source.Id` and `uuid` were absent.
- `.generateUuid()` — static method. `crypto.randomUUID()`. Override to return `null`
  to let Elasticsearch auto-generate the `_id` instead.
- `.buildMappingsIndexDefinition()` — static method. `{ ...mappingsIndexDefinition, properties: .buildMappingsPropertiesIndexDefinition() }`.
- `.buildMappingsPropertiesIndexDefinition()` — static method (`@abstract`, throws unless
  overridden). Must return the Elasticsearch `mappings.properties` object.
- `#uuid` / `#isNew` / `#source` — instance properties set at construction.
- `#isValid()` / `#isInvalid()` — instance methods, via the schema reifier.
- `#denormalizeSource()` / `#toJSON()` — instance methods. Denormalize `source` back to
  its wire shape.

`SentinelDocument` is a no-op `BaseDocument` subclass used as the harmless default
`DocumentCtor` on the base client/payload/capsule classes before an application
supplies its own document type.

## Class group: Parcels (request-side wrappers)

- **`BaseParcel`** — `.staticProperty schema` (default `{}`), `.create({ source })`
  (static factory), `#toJSON()`/`#denormalizeSource()`, `#isValid()`/`#isInvalid()` —
  same shape as `BaseDocument` but for request-body fragments rather than whole
  documents.
- **`BulkDocumentsActionParcel`** — one bulk-API action line, e.g.
  `{ create: { Id } }` / `{ index: { Id } }` / `{ update: { Id } }` / `{ delete: { Id } }`.
- **`SearchDocumentsQueryParcel`** — wraps a reified Query DSL `Clause` (`schema: SearchClauseScalar`).
- **`SearchDocumentsAggregationsParcel`** — wraps a reified Aggregations DSL `Clause`
  (`schema: SearchAggregationsClauseScalar`).

## Class group: Cargoes (response-side wrappers)

- **`BaseCargo`** — `.staticProperty schema` (default `{}`), `.create({ source })`
  (static factory), `#normalizeSource()` — mirror of `BaseParcel` for response-body
  fragments.
- **`SentinelCargo`** — no-op default `BaseCargo` subclass.
- **`BulkDocumentsOutcomeCargo`** — one item of a bulk-API response's `items` array.
  `#get:outcomeBody` (whichever of `create`/`delete`/`index`/`update` is present),
  `#get:status`, `#get:documentUuid` (`outcomeBody.Id`), `#isCreateAction()` /
  `#isDeleteAction()` / `#isIndexAction()` / `#isUpdateAction()`.

## Schema / scalars

`ScalarHash` (a plain object, not a class) re-exports the primitive scalar types from
`@openreachtech/mentsu-schema` (`BigNum`, `Bool`, `Composite`, `Dateonly`, `Datetime`,
`Double`, `Integer`, `Long`, `Node`, `Pattern`, `Record`, `Keyword`, `Sentinel`, `Text`,
`ToCaseKeyword`, `Union`) used to define `Document`/`Parcel`/`Cargo` schemas — used in
the Usage example above (`Keyword`, `Text`) — plus three package-specific scalar
constructors used internally:

- `ScalarHash.Document` (`DocumentScalar`) — wraps a `BaseDocument` instance for schema
  fields (used for `bodySchema.hits.hits: [Document]` on `SearchDocumentsElasticsearchCapsule`).
- `ScalarHash.Parcel` (`ParcelScalar`) — wraps a `BaseParcel` instance
  (`.denormalizeValue()` returns `null` unless the parcel `.isValid()`).
- `ScalarHash.Cargo` (`CargoScalar`) — wraps a `BaseCargo` instance;
  `.as(CargoCtor)` derives a bound scalar for one specific `Cargo` subclass (used as
  `Cargo.as(BulkDocumentsOutcomeCargo)` above).

`SearchClauseScalar` / `SearchAggregationsClauseScalar` are the scalars actually used by
`SearchDocumentsQueryParcel`/`SearchDocumentsAggregationsParcel` above; both accept only
`BaseQueryClause`/`BaseAggregationsClause` instances as their normalized value.

## Query DSL

Turns a plain-object query (e.g. `{ match: { title: 'x' } }`) into a `Clause` instance
that can serialize itself back (`.buildClause()` / `.toJSON()`).

- **`QueryReifier`** — `.create({ Ctors = CLAUSE_CTORS } = {})` (static factory).
  `#reifyQueryClause({ clause })` (`@public`) — the entry point: if `clause` is already a
  `BaseQueryClause`, returns it as-is; otherwise reads the clause's single top-level key
  as the *directive* (e.g. `'match'`), looks up the matching `ClauseCtor` in `Ctors` by
  `.directive`, and constructs it (compound clauses via `.createAsDeeply()`, recursing
  into nested clauses). Falls back to `SentinelLeafQueryClause` for an unrecognized
  directive.
- **`BaseQueryClause`** (`@abstract`) — `.get:directive` (`@abstract`, must be
  overridden), `.create({ directive, body })` (static factory), `#buildClause()` → `{ [directive]: buildBody() }`, `#toJSON()`.
- **`BaseCompoundQueryClause`** (extends `BaseQueryClause`, `@abstract`) —
  `.createAsDeeply({ body, reifier })` (static factory; reifies descendant clauses then
  constructs), `.reifyDescendantBody({ rawClauses, reifier })` (`@abstract`).
- **`BaseLeafQueryClause`** (extends `BaseQueryClause`) — no members of its own; leaf
  clauses hold their body as-is (no nested clauses to reify).
- **`CLAUSE_CTORS`** — the default array passed to `QueryReifier.create()`; contains all
  13 leaf clause classes plus the 2 compound clause classes below.

Leaf clauses (`extends BaseLeafQueryClause`), by directive:

| Class | `.directive` |
| :-- | :-- |
| `ExistsLeafQueryClause` | `exists` |
| `FuzzyLeafQueryClause` | `fuzzy` |
| `IdsLeafQueryClause` | `ids` |
| `MatchAllLeafQueryClause` | `matchAll` |
| `MatchBoolPrefixLeafQueryClause` | `matchBoolPrefix` |
| `MatchLeafQueryClause` | `match` |
| `MatchNoneLeafQueryClause` | `matchNone` |
| `MatchPhaseLeafQueryClause` | `matchPhase` |
| `MatchPhasePrefixLeafQueryClause` | `matchPhasePrefix` |
| `PrefixLeafQueryClause` | `prefix` |
| `RangeLeafQueryClause` | `range` |
| `TermLeafQueryClause` | `term` |
| `TermsLeafQueryClause` | `terms` |
| `WildcardLeafQueryClause` | `wildcard` |
| `SentinelLeafQueryClause` | fallback for unrecognized directives (not in `CLAUSE_CTORS`) |

Compound clauses (`extends BaseCompoundQueryClause`; recurse into nested clauses via the
reifier):

- **`BoolCompoundQueryClause`** (`.directive = 'bool'`) — body `{ must?, mustNot?, should?, filter?, minimumShouldMatch?, boost? }`, each of `must`/`mustNot`/`should`/`filter` an array of (raw or reified) clauses.
- **`NestedCompoundQueryClause`** (`.directive = 'nested'`) — body `{ query, path, scoreMode = 'avg', ignoreUnmapped = true }`.

## Aggregations DSL

Mirrors the Query DSL for the `aggregations`/`aggs` part of a search request.

- **`AggregationsReifier`** — `.create({ Ctors = AGGREGATIONS_CLAUSE_CTORS } = {})`.
  `#reifyAggregationsClause({ clause })` (`@public`) — same shape as
  `QueryReifier#reifyQueryClause`, but the directive is resolved as the first clause key
  that isn't `'aggregations'`/`'aggs'` (so nested sub-aggregations can be
  distinguished from the directive itself). Falls back to `SentinelAggregationsClause`
  for an unrecognized directive.
- **`BaseAggregationsClause`** (`@abstract`) — same shape as `BaseQueryClause`
  (`.get:directive` abstract, `.create({ clause })`, `#buildClause()`, `#toJSON()`), but
  its constructor param is named `clause` rather than `body`.
- **`SentinelAggregationsClause`** — the fallback clause for unrecognized directives.
- **`AGGREGATIONS_CLAUSE_CTORS`** — currently an **empty array**: as of this version, no
  concrete aggregation clause types (e.g. terms/date-histogram buckets) are implemented
  yet, so `AggregationsReifier` always falls back to `SentinelAggregationsClause` unless
  given a custom `Ctors` array.

## Class: `UuidGenerator`

Small standalone UUID helper (used internally by `BaseDocument.generateUuid()`, which
calls `crypto.randomUUID()` directly rather than via this class — this class is offered
for application code that wants the same behavior injectable/mockable).

- `.create({ cryptoClient = this.crypto } = {})` — static factory method.
- `.get:crypto` — static getter. The Node.js `crypto` module.
- `#generateUuid()` — instance method. `this.cryptoClient.randomUUID()`.

## Usage

```js
import {
  BaseDocument,
  BaseIndex,
  Keyword,
  Text,
} from '@openreachtech/renchan-elasticsearch'

class ArticleDocument extends BaseDocument {
  static schema = {
    title: Text,
    slug: Keyword,
  }

  static buildMappingsPropertiesIndexDefinition () {
    return {
      title: { type: 'text' },
      slug: { type: 'keyword' },
    }
  }
}

class ArticleIndex extends BaseIndex {
  static get indexName () {
    return 'articles'
  }

  static get DocumentCtor () {
    return ArticleDocument
  }
}

const index = ArticleIndex.create({
  config: {
    BASE_URL: 'https://localhost:9200',
    AUTHORIZATION_KEY: process.env.ELASTICSEARCH_API_KEY,
  },
})

await index.createIndex()

await index.insertDocuments({
  sources: [
    { source: { title: 'Hello', slug: 'hello' } },
  ],
})

const capsule = await index.searchDocuments({
  clause: {
    query: { match: { title: 'Hello' } },
  },
})

capsule.documents
capsule.total
```
