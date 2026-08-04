# API

Source: `lib/MixinBuilder.js`. `package.json` declares `"types": "./types/index.d.ts"`, but that file is empty, so the JSDoc in `lib/` was used instead. No members are tagged `@public`; the surface below is the natural consumer-facing API inferred from the class design.

## Exports (`index.js`)

- `export default MixinBuilder`
- `export { MixinBuilder }`

## Class: `MixinBuilder`

Builds a `Proxy`-wrapped object where property reads/writes fall through a list of mixin objects layered on top of a root object.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ root = {} })` — static factory method.
- `#addMixins(...objects)` — instance method. Appends one or more mixin objects (variadic). Returns `this` for chaining.
- `#getFullTargets()` — instance method. Returns `[root, ...mixins]` in that order.
- `#build()` — instance method. Returns a `Proxy` over `root` where `get`/`set` search `getFullTargets()` **in order** for the first object that already has the property — so `root` wins over any mixin, and among mixins, the **first-added** mixin wins over later ones (opposite precedence from `mentsu-gene-chain-splicer`'s `spliceGene`). If no target has the property, falls through to `root`.

## Usage

```js
import MixinBuilder from '@openreachtech/mentsu-mixin-builder'

const extended = MixinBuilder.create({ root: {} })
  .addMixins({ greet: () => 'hi' }, { farewell: () => 'bye' })
  .build()

extended.greet() // 'hi'
```
