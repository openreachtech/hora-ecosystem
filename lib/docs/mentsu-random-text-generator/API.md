# API

Source: `lib/RandomTextGenerator.js` (`types/jest.d.ts` is a Jest type augmentation only, not the package's own API declarations; extracted from JSDoc).

## Exports (`index.js`)

- `export { RandomTextGenerator }` — named export of the class (no default export).

## Class: `RandomTextGenerator`

Generates random strings from a seed character set.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ seedString } = {})` — static factory method. `seedString` defaults to `'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'`; each character becomes an available seed.
- `#generate({ length = 10 } = {})` — instance method. Returns a random string of `length` characters drawn (with repetition) from the seed set.

## Usage

```js
import { RandomTextGenerator } from '@openreachtech/mentsu-random-text-generator'

const generator = RandomTextGenerator.create()

generator.generate({ length: 16 })
```
