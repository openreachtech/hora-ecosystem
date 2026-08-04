# API

Source: `lib/**/*.js` (no `.d.ts` API surface is shipped — `types/jest.d.ts` only covers Jest globals — so this is extracted from JSDoc across the package). No top-level `README.md` (or `README.ja.md`) exists in this package, in `node_modules/@openreachtech/renchan-job-bullmq/` or in the upstream `openreachtech/renchan-job-bullmq` GitHub repository at the installed version (`1.1.1`), so `lib/docs/renchan-job-bullmq/README.md` was not generated.

`renchan-job-bullmq` is a framework of **abstract base classes** wrapping [BullMQ](https://docs.bullmq.io/) (`Queue`/`Worker`/`JobScheduler`) so that a "renchan" application defines jobs by subclassing and overriding a handful of static getters/methods, instead of wiring BullMQ directly. Members are inconsistently tagged `@public` across the package: some classes (workers, schedulers, dispatchers, requests, `DeepBulkClassLoader`, `ProcessClerk`) tag their consumer-facing instance methods `@public`; plain value/DTO classes (responses, `JobModel`, `WorkerParcel`, manifests, errors) tag nothing because every member is inherently part of their public surface. The sections below include, per class: `@public`-tagged instance methods where present, the `abstract` static getters a concrete subclass **must** override, static factory methods (`.create()` / `.createAsync()`), and — for DTO/value classes — all instance getters/methods, since that is their entire purpose.

## Exports (`index.js`)

All 29 exports are **named** exports (`export { default as X } from './lib/...'`); there is no default export from the package root. Grouped as in `index.js`:

- Daemon: `JobWorkersDaemon`
- Scheduler service: `BaseJobSchedulerService`
- Engine: `BaseJobEngine`
- Contexts: `BaseJobContext`, `BaseJobShare`
- Manifest: `BaseJobManifest`
- Dispatchers: `BaseJobDispatcher`, `DispatcherRequest`, `DispatcherResponse`, `DispatcherShutdownResponse`
- Workers: `BaseJobWorker`, `JobModel`, `WorkerParcel`
- Schedulers: `BaseJobScheduler`, `BaseCronJobScheduler`, `BaseIntervalJobScheduler`, `SchedulerRequest`, `SchedulerStartResponse`, `SchedulerStopResponse`, `SchedulerShutdownResponse`, `BaseSchedule`, `CronSchedule`, `IntervalSchedule`
- Bodies: `JobBody`
- Errors: `RenchanJobError`, `ConcreteMemberNotFoundJobError`
- Tools: `DeepBulkClassLoader`, `ProcessClerk`, `Timber`

Notation used below:

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter (abstract unless noted) |

## How the pieces fit together

An application built on this package supplies, per job type:

1. A **Manifest** (`BaseJobManifest` subclass) — declares `jobName` and `bodySchema` (a [`mentsu-schema`](https://github.com/openreachtech/mentsu-schema) schema hash).
2. A **Dispatcher** (`BaseJobDispatcher` subclass) — enqueues jobs (`queue.add()`), pointing at an `EngineCtor` and `ManifestCtor`.
3. A **Worker** (`BaseJobWorker` subclass) — processes jobs (BullMQ `Worker`), pointing at a `ManifestCtor` and implementing `executeJob()` / `onJobCompleted()` / `onJobFailed()` / `onJobProgress()` / `onWorkerError()`.
4. Optionally a **Scheduler** (`BaseCronJobScheduler` or `BaseIntervalJobScheduler` subclass) — upserts a repeatable BullMQ job scheduler (`queue.upsertJobScheduler()`).
5. One **Engine** (`BaseJobEngine` subclass) per application — declares `config` (Redis connection, `workersPath`, `schedulersPath`), `ShareCtor`, `ContextCtor` and `standardErrorCodeHash`; shared by all dispatchers/workers/schedulers.
6. Optionally a **Share** (`BaseJobShare` subclass) and **Context** (`BaseJobContext` subclass) — process-wide singletons and per-job-execution values respectively.

`JobWorkersDaemon` and `BaseJobSchedulerService` auto-discover Worker/Scheduler subclasses at runtime via `DeepBulkClassLoader`, which recursively `import()`s every `.js`/`.cjs`/`.mjs` file under `engine.workersPath` / `engine.schedulersPath` and keeps default exports that are functions matching a filter (`it.prototype instanceof BaseJobWorker`, etc.) — **no manual registry of job classes is required**; dropping a new Worker/Scheduler file under the configured path is enough.

Abstract static getters/methods (documented as `.get:x` **(abstract)** below) throw `ConcreteMemberNotFoundJobError` (via `BaseJobManifest`/`BaseJobEngine`/etc.'s own boilerplate) when a concrete subclass fails to override them — this is the framework's "must implement" contract; there's no other validation of subclass completeness.

Retry/backoff is **not** configured by this package: `optionHash` passed to `dispatchJob()` / `startSchedule()` flows straight through to BullMQ's own `Queue#add()` (`JobsOptions`) and `Queue#upsertJobScheduler()` (`JobSchedulerTemplateOptions`), so retry/backoff/attempts are whatever BullMQ options the caller supplies (or BullMQ's own defaults if none).

## Class: `BaseJobEngine`

Abstract. One instance is shared across all dispatchers/workers/schedulers of an application; holds config, the `Share` instance, and per-application error classes.

- `.create({ config = this.config, share, errorHash = this.buildErrorHash(), skipJobHash = {} })` — static factory method.
- `.createAsync({ config = this.config } = {})` — static async factory method. Also builds `share` via `.createShare()` (`ShareCtor.createAsync()`).
- `.get:config` **(abstract)** — `{ workersPath, schedulersPath?, redisConfig }`.
- `.get:ShareCtor` **(abstract)** — constructor of the `BaseJobShare` subclass to use.
- `.get:ContextCtor` **(abstract)** — constructor of the `BaseJobContext` subclass to use.
- `.get:standardErrorCodeHash` **(abstract)** — `Record<errorName, code>`; turned into `Record<errorName, RenchanJobError subclass>` by `.buildErrorHash()`.
- `.get:savingLogFilePath` **(abstract)** — default log file path for `MentsuLogger`.
- `.get:savingLogFilePathLookup` — `Record<jobName, filePath>` overrides of `savingLogFilePath` per job; defaults to `{}`.
- `.get:LoggerCtor` — defaults to `MentsuLogger` (`@openreachtech/mentsu-logger`).
- `.buildErrorHash({ errorCodeHash = this.standardErrorCodeHash } = {})` — maps each `{errorName: code}` to a fresh `RenchanJobError.declareJobError({ code })` subclass.
- `.createLogger({ jobName, env })` / `.ensureLoggerByDispatcher/ByScheduler/ByWorker({ dispatcher|scheduler|worker, env })` — lazily creates and pools (in a `WeakMap` per kind) one `MentsuLogger` per dispatcher/scheduler/worker instance.
- `#get:Ctor`, `#get:processClerk`, `#get:env`, `#get:NODE_ENV`, `#get:timber`, `#get:Error` (the built error hash), `#get:schedulersPath`, `#get:workersPath`, `#get:ContextCtor`, `#get:LoggerCtor` — instance getters delegating to `config`/`share`/`Ctor`.
- `#buildDispatcherConfig()` — `{ connection: config.redisConfig }` (BullMQ `QueueOptions`).
- `#buildSchedulerConfig()` — `{ redisConfig, schedulersPath }`.
- `#buildWorkerConfig()` — `{ workersPath, connection: config.redisConfig }` (BullMQ `WorkerOptions` shape).

## Class: `JobWorkersDaemon`

Manages the lifecycle of every discovered `BaseJobWorker` subclass in one process: loads them, starts them, and shuts them down gracefully on `SIGINT`/`SIGTERM`.

- `.create({ engine, WorkerCtors })` — static factory method.
- `.createAsync({ EngineCtor })` — static async factory method. Creates the engine (`EngineCtor.createAsync()`) and auto-discovers `WorkerCtors` from `engine.workersPath` via `DeepBulkClassLoader`.
- `.get:DeepBulkClassLoaderCtor` — defaults to `DeepBulkClassLoader`.
- `#startDaemon()` **(public)** — creates+sets up every non-skipped worker (`worker.setupWorker()`), pools them, and attaches a process sink for `SIGINT`/`SIGTERM` (calls `#shutdownDaemon()`). Returns the started worker instances.
- `#shutdownDaemon()` — tears down all pooled workers (`worker.teardownWorker()`), detaches the process sink, then calls `processClerk.exit()` (**terminates the process**, exit code `0`).
- `#attachWorkerSink`/`#createWorkers`/`#extractActiveWorkerCtors` (filters out `WorkerCtors` whose `jobName` is truthy in `engine.skipJobHash`) — internal helpers.

## Class: `BaseJobManifest`

Abstract. Declares a job's identity and body schema; instantiated per dispatcher/worker/scheduler class via `.create()`.

- `.create({ jobName = this.jobName, bodySchema = this.bodySchema } = {})` — static factory method.
- `.get:jobName` **(abstract)** — BullMQ job name string.
- `.get:bodySchema` **(abstract)** — `mentsu-schema` schema hash describing the job payload.

## Class: `BaseJobContext`

Abstract. Per-job-execution value object created fresh for every job run (`BaseJobWorker.createContext()`), distinct from the shared, process-wide `BaseJobShare`.

- `.create({ engine, executedAt = this.createCurrentDatetime() })` — static factory method.
- `.createAsync({ engine })` — static async factory method (delegates to `.create()`).
- `.createCurrentDatetime()` — `new Date()`.
- `#get:share`, `#get:config`, `#get:env`, `#get:NODE_ENV`, `#get:timber` — delegate to `this.engine`.
- `#get:now` — alias for `#executedAt` (the datetime the context was created).

## Class: `BaseJobShare`

Abstract. Process-wide singleton created once per `BaseJobEngine` (via `EngineCtor.createShare()` / `ShareCtor.createAsync()`), holding the environment facade, `Timber` logger, and a `ProcessClerk`.

- `.create({ processClerk = this.createProcessClerk(), renchanEnv = this.generateRenchanEnv(), timber = Timber } = {})` — static factory method.
- `.createAsync({ renchanEnv = this.generateRenchanEnv() } = {})` — static async factory method (delegates to `.create()`).
- `.get:ProcessClerkCtor` — defaults to `ProcessClerk`.
- `.createProcessClerk()` — `ProcessClerkCtor.create()`.
- `.generateRenchanEnv()` — returns the `@openreachtech/renchan-env/scripts/env` facade instance.
- `#get:env` — the `renchanEnv` facade.
- `#get:NODE_ENV` — `env.nodeEnv`.

## Class: `BaseJobDispatcher`

Abstract. Enqueues jobs onto a BullMQ `Queue`.

- `.create({ engine, queue, manifest = this.createManifest() })` — static factory method.
- `.createAsync({ engine = null } = {})` — static async factory method. If `engine` is omitted, creates one via `EngineCtor.createAsync()`; builds a BullMQ `Queue` from `engine.buildDispatcherConfig()` and awaits `queue.waitUntilReady()`.
- `.get:EngineCtor` **(abstract)**, `.get:ManifestCtor` **(abstract)** — must be overridden by concrete subclasses.
- `.get:jobName`, `.get:bodySchema` — delegate to `ManifestCtor`.
- `.get:BodyCtor` (defaults to `JobBody`), `.get:QueueCtor` (defaults to BullMQ `Queue`), `.get:RequestCtor` (defaults to `DispatcherRequest`), `.get:ResponseCtor` (defaults to `DispatcherResponse`), `.get:ShutdownResponseCtor` (defaults to `DispatcherShutdownResponse`) — overridable extension points.
- `#dispatchJob({ body, optionHash = {}, keepsConnection = false })` **(public)** — builds a `DispatcherRequest`; if the body fails schema validation, returns a `DispatcherResponse` carrying `Error.InvalidRequest` **without** calling BullMQ; otherwise calls `queue.add(jobName, denormalizedBody, optionHash)` and wraps the resulting `Job` (or any thrown error) in a `DispatcherResponse`. Unless `keepsConnection: true`, closes the queue (`#teardown()`) in a `finally` block after every call — so by default **each dispatch opens and closes its own Redis connection**.
- `#teardown()` **(public)** — closes `this.queue`; returns a `DispatcherShutdownResponse`.
- `#ensureLogger()` — pools a logger for this dispatcher via `engine.Ctor.ensureLoggerByDispatcher()`.

Note: `BaseJobWorker.declareReusableDispatcher()` wraps a `DispatcherCtor` so that its `dispatchJob()` always passes `keepsConnection: true` — this is how a worker's "buddy dispatcher" (`BuddyDispatcherCtor`, used to enqueue follow-up jobs from within `executeJob()`) reuses one connection across the worker's lifetime instead of reconnecting per call.

## Class: `DispatcherRequest`

Value object wrapping a job's normalized body + BullMQ options before it is added to a queue.

- `.create({ jobName, jobBody, optionHash })` / `.createWithNormalizedBody({ jobName, normalizedBody, optionHash })` — static factory methods; the latter builds `jobBody` via `JobBodyCtor.create()`.
- `.get:JobBodyCtor` **(abstract)** — bound via `.use(JobBodyCtor)`, which returns a cached subclass (via `mentsu-bound-ctor-registry`'s `BoundCtorRegistry`) with `JobBodyCtor` fixed.
- `#isValidBody()` **(public)** / `#isInvalidBody()` **(public)** — delegate to `jobBody.isValid()`.
- `#denormalizeBody()` **(public)** — delegates to `jobBody.denormalizeBody()`.

## Class: `DispatcherResponse`

Value object returned by `BaseJobDispatcher#dispatchJob()`.

- `.create({ request, job = null, error = null })` — static factory method.
- `#get:errorMessage`, `#get:idKey` (BullMQ job id), `#get:jobName`, `#get:body` (`job.data`), `#get:optionHash` (`job.opts`) — `null` when the corresponding piece is absent.
- `#createDispatchedAt()` — `new Date(job.timestamp)`, or `null` if no job.
- `#hasError()` / `#hasResponse()` — booleans.

## Class: `DispatcherShutdownResponse`

Value object returned by `BaseJobDispatcher#teardown()`.

- `.create({ dispatcher, error = null })` — static factory method.
- `#get:jobName` — `dispatcher.jobName`.
- `#get:errorMessage`, `#hasError()`.

## Class: `BaseJobWorker`

Abstract. Wraps a BullMQ `Worker`; concrete subclasses implement the actual job-processing logic.

- `.create({ engine, manifest = this.createManifest(), dispatcherHash = {}, errorCodeHash = this.errorCodeHash })` — static factory method. Also builds `config` (`buildConfig()`) and `errorHash` (`buildErrorHash()`).
- `.createAsync({ engine })` — static async factory method. Builds `dispatcherHash` by instantiating every constructor from `collectDispatcherCtorHash()` (the `BuddyDispatcherCtor`, keyed `'buddy'`, plus `collectAdditionalDispatcherCtorHash()`), wrapped via `declareReusableDispatcher()` so each stays connected (`keepsConnection: true`).
- `.get:ManifestCtor` **(abstract)** — must be overridden.
- `.get:BuddyDispatcherCtor` — defaults to `null`; set to enable `dispatcherHash.buddy` for enqueuing follow-up jobs from within `executeJob()`.
- `.get:JobBodyCtor` (defaults to `JobBody`), `.get:WorkerCtor` (defaults to BullMQ `Worker`), `.get:JobModelCtor` (defaults to `JobModel`), `.get:WorkerParcelCtor` (defaults to `WorkerParcel`), `.get:additionalConfig` (defaults to `{}`, merged under the engine-provided base config), `.get:errorCodeHash` (defaults to `{}`, merged with the engine's `standardErrorCodeHash`) — overridable extension points.
- `.get:jobName`, `.get:bodySchema` — delegate to `ManifestCtor`.
- `#setupWorker()` **(public)** — creates the BullMQ `Worker` (with a processor built from `defineJobProcessor()`), awaits `worker.waitUntilReady()`, then attaches the completed/failed/progress/error event sink.
- `#attachWorkerSink({ sink })` **(public)** — registers listeners on the pooled BullMQ `Worker` for each key in `sink` (`completed`, `failed`, `progress`, `error`).
- `#executeJob({ body, context, parcel })` **(abstract)** — the job's actual work; must be overridden (throws `ConcreteMemberNotFoundJobError` otherwise). `body` is the normalized job payload, `context` a fresh `BaseJobContext`, `parcel` a `WorkerParcel` (raw BullMQ processor args: `jobModel`/`token`/`signal`). Its return value is persisted by BullMQ in Redis as the job result — the source warns against returning large payloads.
- `#onJobCompleted({ jobModel, result, previousStatus })` / `#onJobFailed({ jobModel, error, previousStatus })` / `#onJobProgress({ jobModel, progress })` / `#onWorkerError({ error })` **(abstract)** — BullMQ worker event handlers; each throws `ConcreteMemberNotFoundJobError` unless overridden.
- `#teardownWorker()` **(public)** — closes the BullMQ `Worker` (`worker.close()`), removes all its listeners (to avoid a late `completed` firing during graceful shutdown), and clears this worker from the internal pools. Returns `{ isSuccess, error }`.
- `#ensureLogger()` — pools a logger for this worker via `engine.Ctor.ensureLoggerByWorker()`.

## Class: `JobModel`

Value object wrapping a raw BullMQ `Job` inside a worker's processor/event-sink callbacks.

- `.create({ job })` — static factory method.
- `.use(JobBodyCtor)` — returns a cached subclass (via `BoundCtorRegistry`) bound to `JobBodyCtor`.
- `.get:JobBodyCtor` **(abstract)** — must be bound via `.use()` before instantiation is meaningful.
- `.createJobBody({ denormalizedBody })` — `JobBodyCtor.createWithDenormalizedBody({ denormalizedBody })`.
- `#get:denormalizedBody` — `job.data` (raw, schema-denormalized).
- `#normalizeBody()` — round-trips `denormalizedBody` through a fresh `JobBody` and returns its normalized `.body`. This is what `BaseJobWorker.defineJobProcessor()` passes as `executeJob()`'s `body` argument.

## Class: `WorkerParcel`

Value object bundling a BullMQ processor function's raw arguments (`job`/`token`/`signal`) after `job` has been wrapped as a `JobModel`.

- `.create({ jobModel, token, signal = null })` — static factory method.
- `#normalizeBody()` — delegates to `jobModel.normalizeBody()`.

## Class: `BaseJobScheduler`

Abstract. Manages one BullMQ repeatable job scheduler (`queue.upsertJobScheduler()` / `queue.removeJobScheduler()`).

- `.create({ engine, queue, manifest = this.createManifest() })` — static factory method.
- `.createAsync({ engine = null } = {})` — static async factory method. If `engine` is omitted, creates one via `EngineCtor.createAsync()`; builds a `Queue` from `engine.buildSchedulerConfig()` and awaits `queue.waitUntilReady()`.
- `.get:EngineCtor` **(abstract)**, `.get:ManifestCtor` **(abstract)**, `.get:ScheduleCtor` **(abstract)** (a `BaseSchedule` subclass — see `BaseCronJobScheduler`/`BaseIntervalJobScheduler`), `.get:schedulerId` **(abstract)** — must be overridden by concrete subclasses.
- `.get:QueueCtor` (BullMQ `Queue`), `.get:BodyCtor` (`JobBody`), `.get:RequestCtor` (`SchedulerRequest`), `.get:StartResponseCtor` (`SchedulerStartResponse`), `.get:StopResponseCtor` (`SchedulerStopResponse`), `.get:ShutdownResponseCtor` (`SchedulerShutdownResponse`) — overridable extension points.
- `.get:jobName`, `.get:bodySchema` — delegate to `ManifestCtor`.
- `#startSchedule({ schedule, body = {}, optionHash = {} })` **(public)** — builds a `SchedulerRequest`; if the schedule or body fails validation, returns a `SchedulerStartResponse` with no `job` (`isAborted()` reflects this) **without** calling BullMQ; otherwise calls `queue.upsertJobScheduler(schedulerId, request.buildJobSchedule(), request.buildJobTemplate())`. Always tears down (`#teardown()`) the queue connection afterward, in a `finally` block.
- `#stopSchedule()` **(public)** — calls `queue.removeJobScheduler(schedulerId)`; wraps the boolean result (or thrown error) in a `SchedulerStopResponse`. Always tears down afterward.
- `#teardown()` **(public)** — closes `this.queue`; returns a `SchedulerShutdownResponse`.
- `#ensureLogger()` — pools a logger for this scheduler via `engine.Ctor.ensureLoggerByScheduler()`.

Every scheduler call (`startSchedule`, `stopSchedule`) opens and closes its own Redis connection — like dispatchers, schedulers are not designed to be kept alive across calls.

## Class: `BaseCronJobScheduler`

Concrete `BaseJobScheduler` subclass wiring `.get:ScheduleCtor` to `CronSchedule`. Application scheduler classes extend this (rather than `BaseJobScheduler` directly) for cron-based schedules, and still must override `EngineCtor`, `ManifestCtor`, `schedulerId`.

## Class: `BaseIntervalJobScheduler`

Concrete `BaseJobScheduler` subclass wiring `.get:ScheduleCtor` to `IntervalSchedule`. Application scheduler classes extend this for fixed-interval schedules, and still must override `EngineCtor`, `ManifestCtor`, `schedulerId`.

## Class: `SchedulerRequest`

Value object wrapping a schedule + normalized body + BullMQ scheduler options before upserting.

- `.create({ id, schedule, jobName, jobBody, optionHash })` / `.createWithNormalizedBody({ id, rawSchedule, jobName, normalizedBody, optionHash })` — static factory methods; the latter builds `schedule` via `ScheduleCtor.create({ rawSchedule })` and `jobBody` via `JobBodyCtor.create({ normalizedBody })`.
- `.get:ScheduleCtor` **(abstract)**, `.get:JobBodyCtor` **(abstract)** — bound via `.use(ScheduleCtor)` and `.via(JobBodyCtor)` respectively, each returning a cached subclass (`BoundCtorRegistry`).
- `#get:schedulerId` — alias for `#id`.
- `#isValid()` **(public)** / `#isInvalid()` **(public)** — `isValid()` requires both `#isValidSchedule()` and `#isValidBody()`.
- `#isValidSchedule()` **(public)** — `schedule.isValid()`.
- `#isValidBody()` **(public)** — `jobBody.isValid()`.
- `#buildJobSchedule()` **(public)** — `schedule.denormalizeSchedule()` (the first argument to `queue.upsertJobScheduler()`).
- `#buildJobTemplate()` **(public)** — `{ name: jobName, data: jobBody.denormalizeBody(), opts: optionHash }` (the second argument to `queue.upsertJobScheduler()`).

## Class: `SchedulerStartResponse`

Value object returned by `BaseJobScheduler#startSchedule()`.

- `.create({ request, job = null, error = null })` — static factory method.
- `#get:errorMessage`, `#get:idKey`, `#get:jobName`, `#get:schedule` (`request.schedule`), `#get:body`, `#get:optionHash` — `null` when absent.
- `#createDispatchedAt()` — `new Date(job.timestamp)`, or `null`.
- `#hasError()` / `#hasResponse()` — booleans.
- `#isAborted()` — `request.isInvalid()`; true when `startSchedule()` never reached BullMQ because the schedule/body failed validation.

## Class: `SchedulerStopResponse`

Value object returned by `BaseJobScheduler#stopSchedule()`.

- `.create({ schedulerId, removed = null, error = null })` — static factory method.
- `#get:isStopped` — alias for `#removed` (BullMQ's "was a scheduler actually removed" boolean).
- `#get:errorMessage`, `#hasError()`.

## Class: `SchedulerShutdownResponse`

Value object returned by `BaseJobScheduler#teardown()`.

- `.create({ scheduler, error = null })` — static factory method.
- `#get:schedulerId` — `scheduler.Ctor.schedulerId`.
- `#get:jobName` — `scheduler.Ctor.jobName`.
- `#get:errorMessage`, `#hasError()`.

## Class: `BaseSchedule`

Abstract. Validates and (de)normalizes a schedule definition against a `mentsu-schema` schema.

- `.create({ rawSchedule, schemaReifier = this.createSchemaReifier() })` — static factory method.
- `.get:schema` **(abstract)** — schema hash; overridden by `CronSchedule`/`IntervalSchedule`.
- `.get:SchemaReifierCtor` — defaults to `SchemaReifier` (`@openreachtech/mentsu-schema`).
- `#isValid()` **(public)** — `schemaReifier.isFulfilledNormalizedValue({ normalizedValue: rawSchedule })`; overridden by both concrete subclasses to add extra checks.
- `#isInvalid()` **(public)** — `!isValid()`.
- `#denormalizeSchedule()` **(public)** — identity by default (`return rawSchedule`); overridden by both concrete subclasses to translate to BullMQ's shape.

## Class: `CronSchedule`

Concrete `BaseSchedule` for cron-based repeatable jobs.

- `.get:schema` — `{ cronExpression: Text }` (`mentsu-schema` `ScalarHash.Text`).
- `#isValid()` — schema validity **and** `#isValidCronExpression()` (currently always `true` — a `// TODO` notes real cron-expression validation is not yet implemented).
- `#denormalizeSchedule()` — `{ pattern: cronExpression }` (BullMQ's repeat-options shape).

## Class: `IntervalSchedule`

Concrete `BaseSchedule` for fixed-interval repeatable jobs.

- `.get:schema` — `{ millisecond: Integer, isImmediately: Bool }`.
- `#get:millisecond` — `rawSchedule.millisecond`.
- `#isValid()` — schema validity **and** `#isValidMillisecond()` (`millisecond` must be a positive safe integer).
- `#denormalizeSchedule()` — `{ every: millisecond, immediately: isImmediately ?? true }` (BullMQ's repeat-options shape; `immediately` defaults to `true` when `isImmediately` is not supplied).

## Class: `JobBody`

Abstract. Value object validating/(de)normalizing a job's payload against a `mentsu-schema` schema (shared by dispatchers, workers and schedulers).

- `.create({ schemaReifier = this.createSchemaReifier(), normalizedBody = null } = {})` — static factory method.
- `.createWithDenormalizedBody({ denormalizedBody = null } = {})` — static factory method; normalizes `denormalizedBody` via a fresh `SchemaReifier` before calling `.create()`. This is how `JobModel#normalizeBody()` turns a raw BullMQ `job.data` back into a normalized body.
- `.get:schema` **(abstract)** — schema hash; bound via `.as(schema)`, which returns a cached subclass (`BoundCtorRegistry`) with `schema` fixed. This is how `BaseJobDispatcher`/`BaseJobWorker`/`BaseJobScheduler` turn a manifest's `bodySchema` into a concrete `JobBody` subclass at runtime (`inflateBodyCtor()`/`inflateJobBodyCtor()`).
- `.get:SchemaReifierCtor` — defaults to `SchemaReifier`.
- `#get:body` — the normalized body.
- `#denormalizeBody()` — `schemaReifier.denormalizeValue({ normalizedValue: normalizedBody })`.
- `#isValid()` — `schemaReifier.isFulfilledNormalizedValue({ normalizedValue: normalizedBody })`.

## Class: `RenchanJobError`

Abstract. `Error` subclass used throughout the package for all framework-raised errors; concrete error classes are declared, not written by hand.

- `.create({ code = this.errorCode, options, value } = {})` — static factory method. Message is `code` alone, or `` `${code} ${JSON.stringify(value)}` `` when `value` is supplied.
- `.get:errorCode` **(abstract)** — a string code (e.g. `'101.X000.001'`); must be overridden (throws a plain `Error`, not `ConcreteMemberNotFoundJobError`, to avoid infinite recursion).
- `.declareJobError({ code })` — returns an anonymous `RenchanJobError` subclass with `errorCode` fixed to `code`. Used by `BaseJobEngine.buildErrorHash()` and `BaseJobWorker.buildErrorHash()` to turn an application's `standardErrorCodeHash`/`errorCodeHash` into real error classes (e.g. `engine.Error.InvalidRequest.create()`).

## Class: `ConcreteMemberNotFoundJobError`

Concrete `RenchanJobError` with `errorCode` fixed to `'101.X000.001'`. Thrown automatically by every abstract static getter/method across this package (`BaseJobEngine.get:config`, `BaseJobManifest.get:jobName`, `BaseJobWorker#executeJob()`, etc.) whenever a concrete subclass fails to override it — the framework's uniform "not implemented" signal.

## Class: `DeepBulkClassLoader`

Recursively discovers and imports default-exported classes under a directory; used by `JobWorkersDaemon`/`BaseJobSchedulerService` to auto-discover Worker/Scheduler subclasses.

- `.create({ poolPath })` — static factory method.
- `#loadClasses({ poolPath = this.poolPath, filterFunc = it => true, mapFunc = it => it } = {})` **(public)** — recursively lists files under `poolPath` matching `/\.[cm]?js$/`, skips dotfiles, `import()`s each, keeps `default` exports that are `Function`s, filters via `filterFunc` (e.g. `it.prototype instanceof BaseJobWorker`), and maps via `mapFunc`. Returns `Array<Function>`.

## Class: `ProcessClerk`

Thin wrapper around Node's `process` for attaching/detaching signal-handler "sinks" and exiting.

- `.create({ rawProcess = this.process } = {})` — static factory method.
- `.get:process` — the global Node `process` object.
- `.isValidSink({ sink })` — `true` only if `sink` is a non-null object whose every value is a `Function`.
- `#attachSink({ sink = null })` **(public)** — registers every `{eventName: listener}` pair in `sink` on the process (`process.on(eventName, listener)`); returns `null` if `sink` is invalid.
- `#detachSink({ sink = null })` **(public)** — the `process.off()` counterpart; returns `null` if `sink` is invalid.
- `#exit({ exitCode = 0 } = {})` — `process.exit(exitCode)`. Called by `JobWorkersDaemon#shutdownDaemon()` after tearing down workers.

## Class: `Timber`

Not a class — the default export is a `console`-like singleton object (`Object.setPrototypeOf({ ...emptyMethodHash }, console)`). When `process.env.NODE_ENV === 'production'`, `debug`/`error`/`info`/`log`/`warn`/`trace` become no-ops; every other `console` method (and these six outside production) passes through to the real `console`. Used throughout the package (and expected to be used by application job/worker code) instead of calling `console` directly.

## Usage

Based on the package's own `samples/confirm-01/` sample app.

Define a job (manifest + dispatcher + worker):

```js
// app/jobs/alpha/AlphaJobManifest.js
import { ScalarHash } from '@openreachtech/mentsu-schema'
import BaseJobManifest from '@openreachtech/renchan-job-bullmq/lib/BaseJobManifest.js'

const { Integer, BigNum, Datetime, Text } = ScalarHash

export default class AlphaJobManifest extends BaseJobManifest {
  /** @override */
  static get jobName () {
    return 'alpha'
  }

  /** @override */
  static get bodySchema () {
    return {
      customerId: Integer,
      amount: BigNum,
      confirmedAt: Datetime,
      transactionHash: Text,
    }
  }
}

// app/jobs/alpha/AlphaJobDispatcher.js
import BaseJobDispatcher from '@openreachtech/renchan-job-bullmq/lib/dispatchers/BaseJobDispatcher.js'
import SampleJobEngine from '../../SampleJobEngine.js'
import AlphaJobManifest from './AlphaJobManifest.js'

export default class AlphaJobDispatcher extends BaseJobDispatcher {
  /** @override */
  static get EngineCtor () {
    return SampleJobEngine
  }

  /** @override */
  static get ManifestCtor () {
    return AlphaJobManifest
  }
}

// app/jobs/alpha/AlphaJobWorker.js
import BaseJobWorker from '@openreachtech/renchan-job-bullmq/lib/workers/BaseJobWorker.js'
import AlphaJobManifest from './AlphaJobManifest.js'

export default class AlphaJobWorker extends BaseJobWorker {
  /** @override */
  static get ManifestCtor () {
    return AlphaJobManifest
  }

  /** @override */
  async executeJob ({ body, context, parcel }) {
    this.timber.log(`[${this.Ctor.jobName}] Job started with body:`, body)

    return {
      executedAt: new Date().toISOString(),
    }
  }

  /** @override */
  onJobCompleted ({ jobModel, result }) {
    this.timber.log(`[${this.Ctor.jobName}] Job completed.`, result)
  }

  /** @override */
  onJobFailed ({ jobModel, error }) {
    this.timber.error(`[${this.Ctor.jobName}] Job failed.`, error.message)
  }

  /** @override */
  onJobProgress ({ jobModel, progress }) {}

  /** @override */
  onWorkerError ({ error }) {}
}
```

Dispatch a job:

```js
import AlphaJobDispatcher from './app/jobs/alpha/AlphaJobDispatcher.js'

const dispatcher = await AlphaJobDispatcher.createAsync()

const response = await dispatcher.dispatchJob({
  body: {
    customerId: 100001,
    amount: new BigNumber('0.123456789'),
    confirmedAt: new Date('2026-05-20T12:00:00.000Z'),
    transactionHash: '0x0000000000000000000000000001',
  },
})

if (response.hasError()) {
  console.error(`Failed to dispatch job: ${response.errorMessage}`)
}
```

Start a worker daemon (auto-discovers every `BaseJobWorker` subclass under `SampleJobEngine.config.workersPath`):

```js
import JobWorkersDaemon from '@openreachtech/renchan-job-bullmq/lib/JobWorkersDaemon.js'
import SampleJobEngine from './app/SampleJobEngine.js'

const daemon = await JobWorkersDaemon.createAsync({
  EngineCtor: SampleJobEngine,
})

const workers = await daemon.startDaemon()
// SIGINT/SIGTERM now gracefully close all workers and exit the process.
```
