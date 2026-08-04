# API

Source: `lib/GeneChainSplicer.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `export { GeneChainSplicer }` — named export of the class (no default export).

## Class: `GeneChainSplicer`

Dynamically splices methods into an object instance's prototype chain.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ core })` — static factory method. `core` is the object instance to extend.
- `#spliceGene({ mixin })` — instance method. Sets `core`'s prototype to a new object combining `mixin` with `core`'s current prototype, so `mixin`'s methods take precedence. Returns `this` for chaining. When chained, **later `spliceGene()` calls take precedence over earlier ones** for the same member name.

## Usage

```js
import { GeneChainSplicer } from '@openreachtech/mentsu-gene-chain-splicer'

class AlphaCore {
  firstValue () {
    return 1000
  }
}

const alphaCore = new AlphaCore()

GeneChainSplicer.create({ core: alphaCore })
  .spliceGene({
    mixin: {
      firstValue () {
        return 1999
      },
    },
  })

alphaCore.firstValue() // 1999
```
