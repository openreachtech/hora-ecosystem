# @openreachtech/renchan-job-bullmq

Renchan job modules wrapping BullMQ.

`@openreachtech/renchan-job-bullmq` is a background-job framework built on [BullMQ](https://docs.bullmq.io/) (Redis-backed queues). It provides an opinionated class hierarchy the consuming application extends — schema-validated job bodies, per-job loggers, a worker daemon with graceful shutdown, and cron / interval repeatable schedules — around the BullMQ `Queue` and `Worker` primitives.

## Concept

### The per-job triple

Every job is described by three classes that share one `Manifest`.

- **Manifest** (`BaseJobManifest`) — the single source of truth for a job's identity: its `jobName` (also the BullMQ queue name) and its `bodySchema`. Worker, Dispatcher, and Scheduler all reference the same manifest, so the queue name and body schema stay consistent.
- **Worker** (`BaseJobWorker`) — the consumer side. Wraps a BullMQ `Worker`, listens on the manifest's `jobName`, validates and normalizes the payload, and runs your `executeJob()`.
- **Dispatcher** (`BaseJobDispatcher`) — the producer side. Wraps a BullMQ `Queue`; `dispatchJob({ body })` validates the body against the manifest schema, enqueues it, and returns a `DispatcherResponse`.

### Process-level infrastructure

- **Engine** (`BaseJobEngine`) — per-process configuration and dependency-injection hub: where workers (and optionally schedulers) live, the Redis connection, the shared `Share`, the logger pools, and the error-code hash exposed everywhere as `.Error`.
- **Context / Share** (`BaseJobContext` / `BaseJobShare`) — `Context` is built fresh per job execution (carries `executedAt` / `now` and forwards the engine, config, env, logger); `Share` is built once per process for shared singletons. Both may be empty subclasses.
- **JobWorkersDaemon** — the long-running worker process. It builds the engine, auto-discovers every worker under the configured path, starts them, and installs `SIGINT` / `SIGTERM` handlers for graceful shutdown.
- **Scheduler service + schedulers + schedules** — `BaseJobSchedulerService` registers repeatable jobs; `BaseCronJobScheduler` / `BaseIntervalJobScheduler` wrap a queue's job-scheduler API; `CronSchedule` / `IntervalSchedule` validate and denormalize a schedule spec into BullMQ's repeat options.

Jobs are discovered by convention: the daemon and the scheduler service recursively scan the Engine's configured directories and pick up every default-exported subclass, so a job is "registered" simply by placing its file under the configured path.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/renchan-job-bullmq
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

A running Redis instance is required. The examples below read `REDIS_HOST` / `REDIS_PORT` from the environment.

## Usage

Defining and running a job takes a Manifest / Worker / Dispatcher triple, an Engine, and the worker daemon.

### 1. Define a job (Manifest + Worker + Dispatcher)

```js
// AlphaJobManifest.js
import {
  ScalarHash,
} from '@openreachtech/mentsu-schema'

import {
  BaseJobManifest,
} from '@openreachtech/renchan-job-bullmq'

const {
  BigNum,
  Datetime,
  Integer,
  Text,
} = ScalarHash

export default class AlphaJobManifest extends BaseJobManifest {
  static get jobName () {
    return 'alpha'
  }

  static get bodySchema () {
    return {
      customerId: Integer,
      amount: BigNum,
      confirmedAt: Datetime,
      transactionHash: Text,
    }
  }
}
```

```js
// AlphaJobWorker.js
import {
  BaseJobWorker,
} from '@openreachtech/renchan-job-bullmq'

import AlphaJobManifest from './AlphaJobManifest.js'

export default class AlphaJobWorker extends BaseJobWorker {
  static get ManifestCtor () {
    return AlphaJobManifest
  }

  /** @override */
  async executeJob ({ body, context, parcel }) {
    this.timber.log(`[${this.Ctor.jobName}] body:`, body)

    // The return value is stored in Redis — keep it minimal.
    return {
      executedAt: context.now.toISOString(),
    }
  }

  /** @override */
  onJobCompleted ({ jobModel, result, previousStatus }) {}

  /** @override */
  onJobFailed ({ jobModel, error, previousStatus }) {}

  /** @override */
  onJobProgress ({ jobModel, progress }) {}

  /** @override */
  onWorkerError ({ error }) {}
}
```

```js
// AlphaJobDispatcher.js
import {
  BaseJobDispatcher,
} from '@openreachtech/renchan-job-bullmq'

import SampleJobEngine from '../SampleJobEngine.js'
import AlphaJobManifest from './AlphaJobManifest.js'

// An intermediate app base dispatcher binds the engine once.
class AppBaseJobDispatcher extends BaseJobDispatcher {
  static get EngineCtor () {
    return SampleJobEngine
  }
}

export default class AlphaJobDispatcher extends AppBaseJobDispatcher {
  static get ManifestCtor () {
    return AlphaJobManifest
  }
}
```

### 2. Engine (+ Share + Context)

```js
import {
  BaseJobEngine,
  BaseJobShare,
  BaseJobContext,
} from '@openreachtech/renchan-job-bullmq'

class SampleJobShare extends BaseJobShare {}

class SampleJobContext extends BaseJobContext {}

export default class SampleJobEngine extends BaseJobEngine {
  static get config () {
    return {
      workersPath: rootPath.to('app/jobs'), // directory scanned for workers
      // schedulersPath: rootPath.to('app/jobs'), // add when using schedulers
      redisConfig: {
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
      },
    }
  }

  static get ShareCtor () {
    return SampleJobShare
  }

  static get ContextCtor () {
    return SampleJobContext
  }

  static get standardErrorCodeHash () {
    return {
      Unknown: '100.X000.001',
      InvalidRequest: '103.X000.001',
      Database: '104.X000.001',
    }
  }

  static get savingLogFilePath () {
    return 'logs/'
  }
}
```

`InvalidRequest` is load-bearing: `dispatchJob()` throws `this.Error.InvalidRequest` when a body fails schema validation.

### 3. Enqueue a job

```js
import BigNumber from 'bignumber.js'

import AlphaJobDispatcher from '../app/jobs/alpha/AlphaJobDispatcher.js'

const dispatcher = await AlphaJobDispatcher.createAsync() // engine auto-created

const response = await dispatcher.dispatchJob({
  body: {
    customerId: 100001,
    amount: new BigNumber('0.123456789'),
    confirmedAt: new Date('2026-05-20T12:00:00.000Z'),
    transactionHash: '0x...',
  },
})

if (response.hasError()) {
  // response.errorMessage
}

if (response.hasResponse()) {
  // response.createDispatchedAt()?.toISOString()
}

await dispatcher.teardown()
```

### 4. Start the worker daemon

```js
import {
  JobWorkersDaemon,
} from '@openreachtech/renchan-job-bullmq'

import SampleJobEngine from '../app/SampleJobEngine.js'

// Loads every worker under workersPath; SIGINT / SIGTERM trigger graceful shutdown.
const daemon = await JobWorkersDaemon.createAsync({
  EngineCtor: SampleJobEngine,
})

const workers = await daemon.startDaemon()
```

### 5. Scheduled (cron / interval) jobs

A scheduler binds a manifest to a cron or interval schedule; the scheduler service registers them. The worker daemon must be running to execute the jobs — the service only upserts the repeatable jobs in Redis.

```js
// BetaCronJobScheduler.js
import {
  BaseCronJobScheduler,
} from '@openreachtech/renchan-job-bullmq'

import SampleJobEngine from '../../SampleJobEngine.js'
import BetaJobManifest from './BetaJobManifest.js'

export default class BetaCronJobScheduler extends BaseCronJobScheduler {
  static get EngineCtor () {
    return SampleJobEngine
  }

  static get ManifestCtor () {
    return BetaJobManifest
  }

  static get schedulerId () {
    return 'beta-cron-scheduler'
  }
}
```

```js
// SampleJobSchedulerService.js
import {
  BaseJobSchedulerService,
} from '@openreachtech/renchan-job-bullmq'

export default class SampleJobSchedulerService extends BaseJobSchedulerService {
  static async collectScheduleInputs () {
    return [
      {
        schedulerId: 'beta-cron-scheduler',
        schedule: {
          cronExpression: '* * * * *',
        },
        body: {
          taskId: 1001,
          message: 'cron heartbeat',
        },
        optionHash: {},
      },
      {
        schedulerId: 'gamma-interval-scheduler',
        schedule: {
          millisecond: 10000,
          isImmediately: true,
        },
        body: {
          batchId: 2001,
          label: 'interval ping',
        },
        optionHash: {},
      },
    ]
  }
}
```

```js
// start-schedule.js
import SampleJobEngine from '../app/SampleJobEngine.js'
import SampleJobSchedulerService from '../app/SampleJobSchedulerService.js'

const service = await SampleJobSchedulerService.createAsync({
  EngineCtor: SampleJobEngine,
})

await service.startAllSchedulers() // upserts the repeatable jobs
// await service.stopAllSchedulers() // removes them
```

Abstract members that are not overridden throw `ConcreteMemberNotFoundJobError` with the missing member's name, so a mis-wired job fails loudly.

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

### `BaseJobEngine`

Per-process configuration and DI hub.

- `.createAsync({ config })` / `.create()`
- ⚠ `.get:config` (`{ workersPath, schedulersPath?, redisConfig }`), ⚠ `.get:ShareCtor`, ⚠ `.get:ContextCtor`, ⚠ `.get:standardErrorCodeHash`, ⚠ `.get:savingLogFilePath`
- optional override: `.get:savingLogFilePathLookup`, `.get:LoggerCtor`
- `#get:env`, `#get:NODE_ENV`, `#get:timber`, `#get:processClerk`, `#get:Error`

### `BaseJobManifest`

- ⚠ `.get:jobName`, ⚠ `.get:bodySchema`

### `BaseJobWorker`

- `.createAsync()`
- ⚠ `.get:ManifestCtor`
- ⚠ `#executeJob({ body, context, parcel })`, ⚠ `#onJobCompleted()`, ⚠ `#onJobFailed()`, ⚠ `#onJobProgress()`, ⚠ `#onWorkerError()`
- optional override: `.get:BuddyDispatcherCtor`, `.get:errorCodeHash`, `.get:additionalConfig`, `.collectAdditionalDispatcherCtorHash()`
- `#ensureLogger()`, `#get:timber`, `#get:env`, `#get:Error`

### `BaseJobDispatcher`

- `.createAsync({ engine })` / `.create()`
- ⚠ `.get:EngineCtor`, ⚠ `.get:ManifestCtor`
- `#dispatchJob({ body, optionHash, keepsConnection })` → `DispatcherResponse`
- `#teardown()`

### `BaseJobScheduler` / `BaseCronJobScheduler` / `BaseIntervalJobScheduler`

- `.createAsync({ engine })`
- ⚠ `.get:EngineCtor`, ⚠ `.get:ManifestCtor`, ⚠ `.get:schedulerId` (the `Cron` / `Interval` subclasses supply `.get:ScheduleCtor`)
- `#startSchedule({ schedule, body, optionHash })` → `SchedulerStartResponse`
- `#stopSchedule()` → `SchedulerStopResponse`, `#teardown()`

### `BaseJobSchedulerService`

- `.createAsync({ EngineCtor })`
- ⚠ `.collectScheduleInputs()` → `Array<{ schedulerId, schedule, body, optionHash }>`
- `#startAllSchedulers()`, `#stopAllSchedulers()`, `#startScheduler({ schedulerId })`, `#stopScheduler({ schedulerId })`, `#restartScheduler({ schedulerId })`

### `JobWorkersDaemon`

- `.createAsync({ EngineCtor })`
- `#startDaemon()` → the started workers, `#shutdownDaemon()`

### `BaseJobContext` / `BaseJobShare`

No abstract members — subclasses may be empty. Extend to add per-execution or process-wide dependencies. `Context` exposes `#get:share`, `#get:config`, `#get:env`, `#get:NODE_ENV`, `#get:timber`, `#get:now`.

### Response objects

Returned from dispatch / schedule calls: `DispatcherResponse` (`#hasError()`, `#hasResponse()`, `#get:errorMessage`, `#createDispatchedAt()`), `DispatcherShutdownResponse`, `SchedulerStartResponse` (`#hasError()`, `#hasResponse()`, `#isAborted()`), `SchedulerStopResponse`, `SchedulerShutdownResponse`, plus `JobModel` and `WorkerParcel`.

### Errors

- `RenchanJobError` — base error carrying an `errorCode`; `.declareJobError({ code })` mints code-bound subclasses.
- `ConcreteMemberNotFoundJobError` — thrown by an un-overridden abstract member (code `101.X000.001`).

### Tools

- `DeepBulkClassLoader` — recursively loads default-exported classes from a directory (how workers and schedulers are discovered).
- `ProcessClerk` — attaches / detaches process signal handlers.
- `Timber` — a `console` proxy that silences output when `NODE_ENV === 'production'`.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-job-bullmq.git
cd renchan-job-bullmq
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
