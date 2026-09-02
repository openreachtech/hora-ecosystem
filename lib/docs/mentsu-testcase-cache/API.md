# API

Source: `package.json` has a `"types"` field pointing at `types/index.d.ts`, but that file ships **empty** (0 bytes), so it describes nothing. Extracted from JSDoc in `lib/**/*.js` and `constants/EXIT_CODE.js` instead.

Members tagged `@public` are marked as such below. The package is a CLI first — `bin.mentsu-testcase-cache` → `lib/cli.mjs` — and the classes below are the same machinery exposed for programmatic use.

## Exports (`index.js`)

Every export is named; there is no default export from the package itself.

Classes:

- `CacheAuditor` ← `lib/CacheAuditor.js`
- `CacheConfig` ← `lib/CacheConfig.js`
- `CacheKey` ← `lib/CacheKey.js`
- `CacheRecord` ← `lib/CacheRecord.js`
- `CacheRecordStore` ← `lib/CacheRecordStore.js`
- `CacheRunReporter` ← `lib/CacheRunReporter.js`
- `CacheRunner` ← `lib/CacheRunner.js`
- `CacheUnit` ← `lib/CacheUnit.js`
- `CommandOption` ← `lib/CommandOption.js`
- `TestcaseCacheCommand` ← `lib/TestcaseCacheCommand.js`
- `UnitCommandExecutor` ← `lib/UnitCommandExecutor.js`

Constant:

- `EXIT_CODE` ← `constants/EXIT_CODE.js`

Not exported from `index.js`: `lib/cli.mjs`, the executable shim. It creates a `TestcaseCacheCommand` and assigns `await command.executeCommand()` to `process.exitCode`.

Class members are written with the following notation throughout this document.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

## Constant: `EXIT_CODE`

The fixed contract callers branch on. The JSDoc states these must never be renumbered.

| key | value | meaning |
| :-- | :-- | :-- |
| `ALL_PASSED` | `0` | every unit passed |
| `TEST_FAILED` | `1` | at least one unit failed |
| `CONFIG_ERROR` | `2` | config missing, or an unknown unit name was given |
| `AUDIT_MISMATCH` | `3` | a spot audit disagreed with a reused record |

An audit mismatch is deliberately distinct from a test failure: it reports a defect in the measuring instrument, not in the code under test.

## Class: `CacheUnit`

The granularity of the cache — one repository × one command.

- `.create({ name, workingDirectory, workingDirectoryPath, command, extras })` — `@public`. Factory.
- `.createFromDeclaration({ name, declaration, rootPath })` — `@public`. Builds from a `UnitDeclaration`; `workingDirectoryPath` is `path.join(rootPath, declaration.cwd)`, and `extras` defaults to `[]`.
- `.get:path` — the `node:path` module.
- `#name` — the unit name, as keyed in the config file.
- `#workingDirectory` — the declared `cwd`, relative.
- `#workingDirectoryPath` — the absolute working directory.
- `#command` — the command string this unit runs.
- `#extras` — extra path patterns that widen the key.

Typedef `UnitDeclaration`: `{ cwd: string, command: string, extras?: Array<string> }`.

## Class: `CacheConfig`

The config declared by the project.

- `.CONFIG_FILE_NAME` — `'.hora-cache.json'`.
- `.DEFAULT_CACHE_DIRECTORY` — `'.hora-cache'`.
- `.create({ cacheDirectoryPath, units })` — `@public`. Factory.
- `.createFromFile({ rootPath })` — `@public`. Returns `null` when the config file is absent or unparseable. Otherwise resolves the cache directory (`configHash.cacheDir` or the default) and builds every unit.
- `.get:CacheUnitCtor` / `.get:fs` / `.get:path` — seams for the collaborating constructor and node modules.
- `.loadConfigHash({ rootPath })` — parses the config file; `null` on absence or a `JSON.parse` throw.
- `.buildUnits({ rootPath, configHash })` — maps `configHash.units` entries into `CacheUnit` instances.
- `.createCacheUnit({ name, declaration, rootPath })` — delegates to `CacheUnit.createFromDeclaration()`.
- `#cacheDirectoryPath` — the absolute cache directory.
- `#units` — the declared `CacheUnit` instances.
- `#filterUnits({ unitNames })` — the named units, or **all** units when `unitNames` is empty.
- `#extractUnknownUnitNames({ unitNames })` — the given names that are not declared.
- `#hasUnit({ name })` — whether a unit of that name is declared.

