# API

Source: JSDoc across `lib/models/`, `lib/models/mixins/`, `lib/models/hookPayloads/`, `lib/models/tools/`, `lib/tools/`, and `lib/*.js`. `package.json` has no `"types"` field; `types/sequelize.d.ts` only declares an ambient `sequelize` namespace (type aliases for the classes below) and is not itself an API surface. Only one member in the whole package is tagged `@public` (`DeepBulkClassLoader#loadClasses`), so the surface below is chosen by judgment: every exported class's constructor, static factory methods, and the instance/static members a consumer would realistically call — internal-only recursion helpers are omitted or only mentioned in passing.

## Exports (`index.js`)

All exports are named (no default export from `index.js` itself). Two are CommonJS interop (`.cjs` files loaded via `module.createRequire`); the rest are ES module default exports re-exported by name:

- `MigrationAttributeFactory`, `TimestampSeedsSupplier` — CJS interop exports.
- `BaseRenchanModel`, `RenchanModel`, `FertileForestModel` — the model base-class hierarchy.
- `ModelAttributeFactory`, `SubqueryGenerator`, `SubqueryRegExpBuilder`, `WhereClauseExtractor` — query/attribute-building tools.
- `BaseMixinModel`, `AttributesLinearizerMixinModel`, `BackupMixinModel`, `LatestStatusMixinModel`, `PaginationMixinModel`, `ReferralMixinModel`, `SuiteVersionMixinModel` — mixin models.
- `BaseHookPayload`, `ReferralMixinHookPayload` — hook-payload value objects used with `loadHookPayload()`/`unloadHookPayload()`.
- `RequestPagination`, `RequestSort`, `ResponsePagination` — pagination/sort value objects.
- `SequelizeActivator`, `SequelizeClientGenerator`, `SequelizeConfigResolver`, `RenchanModelsLoader` — client/model bootstrapping.
- `DeepBulkClassLoader` — recursive class loader used internally by the loaders above.
- `IncludeOptionBuilder`, `IncludeOptionNode` — build Sequelize `include` option trees from dot-delimited association paths.
- `RootPath` — path resolver relative to a base directory (same shape as the standalone `mentsu-rootpath` package, bundled here too).

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Model hierarchy

The core usage pattern: application models extend `RenchanModel` (or `FertileForestModel` for tree-structured entities), both of which extend `BaseRenchanModel`, which extends `Sequelize.Model` directly.

### Class: `BaseRenchanModel`

Abstract. Extends `SequelizeHandler.Model`. Adds transaction/subquery/hook-payload conveniences shared by every model.

- `.get:_` — static getter. `this.sequelize?.models ?? {}`, i.e. the full model hash once the client is initialized.
- `.get:Mixins` — static getter. Defaults to `[]`; subclasses override it to declare which mixin classes (see below) apply to the model.
- `.get:practicalAttributeNames` — static getter. All attribute names except `createdAt`, `updatedAt`, `deletedAt`.
- `.get:queryGenerator` — static getter. The Sequelize dialect's internal `QueryGenerator` instance (`sequelize.getQueryInterface().queryGenerator`).
- `.getTargetAssociation(TargetModel)` — static method. Finds the `Association` whose `target` is `TargetModel`, or `null`.
- `.quoteColumnWithTable({ column })` — static method. Returns `` `table`.`column` `` quoted per-dialect.
- `.beginTransaction(autoCallback, options)` — static async method. Wraps `sequelize.transaction()`, defaulting `isolationLevel` to `SERIALIZABLE`.
- `.addSubquery({ name, generator, options: { override } })` — static method. Registers a named subquery generator function; throws `Error` if `name` already exists unless `override: true`.
- `.getSubqueryOptionsGenerator(name)` — static method. Looks up a registered subquery generator, or `null`.
- `.createSubqueryGenerator()` — static method. Returns `SubqueryGenerator.create({ Model: this })`.
- `.subquery(name, ...values)` — static method. Runs the named subquery generator with `values`, then returns a `Sequelize.literal()` via `SubqueryGenerator`. Throws `Error` if `name` was never registered with `.addSubquery()`.
- `.get:now` — static getter. `new Date()`.
- `#get:now` — instance getter. Delegates to `this.constructor.now`.
- `#get:hookPayloadPool` — instance getter. A per-instance `WeakMap` (keyed by mixin class) used to pass data between Sequelize hooks on the same entity.
- `#loadHookPayload({ tally, payload })` — instance method. Stores `payload` in `hookPayloadPool` keyed by `tally`. Returns `this` for chaining.
- `#unloadHookPayload({ tally })` — instance method. Reads and returns the payload for `tally`, or `null`.
- `.fulfillIncludeOption(include, ...models)` — static method. Normalizes a Sequelize `include` option into an array, appending `models`.

