# API

Source: no `types` field in `package.json` (`main` only); extracted from JSDoc across `lib/**/*.js` (45 source files, no `@public` tagging convention in this package). The surface below follows the usage pattern shown in the package's own README (a Debezium/MariaDB CDC demo with two consumers + one engine + one connector + a daemon script), plus the other exported base classes a consuming app is expected to extend.

## Exports (`index.js`)

All exports are named (`export { default as Name }`), no default export. Grouped as in `index.js`:

- Constants: `STATUS_LOOKUP`
- Connectors: `AbstractCoreConnector`, `AbstractWorkflowConnector`, `BaseConnector`
- Daemon: `BaseKafkaContext`, `BaseKafkaEngine`, `KafkaConsumersDaemon`
- Contexts: `BaseKafkaShare`
- Consumers: `BaseConsumer`, `BaseEachBatchConsumer`, `BaseEachMessageConsumer`, `BatchMessageProgress`
- Client (thin wrappers over `@openreachtech/mentsu-rocket-client`, used by the connectors above): `BaseKafkaPayload`, `BaseKafkaCapsule`, `BaseKafkaLauncher`, `KafkaRequestBody`, `KafkaRequestQuery`, `KafkaResponseBody`, `CreateConnectorKafkaPayload`, `CreateConnectorKafkaCapsule`, `CreateConnectorKafkaLauncher`, `PutConnectorConfigKafkaPayload`, `PutConnectorConfigKafkaCapsule`, `PutConnectorConfigKafkaLauncher`
- Errors: `KafkaError`, `ConcreteMemberNotFoundKafkaError`
- Messages: `ConsumerMessage`, `BaseMessageDeserializer`, `BufferMessageDeserializer`, `JsonMessageDeserializer`, `BaseMessageValue`, `DebeziumMessageValue`, `BaseMessageKey`, `DebeziumMessageKey`, `BaseConsumerParcel`, `EachBatchConsumerParcel`, `EachMessageConsumerParcel`
- Producers: `ProducerResponse`, `BaseProducer`, `BaseJsonProducer`, `BaseBufferProducer`, `BaseMessageSerializer`, `JsonMessageSerializer`, `BufferMessageSerializer`
- Tools: `DeepBulkClassLoader`

## Notation

Applies to every class section below.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

Members marked **abstract** throw `ConcreteMemberNotFoundKafkaError` unless overridden by a concrete subclass — these are the extension points an application is expected to fill in.

---

## Daemon startup flow (how the pieces fit together)

1. An app defines an **engine** (extends `BaseKafkaEngine`) with `.config` (broker list, `consumersPath`, etc.), `.ShareCtor`, `.ContextCtor`.
2. `KafkaConsumersDaemon.createAsync({ EngineCtor })` builds the engine, creates a `kafkajs` `Kafka` client from `engine.buildKafkaConfig()`, bulk-loads every consumer class under `engine.config.consumersPath` via `DeepBulkClassLoader`, and instantiates each with `ConsumerCtor.createAsync()`.
3. `daemon.startDaemon()` attaches management listeners then calls `consumer.startConsumer()` on every consumer (connect → subscribe → run).
4. Each **consumer** (extends `BaseEachMessageConsumer` or `BaseEachBatchConsumer`) declares its `kafkajs` `groupId` config, its topics (`.collectTopics()`), and the deserializer/key/value/parcel constructors used to build a `ConsumerMessage` per raw Kafka message; the app implements `onEachMessage({ message, parcel, context })`.
5. A **connector** (extends `BaseConnector`) registers/updates Kafka-Connect (Debezium) connectors over HTTP via the `client/` launcher classes.
6. A **producer** (extends `BaseJsonProducer` or `BaseBufferProducer`) sends serialized messages to a topic.

## Class: `STATUS_LOOKUP`

Not a class — a frozen-shape object of `Symbol` constants identifying the outcome of processing one message in an `eachBatch` consumer.

- `.COMPLETED` / `.FAILED` / `.STOPPED` / `.CANCELED` — static properties, each a unique `Symbol`. Compared against `BatchMessageProgress` outcome entries (see `BatchMessageProgress` below).

## Class: `AbstractCoreConnector`