Typedef `ConfigHash`: `{ cacheDir?: string, units?: Record<string, UnitDeclaration> }`.

## Class: `CacheKey`

The sha256 digest over every input of a unit. The input set is **derived** from the repository, never declared — declared extras can only widen it, so a wrong declaration wastes time but cannot fabricate a pass.

- `.DEFAULT_EXTRAS` — `['node_modules/.package-lock.json']`.
- `.KEYED_ENVIRONMENT_VARIABLE_NAMES` — `['NODE_ENV', 'TZ', 'LANG']`.
- `.DELETED_FILE_DIGEST` — `'DELETED'`. A file's absence is itself an input.
- `.create({ value, fileCount })` — `@public`. Factory.
- `.createFromUnit({ unit })` — `@public`. Collects the target file paths and digests everything.
- `.get:childProcess` / `.get:crypto` / `.get:fs` / `.get:path` / `.get:process` — seams for the node modules and the `process` global.
- `.collectTargetFilePaths({ unit })` — git-visible paths plus expanded extras, deduplicated and sorted.
- `.listGitFilePaths({ unit })` — `git ls-files --cached --others --exclude-standard`, run in the unit's working directory.
- `.expandExtraFilePaths({ unit })` — `.DEFAULT_EXTRAS` plus `unit.extras`, each expanded.
- `.expandExtraPattern({ unit, pattern })` — returns the pattern as-is when it has no `*`, else lists matches.
- `.listMatchedFilePaths({ unit, pattern })` — reads the pattern's directory and filters by the file-name pattern. `[]` when the directory does not exist.
- `.buildFileNamePattern({ pattern })` — a `RegExp` where `*` becomes `[^/]*` and every other special character is escaped.
- `.generateDigest({ unit, filePaths })` — the hex sha256 over the header lines and the file lines.
- `.buildHeaderLines({ unit })` — the command, `node:<version> <platform>/<arch>`, and the keyed environment lines.
- `.buildEnvironmentLines()` — one `env:<NAME>=<value>` line per keyed variable; an unset variable contributes an empty value.
- `.buildFileLines({ unit, filePaths })` — one `<path>:<digest>` line per file.
- `.digestFile({ unit, filePath })` — the file's hex sha256, or `.DELETED_FILE_DIGEST` when it does not exist.
- `#value` — the hex digest.
- `#fileCount` — how many files entered the key.

## Class: `CacheRecord`

One recorded pass. **Only passes are recorded** — a failure is executed every time.

- `.create({ unitName, key, command, workingDirectory, fileCount, nodeVersion, platform, executedAt, elapsedMilliseconds, summaryLines })` — `@public`. Factory.
- `.createFromExecution({ unit, cacheKey, execution })` — `@public`. Builds from a live execution.
- `.createFromRecordHash({ recordHash })` — `@public`. Builds from a record file's parsed hash.
- `.get:process` — the `process` global.
- `.generateExecutedAt()` — the current time as an ISO string.
- `#buildRecordHash()` — the hash written to the record file. Its property names are the record file contract.

Typedef `ExecutionSummary`: `{ exitCode: number, elapsedMilliseconds: number, summaryLines: Array<string> }`.

Typedef `RecordHash`: `{ unit, key, command, cwd, fileCount, node, platform, executedAt, durationMs, summaryLines }`.

## Class: `CacheRecordStore`

Record files under the cache directory. The directory is machine-local and never committed; discarding it only costs a re-execution.

- `.create({ cacheDirectoryPath })` — `@public`. Factory.
- `.get:CacheRecordCtor` — the `CacheRecord` constructor.
- `#get:Ctor` / `#get:fs` / `#get:path` — the constructor and the node module seams.
- `#cacheDirectoryPath` — the cache directory.
- `#loadRecord({ unitName, key })` — `@public`. The record for that key, or `null` when no record file exists.
- `#buildRecordFilePath({ unitName, key })` — the record file path for a unit and key.
- `#saveRecord({ cacheRecord })` — `@public`. Writes the record file.
- `#discardAllRecords()` — `@public`. Removes the cache directory outright.
- `#countRecords({ unitName })` — `@public`. How many records a unit has saved; `0` when its directory does not exist.

