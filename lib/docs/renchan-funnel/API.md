# API

Source: no `README.md`/`README.ja.md` ship with this package, and `package.json` has no `"types"` field. `types/kafka.d.ts` and `types/jest.d.ts` only re-export ambient types from `@openreachtech/renchan-kafka`, `@openreachtech/jest-expect-each` and `@openreachtech/jest-deep-containing` for the package's own tests — they do not describe this package's API. Everything below was extracted from JSDoc across the 91 files under `lib/`.

`@public`/`@protected`/`@private` JSDoc tags are used only in a minority of files (roughly 12 of 91), and even in those files only on some members. Where tags are present they are noted per class; where absent, every member documented via JSDoc is listed below as the natural consumer-facing surface (private implementation helpers with no JSDoc at all are omitted).

## Overview

renchan-funnel is a toolkit for building a "funnel" feature on top of Debezium CDC (change-data-capture) messages flowing through Kafka: watch a table for row create/update/delete (or a cron schedule), evaluate configurable trigger conditions against the changed row, and dispatch one or more configured actions (create a record, update a record, send an email, or a custom action) as jobs.

Almost nothing here is usable standalone: nearly every subsystem centers on a `Base*` class that a consuming application subclasses, or a `*Provider`/`*Resolver` it configures with its own Sequelize models, so the funnel logic never hardcodes model names or association aliases. There is no single top-level facade class. A consumer assembles a pipeline from:

1. `BaseFunnelConsumer` / `BaseDebeziumEachBatchConsumer` — Kafka consumers watching a funnel's own re-published topic, or a source table's Debezium topic.
2. `FunnelMessageMatcher` / `FunnelTriggerEvaluator` / `FunnelTriggerSuiteRegistry` — match a batch of change messages to the funnels that target the changed table, then evaluate each funnel's trigger condition tree.
3. `BaseFunnelExecutor` (message-triggered path) or `BaseScheduleFunnelsExecutor` + `ScheduleFunnelDaemon` (cron-triggered path) — record a `FunnelExecution`, build one payload per funnel action via the payload-generator classes, and dispatch each as a job through an app-supplied dispatcher.

## Exports (`index.js`)

`index.js` has no default export; it only re-exports 91 named bindings (`export { default as Name } from './lib/.../File.js'`), grouped below exactly as commented in the source:

- **Constants (13)**: `COLUMN_TYPE`, `DYNAMIC_VALUE_OFFSET_UNIT_KEY`, `DYNAMIC_VALUE_TYPE_KEY`, `FUNNEL_ACTION_EXECUTION_OUTPUT_STATUS`, `FUNNEL_ATTRIBUTE_NAME_HASH`, `FUNNEL_ID_HASH_LENGTH`, `FUNNEL_STATUS`, `FUNNEL_TRIGGER_CATEGORY`, `FUNNEL_TRIGGER_OPERATOR_KEY`, `LOGICAL_OPERATOR_KEY`, `SOURCE_VALUE_TYPE`, `TRIGGER_CATEGORY_IDS_BY_OPERATION`, `VALIDATION_OPERATOR_CATEGORY`
- **Consumers (3)**: `BaseAppEachBatchConsumer`, `BaseFunnelConsumer`, `BaseDebeziumEachBatchConsumer`
- **Producers (3)**: `BaseAppProducer`, `BaseAppBufferProducer`, `FunnelBufferProducer`
- **Extractors (4)**: `DebeziumMessageValueExtractor`, `FunnelFieldReferencePathExtractor`, `FunnelExtractor`, `FunnelActionValueExtractor`
- **Message value (1)**: `AppDebeziumMessageValue`
- **Parcels (5)**: `NewEntitySaveParcel`, `UpdateEntitySaveParcel`, `DeleteEntitySaveParcel`, `CustomFunnelActionExecutionParcel`, `FunnelTriggerParcel`
- **Providers (3)**: `BaseFunnelModelsProvider`, `DynamicValueSuiteProvider`, `OffsetValueSuiteProvider`
- **Payload generators (5)**: `BaseFunnelActionPayloadGenerator`, `CreateRecordPayloadGenerator`, `UpdateRecordPayloadGenerator`, `SendEmailPayloadGenerator`, `CustomActionPayloadGenerator`
- **Trigger condition suites (11)**: `BaseFunnelTriggerSuite`, `ContainsTriggerConditionSuite`, `EqualsTriggerConditionSuite`, `GreaterThanOrEqualTriggerConditionSuite`, `InTriggerConditionSuite`, `IsNotNullTriggerConditionSuite`, `IsNullTriggerConditionSuite`, `NotContainsTriggerConditionSuite`, `NotEqualsTriggerConditionSuite`, `NotInTriggerConditionSuite`, `TriggerSuiteCtors`
- **Funnel value retriever suites (8)**: `BaseFunnelValueRetrieverSuite`, `FunnelValueRetrieverSuiteHashBuilder`, `FunnelValueRetrieverSuiteCtors`, `FixedValueSuite`, `DynamicValueSuite`, `NewValueSuite`, `OldValueSuite`, `FieldReferenceSuite`
- **Dynamic value suites (4)**: `BaseDynamicValueSuite`, `NowValueSuite`, `TodayValueSuite`, `DynamicValueSuiteCtors`
- **Offset value suites (5)**: `BaseOffsetValueSuite`, `DaysOffsetSuite`, `HoursOffsetSuite`, `MinutesOffsetSuite`, `OffsetValueSuiteCtors`
- **Evaluator / matcher / retriever (4)**: `FunnelTriggerEvaluator`, `FunnelTriggerSuiteRegistry`, `FunnelMessageMatcher`, `OriginObjectRecordRetriever`
- **Executors + log registerers (4)**: `BaseFunnelExecutor`, `BaseCustomFunnelActionExecutor`, `BaseFunnelActionExecutionLogRegisterer`, `BaseCustomFunnelActionExecutionLogRegisterer`
- **Schedule (5)**: `BaseScheduleFunnelsExecutor`, `ScheduleFunnelActionPayloadBuilder`, `ScheduleFunnelRetriever`, `FunnelScheduleEvaluator`, `ScheduleFunnelDaemon`
- **Tools (6)**: `CronExpressionResolver`, `DynamicIncludeOptionBuilder`, `FunnelAssociationResolver`, `PeriodicalExecutor`, `RandomTextGenerator`, `Timber`
- **Errors (7)**: `FunnelError`, `AmbiguousAssociationFunnelError`, `AssociationNotFoundFunnelError`, `AttributeNotFoundFunnelError`, `ConcreteMemberNotFoundFunnelError`, `FunnelJobDispatcherNotFoundFunnelError`, `FunnelJobDispatchFailedFunnelError`

Note: `TriggerSuiteCtors`, `FunnelValueRetrieverSuiteCtors`, `DynamicValueSuiteCtors` and `OffsetValueSuiteCtors` are each a plain **array** of classes (not an object/map keyed by string) — the key→class association happens at runtime by reading each class's own static key getter (`operatorKey`, `sourceValueTypeKey`, `dynamicValueKey`, `offsetUnitKey`).

## Notation

Class members throughout this document use the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

No setters (`#set:`/`.set:`) exist anywhere in this package.

---

## Constants

None of these are classes — each file's default export is a plain literal (object, array, or number).