Lowest-level connector: knows how to call the Kafka-Connect REST API (`POST /connectors`, `PUT /connectors/[connectorName]/config`) but has no config-shape opinions. Constructed with `{ config }`.

- `.create({ config = this.buildConfig() } = {})` — static factory method. Returns an instance (or subclass instance, via `this`).
- `.buildConfig()` — **abstract** static method. Must return the connector's `config` object (e.g. `{ BASE_URL: 'http://localhost:8083' }`).
- `.get:connectorName` — **abstract** static getter. Must return the Kafka-Connect connector name.
- `#get:Ctor` — instance getter, returns `this.constructor`.
- `#invokeCreateConnector({ pathParameterHash?, query?, body, optionHash? })` — instance method. Sends `POST /connectors`, path-parameterized with `connectorName`. Returns the launcher's capsule.
- `#invokePutConnectorConfig({ pathParameterHash, query?, body, optionHash? })` — instance method. Sends `PUT /connectors/[connectorName]/config`.

## Class: `AbstractWorkflowConnector`

Extends `AbstractCoreConnector`. Adds config-key denormalization (camelCase → delimiter-case, via `@openreachtech/mentsu-text-case-tools`) before submitting a `bodyConfig` to Kafka Connect.

- `.createDeepKeyCaseConverter()` — static method, builds the `.`-delimiter key converter used internally.
- `#createConnectorFromBodyConfig({ bodyConfig, requestInput? })` — instance method. Denormalizes `bodyConfig` keys and calls `invokeCreateConnector` with `{ name: connectorName, config: <denormalized> }`.
- `#putConnectorConfigWithBodyConfig({ bodyConfig, requestInput? })` — instance method. Same denormalization, then `invokePutConnectorConfig`.

## Class: `BaseConnector`

The class applications actually extend (see README `MariadbConnector` example). Extends `AbstractWorkflowConnector`.

- `.create({ config = this.buildConfig() } = {})` — static factory method (inherited).
- `.buildConfig()` — **abstract** static method, application must implement (e.g. return `{ BASE_URL }`).
- `.get:connectorName` — **abstract** static getter, application must implement.
- `#createConnector({ bodyConfig = this.Ctor.buildConfig(), requestInput = {} } = {})` — instance method. Registers the connector with Kafka Connect.
- `#putConnectorConfig({ bodyConfig = this.Ctor.buildConfig(), requestInput = {} } = {})` — instance method. Updates an existing connector's config.

## Class: `BaseKafkaContext`

Per-invocation context object, created fresh for every consumed message/batch via `engine.ContextCtor.createAsync({ engine })`.

- `.create({ engine, executedAt = new Date() })` — static factory method.
- `.createAsync({ engine })` — static async factory method.
- `#get:share` — instance getter, `engine.share`.
- `#get:env` — instance getter, `engine.env` (the `renchan-env` facade).
- `#get:now` — instance getter, the `executedAt` timestamp.

## Class: `BaseKafkaEngine`

Application-wide engine: holds `config`, the shared `BaseKafkaShare` instance, and a standard error hash. Abstract — an app must subclass it (see README `AppKafkaEngine` example).

- `.createAsync({ config = this.config } = {})` — static async factory method. Builds `share` via `.ShareCtor.createAsync()` then constructs the engine.
- `.get:config` — **abstract** static getter. Must return `{ kafkaOptionHash, consumersPath, consumerOptionHash?, producerOptionHash? }` (only `kafkaOptionHash`/`consumersPath` are read by the framework itself; the rest are merged into consumer/producer config by `BaseConsumer`/`BaseProducer`).
- `.get:ShareCtor` — **abstract** static getter. Must return a `BaseKafkaShare` subclass.
- `.get:ContextCtor` — **abstract** static getter. Must return a `BaseKafkaContext` subclass.
- `.get:standardErrorCodeHash` — static getter. Default `{ SecurityOptionsNotFound: '103.X000.001', Unknown: '100.X000.001' }`; override (with `...super.standardErrorCodeHash`) to add app-specific error codes (see README example).
- `#get:env` — instance getter, `share.env`.
- `#get:NODE_ENV` — instance getter, `env.NODE_ENV`.
- `#buildKafkaConfig({ config = this.config } = {})` — instance method. Merges `config.kafkaOptionHash` with `socketFactory`/`logCreator` hooks (see below) into the object passed to `new Kafka(...)`.
- `#defineSocketFactory()` / `#defineLogCreator()` — instance methods, both return `null` by default; override to plug in a custom `kafkajs` socket factory or log creator.
- `#passesThoughError()` — instance method. Returns `env.isPreProduction()`; when `true`, `collectExceptionCatchingMapEntries()` returns `[]` (errors are not wrapped/caught) — used by consuming code that wants raw errors surfaced only outside production/staging.