## Class: `UnitCommandExecutor`

Runs a unit's command for real. The output is streamed through unchanged and captured at the same time, so the summary lines can be extracted for the record.

- `.SUMMARY_LINE_PATTERN` — `/^(?:Test Suites|Tests):\s/u`. This is what makes the summary replay Jest-shaped, though the tool itself is runner-agnostic.
- `.create({ unit })` — `@public`. Factory.
- `.get:PassThroughCtor` — the `PassThrough` stream constructor.
- `.extractSummaryLines({ outputText })` — the lines of the output matching `.SUMMARY_LINE_PATTERN`.
- `#get:Ctor` / `#get:childProcess` / `#get:events` / `#get:process` / `#get:streamConsumers` — the constructor and node module seams.
- `#unit` — the unit being executed.
- `#executeCommand()` — `@public`. Async. Returns an `ExecutionSummary`.
- `#spawnCommand()` — async. Returns `{ exitCode, outputText }`.
- `#waitExitCode({ spawnedProcess })` — async. A process killed by a signal counts as a failure.
- `#collectStreamText({ sourceStream, targetStream })` — async. Pipes through while collecting.
- `#createPassThrough()` — a new `PassThrough` stream.

## Class: `CacheAuditor`

Re-executes **one reused unit at random** and compares. A mismatch is evidence that the key's input set has a hole, so every record is discarded — no partial trust remains. The target is random because a predictable one could be neutralized by coincidence.

- `.create({ recordStore, reporter })` — `@public`. Factory.
- `.get:UnitCommandExecutorCtor` — the `UnitCommandExecutor` constructor.
- `#get:Ctor` — the constructor of the instance.
- `#recordStore` — the record store.
- `#reporter` — the reporter.
- `#auditReusedUnit({ results })` — `@public`. Async. Returns `null` when nothing was reused. On exit code `0` reports a match and returns `{ unitName, isMatch: true }`; otherwise calls `recordStore.discardAllRecords()` and returns `{ unitName, isMatch: false }`.
- `#pickAuditTarget({ results })` — a random reused result, or `null`.
- `#createUnitCommandExecutor({ unit })` — builds the executor for the target.

## Class: `CacheRunner`

Runs every target unit **serially** through the cache. Serially because commands that rebuild their own database would collide when run concurrently.

- `.create({ config, options, recordStore, reporter })` — `@public`. Factory.
- `.get:CacheAuditorCtor` / `.get:CacheKeyCtor` / `.get:CacheRecordCtor` / `.get:UnitCommandExecutorCtor` — the collaborating constructors.
- `#get:Ctor` — the constructor of the instance.
- `#config` / `#options` / `#recordStore` / `#reporter` — the collaborators.
- `#runUnits()` — `@public`. Async. Returns the run's exit code.
- `#processUnits({ units })` — async. Folds the units serially into an array of `UnitResult`.
- `#processUnit({ unit })` — async. Reuses the record when one matches, else executes.
- `#createCacheKey({ unit })` — `CacheKey.createFromUnit()`.
- `#loadReusableRecord({ unit, cacheKey })` — `null` on a cold run (`options.isCold`) or when no record matches.
- `#executeUnit({ unit, cacheKey })` — async. Records the pass; **a failure records nothing**.
- `#createUnitCommandExecutor({ unit })` — builds the executor.
- `#createCacheRecord({ unit, cacheKey, execution })` — builds the record.
- `#auditResults({ results })` — async. Skipped when `options.skipsAudit`, and when nothing was reused.
- `#createCacheAuditor()` — builds the auditor.
- `#determineExitCode({ results, auditOutcome })` — `AUDIT_MISMATCH` for a failed audit, `TEST_FAILED` when any unit failed, else `ALL_PASSED`.

## Class: `TestcaseCacheCommand`

The CLI entry point. A missing config **stops with guidance** rather than guessing default units — the tool never branches on what the situation looks like.

