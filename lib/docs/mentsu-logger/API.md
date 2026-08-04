# API

Source: `lib/MentsuLogger.js`, `lib/BaseLoggerClient.js`, `lib/WinstonLoggerClient.js` (no `.d.ts` shipped; extracted from JSDoc). No members are tagged `@public`; the surface below is the natural consumer-facing API inferred from the class design.

## Exports (`index.js`)

- `export { MentsuLogger }` — named export of the main class (no default export).

## Class: `MentsuLogger`

Wraps a logger client (a `WinstonLoggerClient` by default) and gates logging by `NODE_ENV`.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ filePath, maxFileSize = 1048576, env, nodeProcess = process })` — static factory method. Internally builds a `WinstonLoggerClient` writing to `filePath` (plus `filePath + '.error.log'` for error level).
- `#log({ message, params = [], tags = [], ...extraOptions })` / `#warn(...)` / `#error(...)` / `#debug(...)` — instance methods. Format `message` with `params` via `util.format`, add a `pid:<pid>` tag, and delegate to the underlying client. Return `this` for chaining.
- **Logging is only emitted when `env.NODE_ENV === 'production'`** (`shouldSkipLogging()` skips in every other environment) — this is the opposite of what the name might suggest, so check this behavior before relying on log output in development.

## Class: `BaseLoggerClient`

Abstract base for logger clients; `log`/`warn`/`error`/`debug` throw `Error('This function must be inherited')` unless overridden by a subclass.

- `.create({ client } = {})` — static factory method.
- `#formatMessage({ message, params })` — instance method. `util.format(message, ...params)`.

## Class: `WinstonLoggerClient extends BaseLoggerClient`

Default client used by `MentsuLogger`, backed by `winston` + `winston-daily-rotate-file`.

- `.create({ filePath, maxFileSize = 1048576, client })` — static factory method. Builds a winston logger with console + daily-rotating file transports (`<filePath>%DATE%.log` at `debug` level, `<filePath>%DATE%.error.log` at `error` level) unless `client` is supplied.
- `#log({ message, params = [] })` / `#warn(...)` / `#error(...)` / `#debug(...)` — instance methods, implemented (delegate to the underlying `winston` logger at the matching level).
- `get winston` — instance getter, the underlying `winston` `Logger` instance.

## Usage

```js
import { MentsuLogger } from '@openreachtech/mentsu-logger'

const logger = MentsuLogger.create({
  filePath: '/var/log/app/app',
  env: process.env,
})

logger.log({ message: 'started', tags: ['boot'] })
```