## Class: `KafkaConsumersDaemon`

Entry-point daemon that boots and gracefully shuts down every consumer for one engine (see README `run-kafka-daemon.js` example).

- `.createAsync({ EngineCtor })` — static async factory method. Builds the engine, creates the `kafkajs` `Kafka` client (validating TLS/SASL security options are present when `engine.env.isProduction()` or `.isStaging()`, throwing `engine.errorHash.SecurityOptionsNotFound` otherwise), recursively loads every consumer class file under `engine.config.consumersPath` (via `DeepBulkClassLoader`), and calls `ConsumerCtor.createAsync({ engine, kafkaClient })` on each.
- `.get:KafkaClientCtor` — static getter, the `kafkajs` `Kafka` constructor.
- `#startDaemon()` — instance method. Attaches a management sink (auto-shutdown on `consumer.crash` / `consumer.network.request_timeout` / `consumer.disconnect`) to every consumer, then starts all consumers concurrently; if any fails to start, immediately calls `shutdownDaemon()`.
- `#shutdownDaemon()` — instance method. Detaches the process-signal sink, disconnects every consumer, then calls `processClerk.exit({ exitCode })` (`0` on success, `1` if any consumer failed to disconnect). Also wired (via `attachProcessSink()`, called from `startDaemon()`) to run automatically on `uncaughtException`, `unhandledRejection`, `SIGINT`, and `SIGTERM`.

## Class: `BaseKafkaShare`

Object shared across all consumers/producers/contexts for one engine: the resolved environment and a `ProcessClerk` (from `@openreachtech/mentsu-process-clerk`) used for signal/exception handling.

- `.create({ renchanEnv = this.renchanEnv, processClerk = this.createProcessClerk() } = {})` — static factory method.
- `.createAsync({ config })` — static async factory method (calls `.create()`).
- `.get:renchanEnv` — static getter, the `@openreachtech/renchan-env` environment facade instance (`renchanCoreEnv`).
- `.get:ProcessClerkCtor` — static getter, the `ProcessClerk` constructor.
- `#get:env` — instance getter, `this.renchanEnv`.

## Class: `BaseConsumer`

Abstract base shared by `BaseEachMessageConsumer` and `BaseEachBatchConsumer`. Not usually extended directly by applications.

- `.createAsync({ engine, kafkaClient })` — static async factory method. Resolves topics via `.collectTopics({ engine })`, then builds the consumer (including the underlying `kafkajs` consumer client via `kafkaClient.consumer(consumerConfig)`, where `consumerConfig = { ...engine.config.consumerOptionHash, ...this.config }`).
- `.get:config` — **abstract** static getter. `kafkajs` `ConsumerConfig` (must include `groupId`).
- `.get:errorCodeHash` — **abstract** static getter. `{ errorName: code }` map used to declare per-consumer `KafkaError` subclasses (accessible on instances as `this.Error.<errorName>`).
- `.get:MessageDeserializerCtor` — **abstract** static getter. E.g. `JsonMessageDeserializer` / `BufferMessageDeserializer`.
- `.get:MessageKeyCtor` — **abstract** static getter. E.g. `DebeziumMessageKey`.
- `.get:MessageValueCtor` — **abstract** static getter. E.g. `DebeziumMessageValue`.
- `.get:ConsumerParcelCtor` — **abstract** static getter (overridden concretely by the two subclasses below).
- `.collectTopics({ engine })` — **abstract** static async method. Must return `Array<string>` of Kafka topics to subscribe to.
- `#get:share` / `#get:config` / `#get:Error` — instance getters delegating to `engine.share`, `engine.config`, and the built error hash respectively.
- `#startConsumer()` — instance method. Attaches the consumer's event sink, then connects, subscribes, and runs the underlying `kafkajs` consumer.
- `#shutdownConsumer()` — instance method. Detaches listeners and disconnects.

