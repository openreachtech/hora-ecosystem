# API

Source: `lib/ProcessClerk.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `export { ProcessClerk }` — named export of the class (re-exported from `./lib/ProcessClerk.js`'s default export). No default export from `index.js` itself.

## Class: `ProcessClerk`

Wraps a Node.js `process` object (`this.rawProcess`, set at construction) so that groups
of event listeners can be attached/detached together.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ rawProcess = this.process } = {})` — static factory method. Returns a new instance of `ProcessClerk` (or of the calling subclass, via `this`). `rawProcess` defaults to the Node.js global `process` object.
- `#attachSink({ sink = null })` — instance method (`@public`). Validates `sink`: it must be a non-null object whose every value is a `Function`; otherwise returns `null`. If valid, for every `[eventName, listener]` entry in `sink`, calls `rawProcess.on(eventName, listener)` (chained via `Array.prototype.reduce`), and returns the resulting `process` object.
- `#detachSink({ sink = null })` — instance method (`@public`). Same validation as `attachSink`. If valid, for every `[eventName, listener]` entry in `sink`, calls `rawProcess.off(eventName, listener)` instead of `.on`, and returns the resulting `process` object (or `null` if `sink` is invalid).

Other members are not tagged `@public` and are omitted here: the `rawProcess` instance
property; the `get Ctor` and `get process` instance getters; the `static get process`
getter; `static isValidSink({ sink })` (the validation used internally by `attachSink`/
`detachSink`); and the instance methods `exit({ exitCode = 0 } = {})`, `exitAsSuccess()`
(exit code `0`), `exitAsFailure()` (exit code `1`), `exitAsMisuse()` (exit code `2`), and
`exitBySigint()` (exit code `130`) — these call `this.process.exit(exitCode)` and encode
this package's process-exit-code convention, but are not part of the tagged `@public`
surface.

## Usage

```js
import { ProcessClerk } from '@openreachtech/mentsu-process-clerk'

const processClerk = ProcessClerk.create()

const sink = {
  SIGINT: () => {
    console.log('Received SIGINT')
  },
  uncaughtException: error => {
    console.error(error)
  },
}

processClerk.attachSink({ sink })

// ... later, to stop listening
processClerk.detachSink({ sink })
```