- `.create({ argv, rootPath, reporter } = {})` — `@public`. Factory; every parameter is optional.
- `.get:CacheConfigCtor` / `.get:CacheKeyCtor` / `.get:CacheRecordStoreCtor` / `.get:CacheRunReporterCtor` / `.get:CacheRunnerCtor` / `.get:CommandOptionCtor` / `.get:process` — the collaborating constructors and the `process` global.
- `.createCommandOption({ argv })` — `CommandOption.createFromArgv()`.
- `.createCacheRunReporter()` — a default reporter.
- `#get:Ctor` — the constructor of the instance.
- `#options` / `#rootPath` / `#reporter` — the parsed options, the project root, the reporter.
- `#executeCommand()` — `@public`. Async. Returns the exit code. Order: load the config (`CONFIG_ERROR` with guidance when `null`), reject unknown unit names (`CONFIG_ERROR`), then honor `--clear`, then `--status`, then run.
- `#loadCacheConfig()` — `CacheConfig.createFromFile()`, or `null`.
- `#clearRecords({ config })` — discards every record and returns an exit code.
- `#createCacheRecordStore({ config })` — builds the store.
- `#showStatus({ config })` — reports every unit's status **without executing anything**.
- `#buildStatusEntry({ unit, recordStore })` — one `StatusEntry`.
- `#createCacheKey({ unit })` — the key for a unit.
- `#runUnits({ config })` — async. Delegates to a `CacheRunner`.
- `#createCacheRunner({ config })` — builds the runner.

## Class: `CommandOption`

The parsed CLI options.

- `.create({ unitNames, isCold, skipsAudit, showsStatus, clearsRecords })` — `@public`. Factory.
- `.createFromArgv({ argv })` — `@public`. Flags are matched by exact string: `--cold` → `isCold`, `--no-audit` → `skipsAudit`, `--status` → `showsStatus`, `--clear` → `clearsRecords`.
- `.extractUnitNames({ argv })` — every argument not starting with `--`.
- `#unitNames` — the unit names to target; empty means all.
- `#isCold` — ignore records and execute everything.
- `#skipsAudit` — do not spot-audit.
- `#showsStatus` — report status instead of running.
- `#clearsRecords` — discard every record instead of running.

## Class: `CacheRunReporter`

Writes every line of the CLI output. A reused summary is replayed from the record itself, so no human has to copy the numbers by hand.

- `.create({ logger } = {})` — `@public`. Factory; `logger` is a `Console`.
- `.formatSeconds({ milliseconds })` — seconds with one decimal, e.g. `"58.3s"`.
- `.shortenKey({ key })` — the leading eight characters of a key.
- `.formatExecutedAt({ executedAt })` — an ISO string without milliseconds.
- `.formatFileCount({ fileCount })` — a grouped count, e.g. `"1,203"`.
- `#get:Ctor` — the constructor of the instance.
- `#logger` — the console it writes to.

Reporting methods, all `@public` and all returning `void`:

- `#reportKeyHeader({ unit, cacheKey, elapsedMilliseconds })`
- `#reportMiss()`
- `#reportRecordedPass({ cacheKey, execution })`
- `#reportFailure({ execution })`
- `#reportReuse({ cacheRecord })` — replays the record's summary lines.
- `#reportAuditStart({ unitName })`
- `#reportAuditMatch({ unitName, execution })`
- `#reportAuditMismatch({ unitName })`
- `#reportAuditSkipped()`
- `#reportSummary({ results, auditOutcome })`
- `#reportStatus({ cacheDirectoryPath, statusEntries })`
- `#reportMissingConfig({ rootPath })`
- `#reportUnknownUnitNames({ unitNames })`
- `#reportRecordsDiscarded({ cacheDirectoryPath })`

Line-building helpers: `#buildSummaryLine({ result, auditOutcome })`, `#buildAuditMark({ result, auditOutcome })`, `#buildSkippedLines({ results })`, `#sumSkippedMilliseconds({ results })`, `#buildStatusLine({ statusEntry })`.

## Shared typedefs (`lib/CacheRunReporter.js`)

- `UnitResult` — `{ unit, cacheKey, cacheRecord: CacheRecord | null, isReused: boolean, hasPassed: boolean, execution: ExecutionSummary | null }`.
- `AuditOutcome` — `{ unitName: string, isMatch: boolean }`.
- `StatusEntry` — `{ unitName: string, recordCount: number, isReusable: boolean, key: string }`.
