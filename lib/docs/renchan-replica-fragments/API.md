# API

Source: `lib/**/*.js` (no `.d.ts` shipped via `"types"` — `package.json` has no `"types"` field at all, so nothing wires TypeScript consumers to it). A `types/replica-fragments.d.ts` exists in the published package but is not referenced by `package.json`; it only declares ambient `ReplicaFragmentsType.*` shape aliases (`Column`, `Entry`, `Predicate`, `FilterSource`, `EntrySource`, `SortSource`, ...) consumed by the JSDoc annotations in `lib/`, not the runtime class API itself — and one of its own imports is broken (`from '../lib/builders/SORT_COLUMN_TYPE.js'`, a path that doesn't exist; the real file is `lib/constants/SORT_COLUMN_TYPE.js`). This reference is therefore extracted directly from the JSDoc comments in `lib/`, cross-checked by actually running the builders (see Usage).

Only 5 members across the whole package carry an explicit `@public` tag: `BaseReplicaFragmentPredicate#buildSearchQuery()`, `ReplicaFragmentSortColumn#buildSortColumn()`, `ReplicaFragmentDocumentSourceBuilder#buildDocumentSource()` / `#buildUpsertDocumentScript()`, and `ReplicaFragmentSearchQueryBuilder#buildPredicates()`. `BaseReplicaFragmentIndex` — the class applications actually subclass — has no `@public` tags of its own at all, even though its instance methods (`putDocumentsFromColumnSources`, `upsertDocumentsFromColumns`, `searchDocumentsFromFilters`) are clearly the intended top-level entry points. The surface documented below is therefore the natural consumer-facing surface (the 5 tagged members, plus `BaseReplicaFragmentIndex`'s own methods and every class's `.create()` factory / constructor), not a strict `@public`-only filter; JSDoc tagging in this package is sparse and does not reliably mark the real API boundary.

## Exports (`index.js`)

No default export. All of the following are named exports:

- Constants (enums / lookup tables): `COLUMN_TYPE`, `SORT_COLUMN_TYPE`, `OPERATOR_KEY`, `COLUMN_TO_ENTRY_TABLE`, `OPERATOR_TO_PREDICATE_TABLE`
- `ArrayableScalarHash` — a `@openreachtech/mentsu-schema` scalar map (see below)
- Columns: `ReplicaFragmentColumn`, `ReplicaFragmentSortColumn`
- Entries: `BaseReplicaFragmentEntry`, `BooleanReplicaFragmentEntry`, `DatetimeReplicaFragmentEntry`, `DoubleReplicaFragmentEntry`, `IntegerReplicaFragmentEntry`, `KeywordReplicaFragmentEntry`, `TextReplicaFragmentEntry`, `SentinelReplicaFragmentEntry`
- Predicates: `BaseReplicaFragmentPredicate`, `BaseCompoundReplicaFragmentPredicate`, `BaseNotReplicaFragmentPredicate`, `EqualsReplicaFragmentPredicate`, `NotEqualsReplicaFragmentPredicate`, `InReplicaFragmentPredicate`, `NotInReplicaFragmentPredicate`, `GreaterThanReplicaFragmentPredicate`, `GreaterThanOrEqualReplicaFragmentPredicate`, `LessThanReplicaFragmentPredicate`, `LessThanOrEqualReplicaFragmentPredicate`, `ContainsReplicaFragmentPredicate`, `NotContainsReplicaFragmentPredicate`, `ExistsReplicaFragmentPredicate`, `NotExistsReplicaFragmentPredicate`, `WildcardReplicaFragmentPredicate`, `LikeReplicaFragmentPredicate`, `StartsWithReplicaFragmentPredicate`, `EndsWithReplicaFragmentPredicate`, `SentinelReplicaFragmentPredicate`, `AndCompoundReplicaFragmentPredicate`, `OrCompoundReplicaFragmentPredicate`
- Documents: `ReplicaFragmentDocument`
- Builders: `ReplicaFragmentDocumentSourceBuilder`, `ReplicaFragmentSearchQueryBuilder`, `ReplicaFragmentSearchSortBuilder`
- Resolver: `ReplicaFragmentEntryCtorResolver`
- Index facade: `BaseReplicaFragmentIndex`

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Class: `BaseReplicaFragmentIndex` — the main entry point

Extends `BaseIndex` from `@openreachtech/renchan-elasticsearch` (see `lib/docs/renchan-elasticsearch/API.md`). Applications subclass this once per replica-fragment index (overriding `BaseIndex`'s `@abstract` `.get:indexName`, and optionally connection `config`); it adds column-shaped convenience methods on top of the inherited raw document/search methods.

- `.get:DocumentCtor` — static getter, **overrides** `BaseIndex`'s abstract one. Returns `ReplicaFragmentDocument`.
- `.get:SearchQueryBuilderCtor` / `.get:SearchSortBuilderCtor` — static getters. Return `ReplicaFragmentSearchQueryBuilder` / `ReplicaFragmentSearchSortBuilder`; override to swap in a customized builder subclass.
- `.createSearchQueryBuilder({ filterSource })` / `.createSearchSortBuilder({ sortSources })` — static methods, thin wrappers around `SearchQueryBuilderCtor.create(...)` / `SearchSortBuilderCtor.create(...)`.
- `#get:Ctor` — instance getter, `this.constructor`.
- `#putDocumentsFromColumnSources({ documents, requestInput = {} })` — instance method. `documents` is `Array<{ uuid, source: { tableId, recordId }, columns: Array<{ columnId, columnType, value, isOverriddenArray? }> }>`. For each document, builds the column source via `ReplicaFragmentDocumentSourceBuilder` and merges it into `source`, then calls the inherited `#putDocuments({ sources, requestInput })` (bulk `index`-action upsert — replaces the whole document). Returns whatever `#putDocuments()` returns (a `BulkDocumentsElasticsearchCapsule`).
- `#upsertDocumentsFromColumns({ documents, requestInput = {} })` — instance method. `documents` is `Array<{ uuid, source, columns }>` (same `columns` shape as above). Builds a Painless `script` + `upsert` fallback body per document (via `#buildUpsertDocumentSourceAsScript()`) and calls the inherited `#bulkUpsertDocumentsWithScript({ sources, requestInput })`.
- `#buildUpsertDocumentSourceAsScript({ document: { uuid, source, columns } })` — instance method. Returns `{ uuid, source: { script: buildUpsertScriptCode(), upsert: buildUpsertFallbackSource() } }`.
- `#buildUpsertScriptCode({ columns })` — instance method. `ReplicaFragmentDocumentSourceBuilder.create({ sources: columns }).buildUpsertDocumentScript()`.
- `#buildUpsertFallbackSource({ source, columns })` — instance method. The document body used if the upsert script's target document doesn't exist yet: starts from all seven column arrays empty (`textColumns: []`, ... `datetimeColumns: []`), then spreads `source` and the built `{ ...columnType: [...] }` groups over it.
- `#searchDocumentsFromFilters({ filters = [], queries = [], orders = [], clause, requestInput = {} })` — instance method. `clause` is the rest of the search clause (everything except `query`/`sort`, which this method fills in). Builds `query` via `#buildSearchQueryFromFilters({ filters, queries })` and `sort` via `#buildSearchSortFromSortSources({ sortSources: orders })`, then calls the inherited `#searchDocuments({ clause: { ...clause, query, sort }, requestInput })`.
- `#buildSearchQueryFromFilters({ filters, queries })` — instance method. Builds one predicate tree from `filters` via `Ctor.createSearchQueryBuilder({ filterSource: filters }).buildPredicates()`, drops it into an array together with the raw `queries`, filters out any falsy entry (see `SentinelReplicaFragmentPredicate` below — it returns `null` for unrecognized operators, not for an empty `filters` array; `filters: []` instead builds a valid but empty `AndCompoundReplicaFragmentPredicate`, i.e. `{ bool: { must: [] } }`, which is truthy and passes through), and wraps the result as `{ bool: { must: [...] } }`.
- `#buildSearchSortFromSortSources({ sortSources })` — instance method. `Ctor.createSearchSortBuilder({ sortSources }).buildSorts()`.

## Class: `ReplicaFragmentDocument` extends `BaseDocument`

The Elasticsearch document type for a replica fragment: one `(tableId, recordId)` row, with its column values grouped by Elasticsearch field type into 7 nested arrays.

- `.schema` (static property, `@override`) — a `@openreachtech/mentsu-schema` schema: `tableId`/`recordId` are `Integer`; `textColumns`/`wildcardColumns`/`keywordColumns`/`booleanColumns`/`integerColumns`/`doubleColumns`/`datetimeColumns` are each `[{ columnId: Integer, value: <Arrayable> }]` (a one-element array schema, i.e. every item in the array is validated against that single object shape — see `CompositeScalar` in `lib/docs/mentsu-schema/API.md`), where `<Arrayable>` is the matching `*Arrayable` union from `ArrayableScalarHash` below (so `value` accepts either a bare scalar or an array of that scalar).
- `.buildMappingsPropertiesIndexDefinition()` (static method, `@override`) — returns the Elasticsearch `mappings.properties` object: `tableId`/`recordId`/`*.columnId` → `integer`; each of the 7 arrays is `{ type: 'nested', properties: { columnId: { type: 'integer' }, value: { type: <es-type> } } }`, where `<es-type>` is `text` (textColumns), `wildcard` (wildcardColumns), `keyword` (keywordColumns), `boolean`, `integer`, `double`, or `date` (datetimeColumns) respectively.
- `#get:documentSource` — instance getter. `this.source?.Source ?? null` (the raw ES `_source` hash of a search hit).
- `#get:tableId` / `#get:recordId` — instance getters. `documentSource?.tableId ?? null` / `documentSource?.recordId ?? null`.

## Module: `ArrayableScalarHash` (`lib/documents/ArrayableScalarHash.js`)

Not a class — a plain object (and matching named exports) of `@openreachtech/mentsu-schema` `UnionScalar`s, each accepting either a bare value or an array of that value: `BoolArrayable`, `DatetimeArrayable`, `DoubleArrayable`, `IntegerArrayable`, `KeywordArrayable`, `TextArrayable` (e.g. `TextArrayable = Union.of(Text, [Text])`). Used to build `ReplicaFragmentDocument.schema`'s per-column `value` fields.

## Class: `ReplicaFragmentColumn`

Identifies one column: a nullable numeric `id` plus a `COLUMN_TYPE` (which Elasticsearch field group it belongs to).

- `.COLUMNS_TABLE` — static property, `Record<COLUMN_TYPE, string>` mapping each `COLUMN_TYPE` to its document field name (`BOOLEAN → 'booleanColumns'`, `DATETIME → 'datetimeColumns'`, `DOUBLE → 'doubleColumns'`, `INTEGER → 'integerColumns'`, `KEYWORD → 'keywordColumns'`, `TEXT → 'textColumns'`).
- `#id` / `#type` — instance properties set at construction.
- `.create({ id = null, type = null } = {})` — static factory method.
- `.createAsNullable()` — static method. `this.create({ id: null, type: null })`.
- `#get:Ctor` — instance getter, `this.constructor`.
- `#get:columnKey` — instance getter. `Ctor.COLUMNS_TABLE[this.type] ?? null` — the document field name for this column's type, or `null` if `type` doesn't resolve.
- `#hasColumnId()` — instance method. `this.id !== null`.

## Class: `ReplicaFragmentSortColumn`

Builds one Elasticsearch `sort` clause entry for a nested column value.

- `#column` / `#direction` / `#path` — instance properties set at construction.
- `.create({ column, direction = 'asc', path = this.resolveSortColumnType({ columnType: column.type }) })` — static factory method.
- `.get:PREDICATE_COLUMN_ID_KEY` / `.get:PREDICATE_VALUE_KEY` — static getters, `'columnId'` / `'value'`.
- `.get:TextCaseConverterCtor` — static getter, `@openreachtech/mentsu-text-case-tools`'s `TextCaseConverter`.
- `.resolveSortColumnType({ columnType })` — static method. Maps a `SORT_COLUMN_TYPE` to its document field name via an inline table (`BOOLEAN → 'booleanColumns'`, `DATETIME → 'datetimeColumns'`, `DOUBLE → 'doubleColumns'`, `INTEGER → 'integerColumns'`, `KEYWORD → 'keywordColumns'`; note `SORT_COLUMN_TYPE` has no `TEXT` entry, so text columns can't be sorted through this class). Returns `undefined` (not a thrown error — the code comments this as "query will be broken") if `columnType` doesn't match.
- `.createTextCaseConverter()` — static method, `TextCaseConverterCtor.create()`.
- `#get:Ctor` — instance getter, `this.constructor`.
- `#buildSortColumn()` — instance method, **`@public`**. Returns one Elasticsearch nested sort entry: `{ [generateColumnPath()]: { order: this.direction, nested: { path: <snake_case path>, filter: { term: { '<path>.columnId': this.column.id } } } } }`. The nested `path` is converted to snake_case (`toDelimiterCase`) but the `term` field key and the top-level sort key both keep `this.path` as-is (camelCase, e.g. `keywordColumns`) — see the "Naming convention" note below for why that's intentional, not a bug.
- `#generateColumnPath()` — instance method. `` `${this.path}.${Ctor.PREDICATE_VALUE_KEY}` ``, e.g. `'keywordColumns.value'`.

## Class: `ReplicaFragmentSearchQueryBuilder`

Turns a filter-source tree (plain objects: `{ columnId?, columnType?, operator, operand }`, where `operand` can itself be an array of such objects for `AND`/`OR`) into a predicate-object tree, then into an Elasticsearch query body.

- `.OPERATOR_TO_PREDICATE_TABLE` — static property, the `OPERATOR_TO_PREDICATE_TABLE` constant (maps every `OPERATOR_KEY` to its predicate class).
- `#bootPredicate` — instance property set at construction (the root `BaseReplicaFragmentPredicate` instance).
- `.create({ filterSource })` — static factory method. `filterSource` is one filter object, **or an array of them** (an array is treated as an implicit top-level `AND`). Builds `bootPredicate` via `createBootPredicate()`.
- `.get:ColumnCtor` — static getter, `ReplicaFragmentColumn`.
- `.createColumn({ columnId = null, columnType = null })` / `.createNullableColumn()` — static methods, thin wrappers around `ColumnCtor.create(...)` / `.createAsNullable()`.
- `.createBootPredicate({ filterSource })` — static method. Normalizes `filterSource` (`normalizePredicateSource()`) then builds the predicate tree (`createPredicate()`).
- `.normalizePredicateSource({ filterSource })` — static method. If `filterSource` is an array, wraps it as an `AND`-compound predicate source (`buildPredicateSourceAsAndCompound()`); otherwise builds a single predicate source (`buildPredicateSource()`).
- `.buildPredicateSourceAsAndCompound({ sources })` — static method. Returns `{ column: createNullableColumn(), operator: OPERATOR_KEY.AND, operand: sources.map(...) }` — each source becomes `{ column: createColumn({ columnId, columnType }), operator, operand }`.
- `.buildPredicateSource({ source: { columnId, columnType, operator, operand } })` — static method. Recurses into `operand` when it's itself a compound filter-source array (`isCompoundOperand()`); otherwise returns `{ column: createColumn(...), operator, operand }` as-is.
- `.createPredicate({ source: { column, operator, operand } })` — static method. Recurses into `operand` when compound, resolving each nested predicate first; resolves the predicate constructor via `resolvePredicateCtor({ operator })`; returns `PredicateCtor.create({ column, operand: resolvedOperand })`.
- `.isCompoundOperand({ operand })` — static method. `true` iff `operand` is an array whose first element is an `object` (i.e. a nested filter-source array, not a plain value/value-array operand like `IN`'s array of scalars).
- `.resolvePredicateCtor({ operator })` — static method. `OPERATOR_TO_PREDICATE_TABLE[operator] ?? SentinelReplicaFragmentPredicate` (unknown operators silently fall back to the no-op sentinel).
- `#buildPredicates()` — instance method, **`@public`**. `this.bootPredicate.buildSearchQuery()` — the final Elasticsearch query-DSL object, or `null` if the boot predicate ended up a `SentinelReplicaFragmentPredicate` (only when `filterSource`'s `operator` — or, for an array `filterSource`, some nested item's `operator` — doesn't match any key in `OPERATOR_TO_PREDICATE_TABLE`). `filterSource: []` does **not** trigger this: it resolves to an `AndCompoundReplicaFragmentPredicate` with zero operands, i.e. `{ bool: { must: [] } }` (verified — see Usage).

## Class: `ReplicaFragmentSearchSortBuilder`

Turns an array of sort sources (`{ columnId?, columnType?, direction?, path? }`) into `ReplicaFragmentSortColumn` instances and then into Elasticsearch sort clauses.

- `#sortColumns` — instance property set at construction.
- `.create({ sortSources })` — static factory method. Builds `sortColumns` via `createSortColumns()`.
- `.get:SortColumnCtor` — static getter, `ReplicaFragmentSortColumn`.
- `.createSortColumns({ sortSources })` — static method. `sortSources.map(source => createSortColumn({ source }))`.
- `.createSortColumn({ source: { columnId, columnType, direction, path } })` — static method. Builds a `ReplicaFragmentColumn` from `{ id: columnId, type: columnType }`, then `SortColumnCtor.create({ column, direction, path })`.
- `#buildSorts()` — instance method. `this.sortColumns.map(it => it.buildSortColumn())` — an array of Elasticsearch sort entries, suitable for a search `clause.sort`.

## Class: `ReplicaFragmentDocumentSourceBuilder`

Turns column-value sources (`{ columnId?, columnType?, value, isOverriddenArray? }`) into entry instances, then into either a full document source (for insert/replace) or a Painless upsert script (for partial update).

- `#entries` — instance property set at construction.
- `.create({ sources })` — static factory method. Builds `entries` via `createEntries()`.
- `.get:EntryCtorResolver` — static getter, `ReplicaFragmentEntryCtorResolver`.
- `.createEntries({ sources })` / `.createEntry({ source: { columnType = null, columnId = null, value, isOverriddenArray = false } })` — static methods. `createEntry` resolves the entry constructor via `resolveEntryCtor({ columnType, value })` and calls `EntryCtor.create({ columnId, value, isOverriddenArray })`.
- `.createEntryCtorResolver(input)` / `.resolveEntryCtor({ columnType = null, value = null })` — static methods, thin wrappers delegating to `EntryCtorResolver`.
- `#buildDocumentSource()` — instance method, **`@public`**. For each of the 7 column groups (`textColumns`, `wildcardColumns`, `keywordColumns`, `booleanColumns`, `integerColumns`, `doubleColumns`, `datetimeColumns`), collects `{ columnId, value }` from every entry whose matching `build<Group>Entry()` returns itself (see the entries table below — a `KeywordReplicaFragmentEntry` contributes to **both** `keywordColumns` and `wildcardColumns`, and `TextReplicaFragmentEntry` to **both** `textColumns` and `wildcardColumns`), then **omits any group with zero entries** from the result object. Suitable as (part of) a `ReplicaFragmentDocument` source for insert/replace.
- `#buildUpsertDocumentScript()` — instance method, **`@public`**. Returns `{ source, params }` for an Elasticsearch `update`-by-script request: `source` is generated Painless code (`generateUpsertScript()`), `params` maps each entry's `columnId` to `{ columnId, value }` (via `buildScriptParamsInput()`).
- `#generateUpsertScript()` — instance method. For each of the 7 groups (using **snake_case** script-side names: `text_columns`, `wildcard_columns`, `keyword_columns`, `boolean_columns`, `integer_columns`, `datetime_columns`, `double_columns`) and each entry contributing to that group, emits one Painless snippet via `generateUpsertColumnScript()`, and joins them all with blank lines.
- `#generateUpsertColumnScript({ columnsKey, entry })` — instance method. If `entry.value` is an array, delegates to `generateUpsertColumnScriptFromArray()`; otherwise to `generateUpsertColumnScriptAsReplacing()`.
- `#generateUpsertColumnScriptAsReplacing({ columnsKey, entry })` — instance method. Emits Painless that removes any existing array element with the same `column_id` and appends `params.<columnId>` in its place (full replace of that column's entry).
- `#generateUpsertColumnScriptFromArray({ columnsKey, entry })` — instance method. If `entry.isOverriddenArray` is `true`, behaves like `generateUpsertColumnScriptAsReplacing()` (full replace). Otherwise emits Painless that **merges**: collects the union (via a `LinkedHashSet`, so duplicates from the existing value are deduped) of the existing array/scalar values for that `column_id` with the new `params.<columnId>.value` array, removes the old entry, and re-adds one entry holding the merged array.
- `#buildScriptParamsInput()` — instance method. `Object.fromEntries(entries.map(it => [it.columnId, { columnId: it.columnId, value: it.value }]))`.

**Note on the generated Painless (verified by running the builder — see Usage):** the script references parameters as `params.<columnId>` (e.g. `params.101`), a bare numeric property-style access. This is only valid Painless if `columnId` is treated as a map key lookup at the language level, not literal dot-property syntax — inspect the generated `source` string for your actual column IDs before relying on it in a real Elasticsearch cluster.

## Class: `ReplicaFragmentEntryCtorResolver`

Resolves which `BaseReplicaFragmentEntry` subclass should represent a given `{ columnType, value }` pair.

- `.columnToEntryLookup` — static property, the `COLUMN_TO_ENTRY_TABLE` constant.
- `#columnType` / `#value` — instance properties set at construction.
- `.create({ columnType = null, value = null } = {})` — static factory method.
- `#get:Ctor` — instance getter, `this.constructor`.
- `#resolveEntryCtor()` — instance method. If `columnType` resolves via `resolveEntryCtorByColumnType()`, returns that. Otherwise falls through to `buildSwitchExpressionEntries()` and returns the first matching entry constructor, or `SentinelReplicaFragmentEntry` if none match.
- `#resolveEntryCtorByColumnType()` — instance method. `Ctor.columnToEntryLookup[this.columnType] ?? null`.
- `#buildSwitchExpressionEntries()` — instance method. Type-sniffs `value` (or `value[0]` if `value` is an array) in this order: `string` → `TextReplicaFragmentEntry`, `instanceof Date` → `DatetimeReplicaFragmentEntry`, `boolean` → `BooleanReplicaFragmentEntry`, `Number.isInteger(...)` → `IntegerReplicaFragmentEntry`, any other `number` → `DoubleReplicaFragmentEntry`. Note this path never picks `KeywordReplicaFragmentEntry` — a `columnType` of `COLUMN_TYPE.KEYWORD` must be passed explicitly to get keyword semantics (which also populates `wildcardColumns`); an untyped string value defaults to `TextReplicaFragmentEntry` (which also populates `wildcardColumns`, but not `keywordColumns`).

## Class: `BaseReplicaFragmentEntry` (abstract) and concretes

One value for one column, ready to be folded into a document source or upsert script by `ReplicaFragmentDocumentSourceBuilder`.

- `#columnId` / `#value` / `#isOverriddenArray` — instance properties set at construction.
- `.create({ columnId = null, value, isOverriddenArray = false })` — static factory method.
- `#buildTextColumnsEntry()` / `#buildWildcardColumnsEntry()` / `#buildKeywordColumnsEntry()` / `#buildBooleanColumnsEntry()` / `#buildIntegerColumnsEntry()` / `#buildDoubleColumnsEntry()` / `#buildDatetimeColumnsEntry()` — instance methods, `@abstract`. Base implementation returns `[]` for all seven; each concrete subclass overrides only the ones it contributes to, returning `[this]`.
- `#toColumnEntries()` — instance method. `[{ columnId: this.columnId, value: this.value }]`.

| Concrete class | Contributes to (`build*Entry()` returning `[this]`) |
| :-- | :-- |
| `TextReplicaFragmentEntry` | `textColumns`, `wildcardColumns` |
| `KeywordReplicaFragmentEntry` | `keywordColumns`, `wildcardColumns` |
| `BooleanReplicaFragmentEntry` | `booleanColumns` |
| `IntegerReplicaFragmentEntry` | `integerColumns` |
| `DoubleReplicaFragmentEntry` | `doubleColumns` |
| `DatetimeReplicaFragmentEntry` | `datetimeColumns` |
| `SentinelReplicaFragmentEntry` | *(none — pure no-op fallback, all seven stay `[]`)* |

## Class: `BaseReplicaFragmentPredicate` (abstract) and its two abstract subclasses

One filter condition on one (possibly column-id-scoped) nested column array, expressed as an Elasticsearch nested `bool` query.

- `#column` / `#operand` / `#path` — instance properties set at construction.
- `.create({ column = this.createColumnAsNullable(), operand, path = this.resolveNestedPath({ column, operand }) })` — static factory method.
- `.get:PREDICATE_COLUMN_ID_KEY` / `.get:PREDICATE_VALUE_KEY` — static getters, `'columnId'` / `'value'`.
- `.get:ColumnCtor` — static getter, `ReplicaFragmentColumn`.
- `.get:boolKey` — static getter, `@abstract`. Throws `Error('<Name>.get:boolKey must be inherited')` unless overridden (the `bool` clause key: `'must'` for every concrete predicate here, `'should'` only for `OrCompoundReplicaFragmentPredicate`).
- `.get:stringOperandColumnsKey` — static getter, `@abstract`. Throws `Error('<Name>.get:stringOperandColumnsKey must be inherited')` unless overridden; the fallback document field (`'textColumns'` / `'wildcardColumns'` / `'keywordColumns'`, or `null` for compound predicates) used when the operand is a string and no explicit `column` was given.
- `.createColumnAsNullable()` — static method. `ColumnCtor.createAsNullable()`.
- `.resolveNestedPath({ column, operand })` — static method. Uses `column.columnKey` if the column has one; otherwise type-sniffs `operand` (or `operand[0]` if an array) via `buildSwitchExpressions()`: `instanceof Date` → `'datetimeColumns'`, `boolean` → `'booleanColumns'`, `Number.isInteger` → `'integerColumns'`, other `number` → `'doubleColumns'`, anything else → `stringOperandColumnsKey`.
- `.buildSwitchExpressions({ operand })` — static method, `@abstract` in the sense that subclasses only need to set `stringOperandColumnsKey` to change its last branch (see above).
- `#get:Ctor` — instance getter, `this.constructor`.
- `#buildSearchQuery()` — instance method, **`@public`**, `@abstract`-in-spirit (default calls `buildNestedClause()`; `BaseCompoundReplicaFragmentPredicate` and `SentinelReplicaFragmentPredicate` override it). The method applications call to get a full Elasticsearch query-DSL clause.
- `#buildNestedClause()` — instance method. `{ nested: buildNestedClauseBody() }`.
- `#buildNestedClauseBody()` — instance method. `{ path: <this.path, snake_cased>, query: buildNestedQuery() }`.
- `#buildNestedQuery()` — instance method. `{ bool: { [Ctor.boolKey]: buildColumnPredicates() } }`.
- `#buildColumnPredicates()` — instance method. `[buildColumnIdPredicate()]` (only if `column.hasColumnId()`) followed by `buildValuePredicate()`.
- `#buildColumnIdPredicate()` — instance method. `{ term: { '<this.path>.columnId': this.column.id } }` — **not** snake-cased (see the naming-convention note below).
- `#buildValuePredicate()` — instance method, `@abstract`. Throws `Error('<Name>#buildValuePredicate() must be inherited')` unless overridden.

**`BaseNotReplicaFragmentPredicate`** (extends `BaseReplicaFragmentPredicate`, still abstract) — for negated operators (`NOT_IN`, `NOT_EQUALS`, `NOT_CONTAINS`, `NOT_EXISTS`): `.get:boolKey` returns `'must'` (the *inner* clause still uses `must`, not `mustNot`), and `#buildNestedClause()` is overridden to wrap the whole thing as `{ bool: { mustNot: [super.buildNestedClause()] } }`.

**`BaseCompoundReplicaFragmentPredicate`** (extends `BaseReplicaFragmentPredicate`, still abstract) — for `AND`/`OR`, whose `operand` is an **array of predicate instances** rather than a scalar/array-of-scalars: `.get:stringOperandColumnsKey` returns `null`; `#buildSearchQuery()` is overridden to `{ bool: { [Ctor.boolKey]: operand.map(it => it.buildSearchQuery()) } }` (each child predicate builds its own full query, they're just combined under one `bool` key — no nested wrapping at this level).

### Concrete predicates (`OPERATOR_KEY` → predicate, via `OPERATOR_TO_PREDICATE_TABLE`)

Every concrete predicate below only overrides `.get:boolKey`, `.get:stringOperandColumnsKey`, and `#buildValuePredicate()` — everything else comes from `BaseReplicaFragmentPredicate` (or `BaseNotReplicaFragmentPredicate`) as described above. `<path>` = `` `${this.path}.${PREDICATE_VALUE_KEY}` `` (e.g. `keywordColumns.value`), always the un-cased `this.path` — **except** `EXISTS`/`NOT_EXISTS` (see below), which snake-case it (verified — see the note after this table).

| `OPERATOR_KEY` | Class | Extends | `stringOperandColumnsKey` | `buildValuePredicate()` clause |
| :-- | :-- | :-- | :-- | :-- |
| `EQUALS` | `EqualsReplicaFragmentPredicate` | Base | `keywordColumns` | `{ term: { <path>: operand } }` |
| `NOT_EQUALS` | `NotEqualsReplicaFragmentPredicate` | BaseNot | `keywordColumns` | `{ term: { <path>: operand } }` |
| `IN` | `InReplicaFragmentPredicate` | Base | `keywordColumns` | `{ terms: { <path>: operand } }` (`operand` is an array) |
| `NOT_IN` | `NotInReplicaFragmentPredicate` | BaseNot | `keywordColumns` | `{ terms: { <path>: operand } }` |
| `GREATER_THAN` | `GreaterThanReplicaFragmentPredicate` | Base | `keywordColumns` | `{ range: { <path>: { gt: operand } } }` |
| `GREATER_THAN_OR_EQUAL` | `GreaterThanOrEqualReplicaFragmentPredicate` | Base | `keywordColumns` | `{ range: { <path>: { gte: operand } } }` |
| `LESS_THAN` | `LessThanReplicaFragmentPredicate` | Base | `keywordColumns` | `{ range: { <path>: { lt: operand } } }` |
| `LESS_THAN_OR_EQUAL` | `LessThanOrEqualReplicaFragmentPredicate` | Base | `keywordColumns` | `{ range: { <path>: { lte: operand } } }` |
| `CONTAINS` | `ContainsReplicaFragmentPredicate` | Base | `textColumns` | `{ match: { <path>: operand } }` |
| `NOT_CONTAINS` | `NotContainsReplicaFragmentPredicate` | BaseNot | `textColumns` | `{ match: { <path>: operand } }` |
| `EXISTS` | `ExistsReplicaFragmentPredicate` | Base | `wildcardColumns` | `{ exists: { field: <path>.value, but fully snake-cased via TextCaseConverter, e.g. `'text_columns.value'` } }` — unlike every other predicate here, `EXISTS` snake-cases its field key too, not just the nested `path` |
| `NOT_EXISTS` | `NotExistsReplicaFragmentPredicate` | BaseNot | `wildcardColumns` | same as `EXISTS` |
| `WILDCARD` | `WildcardReplicaFragmentPredicate` | Base | `wildcardColumns` | `{ wildcard: { <path>: operand } }` (operand used as-is, e.g. `'a*c'`) |
| `LIKE` | `LikeReplicaFragmentPredicate` | Base | `wildcardColumns` | `{ wildcard: { <path>: '*' + operand + '*' } }` |
| `STARTS_WITH` | `StartsWithReplicaFragmentPredicate` | Base | `wildcardColumns` | `{ wildcard: { <path>: operand + '*' } }` |
| `ENDS_WITH` | `EndsWithReplicaFragmentPredicate` | Base | `wildcardColumns` | `{ wildcard: { <path>: '*' + operand } }` |
| `AND` | `AndCompoundReplicaFragmentPredicate` | BaseCompound | *(n/a — `boolKey = 'must'`)* | *(n/a, see above)* |
| `OR` | `OrCompoundReplicaFragmentPredicate` | BaseCompound | *(n/a — `boolKey = 'should'`)* | *(n/a, see above — also re-overrides `#buildSearchQuery()` identically to the parent, i.e. redundantly)* |
| *(no operator — internal fallback)* | `SentinelReplicaFragmentPredicate` | Base | `null` | `#buildSearchQuery()` is overridden to always return `null` (used by `resolvePredicateCtor()`'s `?? SentinelReplicaFragmentPredicate` fallback, i.e. only when an `operator` value doesn't match any key in `OPERATOR_TO_PREDICATE_TABLE` — **not** triggered by an empty filter list, see `ReplicaFragmentSearchQueryBuilder` above) |

## Naming convention: why nested `path` is snake_case but field keys aren't

Every predicate/sort builder above converts the nested query's own `path` value (e.g. `'keywordColumns'` → `'keyword_columns'`) via `TextCaseConverter`, but leaves the `term`/`range`/`wildcard`/`match` field-name **keys** (e.g. `'keywordColumns.value'`) in camelCase. This isn't inconsistent: this package composes with `@openreachtech/renchan-elasticsearch`'s `ElasticsearchRequestBody`, which serializes the *entire* outgoing request body's object **keys** to snake_case before sending it to Elasticsearch (so `keywordColumns.value` becomes `keyword_columns.value` on the wire regardless). A nested `path` is a plain **string value**, not an object key, so that automatic conversion never touches it — these classes have to snake_case it themselves to keep it consistent with the keys the outer layer will later convert. Verified directly (see Usage): calling the builders in isolation therefore shows camelCase field keys next to an already-snake_case `path`/`nested.path`.

`ExistsReplicaFragmentPredicate`/`NotExistsReplicaFragmentPredicate` are the one exception: `exists.field` is itself a plain **string value** (not an object key an outer layer would snake_case for you), so this package snake-cases it manually too — verified: `EXISTS` on a `TEXT` column produces `{ nested: { path: 'text_columns', query: { bool: { must: [{ term: { 'textColumns.columnId': 5 } }, { exists: { field: 'text_columns.value' } }] } } } }` — note `textColumns.columnId` stays camelCase (an object key) right next to `text_columns.value` (a string value), inside the very same query.

## Usage

```js
import {
  COLUMN_TYPE,
  OPERATOR_KEY,
  ReplicaFragmentSearchQueryBuilder,
  ReplicaFragmentDocumentSourceBuilder,
  ReplicaFragmentSearchSortBuilder,
  BaseReplicaFragmentIndex,
} from '@openreachtech/renchan-replica-fragments'

// 1. Define a concrete index (per `BaseIndex`'s own conventions -- see
//    lib/docs/renchan-elasticsearch/API.md for `.get:indexName`, `config`, etc.)
class UserRecordFragmentIndex extends BaseReplicaFragmentIndex {
  static get indexName () {
    return 'user-record-fragments'
  }
}

// 2. Build a search query from filters (verified output, no ES connection needed):
const queryBuilder = ReplicaFragmentSearchQueryBuilder.create({
  filterSource: [
    {
      columnId: 101,
      columnType: COLUMN_TYPE.KEYWORD,
      operator: OPERATOR_KEY.EQUALS,
      operand: 'active',
    },
    {
      columnId: 202,
      columnType: COLUMN_TYPE.INTEGER,
      operator: OPERATOR_KEY.GREATER_THAN_OR_EQUAL,
      operand: 18,
    },
  ],
})
queryBuilder.buildPredicates()
// -> { bool: { must: [
//      { nested: { path: 'keyword_columns', query: { bool: { must: [
//        { term: { 'keywordColumns.columnId': 101 } },
//        { term: { 'keywordColumns.value': 'active' } },
//      ] } } } },
//      { nested: { path: 'integer_columns', query: { bool: { must: [
//        { term: { 'integerColumns.columnId': 202 } },
//        { range: { 'integerColumns.value': { gte: 18 } } },
//      ] } } } },
//    ] } }

// 3. Build a document source from column values, for inserting/replacing:
const sourceBuilder = ReplicaFragmentDocumentSourceBuilder.create({
  sources: [
    { columnId: 101, columnType: COLUMN_TYPE.KEYWORD, value: 'active' },
    { columnId: 202, columnType: COLUMN_TYPE.INTEGER, value: 18 },
  ],
})
sourceBuilder.buildDocumentSource()
// -> { wildcardColumns: [{ columnId: 101, value: 'active' }],
//      keywordColumns: [{ columnId: 101, value: 'active' }],
//      integerColumns: [{ columnId: 202, value: 18 }] }

// 4. Or, together with an index instance, insert/search using column-shaped input directly:
const index = UserRecordFragmentIndex.create()

await index.putDocumentsFromColumnSources({
  documents: [
    {
      uuid: 'doc-uuid-1',
      source: { tableId: 1, recordId: 42 },
      columns: [
        { columnId: 101, columnType: COLUMN_TYPE.KEYWORD, value: 'active' },
        { columnId: 202, columnType: COLUMN_TYPE.INTEGER, value: 18 },
      ],
    },
  ],
})

const capsule = await index.searchDocumentsFromFilters({
  filters: {
    columnId: 101,
    columnType: COLUMN_TYPE.KEYWORD,
    operator: OPERATOR_KEY.EQUALS,
    operand: 'active',
  },
  orders: [
    { columnId: 202, columnType: COLUMN_TYPE.INTEGER, direction: 'desc' },
  ],
  clause: {},
})
capsule.documents // Array<ReplicaFragmentDocument>
```

Steps 2 and 3 above were run directly against the installed package (`ReplicaFragmentSearchQueryBuilder`/`ReplicaFragmentDocumentSourceBuilder`/`ReplicaFragmentSearchSortBuilder` need no Elasticsearch connection); the shown output is the actual result. Step 4 additionally requires a real (or mocked) Elasticsearch connection via `@openreachtech/renchan-elasticsearch`'s `BaseIndex.create({ config })` and was not executed here.