## Class: `BaseEachMessageConsumer`

Extends `BaseConsumer` for `kafkajs`'s `eachMessage` mode (one message at a time). This is the class applications extend for message-by-message processing (see README `UserEachMessageConsumer` example).

- `.get:ConsumerParcelCtor` — static getter, fixed to `EachMessageConsumerParcel`.
- `#onEachMessage({ message, parcel, context })` — **abstract** instance method. The hook applications implement; `message` is a `ConsumerMessage`, `parcel` an `EachMessageConsumerParcel`, `context` a `BaseKafkaContext`.

## Class: `BaseEachBatchConsumer`

Extends `BaseConsumer` for `kafkajs`'s `eachBatch` mode (a batch of messages per invocation, with manual offset/heartbeat control). Applications extend this for batch processing (see README `UserAmountEachBatchConsumer` example).

- `.SKIP_CYCLE` — static property, `100`. Every 100 messages, processing yields to the event loop (`setTimeout(resolve, 0)`) to avoid blocking.
- `.get:ConsumerParcelCtor` — static getter, fixed to `EachBatchConsumerParcel`.
- `#onEachMessage({ message, parcel, context })` — **abstract** instance method, called once per message in the batch (same signature/role as in `BaseEachMessageConsumer`); after it resolves without throwing, the framework calls `parcel.invokeResolveOffset()` and `parcel.invokeHeartbeat()` automatically.
- `#onPostBatchMessages({ progress })` — instance method (no-op by default). Called once after the whole batch is processed, with the accumulated `BatchMessageProgress`.
- `#shouldCancelProcess({ progress })` — instance method (returns `false` by default). Override to skip remaining messages in the batch based on prior outcomes.
- Per-message processing sets outcome `status` to one of `STATUS_LOOKUP.COMPLETED` / `.FAILED` / `.STOPPED` (batch no longer running/stale) / `.CANCELED` (`shouldCancelProcess` returned `true`); on error, `.FAILED` with `error: engine.errorHash.Unknown.create(...)`.

## Class: `BatchMessageProgress`

Immutable-ish progress accumulator threaded through `BaseEachBatchConsumer`'s per-message reduce loop; a new instance is produced after each message via `cloneWithOutcome`.

- `.create({ parcel, batchOutcomes = [] })` — static factory method.
- `#get:messagesLength` — instance getter, total message count in the batch (`parcel.messages.length`).
- `#extractCurrentMessage()` — instance method. The raw `kafkajs` message corresponding to the last recorded outcome, or `null`.
- `#countCompletedMessage()` / `#countFailedMessage()` / `#countSkippedMessage()` — instance methods, counts of outcomes with the corresponding `STATUS_LOOKUP` status. (Note: `countSkippedMessage` looks for `STATUS_LOOKUP.SKIPPED`, a status not actually produced by `BaseEachBatchConsumer` — which emits `CANCELED`/`STOPPED` instead — so it will always return `0` unless a custom outcome uses that status.)
- `#cloneWithOutcome({ outcome })` — instance method. Returns a new `BatchMessageProgress` with `outcome` appended to `batchOutcomes`.

## Class: `BaseKafkaPayload`

