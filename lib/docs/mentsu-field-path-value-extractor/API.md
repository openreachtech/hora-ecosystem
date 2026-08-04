# API

Source: `lib/FieldPathValueExtractor.js` (`types/jest.d.ts` is a Jest type augmentation only, not the package's own API declarations; extracted from JSDoc).

## Exports (`index.js`)

- `export { FieldPathValueExtractor }` — named export of the class (no default export).

## Class: `FieldPathValueExtractor`

Extracts a value from a root object using a delimited field path (default delimiter: `.`).

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ root, delimiter = '.' })` — static factory method.
- `#bulkExtract({ lookup })` — instance method (`@public`). `lookup` is a hash of `key: fieldPath` or `key: [fieldPath, defaultValue]`. Returns a same-shaped hash of extracted values, falling back to `defaultValue` (or `null`) when the path resolves to `null`/`undefined`.
- `#buildClue()` — instance method (`@public`). Returns a `Proxy` that resolves properties as field paths against the root object (property access reads through `extractFieldPathValue`); also callable as a function `clue(fieldPath, defaultValue)`.

Other members (`extractFieldPathValue`, `buildSplitPathSegments`, `traversePathSegmentsToValue`, `buildProxyHandler`) are internal (not `@public`) and are omitted here.

## Usage

```js
import { FieldPathValueExtractor } from '@openreachtech/mentsu-field-path-value-extractor'

const extractor = FieldPathValueExtractor.create({ root: someObject })

extractor.bulkExtract({
  lookup: {
    name: 'user.name',
    age: ['user.age', 0],
  },
})
// -> { name: <value>, age: <value or 0> }

const clue = extractor.buildClue()
clue.user.name // reads root.user.name via the field-path proxy
```
