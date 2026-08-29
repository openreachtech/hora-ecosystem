# @openreachtech/mentsu-field-path-value-extractor

Extract values from a nested object using delimited field paths.

## Overview

`FieldPathValueExtractor` reads values out of a nested object (or array) by a single
string field path such as `'CustomerProfile.lastName'`. The path is split by a
configurable delimiter (`.` by default) and traversed segment by segment.

- Missing segments resolve to `null` instead of throwing.
- A fallback default value can be supplied per lookup.
- `#buildClue()` exposes the extractor as a proxy for property-style access, and
  `#bulkExtract()` resolves many paths at once into a plain object.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-field-path-value-extractor
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### Property access with a clue proxy

```js
import { FieldPathValueExtractor } from '@openreachtech/mentsu-field-path-value-extractor'

const alphaExtractor = FieldPathValueExtractor.create({
  root: {
    id: 100001,
    CustomerProfile: {
      lastName: 'Doe',
      firstName: 'John',
    },
    CustomerPayments: [
      {
        CustomerPaymentPaidValue: {
          CoinType: {
            name: 'Bitcoin',
          },
        },
      },
    ],
  },
})

const alphaClue = alphaExtractor.buildClue()

// Property access with a delimited field path.
alphaClue['CustomerProfile.lastName'] // 'Doe'
alphaClue['CustomerPayments.0.CustomerPaymentPaidValue.CoinType.name'] // 'Bitcoin'

// A missing path resolves to null.
alphaClue['CustomerProfile.birthdate'] // null

// Call form with a fallback default value.
alphaClue('CustomerProfile.middleName', 'N/A') // 'N/A'
```

### Extracting many paths at once

```js
import { FieldPathValueExtractor } from '@openreachtech/mentsu-field-path-value-extractor'

const betaExtractor = FieldPathValueExtractor.create({
  root: {
    id: 100001,
    CustomerProfile: {
      lastName: 'Doe',
      firstName: 'John',
    },
  },
})

const betaExtractedValues = betaExtractor.bulkExtract({
  lookup: {
    customerId: 'id',
    lastName: 'CustomerProfile.lastName',
    middleName: ['CustomerProfile.middleName', 'N/A'], // tuple form: [fieldPath, defaultValue]
  },
})

// {
//   customerId: 100001,
//   lastName: 'Doe',
//   middleName: 'N/A',
// }
```

### Using a custom delimiter

```js
import { FieldPathValueExtractor } from '@openreachtech/mentsu-field-path-value-extractor'

const gammaExtractor = FieldPathValueExtractor.create({
  root: {
    CustomerProfile: {
      lastName: 'Smith',
    },
  },
  delimiter: ':',
})

const gammaClue = gammaExtractor.buildClue()

gammaClue['CustomerProfile:lastName'] // 'Smith'
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

### `FieldPathValueExtractor`

Class for extracting a value from an object using a delimited field path.

#### `.create()`

Factory method. Creates an instance.

Parameters (single object argument):

| key | type | required | description |
| :-- | :-- | :-- | :-- |
| `root` | `object` | yes | The source object (or array) to extract values from. |
| `delimiter` | `string` | no | The field path delimiter. Defaults to `'.'`. |

Returns: a `FieldPathValueExtractor` instance.

#### `#extractFieldPathValue()`

Extracts a single value from `root` using a delimited field path.

Parameters (single object argument):

| key | type | required | description |
| :-- | :-- | :-- | :-- |
| `fieldPath` | `string` | yes | The delimited field path to resolve against `root`. |

Returns: the value at the path, or `null` when any segment is missing.

#### `#buildClue()`

Builds a proxy that resolves delimited field paths against `root`.

Takes no arguments. Returns a proxy that supports two access styles:

- Property access — `clue['a.b.c']` returns the value at the path, or `null` when any
  segment is missing.
- Function call — `clue('a.b.c', defaultValue)` returns the value at the path, or
  `defaultValue` (default `null`) when the resolved value is nullish.

#### `#bulkExtract()`

Extracts multiple values at once from a lookup map.

Parameters (single object argument):

| key | type | required | description |
| :-- | :-- | :-- | :-- |
| `lookup` | `Record<string, string \| [string, *]>` | yes | A map whose keys are output keys. Each value is either a field path string, or a `[fieldPath, defaultValue]` tuple. |

Returns: an object with the same keys as `lookup`. Each key is mapped to the extracted
value, or to the tuple's `defaultValue` when the extracted value is nullish.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-field-path-value-extractor.git
cd mentsu-field-path-value-extractor
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