| export | shape | purpose |
| :-- | :-- | :-- |
| `COLUMN_TYPE` | object keyed `INTEGER`(10)/`DECIMAL`(20)/`VARCHAR`(30)/`TEXT`(40)/`DATETIME`(50)/`DATEONLY`(60)/`BOOLEAN`(70), each `{ ID, NAME, IS_ACTIVE: true, DISPLAY_ORDER: ID + 1 }` | supported column data types, used by `DebeziumMessageValueExtractor#generateValueWithOriginalDataType()` to coerce decoded values |
| `DYNAMIC_VALUE_OFFSET_UNIT_KEY` | `{ MINUTES: 'MINUTES', HOURS: 'HOURS', DAYS: 'DAYS' }` | offset units accepted by the offset-value-provider suites |
| `DYNAMIC_VALUE_TYPE_KEY` | `{ NOW: 'NOW', TODAY: 'TODAY' }` | dynamic time value types resolved by `NowValueSuite`/`TodayValueSuite` |
| `FUNNEL_ACTION_EXECUTION_OUTPUT_STATUS` | `{ SUCCEEDED: 'succeeded', FAILED: 'failed' }` | outcome status recorded in a funnel action execution's output JSON |
| `FUNNEL_ATTRIBUTE_NAME_HASH` | `{ funnelAction: ['id','payload','executionOrder'], funnelExecution: ['idHash','TriggeringOriginObjectCategoryId','triggeringRecordIdKey','startedAt','completedAt','isFailed','errorMessage'] }` | attribute names the app's `FunnelAction`/`FunnelExecution` models must declare; checked by `FunnelAssociationResolver.validateFunnelAttributeNames()` since Sequelize silently drops writes to unknown attributes |
| `FUNNEL_ID_HASH_LENGTH` | `48` (number) | length of the random text used as a funnel execution id hash |
| `FUNNEL_STATUS` | `{ ACTIVE: 1, INACTIVE: 0 }` | funnel `is_active` status, stored as `TINYINT` rather than boolean |
| `FUNNEL_TRIGGER_CATEGORY` | keyed `RECORD_CREATED`(1)/`RECORD_UPDATED`(2)/`RECORD_DELETED`(3)/`SCHEDULED`(4), each `{ ID, NAME, DESCRIPTION, IS_ACTIVE: true, DISPLAY_ORDER: ID }` | the events that can trigger a funnel |
| `FUNNEL_TRIGGER_OPERATOR_KEY` | `{ EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, IN, NOT_IN, IS_NULL, IS_NOT_NULL, GREATER_THAN_OR_EQUAL }` (self-named string enum) | comparison operators usable in a funnel trigger condition |
| `LOGICAL_OPERATOR_KEY` | `{ AND: 'AND', OR: 'OR' }` | logical combinators for a trigger/validation condition tree |
| `SOURCE_VALUE_TYPE` | `{ FIXED_VALUE, DYNAMIC_VALUE, NEW_VALUE, OLD_VALUE, FIELD_REFERENCE }` (self-named string enum) | where a funnel action's value is sourced from |
| `TRIGGER_CATEGORY_IDS_BY_OPERATION` | object keyed by Debezium operation key (via `@openreachtech/renchan-kafka`'s `DebeziumMessageValue.OPERATION_KEY_LOOKUP`): `CREATE → [RECORD_CREATED.ID]`, `UPDATE → [RECORD_UPDATED.ID]`, `DELETE → [RECORD_DELETED.ID]` | maps a Debezium operation to the funnel trigger categories it's allowed to fire; unmapped operations (e.g. snapshot read `r`) fire no funnel |
| `VALIDATION_OPERATOR_CATEGORY` | `{ FIELD: 'FIELD', LOGICAL: 'LOGICAL' }` | categorizes a validation/trigger operator as acting on one field vs. combining children logically |

---

## Errors

All extend `FunnelError`, which extends `Error`.

### `FunnelError`

Base class for all funnel-domain errors.

- `.create({ code = this.errorCode, options, value } = {})` — static factory. Builds the message via `.generateErrorMessage({ code, value })` and returns `new this(message, options)` (uses `this`, so a subclass factory produces an instance of that subclass).
- `.get:errorCode` — abstract static getter; throws a plain `Error` (deliberately *not* `FunnelError`, so it isn't itself shown to a client) with message `` concrete-member-not-found {"memberName":"<ClassName>.get:errorCode"} `` unless a subclass overrides it.
- `.generateErrorMessage({ code, value })` — returns `code` alone if `value` is falsy, else `` `${code} ${JSON.stringify(value)}` ``.
- `.declareFunnelError({ code })` — returns an anonymous subclass of `this` whose `errorCode` getter returns `code` (an alternative to writing a named subclass file).

### Concrete error classes

Each below only overrides `.get:errorCode`; none override the constructor.

| class | error code | thrown when |
| :-- | :-- | :-- |
| `ConcreteMemberNotFoundFunnelError` | `101.X000.001` | a required abstract/concrete member (e.g. a `Base*` model/dispatcher getter) was never implemented by a subclass |
| `AssociationNotFoundFunnelError` | `101.X000.002` | `FunnelAssociationResolver` can't resolve any association from a source model to a target model (or a supplied alias override doesn't exist) |
| `AmbiguousAssociationFunnelError` | `101.X000.003` | a source model has more than one association to the same target model and no alias override disambiguates them |
| `FunnelJobDispatcherNotFoundFunnelError` | `101.X000.004` | no job dispatcher class serves a funnel action's `actionType`, and no fallback dispatcher is declared |
| `FunnelJobDispatchFailedFunnelError` | `101.X000.005` | a job dispatcher rejects a payload (`dispatchedJob.hasError()`) instead of dispatching it |
| `AttributeNotFoundFunnelError` | `101.X000.006` | a field name the funnel resolved/defaulted to is not an attribute of the app's model (raised while an executor is being built, not while handling a message) |

---

## Consumers

### `BaseAppEachBatchConsumer` (abstract)

Extends `BaseEachBatchConsumer` from `@openreachtech/renchan-kafka`.

- `.get:HEARTBEAT_INTERVAL` — `3000` (ms) between heartbeats sent while a batch runs.
- `.get:setInterval` / `.get:clearInterval` — expose Node's globals as overridable getters (for tests).
- `#buildRunConfig()` — override; returns `{ ...super.buildRunConfig(), eachBatchAutoResolve: false }` so kafkajs never auto-commits offsets; only `#resolveBatchOffset()` commits, on success.
- `#defineEachBatch()` — override; the actual kafkajs `eachBatch` handler: builds a parcel + context, calls `#processBatchMessages()`, then `#summarizeOutcome()`.
- `#processBatchMessages({ parcel, context })` — if `parcel.shouldBreakProcess()`, returns `{ status: STOPPED, error: null }` immediately without touching messages. Otherwise starts a heartbeat timer, deserializes messages, calls `#onEachBatch()`, resolves the batch offset on success, and returns `{ status: COMPLETED, outcomes }`. Any thrown error is caught and returned as `{ status: FAILED, error: engine.errorHash.Unknown.create({ options: { cause: { originalError: error } } }) }`. The heartbeat is always stopped in `finally`.
- `#onEachBatch({ messages, parcel, context })` — abstract; throws `ConcreteMemberNotFoundKafkaError` unless overridden.
- `#summarizeOutcome({ batchOutcome })` — abstract, default no-op; concrete consumers may override for post-batch hooks.

### `BaseFunnelConsumer` (abstract)

Extends `BaseAppEachBatchConsumer`. Watches a single funnel's own re-published Kafka topic (named by `funnelIdHash`).

- `.create({ engine, kafkaClient, errorCodeHash, topics, funnelExecutor, targetFunnel })` — `@public`, override.
- `.createAsync({ engine, kafkaClient })` — `@public`, override; resolves the funnel models provider, finds the target funnel, collects topics, builds the funnel executor, then delegates to `.create()`.
- `.get:FunnelModelsProviderCtor` / `.get:FunnelExecutorCtor` / `.get:funnelIdHash` — abstract; a concrete consumer must supply the models provider class, the executor class, and the id hash of the funnel it serves. Throw `ConcreteMemberNotFoundFunnelError` unless overridden.
- `.get:MessageDeserializerCtor` → `JsonMessageDeserializer`; `.get:MessageKeyCtor` → `DebeziumMessageKey`; `.get:MessageValueCtor` → `AppDebeziumMessageValue` — overrides wiring Debezium JSON decoding.
- `.collectTopics({ engine })` — override; returns `[this.funnelIdHash]`.
- `.resolveSystemUserId()` — abstract async; must resolve the system user id attributed when no acting user can be resolved from a message.
- `#onEachBatch({ messages, parcel, context })` — override; extracts `.normalizedValue` from each message and calls `this.funnelExecutor.executeTriggerFunnels({ debeziumMessageValues, targetFunnels: [this.targetFunnel] })`.

### `BaseDebeziumEachBatchConsumer` (abstract)

Extends `BaseAppEachBatchConsumer`. Watches a source table's Debezium topic and fans matched messages out to each targeting funnel's own topic.

- `.create(...)` / `.createAsync({ engine, kafkaClient })` — override; builds a `FunnelMessageMatcher.createAsync({ tableName: this.tableName, funnelModelsProvider })`, a per-funnel `FunnelBufferProducer` lookup (one connected producer per funnel id hash), collects topics, then delegates to `.create()`.
- `.get:tableName` / `.get:debeziumTopicPrefix` / `.get:FunnelModelsProviderCtor` — abstract; must be supplied by a concrete consumer (`debeziumTopicPrefix` is the connector's `{serverName}.{database}` prefix).
- `.collectTopics({ engine })` — override; returns `[this.buildDebeziumTopic({ tableName: this.tableName })]` (`` `${prefix}.${tableName}` ``).
- `#onEachBatch({ messages, parcel, context })` — groups the batch by matched funnel via `funnelMessageMatcher.groupMatchedMessagesByFunnelAsync()`, then sends each group's messages to that funnel's producer **sequentially** (not concurrently).

---

## Producers

### `BaseAppProducer` (abstract)

Extends `BaseProducer` from `@openreachtech/renchan-kafka`. Unlike the base class's static `topic`, each instance carries its own `#topic` so one class can serve multiple destination topics (e.g. one per funnel).

- `.create({ engine, kafkaClient, producerClient, errorCodeHash, topic })` — override; includes `topic` in the built instance.
- `.createAsync({ engine = null, topic = this.topic })` — override; creates an engine/kafka client/producer client and connects it if not supplied, forwarding `topic` through to `.create()`.
- `#sendMessages({ messages, keepConnection = false })` — override; always sends to `this.topic`. Returns `ProducerResponse.create({ rawResponse, error: null })` on success, or wraps a thrown error as `engine.errorHash.Unknown`. Tears down the connection in `finally` unless `keepConnection` is `true`.

### `BaseAppBufferProducer` (abstract)

Extends `BaseAppProducer`. `.get:MessageSerializerCtor` → override, returns `BufferMessageSerializer` (from `@openreachtech/renchan-kafka`) so the source message buffer passes through unchanged.

### `FunnelBufferProducer`

Extends `BaseAppBufferProducer`; concrete (not abstract). `.get:config` → `{}`; `.get:errorCodeHash` → `{ Unknown: 'unknown_error' }`. Re-publishes a funnel's matched messages, byte-for-byte unchanged, to that funnel's own topic.

---

## Extractors

### `DebeziumMessageValueExtractor`

- `.create({ debeziumMessageValue, originObjectColumns })` — factory.
- `#get:oldRecord` / `#get:newRecord` — `debeziumMessageValue?.oldRecord`/`newRecord ?? null`.
- `#extractOperationKey()` — `debeziumMessageValue?.operationKey ?? null` (`c`/`u`/`d`/...).
- `#extractOldValue({ originObjectColumnId })` / `#extractNewValue({ originObjectColumnId })` — resolve a column's decoded value from the old/new record.
- `#extractLastModifiedByUserId()` — reads column named `last_modified_by_user_id` from the new record.
- `#extractOriginObjectCategoryId()` — resolves `sourceTable` from the message, finds the origin-object column whose `tableName` matches, returns its `OriginObjectCategoryId`, or `null`.
- `#extractOriginObjectUniqueKey()` — narrows columns to the message's source table first (required, since hasMany-modelled tables reuse the same column name across "slots"), finds the column flagged `isOriginObjectUniqueKey`, reads its value from `newRecord ?? oldRecord`.
- `#generateValueWithOriginalDataType({ value, originObjectColumn })` — coerces a raw decoded value by `COLUMN_TYPE`: `TEXT`/`VARCHAR` unchanged; `INTEGER`/`DECIMAL` → `Number(value)`; `BOOLEAN` → `Boolean(Number(value))`; `DATETIME` → `new Date(Number(value))`; `DATEONLY` → `new Date(Number(value) * 86400000)`; unknown type → unchanged.

### `FunnelFieldReferencePathExtractor`

Ported from leepai's `FlowsFieldPathExtractor` (criteria-rule half only).

- `.create({ funnelExtractors })` — factory.
- `#extractFieldReferencePaths()` — flat-maps every funnel extractor's criteria-rule `FIELD_REFERENCE` field paths (e.g. `User.Client.name`), dedupes via `Set`. Used to decide which associations must be eager-loaded for field-reference conditions.

### `FunnelExtractor`

Resolves a funnel's related entities purely through an injected `funnelModelsProvider` and `funnelAssociationResolver` — no model or alias name is hardcoded.

- `.create({ funnelIdHash, associatedFunnel, funnelAssociationResolver })` — factory.
- `.createAsync({ funnelIdHash, funnelModelsProvider })` — builds a `FunnelAssociationResolver`, finds the funnel (`FunnelModel.findOne` eager-loading trigger category, creation rule, actions + action categories, and origin object category + columns, all via resolver-provided aliases), then delegates to `.create()`.
- `#extractFunnelCriteriaRule()` / `#extractFunnelTriggerCategoryId()` / `#extractOriginObjectCategoryId()` / `#extractOriginObjectColumns()` — read the corresponding aliased association off `associatedFunnel`, `?? null`/`?? []`.

### `FunnelActionValueExtractor`

- `.create({ funnelAction, funnelForeignKey })` — factory.
- `#get:funnelActionId` / `#get:funnelId` / `#get:executionOrder` — read `funnelAction.id`, `funnelAction[funnelForeignKey]`, `funnelAction.executionOrder` (`?? null` each).
- `#extractParsedActionPayload()` — `JSON.parse(funnelAction.payload)` (no error handling for malformed JSON).

---

## Message value

### `AppDebeziumMessageValue`

Extends `DebeziumMessageValue` (generic) from `@openreachtech/renchan-kafka`.

- `#get:payload` — override; returns `this.rawValue?.payload ?? this.rawValue`, so it resolves correctly whether the Debezium connector is configured with schemas enabled (nested `{ schema, payload }` envelope) or disabled (payload at the value root). Every other derived getter in the base class (`newRecord`/`oldRecord`/`operationKey`/`sourceTable`/`executionAt`) flows from `payload`, so this one override fixes all of them for schemaless events.

---

## Parcels

Plain result-wrapper value objects; none extend anything, none carry `@public` tags.

### `NewEntitySaveParcel`

- `.create({ newEntityHash, savedEntity = null, error = null, option = {} })` — factory.
- `#hasError()` — `this.error !== null`. `#hasSavedEntity()` — `this.savedEntity !== null`.
- `#get:errorMessage` — `error?.message ?? null`. `#get:savedEntityId` — `savedEntity?.id ?? null`. `#get:originObjectCategoryId` — `newEntityHash.originObjectCategoryId ?? null`.

### `UpdateEntitySaveParcel` / `DeleteEntitySaveParcel`

Structurally identical shape (field names differ: `updatedEntity`/`updateEntityHash` vs. `deletedEntity`/`deleteEntityHash`).

- `.create({ updatedEntity | deletedEntity, updateEntityHash | deleteEntityHash, error = null })` — factory.
- `#hasError()` — `this.error !== null`. `#get:errorMessage` — `error?.message ?? null`.

### `CustomFunnelActionExecutionParcel`

Generic over the custom action's return type.

- `.create({ actionPayload, fulfilledResult = null, error = null })` — factory.
- `#hasError()` — `this.error !== null`. `#hasFulfilledResult()` — `!this.hasError()` (true whenever there's no error, regardless of whether `fulfilledResult` is actually set).
- `#get:errorMessage` — `error?.message ?? null`. `#get:errorStack` — `error?.stack ?? null` (includes the message as its first line).

### `FunnelTriggerParcel`

- `.create({ triggerResult, errors })` — factory (both required, no defaults).
- `#shouldTriggerActions()` — returns `this.triggerResult` directly.

---

## Providers

### `BaseFunnelModelsProvider` (abstract)

Exposes the Sequelize model classes the funnel feature needs; a consuming app subclasses this and overrides every model getter below so no other class imports a model directly.

- `.create({ sequelizeClient, originObjectModelLookup })` — plain factory.
- `.createAsync({ sequelizeClient = this.FunnelModel.sequelize } = {})` — builds `originObjectModelLookup` (queries all origin object categories, maps `category.id → sequelizeClient.models[category.name] ?? null`) then delegates to `.create()`. **Must** be used instead of `.create()` whenever any funnel of the watched table has a `FIELD_REFERENCE` condition.
- Abstract model getters (each throws `ConcreteMemberNotFoundFunnelError` unless overridden, both as `.get:` static and mirrored `#get:` instance): `FunnelModel`, `FunnelTriggerCategoryModel`, `FunnelTriggerCronExpressionModel`, `FunnelCreationRuleModel`, `FunnelActionModel`, `FunnelActionCategoryModel`, `FunnelExecutionModel`, `FunnelActionExecutionModel`, `FunnelExecutionStatusModel`, `FunnelActionExecutionJobLinkageModel`, `JobModel`, `JobExecutionStatusModel`, `OriginObjectCategoryModel`, `OriginObjectColumnModel`.
- `#resolveOriginObjectRootModel({ originObjectCategoryId })` — `originObjectModelLookup[originObjectCategoryId] ?? null`; only invoked when a watched table has a `FIELD_REFERENCE`-conditioned funnel.
- `#resolveAssociationAlias({ sourceModel, targetModel })` — concrete default, always returns `null` (meaning "auto-resolve the one association to that target"); override only when a source model has more than one association to the same target model.

### `DynamicValueSuiteProvider`

- `.create({ suiteCtors = DynamicValueSuiteCtors, offsetValueSuiteProvider = this.createOffsetValueSuiteProvider() } = {})` — factory; defaults to the built-in suite list and a fresh `OffsetValueSuiteProvider`.
- `#generateDynamicValueSuite({ dynamicValueKey, offsetOption = {}, option = {} })` — finds the ctor in `suiteCtors` whose static `dynamicValueKey` matches; returns `null` if none found; else `Ctor.create({ offsetOption, option, offsetValueSuiteProvider })`.

### `OffsetValueSuiteProvider`

- `.create({ suiteCtors = OffsetValueSuiteCtors } = {})` — factory.
- `#generateOffsetValueSuite({ offsetUnitKey, params: { baseValue, offsetValue, option = {} } })` — finds the ctor whose static `offsetUnitKey` matches; returns `null` if none found; else `Ctor.create({ baseValue, offsetValue, option })`.

---

## Payload generators

### `BaseFunnelActionPayloadGenerator` (abstract)

A subclass declares `.get:actionCategoryKey` and implements `#generatePayload()`, typically composing `#generateBaseFunnelPayload()` with values pulled through the injected `funnelValueSuiteHash`.

- `.create({ funnelExecution, funnelValueSuiteHash, funnelActionValueExtractor, debeziumMessageValueExtractor, fieldPathValueExtractor, systemUserId })` — plain factory, all required.
- `.createAsync({ fieldPathValueExtractor, funnelActionValueExtractor, funnelExecution, debeziumMessageValueExtractor, systemUserId })` — builds `funnelValueSuiteHash` via `FunnelValueRetrieverSuiteHashBuilder`, then delegates to `.create()`.
- `.get:actionCategoryKey` — abstract; throws plain `Error('Property actionCategoryKey must be implemented.')` unless overridden.
- `#generateBaseFunnelPayload()` — builds the common envelope: `actionType`/`actionCategoryKey` (both = `this.actionCategoryKey`), `funnel: { funnelId, funnelActionId, funnelExecutionId, executionOrderInFunnel }`, `sourceOriginObjectCategoryId`/`sourceOriginObjectUniqueKey`, `sourceOriginObjectLastModifiedByUserId` (falls back to `this.systemUserId` when the message carries no last-modifier).
- `#generatePayload()` — abstract; throws plain `Error('Method generatePayload() must be implemented.')` unless overridden.

### Concrete payload generators

All four extend `BaseFunnelActionPayloadGenerator`, add no constructor/static factories of their own, and each override `.get:actionCategoryKey` + `#generatePayload()`:

| class | `actionCategoryKey` | what `#generatePayload()` adds |
| :-- | :-- | :-- |
| `CreateRecordPayloadGenerator` | `'createRecord'` | resolves `targetOriginObjectUniqueKey` and every value in `recordCreationValues[].values[]` through `funnelValueSuiteHash`; passes `associations` through unchanged |
| `UpdateRecordPayloadGenerator` | `'updateRecord'` | same value resolution for `recordUpdateValues[].values[]`; if the parsed payload has no `recordUpdateValues`, the field is `null` rather than throwing |
| `SendEmailPayloadGenerator` | `'sendEmail'` | resolves `targetOriginObjectUniqueKey` (bare number, not `{sourceValueType,value}`), `scheduledSendTime`, `sender.email`, `sender.name`, `sendToValue`, and each of `sendToCcValues`/`sendToBccValues` |
| `CustomActionPayloadGenerator` | `'custom'` | resolves every `values[].value`; then **overwrites** `actionType` with `actionPayload.actionType` from the parsed payload (not the base's `actionCategoryKey`-derived value) |

---

## Trigger condition suites

### `BaseFunnelTriggerSuite` (abstract)

- `.create()` — no-arg factory.
- `#get:Ctor` — `this.constructor`.
- `.get:operatorKey` / `#get:operatorKey` — abstract; throws `ConcreteMemberNotFoundFunnelError` unless overridden.
- `#isPassTrigger({ leftHand, rightHand })` — abstract (already-extracted values, not raw sources); throws `ConcreteMemberNotFoundFunnelError` unless overridden. Returns `{ isPassed, error }`.
- `#evaluate({ leftHand, rightHand, fieldPathValueExtractor, debeziumMessageValueExtractor })` — concrete: extracts both sides via `#extractValue()` then delegates to `#isPassTrigger()`.
- `#extractValue({ triggerValue, fieldPathValueExtractor, debeziumMessageValueExtractor })` — resolves a rule-side value by `triggerValue.sourceValueType`: falsy → `null`; `FIXED_VALUE` → `triggerValue.value`; `NEW_VALUE`/`OLD_VALUE` → `debeziumMessageValueExtractor.extractNewValue()`/`extractOldValue()`; `FIELD_REFERENCE` → strips the leading root-model segment off `sourceFieldPath` then `fieldPathValueExtractor.extractFieldPathValue()`; anything else (including `DYNAMIC_VALUE`, which has no branch here) → `null`.

### Concrete trigger condition suites

All 9 extend `BaseFunnelTriggerSuite`, add no constructor or extra statics, and each just override `.get:operatorKey` + `#isPassTrigger()`:

| class | operator | `#isPassTrigger()` behavior |
| :-- | :-- | :-- |
| `EqualsTriggerConditionSuite` | `EQUALS` | strict `===`, no coercion, no null special-casing |
| `NotEqualsTriggerConditionSuite` | `NOT_EQUALS` | strict `!==`, mirrors Equals |
| `ContainsTriggerConditionSuite` | `CONTAINS` | stringifies both sides and checks `.includes()`; fails immediately if either side is strictly `null` |
| `NotContainsTriggerConditionSuite` | `NOT_CONTAINS` | if `leftHand === null`, passes immediately (this branch always short-circuits before any right-hand null check can matter); otherwise stringifies both sides and passes when `!leftHandString.includes(rightHandString)` |
| `GreaterThanOrEqualTriggerConditionSuite` | `GREATER_THAN_OR_EQUAL` | coerces both sides with `Number()`; fails with a named "must be a number" error if either coerces to `NaN`; else `leftHand >= rightHand` |
| `InTriggerConditionSuite` | `IN` | requires `rightHand` to be an `Array` (fails otherwise); passes when `rightHand.includes(leftHand)` (strict-equality membership) |
| `NotInTriggerConditionSuite` | `NOT_IN` | requires `rightHand` to be an `Array`; passes when `rightHand.includes(leftHand)` is `false` |
| `IsNullTriggerConditionSuite` | `IS_NULL` | unary (ignores `rightHand`); passes when `leftHand` is `null`, `''`, `'null'`, or `'undefined'` (treats stringified nulls from upstream serialization as null too) |
| `IsNotNullTriggerConditionSuite` | `IS_NOT_NULL` | unary; exact inverse of `IsNull`'s four-value check |

### `TriggerSuiteCtors`

Plain array (not a map): `[ContainsTriggerConditionSuite, EqualsTriggerConditionSuite, GreaterThanOrEqualTriggerConditionSuite, InTriggerConditionSuite, IsNotNullTriggerConditionSuite, IsNullTriggerConditionSuite, NotContainsTriggerConditionSuite, NotEqualsTriggerConditionSuite, NotInTriggerConditionSuite]`.

---

## Evaluator / matcher / retriever

### `FunnelTriggerEvaluator`

Evaluates one funnel's criteria-rule condition tree against one change message.

- `.create({ fieldPathValueExtractor, funnelTriggerSuiteRegistry, debeziumMessageValueExtractor, funnelCriteriaRule, funnelTriggerCategoryId })` — plain factory.
- `.createAsync({ fieldPathValueExtractor, debeziumMessageValueExtractor, funnelCriteriaRule, funnelTriggerCategoryId })` — builds a fresh `FunnelTriggerSuiteRegistry.create()` internally, then delegates to `.create()`.
- `#evaluate()` — public entry point. First checks `#isTriggerCategoryMatched()`; if `false`, short-circuits to `FunnelTriggerParcel.create({ triggerResult: false, errors: [] })` without touching the criteria rule. Otherwise parses `funnelCriteriaRule.condition` as JSON (no try/catch — malformed JSON throws uncaught `SyntaxError`) and recursively evaluates the condition tree.
- `#isTriggerCategoryMatched()` — `false` if the message has no operation key; else checks `TRIGGER_CATEGORY_IDS_BY_OPERATION[operationKey]` includes `this.funnelTriggerCategoryId`.
- Recursive evaluation rules: an empty condition object vacuously passes; a `FIELD` condition looks up its suite by `operatorKey` in the registry and calls `.evaluate()` (no null-check — an unrecognized `operatorKey` throws a `TypeError` calling `.evaluate()` on `null`); a logical `AND` passes only if every child passes (errors from *all* children, passing or not, are concatenated); `OR` passes if any child passes (same error-collection behavior); an empty/non-array `children`, or any other operator key, vacuously passes.

### `FunnelTriggerSuiteRegistry`

- `.create({ SuiteCtors = TriggerSuiteCtors } = {})` — instantiates every ctor via `.create()`; passing a custom `SuiteCtors` array lets a caller swap/extend the operator set.
- `#getSuite({ operatorKey })` — linear `.find()` over the built suite instances matching `suite.operatorKey === operatorKey`; returns `null` if none found. This lookup — not a pre-built map — is the only place operator strings resolve to suite instances.

### `FunnelMessageMatcher`

Matches a batch of Debezium messages against the funnels targeting the changed table, grouping collaborators per funnel and hydrating origin-object records once per batch (via `OriginObjectRecordRetriever`) for any `FIELD_REFERENCE` conditions.

- `.create({ funnelModelsProvider, funnelExtractors, funnelTriggerSuiteRegistry, originObjectRecordRetriever })` — plain factory.
- `.createAsync({ tableName, funnelModelsProvider })` — the primary entry point: resolves the table's `originObjectCategoryId`, builds one `FunnelExtractor` per active funnel targeting it, builds a fresh `FunnelTriggerSuiteRegistry`, builds an `originObjectRecordRetriever` (`null` if no funnel needs `FIELD_REFERENCE` hydration), then delegates to `.create()`.
- `#get:originObjectColumns` — reads columns off the *first* funnel extractor only (`?? []`), since every funnel on this matcher targets the same origin object category.
- `#extractFunnelIdHashes()` — maps every funnel extractor to its `funnelIdHash` (used to size the per-funnel producer lookup).
- `#groupMatchedMessagesByFunnelAsync({ messages })` — main public entry point: drops messages with no payload, hydrates origin-object records once, evaluates every funnel against every message via a `FunnelTriggerEvaluator`, and returns one `{ funnelIdHash, messages }` group per funnel that matched at least one message (funnels matching zero messages are dropped).

### `OriginObjectRecordRetriever`

Ported from leepai's `OriginObjectRecordRetriever`. Retrieves origin-object records hydrated with the associations a funnel's `FIELD_REFERENCE` conditions read from, in one query per batch.

- `.create({ originObjectRootModel, fieldPaths })` — builds `includeOptions` once via `DynamicIncludeOptionBuilder.create({ rootModel: originObjectRootModel, fieldPaths }).buildIncludeOptions()`, then constructs the instance so a batch's query is a single call.
- `#findOriginObjectRecords({ uniqueKeys })` — returns an empty `Map` immediately if `uniqueKeys` is empty; else `originObjectRootModel.findAll({ where: { id: { [Op.in]: uniqueKeys } }, include: includeOptions })`, returning a `Map` keyed by each record's `id` (hardcoded primary-key column name).

---

## Funnel value retriever suites

Resolve the actual value for a funnel-action's field, given its `sourceValueType`.

### `BaseFunnelValueRetrieverSuite` (abstract)

- `.create({ debeziumMessageValueExtractor, fieldPathValueExtractor, dynamicValueSuiteProvider })` — factory.
- `.get:sourceValueTypeKey` / `#get:sourceValueTypeKey` — abstract; throws `Error('Property sourceValueTypeKey must be implemented.')` unless overridden.
- `#retrieveValue({ funnelActionValue })` — abstract; throws `Error('Method retrieveValue() must be implemented.')` unless overridden.

### `FunnelValueRetrieverSuiteHashBuilder`

- `.create({ valueSuiteClasses = FunnelValueRetrieverSuiteCtors, dynamicValueSuiteProvider = this.createDynamicValueSuiteProvider(), fieldPathValueExtractor, debeziumMessageValueExtractor })` — factory; defaults to the full built-in suite list and a fresh `DynamicValueSuiteProvider`.
- `#buildFunnelActionValueSuiteHash()` — returns `{ [sourceValueTypeKey]: suiteInstance }` built from every class in `valueSuiteClasses`, keyed by each class's own `sourceValueTypeKey`.

### Concrete funnel value retriever suites

All 5 extend `BaseFunnelValueRetrieverSuite`, override `.get:sourceValueTypeKey` + `#retrieveValue()`, add no constructor of their own:

| class | `sourceValueTypeKey` | `#retrieveValue()` behavior |
| :-- | :-- | :-- |
| `FixedValueSuite` | `FIXED_VALUE` | returns `funnelActionValue.value` unchanged (the literal) |
| `NewValueSuite` | `NEW_VALUE` | `debeziumMessageValueExtractor.extractNewValue({ originObjectColumnId })` — post-change column value |
| `OldValueSuite` | `OLD_VALUE` | `debeziumMessageValueExtractor.extractOldValue({ originObjectColumnId })` — pre-change column value |
| `FieldReferenceSuite` | `FIELD_REFERENCE` | `fieldPathValueExtractor.extractFieldPathValue({ fieldPath: value.sourceFieldPath })` |
| `DynamicValueSuite` | `DYNAMIC_VALUE` | asks `dynamicValueSuiteProvider.generateDynamicValueSuite({ dynamicValueKey, offsetOption, option })` for a dynamic-value suite, returns its `resolveValue()` — **note**: this is a different concept from `BaseDynamicValueSuite` below (same "DynamicValue" name fragment, different subsystem); this class *delegates into* that subsystem rather than being related to it by inheritance |

### `FunnelValueRetrieverSuiteCtors`

Plain array: `[DynamicValueSuite, FieldReferenceSuite, FixedValueSuite, NewValueSuite, OldValueSuite]`.

---

## Dynamic value suites

Resolve a "dynamic" time value (e.g. "now", "today"), consumed by `DynamicValueSuite` above via `DynamicValueSuiteProvider` — do not confuse with the differently-scoped class of the same name-fragment above.

### `BaseDynamicValueSuite` (abstract)

- `.create({ offsetValueSuiteProvider, offsetOption = {}, option = {} })` — factory.
- `.get:dynamicValueKey` / `#get:dynamicValueKey` — abstract; throws `Error('Property dynamicValueKey must be implemented.')` unless overridden.
- `#generateBaseValue()` — abstract; throws `Error('Method generateBaseValue() must be implemented.')`. The moment (e.g. "now") before any offset is applied.
- `#resolveValue()` — abstract; throws `Error('Method resolveValue() must be implemented.')`. The final resolved value.

### `NowValueSuite`

- `dynamicValueKey` = `'NOW'`. `#get:acceptableOffsetUnitKeys` → `['MINUTES','HOURS','DAYS']` (all three accepted).
- `#generateBaseValue()` → `new Date()`.
- `#resolveValue()` — returns the current `Date` unmodified if no acceptable offset unit key was given; otherwise asks `offsetValueSuiteProvider.generateOffsetValueSuite()` for an offset suite and returns its `generateOffsetProvidedValue()`. Throws `Error('Unknown offset unit key: ...')` if the provider yields no suite despite the key passing the acceptable-list check. Returns a `Date`.

### `TodayValueSuite`

- `dynamicValueKey` = `'TODAY'`. `#get:defaultTimezone` → `'Asia/Tokyo'`. `#get:acceptableOffsetUnitKeys` → `['DAYS']` only (no hours/minutes, unlike `NowValueSuite`).
- `#resolveTimezone()` → `option.timezone ?? defaultTimezone`.
- `#resolveValue()` — formats `baseValue` (or its offset-shifted result) as a timezone-aware `YYYY-MM-DD` string via `toLocaleString('ja-JP', { timeZone, year:'2-digit', month:'2-digit', day:'2-digit' })` with `/` replaced by `-`. Returns a `string`, not a `Date` (unlike `NowValueSuite`). Same "Unknown offset unit key" throw as above.

### `DynamicValueSuiteCtors`

Plain array: `[NowValueSuite, TodayValueSuite]`.

---

## Offset value suites

Apply a numeric offset (minutes/hours/days) to a base `Date`, used by `NowValueSuite`/`TodayValueSuite` above.

### `BaseOffsetValueSuite` (abstract)

- `.create({ baseValue, offsetValue, option = {} })` — factory.
- `.get:offsetUnitKey` / `#get:offsetUnitKey` — abstract; throws `Error('Property offsetUnitKey must be implemented.')` unless overridden.
- `#generateOffsetProvidedValue()` — abstract; throws `Error('Method generateOffsetProvidedValue() must be implemented.')`.

### Concrete offset value suites

All 3 extend `BaseOffsetValueSuite`, override `.get:offsetUnitKey` + `#generateOffsetProvidedValue()`, adding `offsetValue` (a signed number) in the corresponding unit:

| class | `offsetUnitKey` | `#generateOffsetProvidedValue()` |
| :-- | :-- | :-- |
| `MinutesOffsetSuite` | `MINUTES` | `new Date(new Date(baseValue).getTime() + offsetValue * 60 * 1000)` |
| `HoursOffsetSuite` | `HOURS` | `new Date(new Date(baseValue).getTime() + offsetValue * 60 * 60 * 1000)` |
| `DaysOffsetSuite` | `DAYS` | `new Date(new Date(baseValue).getTime() + offsetValue * 24 * 60 * 60 * 1000)` |

### `OffsetValueSuiteCtors`

Plain array: `[DaysOffsetSuite, HoursOffsetSuite, MinutesOffsetSuite]`.

---

## Executors + log registerers

### `BaseFunnelExecutor` (abstract)

The message-triggered execution path: records a `FunnelExecution`, builds one action payload per funnel action, and dispatches each as a job.

- `.create({ funnelModelsProvider, originObjectColumns, dynamicValueSuiteProvider, randomTextGenerator = RandomTextGenerator.create(), systemUserId, logger = Timber, funnelAssociationResolver = null })` — `@public` factory.
- `.createAsync({ funnelModelsProvider, originObjectColumns, systemUserId, logger })` — `@public`; builds a `DynamicValueSuiteProvider`, calls `FunnelAssociationResolver.validateFunnelAttributeNames()` (throws `AttributeNotFoundFunnelError` if the app's models are missing expected attributes), builds a `FunnelAssociationResolver`, then delegates to `.create()`.
- `.get:targetOriginObjectCategoryId` — abstract; plain `Error` unless overridden by a subclass.
- `.get:funnelActionPayloadGeneratorClassHash` — concrete default: the 4 built-in payload generators keyed by `actionCategoryKey`.
- `.get:funnelJobDispatcherCtorHash` — abstract; `ConcreteMemberNotFoundFunnelError` unless overridden — maps a funnel action's type to a job dispatcher class.
- `.get:fallbackFunnelJobDispatcherCtor` — concrete default `null`; a subclass may override to supply a fallback dispatcher for unnamed action types.
- `#executeTriggerFunnels({ debeziumMessageValues, targetFunnels, transaction = null })` — `@public` main entry point. Returns `{ dispatchedJobs: [] }` immediately if there are no messages. Otherwise: builds per-message `FunnelExecution` attributes, bulk-creates them, generates one job payload per funnel action (sorted by `executionOrder`), and **dispatches jobs serially** (preserving declared action order) via `#dispatchSingleJob()`, which throws `FunnelJobDispatchFailedFunnelError` if a dispatcher reports an error, and closes each dispatcher's connection after use (`keepsConnection: false`).
- `#resolveDispatcherCtor({ actionType })` — hash lookup, falling back to `fallbackFunnelJobDispatcherCtor`; throws `FunnelJobDispatcherNotFoundFunnelError` if neither resolves.
- `#extractOriginObjectRecord({ debeziumMessageValueExtractor })` — concrete default `newRecord ?? oldRecord`; a subclass may override to fetch the record with associations when a field reference crosses one.

### `BaseCustomFunnelActionExecutor` (abstract)

Generic over the custom action's return type. Runs one custom funnel action's own logic (outside the create/update/send-email built-ins).

- `.create({ actionPayload, funnelModelsProvider, logger = Timber, executionLogRegisterer = this.createExecutionLogRegisterer(...) })` — factory.
- `.get:ExecutionLogRegistererCtor` — abstract; plain `Error` unless overridden — the concrete `BaseCustomFunnelActionExecutionLogRegisterer` subclass to use.
- `.get:ExecutionParcelCtor` — concrete default `CustomFunnelActionExecutionParcel`.
- `#executeAction({ actionPayload = this.actionPayload } = {})` — `@public`. Sequence: records a start log, calls `#saveEntitiesIntoParcel()` (the actual custom logic), records an end log, formats the result. Returns `{ executionParcel, executionEndedLogResult }`.
- `#saveEntitiesIntoParcel({ actionPayload })` — abstract; plain `Error` unless overridden. **This is the method a subclass must implement** — it performs the custom action and returns a `CustomFunnelActionExecutionParcel`.
- `#createActionExecutionParcel({ actionPayload, fulfilledResult = null, error = null })` — helper for subclasses implementing `#saveEntitiesIntoParcel`.

### `BaseFunnelActionExecutionLogRegisterer`

Concrete (not abstract) — used as-is for the standard (non-custom) action execution path.

- `.create({ jobPayload, funnelModelsProvider })` — factory.
- `#registerExecutionStartedLog({ specifiedAt, jobPayload = this.jobPayload })` — `@public`; creates a `FunnelActionExecution` row (`startedAt`, `completedAt: null`, `inputPayload: JSON.stringify(jobPayload)`, `output: null`, `errorMessage: null`).
- `#registerExecutionEndedLog({ specifiedAt, initialFunnelActionExecution, updatedEntityParcels = [], deletedEntityParcels = [], newEntityParcels = [], jobPayload = this.jobPayload })` — `@public`; success = none of the three parcel arrays contain any `parcel.hasError()`. Updates both the `FunnelActionExecution` row (`completedAt`+`output`, or `output`+`errorMessage` on failure) and the parent `FunnelExecution` row (`completedAt`, or `isFailed: true`+`errorMessage`), building a `savedResults` summary (counts/ids of updated/created/deleted entities) only on success.

### `BaseCustomFunnelActionExecutionLogRegisterer` (abstract)

Generic over the custom action's return type. Counterpart of the class above for custom actions (works off a `CustomFunnelActionExecutionParcel` instead of raw entity-save parcels).

- `.create({ actionPayload, funnelModelsProvider })` — factory.
- `#registerExecutionStartedLog({ specifiedAt, actionPayload = this.actionPayload })` — `@public`; same shape as above but keyed off `actionPayload.funnel`.
- `#registerExecutionEndedLog({ specifiedAt, executionParcel, initialActionExecution })` — `@public`; success = `executionParcel.hasFulfilledResult()`.
- `#buildSavedResult({ executionParcel })` — abstract; plain `Error` unless overridden — must be implemented to shape the saved-result payload on success.
- `#generateErrorMessage({ executionParcel })` — concrete default `executionParcel.errorMessage`; a subclass **may** (not must) override to record more detail (e.g. a stack trace).

---

## Schedule

### `BaseScheduleFunnelsExecutor` (abstract)

The cron-triggered execution path (parallel to `BaseFunnelExecutor`, but for `FUNNEL_TRIGGER_CATEGORY.SCHEDULED` funnels with no triggering message).

- `.create({ funnelModelsProvider, funnelAssociationResolver, systemUserId, funnelActionPayloadBuilder = this.createFunnelActionPayloadBuilder(...), logger = Timber, jobDispatcherMap })` — factory (`systemUserId` is consumed only to build the default payload builder, not stored on the instance).
- `.createAsync({ funnelModelsProvider, systemUserId, logger = Timber })` — builds a `FunnelAssociationResolver`, awaits `.buildJobDispatcherMap()`, delegates to `.create()`.
- `.loadJobDispatcherCtors()` — abstract async; `ConcreteMemberNotFoundFunnelError` unless overridden. **The consuming app must implement this** to supply its dispatcher classes.
- `.buildJobDispatcherMap()` — `@public`; calls `loadJobDispatcherCtors()`, filters to valid dispatcher ctors, instantiates each (`.createAsync()`), returns a `Map<jobName, dispatcherInstance>`.
- `#executeTriggerFunnels({ transaction = null } = {})` — `@public`; retrieves all schedule funnels via `ScheduleFunnelRetriever`, filters to those `FunnelScheduleEvaluator#shouldExecuteNow()` returns `true` for, then delegates to `#executeFunnels()`.
- `#executeFunnels({ funnels, targetFunnels, currentDatetime, transaction = null })` — `@public`; bulk-creates `FunnelExecution` rows, builds job payloads via `funnelActionPayloadBuilder`, dispatches jobs, then updates `lastExecutedAt` on every executed funnel. Returns `{ funnelExecutions, dispatchedJobs }`.
- `#dispatchFunnelActionJob({ funnelActionJobPayload })` — resolves the dispatcher from the pre-built `jobDispatcherMap`; if none found, **logs and continues** (`dispatchResponse: null`) rather than throwing, unlike `BaseFunnelExecutor`. Dispatches with `keepsConnection: true` (opposite of `BaseFunnelExecutor`), since dispatchers here are built once and reused for the executor's whole lifetime.

### `ScheduleFunnelActionPayloadBuilder`

- `.create({ funnelAssociationResolver, dynamicValueSuiteProvider = DynamicValueSuiteProvider.create(), systemUserId })` — factory.
- `#get:valueSuiteClasses` — returns only `[DynamicValueSuite, FixedValueSuite]` (narrower than the message-triggered path's 5 suites, since a scheduled funnel has no Debezium message or field-reference context).
- `#generateScheduleFunnelActionJobPayloads({ funnelIdToFunnelActionsHashMap, funnelExecution })` — `@public`; builds each action's payload using **empty** Debezium/field-path extractors (`debeziumMessageValue: null`, `originObjectColumns: []`, `root: null`), sorted by `executionOrder ?? 0` then `id` as tiebreak (unlike `BaseFunnelExecutor`'s sort, which has no tiebreak).

### `ScheduleFunnelRetriever`

- `.create({ funnelModelsProvider, funnelAssociationResolver })` — factory.
- `#findScheduleFunnels()` — `@public`; `FunnelModel.findAll()` where `funnelTriggerCategory = SCHEDULED`, `isDeleted: false`, `isActive: true`, eager-loading funnel actions (+ categories), trigger category, and cron expression via resolver-provided aliases.

### `FunnelScheduleEvaluator`

- `.create({ funnel, funnelTriggerCronExpressionAlias, timezone = 'UTC', currentDatetime = this.createCurrentDatetime(), cronExpressionResolver = this.createCronExpressionResolver(...) })` — factory; default resolver reads the cron string off the funnel's aliased cron-expression association.
- `#extractInvalidCronErrorMessage()` — `@public`; delegates to the cron resolver.
- `#shouldExecuteNow()` — `@public`. Returns `false` if the cron expression is invalid, or if there's no previous fire boundary. If the funnel has never run (`lastExecutedAt` falsy), delegates to `#shouldExecuteNowWhenNeverExecuted()` (which requires the previous fire boundary to be after `funnel.deployedAt`, so schedule boundaries before deployment never fire). Otherwise, `true` only if `lastExecutedAt` is strictly before the previous fire boundary — i.e. the funnel hasn't already run for the most recent scheduled tick.

### `ScheduleFunnelDaemon`

Long-running process wrapping `ProcessClerk` (from `@openreachtech/mentsu-process-clerk`) and this package's `PeriodicalExecutor`.

- `.processSinkPool` — static property, a `WeakMap<ScheduleFunnelDaemon, ProcessSink>`, one process-event sink object per instance.
- `.create({ executor, interval = this.DEFAULT_INTERVAL_MILLISECONDS, processClerk = this.createProcessClerk(), periodicalExecutor = this.createPeriodicalExecutor({ executor, interval }) })` — factory.
- `.get:DEFAULT_INTERVAL_MILLISECONDS` — `15000` (15s).
- `.generateTick({ executor })` — returns the tick function actually run every interval: calls `executor.executeTriggerFunnels()`, returns `true` on success; **catches and swallows any error, returning `false`** — a failed tick never crashes the daemon or propagates.
- `#start()` — `@public`. Attaches the process-event sink, then starts the interval timer (`periodicalExecutor.startTick()`) — every `interval` ms (15s by default) calls `executor.executeTriggerFunnels()`. Returns `this`.
- `#stop()` — detaches the sink, stops the interval (`clearInterval`). Returns `this`.
- Process-event handling: `uncaughtException`/`unhandledRejection` → `#shutdownDaemon({ exitCode: 1 })`; `SIGINT`/`SIGTERM` → `#shutdownDaemon()` (exit code `0`). `#shutdownDaemon()` always calls `#stop()` first, then `processClerk.exit({ exitCode })` — the actual `process.exit` call is delegated to `ProcessClerk`.

---

## Tools

### `CronExpressionResolver`

Wraps `CronExpressionParser` from the `cron-parser` npm package.

- `.create({ expression, currentDatetime = this.createCurrentDatetime(), timezone = 'UTC' })` — factory.
- `.isBlankExpression({ expression })` — `true` if not a string, or trims to `''`.
- `#hasValidExpression()` — `@public`; `true` if the expression parses with no error.
- `#extractInvalidErrorMessage()` — `@public`; `parsed.error.message`, or `null` if valid.
- `#resolvePreviousDatetime()` — `@public`; the previous scheduled fire boundary strictly before `currentDatetime` (`parsed.cronExpression.prev().toDate()`), or `null` if the expression is invalid.
- `#resolveNextDatetime()` — `@public`; the next scheduled fire boundary after `currentDatetime` (`.next().toDate()`), or `null` if invalid.
- If the expression is blank, parsing yields a domain `FunnelError` (`code: '103.X000.001'`) rather than the raw cron-parser error.

### `DynamicIncludeOptionBuilder`

Ported from a leepai predecessor. Builds Sequelize `include` options from a list of dotted field paths.

- `.create({ rootModel, fieldPaths })` — factory.
- `#buildIncludeOptions()` — returns `[]` if `fieldPaths` isn't a non-empty array; otherwise builds a merged association-name tree from every field path (stripping the leading root-model segment and trailing column segment; numeric segments/array indices are skipped) and recursively converts the tree into Sequelize `include` options, filtering to keys that are real associations on the model.
- `#resolveSeparateOption({ targetModel, association })` — `true` if the target model opts in via `shouldSeparateQueryInAssociation`, or if the association is a `HasMany` — such associations are loaded with Sequelize's `separate: true` to avoid row-multiplication.

### `FunnelAssociationResolver`

Central abstraction resolving Sequelize association aliases/foreign keys dynamically rather than hardcoding them, since the app supplies its own models via `BaseFunnelModelsProvider`.

- `.create({ funnelModelsProvider, funnelAliasHash = this.buildFunnelAliasHash(...), foreignKeyHash = this.buildForeignKeyHash(...) })` — factory; resolves both hashes eagerly. `funnelModelsProvider` itself is not stored on the instance.
- `.resolveAlias({ sourceModel, targetModel, aliasOverride = null })` / `.resolveForeignKey({ ... })` — resolve a single association's alias or FK.
- `.resolveAssociation({ sourceModel, targetModel, aliasOverride = null })` — without an override: finds all of `sourceModel.associations` whose `.target === targetModel`; throws `AssociationNotFoundFunnelError` if zero match, `AmbiguousAssociationFunnelError` if more than one match. With an override: looks it up directly, throwing `AssociationNotFoundFunnelError` if absent.
- `.validateFunnelAttributeNames({ funnelModelsProvider })` — checks that `FunnelActionModel` and `FunnelExecutionModel` declare every attribute name in `FUNNEL_ATTRIBUTE_NAME_HASH` (only these two models — chosen because Sequelize silently drops writes to unknown attributes rather than erroring). Throws `AttributeNotFoundFunnelError` listing what's missing. Meant to run once at startup (called from `BaseFunnelExecutor.createAsync`).
- Instance getters (`#get:funnelTriggerCategoryAlias`, `#get:funnelTriggerCronExpressionAlias`, `#get:funnelCreationRuleAlias`, `#get:funnelActionAlias`, `#get:funnelActionCategoryAlias`, `#get:originObjectCategoryAlias`, `#get:originObjectColumnAlias`, `#get:funnelExecutionFunnelForeignKey`, `#get:funnelTriggerCategoryForeignKey`, `#get:funnelActionFunnelForeignKey`) — simple lookups into the two hashes built at construction time.

### `PeriodicalExecutor`

Thin `setInterval`/`clearInterval` wrapper.

- `.intervalIdPool` — static property, a `WeakMap<PeriodicalExecutor, NodeJS.Timeout>` tracking the running interval id per instance.
- `.create({ onTick, interval })` — factory.
- `#startTick()` — `@public`; no-op if already running (prevents leaking a second interval on a double-start); otherwise starts `setInterval(() => onTick(), interval)` and pools the returned id.
- `#stopTick()` — `@public`; clears and un-pools the interval id, if one exists.

### `RandomTextGenerator`

- `.create({ seeds = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length = 32 } = {})` — factory (default seed is the 62-char alphanumeric set).
- `#generate(length = this.length)` — builds a string of `length` characters, each independently drawn from `seeds` via `Math.random()`. **Not cryptographically secure.**

### `Timber`

Not a class — a plain console-like singleton object (`{ ...emptyFunctions, __proto__: console }`), used throughout the package as the default `logger`.

- If `process.env.NODE_ENV === 'production'`: `debug`/`error`/`info`/`log`/`warn`/`trace` are replaced with no-ops; everything else falls through to the real global `console` via the prototype chain.
- In any other `NODE_ENV`, every method behaves exactly like the global `console`.

---

## Usage

No usage example ships in the package (no README). Based on the shapes above, a minimal message-triggered pipeline looks like:

```js
import {
  BaseFunnelModelsProvider,
  BaseFunnelConsumer,
  BaseFunnelExecutor,
} from '@openreachtech/renchan-funnel'

// 1. Point the funnel feature at your own Sequelize models.
class AppFunnelModelsProvider extends BaseFunnelModelsProvider {
  static get FunnelModel () {
    return YourFunnelModel
  }
  // ...override every other abstract model getter (FunnelActionModel, FunnelExecutionModel, etc.)
}

// 2. Declare how a triggered funnel executes and dispatches its actions.
class AppFunnelExecutor extends BaseFunnelExecutor {
  static get targetOriginObjectCategoryId () {
    return YOUR_ORIGIN_OBJECT_CATEGORY_ID
  }
  static get funnelJobDispatcherCtorHash () {
    return { createRecord: YourCreateRecordJobDispatcher, sendEmail: YourSendEmailJobDispatcher }
  }
  static async resolveSystemUserId () {
    return YOUR_SYSTEM_USER_ID
  }
}

// 3. Consume the funnel's own re-published Kafka topic.
class AppFunnelConsumer extends BaseFunnelConsumer {
  static get FunnelModelsProviderCtor () {
    return AppFunnelModelsProvider
  }
  static get FunnelExecutorCtor () {
    return AppFunnelExecutor
  }
  static get funnelIdHash () {
    return 'the-funnel-id-hash'
  }
}

const consumer = await AppFunnelConsumer.createAsync({ engine, kafkaClient })
```

A scheduled (cron) funnel instead pairs a `BaseScheduleFunnelsExecutor` subclass with `ScheduleFunnelDaemon`:

```js
import { BaseScheduleFunnelsExecutor, ScheduleFunnelDaemon } from '@openreachtech/renchan-funnel'

class AppScheduleFunnelsExecutor extends BaseScheduleFunnelsExecutor {
  static async loadJobDispatcherCtors () {
    return [YourCreateRecordJobDispatcher, YourSendEmailJobDispatcher]
  }
}

const executor = await AppScheduleFunnelsExecutor.createAsync({ funnelModelsProvider, systemUserId })
const daemon = ScheduleFunnelDaemon.create({ executor })

daemon.start()
```