### Class: `RenchanModel`

Abstract. Extends `BaseRenchanModel`. This is the class application models are meant to extend; it defines the initialization lifecycle and the mixin-composition machinery.

- `.initWithSequelizeClient(sequelizeClient)` — static method. Calls `this.init(this.createAttributes(DataTypes), this.createOptions(sequelizeClient))`. Called by `SequelizeActivator`/loaders during bootstrap.
- `.createAttributes(DataTypes)` — static abstract method. **Must be overridden** by every concrete model; throws `Error('this function must be inherited')` otherwise. Returns the Sequelize attributes hash for `.init()`.
- `.createOptions(sequelizeClient)` — static method. Returns `{ modelName: this.name, sequelize: sequelizeClient, syncOnAssociation: false, timestamps: true, underscored: true }`. Overridable per-model.
- `.postInit()` — static method. Calls `.associate()`, `.defineScopes(Op)`, `.defineSubqueries()`, `.setupHooks()` in order, then returns `this`. Called once per model right after `.initWithSequelizeClient()`.
- `.associate()` / `.defineScopes(Op)` / `.defineSubqueries()` / `.setupHooks()` — static methods. Each delegates to `this.mixinsApplier`, which calls the same-named method on every class in `.get:Mixins` (in order). Concrete models override these directly (calling `super.xxx?.()` first) to add their own associations/scopes/subqueries/hooks alongside the mixins'.
- `.get:mixinsApplier` — static getter. A `Proxy` around `this.$` where every accessed property is turned into a function that calls that property on each of `this.Mixins` in turn.
- `.get:$` — static getter. Builds (via `renchan-tools`' `MixinBuilder`) a merged static object combining `this` with every `Mixin.staticMixinTargets` — i.e. the model class with all its mixins' static sides mixed in.
- `#get:$` — instance getter. Same idea at the instance level, merging `Mixin.instanceMixinTargets(this)` for every mixin.

### Class: `FertileForestModel`

The default export of `lib/models/FFModel.js`. Not declared as a plain JS class in this package — it is `FertileForest.Model` from the peer package `@steweucen/fertile-forest-sequelize`, initialized here with `RenchanModel` as its base `Model` (`FertileForest.init({ __proto__: Sequelize, Model: RenchanModel })`). The result is a class that is simultaneously a `RenchanModel` (same lifecycle/mixin API as above) and a Fertile Forest adjacency-list tree node.

- Extend it (instead of `RenchanModel`) for models representing a tree/hierarchy (e.g. the referral tree used by `ReferralMixinModel`).
- Adds an `.ff` namespace (both static, via `TableTrait`, and instance-level, via `EntityTrait`, from the peer package) with tree operations such as `sprout()`, `sproutAsChild()`, `graft()`, `trunk()`, `ancestors()`, `ancestor()`, `genitor()`, `root()`, `descendants()`, `subtree()`, `children()`. These are documented by `@steweucen/fertile-forest-sequelize`, not this package; `renchan-sequelize` only wires `FertileForest.init()` up to `RenchanModel`.
- Used internally by `ReferralMixinModel.defineCallbackAfterCreate()` as `this.ReferralNodeModel.ff.sprout(genitorNode, record, options)`.

## Mixin models

Mixins are plain `BaseMixinModel` subclasses listed in a model's `static get Mixins ()`. `RenchanModel.postInit()` calls each lifecycle method (`associate`/`defineScopes`/`defineSubqueries`/`setupHooks`) on every mixin via `mixinsApplier`, and `$`/`#$` merge each mixin's static/instance surface onto the model. Several mixins declare abstract getters (`.get:XxxModel`) that the *consuming* model must override to point at its own associated models.

### Class: `BaseMixinModel`

Abstract. Extends `BaseRenchanModel`. The common base every mixin extends; provides no-op defaults for the four lifecycle hooks so mixins only need to override the ones they use.

- `.associate()` / `.defineScopes(Op)` / `.defineSubqueries()` / `.setupHooks()` — static methods, no-op by default.
- `#get:MixinModel` — instance getter. `this.constructor.$` — the merged mixin-model constructor, for calling other mixins' static members from an instance context.
- `.get:staticMixinTargets` — static getter. Defaults to `[this]` (mixed into `RenchanModel.$`).
- `.instanceMixinTargets(entity)` — static method. Defaults to `[this.prototype]` (mixed into `RenchanModel#$`).

### Class: `AttributesLinearizerMixinModel`

Extends `BaseMixinModel`. Flattens an entity's own `dataValues` together with every eagerly-`include`d nested `RenchanModel`'s `dataValues` into one array.

- `.instanceMixinTargets(entity)` — static method (`@override`). Returns `this.getAttributeNodes(entity).map(it => it.dataValues)`.
- `.getAttributeNodes(node)` — static method. Recursively walks `node._options.includeNames`, collecting `node` plus every included `RenchanModel` descendant.

### Class: `BackupMixinModel`

Extends `BaseMixinModel`. Adds an `afterSave` hook that writes a copy of the saved row (minus `id`/`createdAt`/`updatedAt`/`deletedAt`) into a separate backup model, inside the same transaction.

- `.setupHooks()` — static method (`@override`). Registers the `afterSave` backup hook described above.
- `.get:BackupModel` — static abstract getter. **Must be overridden** to return the backup model's class; throws `Error('".get:BackupModel" must be inherited')` otherwise.

### Class: `LatestStatusMixinModel`

Extends `BaseMixinModel`. For models that have a many-to-many "status history" association and need the most recent status.

- `.associate()` — static method (`@override`). `this.belongsToMany(this.StatusModel, { through: this.StatusPhaseModel })`.
- `.setupHooks()` — static method (`@override`). Registers a `beforeFind` hook (via `.defineHookBeforeFind()`) that auto-includes the status association on every find.
- `.defineHookBeforeFind()`, `.createStaticModelIncludeable()` — static methods used to build the auto-include hook.
- `.get:StatusModel` / `.get:StatusPhaseModel` — static abstract getters. **Must be overridden**; each throws `Error` otherwise.
- `.get:orderAttributeOfStatusPhaseModel` — static getter. Defaults to `'savedAt'`; the through-table column used to order statuses.
- `#get:latestStatus` — instance getter. The single most recent status entity (by `.defineComparerForLatestStatus()`), or `undefined` if none.
- `#extractStatuses()` — instance method. Reads the associated status entities off the instance.

### Class: `PaginationMixinModel`

Extends `BaseMixinModel`. Adds a reusable "find with pagination" convenience.

- `.defineScopes(Op)` — static method (`@override`). Registers a `'&pagination'` scope that applies `RequestPagination#createFindOptions()`.
- `.definePaginationScopeCallback()` — static method. The scope callback itself.
- `.createResponsePagination({ requestPagination, totalNumber })` — static method. Returns `ResponsePagination.create(...)`.
- `.findAllWithPagination({ pagination, options })` — static async method. **CRUD convenience**: runs `this.count(options)` for the total, then `this.scope({ method: ['&pagination', { pagination }] }).findAll(options)`, and returns `{ pagination: ResponsePagination, records }`.

### Class: `ReferralMixinModel`

Extends `BaseMixinModel`. Implements an invite-code-based referral system on top of a `FertileForestModel` tree.

- `.associate()` — static method (`@override`). `hasOne(InviteCodeModel)`, `hasOne(ReferralNodeModel)`.
- `.setupHooks()` — static method (`@override`). Registers `beforeCreate` (resolves the genitor node from the supplied invite code, throwing `Error` if the code doesn't resolve to a node) and `afterCreate` (grafts the new entity's referral node under the genitor via `ReferralNodeModel.ff.sprout()`) hooks.
- `.get:InviteCodeModel` / `.get:ReferralNodeModel` — static abstract getters. **Must be overridden**; each throws `Error` otherwise.
- `.get:inviteCodeAttributeOfInviteCodeModel` (default `'inviteCode'`), `.get:savedAtAttributeOfInviteCodeModel` (default `'savedAt'`), `.get:attributeToOrderInInviteCodeModel` — static getters, overridable.
- `.buildByInviteCode({ byInviteCode, record, options })` — static method. **CRUD convenience**: builds an entity together with a nested `InviteCodeModel` record (auto-generating an invite code if the caller didn't supply one under the associated model's key) and attaches a hook payload carrying `byInviteCode` for the create hooks above.
- `.createByInviteCode({ byInviteCode, record, options })` — static async method. **CRUD convenience**: `.buildByInviteCode(...).save(options)`.
- `.findGenitorNodeByInviteCode({ inviteCode, transaction })` — static async method. Resolves the referral-tree node that owns a given invite code, or `null`.
- `.generateInviteCode()` / `.createRandomTextGenerator()` — static methods. Uses `renchan-tools`' `RandomTextGenerator`.

### Class: `SuiteVersionMixinModel`

Extends `BaseMixinModel`. For models representing a versioned "suite" of child records (a one-to-many association where each parent version owns a snapshot of children).

- `.associate()` — static method (`@override`). `this.hasMany(this.SuiteModel)`.
- `.get:SuiteModel` — static abstract getter. **Must be overridden**; throws `Error` otherwise.
- `.get:versionKey` — static getter. Defaults to `'startedAt'`; the column used to order/compare versions.
- `.buildWithSuite(record, options)` / `.createWithSuite(record, options)` — static (async for create) methods. **CRUD convenience**: build/create the parent entity together with its suite of child records in one call (`fulfillSuiteAttributes`/`fulfillIncludeToAddSuiteModel` fill in defaults).
- `.findSuite({ pointed }, findOptions)` — static async method. **CRUD convenience**: finds the suite whose version is `<= pointed`, most recent first, returning the sorted array of children (`[]` if no matching parent).
- `.findCurrentSuite(findOptions)` — static async method. `.findSuite({ pointed: this.now }, findOptions)`.
- `.findAllSuites(findOptions)` — static async method. **CRUD convenience**: returns every version as `Array<{ version, suite }>`.
- `.getSuiteSorter()` — static method. Defaults to a no-op comparator (`() => 0`); override to control child ordering.
- `#get:versionKey` / `#get:suiteKey` — instance getters, mirroring the static ones.
- `#getSuite()` — instance method. The (sorted) child records already loaded on the instance.
- `#generateSuiteVersion()` — instance method. Returns `{ version, suite }` for this entity.

## Hook payloads

Small value objects passed between Sequelize hooks on the same entity via `BaseRenchanModel#loadHookPayload()`/`#unloadHookPayload()`.

### Class: `BaseHookPayload`

Abstract.

- `#params` — instance property, set from the constructor argument.
- `.create(params)` — static factory method. `new this(params)`.

### Class: `ReferralMixinHookPayload`

Extends `BaseHookPayload`. Carries state between `ReferralMixinModel`'s `beforeCreate`/`afterCreate` hooks.

- `.create({ byInviteCode = null, genitorNode = null })` — static factory method.
- `#get:byInviteCode` — instance getter.
- `#get:genitorNode` — instance getter.
- `#setGenitorNode(entity)` — instance method. Returns `this` for chaining.

## Pagination & sorting tools

### Class: `RequestPagination`

Represents an incoming pagination + sort request.

- `.create({ limit = 20, offset = 0, sort: { key, direction } = {} } = {})` — static factory method.
- `.createRequestSort({ key, direction })` — static method. Returns `RequestSort.create(...)`.
- `#resolveLimit()` — instance method. Returns `limit` if it's a positive integer, else `20`.
- `#resolveOffset()` — instance method. Returns `offset` if it's a positive integer, else `0`.
- `#createFindOptions()` — instance method. Returns `{ limit, offset, order }`, ready to spread into a Sequelize `FindOptions`.

### Class: `RequestSort`

- `.create(params = {})` — static factory method.
- `#get:sortKey` — instance getter. `params.key ?? null`.
- `#get:isAscent` — instance getter. `true` unless `direction` (case-insensitive) is `'DESC'`.
- `#get:isDescent` — instance getter. `!isAscent`.
- `#get:orderOption` — instance getter. `[]` if no `sortKey`, else `[[sortKey, isAscent ? 'ASC' : 'DESC']]`.

### Class: `ResponsePagination`

Pairs a `RequestPagination` with the query's total row count, for building a paginated API response.

- `.create({ requestPagination, totalNumber })` — static factory method.
- `#get:limit` — instance getter. `requestPagination.resolveLimit()`.
- `#get:offset` — instance getter. `requestPagination.resolveOffset()`.
- `#get:totalNumber` — instance getter.

## Bootstrapping & infrastructure

### Class: `SequelizeActivator`

The top-level entry point for standing up a Sequelize client with all Renchan models activated. This is the class applications call at process start-up.

- `.create({ sequelizeClient, models })` — static factory method.
- `.createAsync({ nodeEnv, configPath, modelsPath })` — static async factory method. **The primary usage pattern**: generates a Sequelize client from the config file at `configPath` for `nodeEnv`, deep-loads every `RenchanModel` subclass under `modelsPath`, calls `.initWithSequelizeClient()` then `.postInit()` on each, and returns an activator wrapping the result.
- `.generateClient({ nodeEnv, configPath })` — static async method. Used internally by `.createAsync()`.
- `.loadModels({ poolPath })` — static async method. `DeepBulkClassLoader.create({ poolPath }).loadClasses({ filterFunc: it => it.prototype instanceof RenchanModel })`.
- `.activateModels({ sequelizeClient, models })` — static method. Runs `.initWithSequelizeClient(sequelizeClient)` then `.postInit()` on each model class.
- `#get:sequelize` — instance getter. The activated `Sequelize` client.
- `#get:activatedModels` — instance getter. Array of activated model classes.
- `#get:modelHash` — instance getter. `{ [modelName]: ModelClass }` — the convenient way to pull individual models back out after bootstrapping.

### Class: `SequelizeClientGenerator`

- `.create({ config })` — static factory method.
- `.createAsync({ configPath, nodeEnv })` — static async factory method. Resolves the config via `SequelizeConfigResolver` first.
- `.createConfigResolver({ configPath })` — static async method.
- `#generateClient()` — instance method. `new Sequelize(database, username, password, options)` from `this.config`.

### Class: `SequelizeConfigResolver`

- `.create({ configHash })` — static factory method.
- `.createAsync({ configPath })` — static async factory method. Loads `configHash` via `.loadConfigHash()`.
- `.loadConfigHash({ configPath })` — static async method. `require(configPath)` (a CommonJS, Sequelize-CLI-style config file, e.g. `config/config.js` with one key per environment).
- `#resolveConfig({ env })` — instance method. `configHash[env] ?? null`.

### Class: `RenchanModelsLoader`

A lighter-weight alternative to `SequelizeActivator` that only loads model classes, without initializing/activating them against a Sequelize client.

- `.create({ models })` — static factory method.
- `.createAsync({ poolPath })` — static async factory method. Deep-loads `RenchanModel` subclasses under `poolPath`.
- `.loadModels({ poolPath })` — static async method. Same filter as `SequelizeActivator.loadModels()`.
- `#collectLoadedModels()` — instance method. Returns the loaded model classes.

## Loading & query-building tools

### Class: `DeepBulkClassLoader`

Used internally by `SequelizeActivator`/`RenchanModelsLoader` to recursively import model files.

- `.create({ poolPath })` — static factory method.
- `#loadClasses({ poolPath = this.poolPath, filterFunc = () => true, mapFunc = it => it })` — instance method (`@public`). Recursively `import()`s every non-dotfile under `poolPath`, collects each module's default export, keeps only `Function`s, filters with `filterFunc`, and maps with `mapFunc`.
- `#loadFileNames({ poolPath = this.poolPath })` — instance method. Recursive directory walk returning every file path (directories are traversed, not returned).

### Class: `IncludeOptionBuilder`

Converts a flat list of dot-delimited association paths (e.g. `'.author.company'`) into a nested Sequelize `include` option tree, merging shared prefixes.

- `.create({ BootModelCtor })` — static factory method.
- `.get:IncludeOptionNodeCtor` — static getter. `IncludeOptionNode`.
- `.createIncludeOptionNode({ association })` — static method.
- `#buildIncludeOptions({ paths })` — instance method. Returns `[]` for an empty/invalid `paths`; otherwise builds and returns the `Array<IncludeOptions>` tree rooted at `BootModelCtor`.

### Class: `IncludeOptionNode`

The tree node type built by `IncludeOptionBuilder`. Each node resolves association path segments against the live Sequelize `associations` on its model.

- `.create({ association = null, ModelCtor = association?.target ?? null })` — static factory method.
- `.get:supportingSeparateOptionTypes` — static getter. `['HasMany']` — association types that get `separate: true` in the resulting include option.
- `#appendChildren({ pathSegmentsSets })` / `#appendChild({ pathSegments })` — instance methods. Grow the tree one path (or a batch of paths) at a time, merging on shared association names.
- `#toOption()` — instance method. Converts the (sub)tree into a Sequelize `IncludeOptions` object (root node returns an array of its children's options instead).

### Class: `ModelAttributeFactory`

Ready-made Sequelize model-attribute declarations, for use inside `RenchanModel.createAttributes(DataTypes)`.

- `.create(DataTypes)` — static factory method.
- `#get:ID_BIGINT` — instance getter. `{ id: { type: DataTypes.BIGINT, allowNull: false, autoIncrement: true, primaryKey: true } }`.
- `#get:ID_INTEGER` — instance getter. Same, with `DataTypes.INTEGER`.

### Class: `MigrationAttributeFactory`

CommonJS (`.cjs`); the migration-file counterpart of `ModelAttributeFactory` (includes `field` and timestamp helpers, for use in Sequelize CLI migration files rather than model definitions).

- `.create(SequelizeHandler = require('sequelize'))` — static factory method.
- `#get:ID_BIGINT` / `#get:ID_INTEGER` — instance getters. Same shape as `ModelAttributeFactory`'s, plus `field: 'id'`.
- `#get:TIMESTAMPS` — instance getter. `{ createdAt: { type: DATE(3), field: 'created_at', allowNull: false }, updatedAt: { ... field: 'updated_at' ... } }`.
- `#get:TIMESTAMPS_WITH_DELETED_AT` — instance getter. `TIMESTAMPS` plus a nullable `deletedAt`/`deleted_at`.

### Class: `TimestampSeedsSupplier`

CommonJS (`.cjs`); fills in `created_at`/`updated_at` for Sequelize CLI seed files.

- `.supplyAll(seeds)` — static method. `seeds.map(it => this.supplyOne(it))`.
- `.supplyOne(seed)` — static method. `{ created_at: now, updated_at: now, ...seed }` — an explicit value in `seed` wins over the auto-generated timestamp. `deleted_at` is intentionally not supplied (defaults to `null`).

### Class: `RootPath`

Resolves a path relative to a base directory — the same shape as the standalone `@openreachtech/mentsu-rootpath` package, bundled locally here for this package's own use.

- `.create({ base = process.cwd() } = {})` — static factory method.
- `#to(targetPath)` — instance method. `path.resolve(this.base, targetPath)`.

### Class: `SubqueryGenerator`

Used internally by `BaseRenchanModel.subquery()`/`.createSubqueryGenerator()` to turn a registered subquery definition into a `Sequelize.literal()`.

- `.create({ Model })` — static factory method.
- `#get:queryGenerator` — instance getter. `this.Model.queryGenerator`.
- `#generateSubquery({ options, Model = this.Model })` — instance method. Raw SELECT SQL string via the dialect's `QueryGenerator#selectQuery()`.
- `#formatSubquery(subquery)` — instance method. Wraps in parens, strips a trailing `;`.
- `#toSubqueryLiteral(options)` — instance method. Returns `Model.sequelize.Sequelize.literal(formattedSubquery)`.

### Class: `SubqueryRegExpBuilder`

A test-support utility: builds a `RegExp` from a nested array-of-string SQL template containing `?slotName` placeholders, for asserting generated SQL matches expectations regardless of whitespace.

- `.create(haystacks)` — static factory method. `haystacks` is a (nested) array of SQL fragment strings.
- `#buildRegExp(values = {})` — instance method. Escapes the template, replaces `?slotName` placeholders with the (regex-escaped, dialect-quoted) value from `values`, and anchors with `^...$`. Handles string, `Date`, and scalar substitution differently (e.g. `Date` becomes a `YYYY-MM-DD HH:mm:ss.SSS` pattern with an optional `+00:00` suffix).

### Class: `WhereClauseExtractor`

Recursively strips `undefined` values out of a Sequelize `where`-clause-shaped object/array, so callers can build `where` clauses with optional keys without leaving stray `undefined`s for Sequelize to choke on.

- `.create({ extractorHash = {} } = {})` — static factory method. `extractorHash` maps a `Symbol` key (typically a `Sequelize.Op`) to a custom extractor function; defaults already handle `Op.between`/`Op.notBetween` (requires an array of length >= 2).
- `#extract(target)` — instance method. Returns `target` as-is for non-plain-object/array values; otherwise recurses through arrays/objects (including `Symbol` keys), dropping any key/element whose extracted value is `undefined`, and returns `undefined` itself if nothing remains.

## Usage

```js
import {
  RenchanModel,
  ModelAttributeFactory,
  PaginationMixinModel,
  RequestPagination,
  SequelizeActivator,
} from '@openreachtech/renchan-sequelize'

// A model definition (e.g. app/sequelize/models/UserModel.js)
class UserModel extends RenchanModel {
  static get Mixins () {
    return [
      PaginationMixinModel,
    ]
  }

  static createAttributes (DataTypes) {
    const factory = ModelAttributeFactory.create(DataTypes)

    return {
      ...factory.ID_BIGINT,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    }
  }
}

// Bootstrapping (once, at process start-up)
const activator = await SequelizeActivator.createAsync({
  nodeEnv: process.env.NODE_ENV,
  configPath: './config/config.js',
  modelsPath: './app/sequelize/models',
})

const { UserModel: User } = activator.modelHash

// CRUD convenience added by PaginationMixinModel
const { pagination, records } = await User.findAllWithPagination({
  pagination: RequestPagination.create({ limit: 10, offset: 0 }),
  options: {},
})
```
