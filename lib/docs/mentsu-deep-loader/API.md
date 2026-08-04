# API

Source: `lib/DeepLoader.js`, `lib/DeepCtorsLoader.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `export { DeepLoader }` — named export of the base loader (re-exported as the `default` export of `lib/DeepLoader.js`).
- `export { DeepCtorsLoader }` — named export of the constructor-filtering loader (re-exported as the `default` export of `lib/DeepCtorsLoader.js`).
- No default export from `index.js` itself.

No members are tagged `@public`; the surface below is the natural consumer-facing API inferred from the class design (it matches the package's own hand-written API reference docs, which likewise omit `#collectFileNames()` and `#get:fs` as internal plumbing).

## Class: `DeepLoader`

Base loader. Recursively imports the modules under a pool path and collects a value from each module through a set of override hooks. By default it collects the `default` export of every `.js` / `.cjs` / `.mjs` file.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ poolPath })` — static factory method. Returns an instance of `DeepLoader` (or subclass, via `this`).
- `#poolPath` — instance property, the base directory passed at construction. Used as the default `poolPath` for `#deepLoad()` and `#collectFileNames()` when the method isn't called with an explicit one.
- `#deepLoad({ poolPath = this.poolPath } = {})` — instance method, `async`. Recursively collects file names under `poolPath`, dynamically `import()`s each file **sequentially** (each import awaited before the next starts, via `Array#reduce` chaining — so results preserve file-collection order), maps each imported module through `#defineExportsFilter()`, then keeps only the values for which `#defineLoadedFilter()` returns truthy. Returns a `Promise` resolving to the array of collected values.
- `#defineFileNameFilter()` — instance method, override hook (`@abstract`). Returns a `({ filename }) => boolean` predicate that decides which files get imported. Default: matches filenames ending in `.js`, `.cjs`, or `.mjs` (`/\.[cm]?js$/u`).
- `#defineExportsFilter()` — instance method, override hook (`@abstract`). Returns a `({ exported }) => *` function that maps an imported module namespace to the value to collect. Default: returns `exported.default` (only the default export is collected; named exports are ignored unless this hook is overridden).
- `#defineLoadedFilter()` — instance method, override hook (`@abstract`). Returns a `({ exported }) => boolean` predicate that decides which collected values survive the final filter. Default: keeps every value (`true`).

Other members (`#collectFileNames()`, `#get:fs`) are internal implementation detail (not part of the package's documented API) and are omitted here.

Non-obvious behavior:

- `#collectFileNames({ poolPath = this.poolPath } = {})` recurses into every subdirectory (skipping entries whose name starts with `.`) with plain `fs.readdirSync` / `fs.statSync` calls. There is **no recursion-depth limit** and **no cycle detection** — a symlink cycle in the pool directory would recurse indefinitely.
- Files are imported one at a time, in the order they were collected, not in parallel — so side effects from module-level code in the loaded files run in a deterministic, predictable order.

## Class: `DeepCtorsLoader`

Extends `DeepLoader`. Specialized for loading constructors: keeps only the loaded values that are one of the "acceptable" constructors — or a subclass of them. When no acceptable constructors are bound, every value is kept (same as the base `DeepLoader` behavior).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ poolPath, acceptableCtors = this.acceptableCtors })` — static factory method. Returns an instance of `DeepCtorsLoader` (or subclass, via `this`). `acceptableCtors` defaults to the calling class's `.acceptableCtors` static getter, so a class derived via `.of()` doesn't need to repeat its bound constructors at `.create()` time.
- `.of(...Ctors)` — static method. Returns a **derived loader class** (a subclass of `this`) whose `.acceptableCtors` static getter returns `Ctors`. Memoized via `@openreachtech/mentsu-bound-ctor-registry`: calling `.of()` again with the same base class and the same constructor(s) returns the **identical** derived class reference rather than declaring a new one.
- `.get:acceptableCtors` — static getter, override hook (`@abstract`). The default acceptable constructors for the class. `DeepCtorsLoader` itself returns `[]`; a class returned by `.of(...Ctors)` returns `Ctors`.
- `#acceptableCtors` — instance property, the acceptable constructors passed (or defaulted) at construction; used by `#defineLoadedFilter()`.
- `#defineLoadedFilter()` — instance method, `@override` of `DeepLoader#defineLoadedFilter()`. If `#acceptableCtors` is empty, returns a predicate that keeps everything (same as the base class default). Otherwise returns a predicate that keeps a value only when it is a `Function` **and** is exactly one of `#acceptableCtors`, or has one of them in its prototype chain (checked via `Object.prototype.isPrototypeOf.call(acceptableCtor, exported)`) — i.e. the value *is or extends* one of the acceptable constructors.

## Usage

```js
import { DeepLoader, DeepCtorsLoader } from '@openreachtech/mentsu-deep-loader'

// Load the default export of every module under app/models.
const modelValues = await DeepLoader.create({
  poolPath: 'app/models',
}).deepLoad()

// Load only constructors that are (or extend) BaseModel.
import BaseModel from './app/models/BaseModel.js'

const ModelLoader = DeepCtorsLoader.of(BaseModel)

const modelCtors = await ModelLoader.create({
  poolPath: 'app/models',
}).deepLoad()
```
