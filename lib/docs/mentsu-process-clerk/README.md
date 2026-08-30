# @openreachtech/mentsu-process-clerk

A small clerk class that manages Node.js process event listeners (sinks) and provides convenient process-exit helpers.

## Overview

`ProcessClerk` wraps a Node.js `process` object and offers two things:

- Attaching and detaching a **sink** — a plain object that maps process event names (e.g. `SIGINT`, `SIGTERM`) to their listener functions — in one call.
- Exiting the process with well-known exit codes through readable helper methods.

By taking the `process` object as a constructor parameter, the clerk stays easy to test: a mock process can be injected instead of the real one.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-process-clerk
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

Create a clerk, attach a sink of process event listeners, and exit gracefully when a
signal arrives.

```js
import { ProcessClerk } from '@openreachtech/mentsu-process-clerk'

const alphaClerk = ProcessClerk.create()

const alphaSink = {
  SIGINT: () => {
    console.log('Received SIGINT, shutting down...')

    alphaClerk.exitBySigint()
  },
}

// Attach the listeners to the process.
alphaClerk.attachSink({
  sink: alphaSink,
})

// Later, detach them when they are no longer needed.
alphaClerk.detachSink({
  sink: alphaSink,
})
```

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

### `ProcessClerk`

Clerk to manage process event sinks.

#### `.create()`

Factory method. Creates a new instance.

```
.create({ rawProcess? }?) => ProcessClerk
```

| parameter | type | description |
| :-- | :-- | :-- |
| `rawProcess` | `NodeJS.Process` | The process object to manage. Optional. Defaults to the global `process`. |

#### `#attachSink()`

Attaches a sink to the process. Each entry of the sink is registered with `process.on(eventName, listener)`.

```
#attachSink({ sink? }) => NodeJS.Process | null
```

| parameter | type | description |
| :-- | :-- | :-- |
| `sink` | `Record<string, (...args: Array<*>) => void> \| null` | Map of event names to listener functions. Optional. Defaults to `null`. |

Returns the process with the listeners attached, or `null` when the sink is invalid
(not an object, or containing a value that is not a function).

#### `#detachSink()`

Detaches a sink from the process. Each entry of the sink is removed with `process.off(eventName, listener)`.

```
#detachSink({ sink? }) => NodeJS.Process | null
```

| parameter | type | description |
| :-- | :-- | :-- |
| `sink` | `Record<string, (...args: Array<*>) => void> \| null` | Map of event names to listener functions. Optional. Defaults to `null`. |

Returns the process with the listeners detached, or `null` when the sink is invalid.

#### `#exitAsSuccess()`

Exits the process as success (exit code `0`).

```
#exitAsSuccess() => void
```

#### `#exitAsFailure()`

Exits the process as failure (exit code `1`).

```
#exitAsFailure() => void
```

#### `#exitAsMisuse()`

Exits the process as misuse (exit code `2`).

```
#exitAsMisuse() => void
```

#### `#exitBySigint()`

Exits the process by SIGINT (exit code `130`).

```
#exitBySigint() => void
```

#### `#exit()`

Exits the process with the given exit code.

```
#exit({ exitCode? }?) => void
```

| parameter | type | description |
| :-- | :-- | :-- |
| `exitCode` | `number` | The exit code passed to `process.exit()`. Optional. Defaults to `0`. |

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-process-clerk.git
cd mentsu-process-clerk
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