Base HTTP payload for Kafka-Connect requests (extends `mentsu-rocket-client`'s `BasePayload`). Used internally by the `Create`/`Put` launcher classes below; not typically touched directly by applications.

- `.get:contentType` — static getter, `'application/json'`.
- `.get:RequestBodyCtor` / `.get:RequestQueryCtor` — static getters, `KafkaRequestBody` / `KafkaRequestQuery`.

## Class: `BaseKafkaCapsule`

Base response capsule (extends `mentsu-rocket-client`'s `BaseCapsule`). `.get:ResponseBodyCtor` is fixed to `KafkaResponseBody`. No additional members.

## Class: `BaseKafkaLauncher`

Base HTTP launcher (extends `mentsu-rocket-client`'s `BaseLauncher`). No-op subclass — a pure naming/typing anchor for the concrete launchers below.

## Class: `KafkaRequestBody` / `KafkaRequestQuery` / `KafkaResponseBody`

No-op subclasses of `mentsu-rocket-client`'s `RequestBody` / `RequestQuery` / `ResponseBody`, used as the default request/response shapes for Kafka-Connect calls.

## Class: `CreateConnectorKafkaPayload` / `CreateConnectorKafkaCapsule` / `CreateConnectorKafkaLauncher`

Concrete payload/capsule/launcher triad implementing `POST /connectors` (create a Kafka-Connect connector). `CreateConnectorKafkaPayload.get:method` is `POST`, `.get:pathname` is `/connectors`. Used internally by `AbstractCoreConnector#invokeCreateConnector`.

## Class: `PutConnectorConfigKafkaPayload` / `PutConnectorConfigKafkaCapsule` / `PutConnectorConfigKafkaLauncher`

Concrete payload/capsule/launcher triad implementing `PUT /connectors/[connectorName]/config` (update a connector's config). `PutConnectorConfigKafkaPayload.get:method` is `PUT`. Used internally by `AbstractCoreConnector#invokePutConnectorConfig`.

## Class: `KafkaError`

Base error type (`extends Error`) for the whole package; every `errorHash` entry produced by `buildErrorHash()` (on engines/consumers/producers) is a `KafkaError` subclass bound to one error code.

- `.create({ code = this.errorCode, options, value } = {})` — static factory method. Message is `code` alone, or `` `${code} ${JSON.stringify(value)}` `` when `value` is given.
- `.get:errorCode` — **abstract** static getter; throws a plain (non-`KafkaError`) `Error` if not overridden, by design, so it's never surfaced to clients.
- `.declareKafkaError({ code })` — static method. Returns `class extends this { static get errorCode () { return code } }` — this is how `errorCodeHash` entries turn into concrete error classes.

## Class: `ConcreteMemberNotFoundKafkaError`

`extends KafkaError`, fixed `.get:errorCode` = `'101.X000.001'`. Thrown by every abstract static/instance member in this package that hasn't been overridden by a concrete subclass (message includes `{"memberName": "<Class>.<member>"}`).

## Class: `ConsumerMessage`

Normalizes one raw `kafkajs` message into `{ key, value, normalizedValue }` plus metadata. Built per-message by `BaseConsumer.createMessage()`.

- `.createAsync({ rawMessage })` — static async factory method. Deserializes `rawMessage.key`/`.value` (via `MessageDeserializerCtor`), wraps the deserialized value in `MessageValueCtor`.
- `.use(MessageDeserializerCtor)` / `.toKey(MessageKeyCtor)` / `.toValue(MessageValueCtor)` — static methods. Each returns a new bound subclass with the given constructor fixed (used internally by `BaseConsumer.inflateMessageCtor()`, chained as `MessageCtor.use(...).toKey(...).toValue(...)`); applications configure this indirectly via the consumer's `MessageDeserializerCtor`/`MessageKeyCtor`/`MessageValueCtor` static getters rather than calling these directly.
- `#get:key` — instance getter, deserialized key.
- `#get:value` — instance getter, deserialized raw value.
- `#get:normalizedValue` — instance getter, the `MessageValueCtor` instance (e.g. a `DebeziumMessageValue`) — **this is what `onEachMessage` handlers read** (see README examples, `message.normalizedValue.operationKey` / `.newRecord`).
- `#get:rawTimestamp` — instance getter, raw Unix-ms string.
- `#get:size` — instance getter, byte size or `null`.
- `#normalizeOffset()` — instance method, `Number(rawMessage.offset)`.
- `#normalizeReceivedAt()` — instance method, `Date` from `rawTimestamp`, or `null` if invalid/absent.

## Class: `BaseMessageDeserializer`

Abstract. `#deserializeBuffer()` is the sole abstract instance method (must resolve to the deserialized value or `null`).

## Class: `BufferMessageDeserializer`

`#deserializeBuffer()` returns the raw `Buffer` unchanged.

## Class: `JsonMessageDeserializer`

`#deserializeBuffer()` calls `JSON.parse(buffer.toString())`; returns `null` on parse failure (does not throw). Used as the default in the README's Debezium examples.

## Class: `BaseMessageValue`

Abstract wrapper; constructor just stores `rawValue`. No behavior beyond `.create({ rawValue })`.

## Class: `DebeziumMessageValue`

Extends `BaseMessageValue`; interprets a Debezium change-event JSON payload (`{ schema, payload: { before, after, source, op, ts_ms } }`).

- `.get:OPERATION_KEY_LOOKUP` — static getter, `{ CREATE: 'c', UPDATE: 'u', DELETE: 'd', READ: 'r', TRUNCATE: 't', MESSAGE: 'm' }`.
- `#get:operationKey` — instance getter, `payload.op` (one of the codes above).
- `#get:oldRecord` / `#get:newRecord` — instance getters, `payload.before` / `payload.after`.
- `#get:sourceTable` — instance getter, `payload.source.table`.
- `#get:executionAt` — instance getter, `new Date(payload.ts_ms)`.
- `#isCreateOperation()` / `#isUpdateOperation()` / `#isDeleteOperation()` / `#isReadOperation()` / `#isTruncateOperation()` — instance methods, compare `operationKey` against `OPERATION_KEY_LOOKUP`. (There is no `isMessageOperation()` for the `'m'`/`MESSAGE` code.)

## Class: `BaseMessageKey`

Abstract wrapper; constructor just stores `rawKey`. No behavior beyond `.create({ rawKey })`.

## Class: `DebeziumMessageKey`

Extends `BaseMessageKey`; a Debezium key payload is `{ schema, payload: <primary key fields> }`.

- `#get:schema` — instance getter, `rawKey.schema`.
- `#get:payload` — instance getter, `rawKey.payload`.

## Class: `BaseConsumerParcel`

Thin wrapper around the raw `kafkajs` `eachMessage`/`eachBatch` payload, giving access to flow-control primitives.

- `.createAsync({ rawArgument })` — static async factory method.
- `#invokeHeartbeat()` — instance method, `rawArgument.heartbeat()`.
- `#invokePause()` — instance method, `rawArgument.pause()` — returns the resume function.

## Class: `EachMessageConsumerParcel`

Extends `BaseConsumerParcel<EachMessagePayload>`. Adds `#get:topic`, `#get:partition`, `#get:message` (the raw `kafkajs` `KafkaMessage`) as read-through getters on `rawArgument`.

## Class: `EachBatchConsumerParcel`

Extends `BaseConsumerParcel<EachBatchPayload>`. Adds batch-scoped accessors and flow control used internally by `BaseEachBatchConsumer`.

- `#get:batch` / `#get:messages` / `#get:topic` / `#get:partition` — instance getters read through `rawArgument.batch`.
- `#shouldBreakProcess()` — instance method, `true` when the batch is no longer running or has gone stale (checked before processing each message).
- `#invokeResolveOffset({ offset })` / `#invokeCommitOffsetsIfNecessary()` / `#invokeUncommittedOffsets()` — instance methods, read-through to `rawArgument`.

## Class: `ProducerResponse`

Result of `BaseProducer#sendMessages()`.

- `.create({ rawResponse, error })` — static factory method.
- `#get:outcomes` — instance getter, the raw `kafkajs` `RecordMetadata[]` response (or `null` on error).
- `#hasError()` — instance method, truthy when `error` is set.

## Class: `BaseProducer`

Abstract producer wrapping a `kafkajs` producer client. Not usually extended directly — see `BaseJsonProducer`/`BaseBufferProducer`.

- `.createAsync({ engine = null } = {})` — static async factory method. Creates the engine if not given, builds the `kafkajs` `Kafka` client (same TLS/SASL validation as `KafkaConsumersDaemon.createAsync`), creates and connects the producer client.
- `.get:EngineCtor` — **abstract** static getter.
- `.get:MessageSerializerCtor` — **abstract** static getter (fixed concretely by the two subclasses below).
- `.get:config` — **abstract** static getter, `kafkajs` `ProducerConfig`.
- `.get:errorCodeHash` — **abstract** static getter.
- `.get:topic` — **abstract** static getter, the default topic for `sendMessages()`.
- `#sendMessages({ messages, keepConnection = false })` — instance method. Serializes each message's `key`/`value` via `MessageSerializerCtor`, sends them, and disconnects the producer afterward unless `keepConnection` is `true`. Always resolves (never rejects) with a `ProducerResponse` — errors are captured on `.error`, not thrown.
- `#enrichMessageKey({ key })` — instance method (identity by default); override to transform/derive a key before serialization.

## Class: `BaseJsonProducer`

Extends `BaseProducer`; `.get:MessageSerializerCtor` fixed to `JsonMessageSerializer`.

## Class: `BaseBufferProducer`

Extends `BaseProducer`; `.get:MessageSerializerCtor` fixed to `BufferMessageSerializer`.

## Class: `BaseMessageSerializer`

Abstract. `#toBuffer()` is the sole abstract instance method, must resolve to a `Buffer` (or `null`).

## Class: `JsonMessageSerializer`

`#toBuffer()` returns `Buffer.from(JSON.stringify(source), 'utf8')`.

## Class: `BufferMessageSerializer`

`#toBuffer()` returns `source` unchanged (assumed already a `Buffer`).

## Class: `DeepBulkClassLoader`

Recursively loads every `.js`/`.mjs`/`.cjs` file's default export under a directory as a class; used internally by `KafkaConsumersDaemon` to auto-discover consumer classes from `engine.config.consumersPath`.

- `.create({ poolPath })` — static factory method.
- `#loadClasses({ poolPath = this.poolPath, filterFunc = it => true, mapFunc = it => it } = {})` — instance method, `@public`-tagged in source. Recursively walks `poolPath` (skipping dotfiles), dynamically `import()`s every matching file, keeps only default exports that are functions/classes, then applies `filterFunc`/`mapFunc`.

## Usage

Minimal shape of the README's own end-to-end example (Debezium/MariaDB CDC demo — see `lib/docs/renchan-kafka/README.md` for the full walkthrough with Docker setup):

```js
// connectors/MariadbConnector.js
import { BaseConnector } from '@openreachtech/renchan-kafka'

export default class MariadbConnector extends BaseConnector {
  static get connectorName () {
    return 'mariadb-connector'
  }

  static buildConfig () {
    return {
      BASE_URL: 'http://localhost:8083',
    }
  }
}

// consumers/eachMessageConsumers/UserEachMessageConsumer.js
import {
  BaseEachMessageConsumer,
  JsonMessageDeserializer,
  DebeziumMessageKey,
  DebeziumMessageValue,
  EachMessageConsumerParcel,
} from '@openreachtech/renchan-kafka'

export default class UserEachMessageConsumer extends BaseEachMessageConsumer {
  static get config () {
    return { groupId: 'demo-users-group' }
  }

  static get errorCodeHash () {
    return {}
  }

  static get MessageDeserializerCtor () {
    return JsonMessageDeserializer
  }

  static get MessageKeyCtor () {
    return DebeziumMessageKey
  }

  static get MessageValueCtor () {
    return DebeziumMessageValue
  }

  static get ConsumerParcelCtor () {
    return EachMessageConsumerParcel
  }

  static async collectTopics () {
    return ['db_server.demo_db.users']
  }

  async onEachMessage ({ message }) {
    if (!message.value?.payload) {
      return
    }

    console.log(message.normalizedValue.operationKey, message.normalizedValue.newRecord)
  }
}

// engine/AppKafkaEngine.js
import { BaseKafkaEngine, BaseKafkaShare, BaseKafkaContext } from '@openreachtech/renchan-kafka'
import { RootPath } from '@openreachtech/mentsu-rootpath'

const rootPath = RootPath.create()

export default class AppKafkaEngine extends BaseKafkaEngine {
  static get config () {
    return {
      kafkaOptionHash: {
        brokers: ['localhost:9092'],
        clientId: 'mariadb-cdc-demo',
      },
      consumersPath: rootPath.to('src/kafka/consumers'),
      consumerOptionHash: { groupId: 'mariadb-cdc-demo-group' },
    }
  }

  static get ShareCtor () {
    return BaseKafkaShare
  }

  static get ContextCtor () {
    return BaseKafkaContext
  }
}

// scripts/run-kafka-daemon.js
import { KafkaConsumersDaemon } from '@openreachtech/renchan-kafka'
import AppKafkaEngine from '../engine/AppKafkaEngine.js'

const daemon = await KafkaConsumersDaemon.createAsync({
  EngineCtor: AppKafkaEngine,
})

await daemon.startDaemon()
```
