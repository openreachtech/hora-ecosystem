# API

Source: `lib/BoundCtorRegistry.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `export { BoundCtorRegistry }` — named export of the class (no default export).

## Class: `BoundCtorRegistry`

Memoizes a "bound constructor" derived from a base constructor plus a set of bindings, so the same derivation isn't repeated for the same base constructor + bindings combination.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ BaseCtor })` — static factory method. Returns an instance of `BoundCtorRegistry` bound to `BaseCtor`.
- `#ensureBoundCtor({ bindings, deriver })` — instance method (`@public`). Returns a bound constructor for the given `bindings`, deriving it via `deriver({ Ctor: BaseCtor })` on first use and caching it for subsequent calls with the same `bindings`/`BaseCtor`.

Other members (`ensureBindingWeakMapKey`, `ensureCtorPool`, `declareBoundCtor`, `get Ctor`) are internal (not `@public`) and are omitted here.

## Usage

```js
import { BoundCtorRegistry } from '@openreachtech/mentsu-bound-ctor-registry'

const registry = BoundCtorRegistry.create({ BaseCtor: SomeBaseClass })

const BoundClass = registry.ensureBoundCtor({
  bindings: [someKey],
  deriver: ({ Ctor }) => class extends Ctor {
    // ...
  },
})
```
