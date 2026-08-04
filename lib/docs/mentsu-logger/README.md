# @openreachtech/mentsu-logger

A thin logger wrapper around [winston](https://github.com/winstonjs/winston) with daily log-file rotation.

## Overview

`mentsu-logger` provides a small, uniform logging interface (`log` / `warn` / `error` / `debug`) on top of winston. It adds:

- printf-style message formatting (via `util.format`) through a `params` array.
- tag support, automatically appending the current process id as a `pid:<pid>` tag.
- output to both the console and daily-rotated log files (a general log and an error-only log).
- environment-gated output: log entries are written only when `NODE_ENV` is `production`.

All logging methods return the logger instance, so calls can be chained.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-logger
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

Create a logger with `MentsuLogger.create()`, then call one of the level methods.

```js
import { MentsuLogger } from '@openreachtech/mentsu-logger'

const alphaLogger = MentsuLogger.create({
  filePath: 'logs/app-',
  env: {
    NODE_ENV: 'production',
  },
})

// Simple message.
alphaLogger.log({
  message: 'What a beautiful day',
})

// printf-style formatting via `params`.
alphaLogger.warn({
  message: 'I have %d apples',
  params: [3],
})

// Custom tags (a `pid:<pid>` tag is appended automatically).
alphaLogger.error({
  message: 'Job failed',
  tags: [
    'job:AlphaSummarizer',
  ],
})

// Methods return the instance, so calls can be chained.
alphaLogger
  .debug({ message: 'step 1' })
  .debug({ message: 'step 2' })
```

Log entries are written only when `env.NODE_ENV` is `production`. With any other value,
the level methods return the instance without emitting anything, which keeps
non-production environments quiet without changing call sites.

Each entry is sent to the console and to daily-rotated files derived from `filePath`:
a general log (`<filePath>%DATE%.log`) and an error-only log (`<filePath>%DATE%.error.log`).

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

### MentsuLogger

The logger class exported by this package.

#### `.create()`

Factory method. Creates a `MentsuLogger` backed by a winston logger client.

```js
MentsuLogger.create({
  filePath,
  maxFileSize,
  env,
  nodeProcess,
})
```

| parameter | type | required | description |
| :-- | :-- | :-- | :-- |
| `filePath` | `string` | yes | Base path used to build the rotated log file names. |
| `maxFileSize` | `number` | no | Maximum size (in bytes) of a rotated file. Defaults to `1048576` (1 MiB). |
| `env` | `{ [key: string]: string }` | no | Environment map. `NODE_ENV` gates whether entries are written (`production` enables output). |
| `nodeProcess` | `{ pid: number }` | no | Process-like object. Defaults to the global `process`; its `pid` is appended as a `pid:<pid>` tag. |

Returns a `MentsuLogger` instance.

#### `#log()`

Writes an entry at the `info` level.

```js
alphaLogger.log({
  message,
  params,
  tags,
})
```

| parameter | type | required | description |
| :-- | :-- | :-- | :-- |
| `message` | `string` | yes | Message, optionally with `util.format` placeholders (e.g. `%s`, `%d`). |
| `params` | `Array<*>` | no | Values substituted into the `message` placeholders. Defaults to `[]`. |
| `tags` | `Array<string>` | no | Tags attached to the entry. A `pid:<pid>` tag is appended automatically. Defaults to `[]`. |

Returns the `MentsuLogger` instance for method chaining.

#### `#warn()`

Writes an entry at the `warn` level. Same parameters and return value as `#log()`.

#### `#error()`

Writes an entry at the `error` level. Same parameters and return value as `#log()`.

#### `#debug()`

Writes an entry at the `debug` level. Same parameters and return value as `#log()`.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-logger.git
cd mentsu-logger
npm install
npm run lint
npm test
```

## License

This project is released under the MIT License.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
