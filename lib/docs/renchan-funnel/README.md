# @openreachtech/renchan-funnel

A funnel (workflow-automation) engine that reacts to database change events.

`@openreachtech/renchan-funnel` consumes Debezium CDC change messages off Kafka, evaluates them against user-defined *funnels* (trigger conditions stored in the database), and dispatches the configured actions as background jobs when a change matches. A scheduled (cron) trigger path is also provided. It is a library of abstract base classes: the consuming application supplies its own Sequelize models and job dispatchers by subclassing.

## Concept

### The domain model

- **Funnel** — a stored automation rule. It targets an *origin object category* (a logical entity such as `USER` that may span several source tables), carries an ordered set of trigger conditions and actions, and is toggled by an active flag. Each funnel owns an *id hash*, which is also the name of its own Kafka topic.
- **Trigger** — what makes a funnel fire. Categories are `record_created`, `record_updated`, `record_deleted` (all CDC-driven) and `scheduled` (cron-driven).
- **Trigger condition** — compares a left-hand value against a right-hand value using an operator (`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `NOT_CONTAINS`, `IN`, `NOT_IN`, `IS_NULL`, `IS_NOT_NULL`, `GREATER_THAN_OR_EQUAL`), combined with logical operators. Each operator is one small strategy class — a *trigger condition suite* extending `BaseFunnelTriggerSuite`.
- **Source value type** — where each side of a condition or action value comes from: `FIXED_VALUE`, `DYNAMIC_VALUE` (time-relative, e.g. "now" / "today", optionally offset by days / hours / minutes), `NEW_VALUE` (post-change), `OLD_VALUE` (pre-change), or `FIELD_REFERENCE` (a field on the origin object record, resolved from the database).
- **Action** — what a funnel does when it fires. Each action is turned into a background-job payload by a `BaseFunnelActionPayloadGenerator` and dispatched through a job dispatcher resolved by the action's type.

### The two-stage Kafka pipeline

1. **Message filter layer** — a `BaseDebeziumEachBatchConsumer` watches one source *table*. For each batch it matches every change message against the funnels targeting that table, groups the messages by the funnel they matched, and re-publishes each group unchanged to that funnel's own topic. This stage only routes; it does not execute.
2. **Execution layer** — a `BaseFunnelConsumer` subscribes to a single funnel's topic and drives a `BaseFunnelExecutor`, which records the execution and dispatches one background job per funnel action.

A separate **schedule daemon** covers `scheduled` funnels by evaluating cron expressions and dispatching the same action jobs on time.

The consuming application binds the library to its own world through a single `BaseFunnelModelsProvider` subclass — the library imports no model directly.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/renchan-funnel
```

When using GitHub Packages (the `@openreachtech` scope), the following two items are
required:

1. Add the registry to your project's `.npmrc`:

   ```
   @openreachtech:registry=https://npm.pkg.github.com
   ```

2. Authenticate with `npm login`:

   ```sh
   npm login --registry https://npm.pkg.github.com
   ```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

This package builds on [`@openreachtech/renchan-kafka`](https://github.com/openreachtech/renchan-kafka) for its Kafka consumer/producer framework, and expects the consuming application to provide Sequelize models and a background-job transport.

## Usage

Wiring a funnel pipeline into an application takes four pieces.

### 1. Models provider

Bind the library's model names to your own Sequelize models. Override one static getter per model the base declares; the library reaches every table through this single indirection point.

```js
import {
  BaseFunnelModelsProvider,
} from '@openreachtech/renchan-funnel'

import Funnel from '../sequelize/models/Funnel.js'
import FunnelAction from '../sequelize/models/FunnelAction.js'
import FunnelExecution from '../sequelize/models/FunnelExecution.js'
import OriginObjectCategory from '../sequelize/models/OriginObjectCategory.js'
// ...import the rest of your models

export default class FunnelModelsProvider extends BaseFunnelModelsProvider {
  static get FunnelModel () {
    return Funnel
  }

  static get FunnelActionModel () {
    return FunnelAction
  }

  static get FunnelExecutionModel () {
    return FunnelExecution
  }

  static get OriginObjectCategoryModel () {
    return OriginObjectCategory
  }

  // ...override every model getter the base declares
}
```

### 2. Stage 1 — filter / route consumer (one per watched table)

```js
import {
  BaseDebeziumEachBatchConsumer,
} from '@openreachtech/renchan-funnel'

import FunnelModelsProvider from '../tools/FunnelModelsProvider.js'

export default class UserBasicDebeziumEachBatchConsumer extends BaseDebeziumEachBatchConsumer {
  static get config () {
    return {
      groupId: 'user_basics-funnel-group',
    }
  }

  static get errorCodeHash () {
    return {}
  }

  static get tableName () {
    return 'user_basics'
  }

  static get debeziumTopicPrefix () {
    return `${env.KAFKA_DEBEZIUM_TOPIC_PREFIX}.${env.DATABASE_NAME}`
  }

  static get FunnelModelsProviderCtor () {
    return FunnelModelsProvider
  }
}
```

### 3. Stage 2 — executor + execution consumer

The executor declares which origin object category it serves and which job dispatcher handles each action type. The consumer binds one funnel (by its id hash) to that executor.

```js
import {
  BaseFunnelExecutor,
  BaseFunnelConsumer,
} from '@openreachtech/renchan-funnel'

import FunnelModelsProvider from '../tools/FunnelModelsProvider.js'

export class UserFunnelExecutor extends BaseFunnelExecutor {
  static get targetOriginObjectCategoryId () {
    return ORIGIN_OBJECT_CATEGORY.USER.ID
  }

  static get funnelJobDispatcherCtorHash () {
    // keyed by the action's actionType
    return {
      [ACTION_TYPE.SEND_EMAIL]: SendEmailJobDispatcher,
    }
  }
}

export class SendWelcomeExecutionFunnelConsumer extends BaseFunnelConsumer {
  static get funnelIdHash () {
    return FUNNEL_ID_HASH.SEND_EMAIL_TO_USER_WHEN_USER_IS_CREATED
  }

  static get FunnelExecutorCtor () {
    return UserFunnelExecutor
  }

  static get FunnelModelsProviderCtor () {
    return FunnelModelsProvider
  }

  static async resolveSystemUserId () {
    return Number(env.SYSTEM_USER_ID)
  }
}
```

Both consumers are booted by your renchan-kafka engine, which passes `{ engine, kafkaClient }` into each consumer's `.createAsync()`.

### 4. Scheduled funnels daemon

For `scheduled` funnels, run a daemon that evaluates cron expressions and dispatches action jobs on time.

```js
import {
  ScheduleFunnelDaemon,
} from '@openreachtech/renchan-funnel'

import ScheduleFunnelsExecutor from '../executors/ScheduleFunnelsExecutor.js'
import FunnelModelsProvider from '../tools/FunnelModelsProvider.js'

const funnelModelsProvider = await FunnelModelsProvider.createAsync()

const executor = await ScheduleFunnelsExecutor.createAsync({
  funnelModelsProvider,
  systemUserId: Number(env.SYSTEM_USER_ID),
})

ScheduleFunnelDaemon.create({
  executor,
})
  .start()
```

Abstract members that are not overridden throw at startup with the missing member's name (`ConcreteMemberNotFoundFunnelError`), so a mis-wired pipeline fails loudly rather than silently.

## API

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `#set:instanceSetter` | instance setter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `.set:staticSetter` | static setter |

Members marked ⚠ are abstract — the consuming application must override them.

### `BaseFunnelModelsProvider`

Binds the library's model names to the application's Sequelize models.

- `.createAsync()` / `.create()` — build a provider.
- ⚠ `.get:FunnelModel`, ⚠ `.get:FunnelActionModel`, ⚠ `.get:FunnelExecutionModel`, ⚠ `.get:OriginObjectCategoryModel`, and the remaining model getters — one per table the library reads or writes. Each is also served as an instance getter of the same name.

### `BaseDebeziumEachBatchConsumer` (stage 1)

Watches one table and routes matched messages to per-funnel topics.

- `.createAsync({ engine, kafkaClient })` / `.create()`
- ⚠ `.get:tableName`, ⚠ `.get:debeziumTopicPrefix`, ⚠ `.get:FunnelModelsProviderCtor`
- override `.get:config` (Kafka `groupId`), `.get:errorCodeHash`
- `#onEachBatch()` — implemented; performs matching and routing.

### `BaseFunnelConsumer` (stage 2)

Serves a single funnel's topic.

- `.createAsync({ engine, kafkaClient })` / `.create()`
- ⚠ `.get:funnelIdHash`, ⚠ `.get:FunnelExecutorCtor`, ⚠ `.get:FunnelModelsProviderCtor`, ⚠ `.resolveSystemUserId()`
- provided: `.get:MessageDeserializerCtor`, `.get:MessageKeyCtor`, `.get:MessageValueCtor`, `#onEachBatch()`

### `BaseFunnelExecutor`

Records executions and dispatches one job per action.

- `.createAsync({ funnelModelsProvider, originObjectColumns, systemUserId })` / `.create()`
- ⚠ `.get:targetOriginObjectCategoryId`, ⚠ `.get:funnelJobDispatcherCtorHash`
- optional override: `.get:fallbackFunnelJobDispatcherCtor`, `.get:ActionPayloadGeneratorCtor`, `#get:valueSuiteClasses`
- `#executeTriggerFunnels({ debeziumMessageValues, targetFunnel })` — the main entry point.

### `BaseFunnelTriggerSuite`

One strategy class per trigger operator.

- `.create()`
- ⚠ `#get:operatorKey`, ⚠ `#isPassTrigger({ leftHand, rightHand })`
- provided: `#evaluate()`, `#extractValue()`

### Other extension points

- `BaseFunnelValueRetrieverSuite` — ⚠ `.get:sourceValueTypeKey`, ⚠ `#retrieveValue()`
- `BaseFunnelActionPayloadGenerator` — ⚠ `.get:actionCategoryKey`, ⚠ `#generatePayload()`
- `BaseScheduleFunnelsExecutor` — ⚠ `.loadJobDispatcherCtors()`
- `BaseCustomFunnelActionExecutor` — ⚠ `.get:ExecutionLogRegistererCtor`, ⚠ `#saveEntitiesIntoParcel()`

### Also exported

Constants (`FUNNEL_STATUS`, `FUNNEL_TRIGGER_CATEGORY`, `FUNNEL_TRIGGER_OPERATOR_KEY`, `SOURCE_VALUE_TYPE`, `DYNAMIC_VALUE_TYPE_KEY`, `DYNAMIC_VALUE_OFFSET_UNIT_KEY`, `LOGICAL_OPERATOR_KEY`, and more); the nine concrete trigger condition suites; dynamic / offset value providers; save parcels (`NewEntitySaveParcel`, `UpdateEntitySaveParcel`, `DeleteEntitySaveParcel`); producers (`FunnelBufferProducer`, `BaseAppBufferProducer`); extractors (`FunnelExtractor`, `FunnelActionValueExtractor`, `DebeziumMessageValueExtractor`, `FunnelFieldReferencePathExtractor`); and the `FunnelError` family.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-funnel.git
cd renchan-funnel
npm install
npm run lint
npm test
```

## License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
