# Mentsu Value Normalizer

Normalize loosely-typed input values into a canonical form, guarding on the value's runtime type before conversion.

## Overview

`BaseValueNormalizer` wraps a raw value together with the set of runtime types it is
willing to accept. When you ask it to normalize, it first checks the value's type against
the acceptable types, then converts it. If the value is not acceptable — or cannot be
converted — normalization yields `null` instead of throwing.

The package ships ready-made normalizers (`NumberValueNormalizer`,
`IntegerValueNormalizer`, `DateValueNormalizer`), and `BaseValueNormalizer` is designed to
be extended so you can implement your own.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-value-normalizer
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### Normalize with a provided normalizer

Each concrete normalizer declares its own acceptable types. `NumberValueNormalizer`
accepts `number` and `bigint`, and converts them with `Number()`.

```js
import { NumberValueNormalizer } from '@openreachtech/mentsu-value-normalizer'

const numberNormalizer = NumberValueNormalizer.create({
  value: 42n,
})

const normalizedNumber = numberNormalizer.normalizeValue() // 42
```

When the value's type is not among the acceptable types, normalization returns `null` —
even if the value could otherwise be converted.

```js
import { NumberValueNormalizer } from '@openreachtech/mentsu-value-normalizer'

// A string is not an acceptable type for NumberValueNormalizer.
const rejectedNumber = NumberValueNormalizer.create({
  value: '42',
})
  .normalizeValue() // null
```

`DateValueNormalizer` accepts `string` and `number`, and converts them with `new Date()`.

```js
import { DateValueNormalizer } from '@openreachtech/mentsu-value-normalizer'

const dateNormalizer = DateValueNormalizer.create({
  value: '2026-07-08',
})

const normalizedDate = dateNormalizer.normalizeValue() // Date instance
```

### Bind a custom set of acceptable types

Use `.from()` to derive a normalizer bound to a different set of acceptable types. Here we
also accept `string`, so a numeric string passes the type guard and gets converted.

```js
import {
  NumberValueNormalizer,
  ACCEPTABLE_TYPE,
} from '@openreachtech/mentsu-value-normalizer'

const LooseNumberNormalizer = NumberValueNormalizer.from([
  ACCEPTABLE_TYPE.NUMBER,
  ACCEPTABLE_TYPE.BIGINT,
  ACCEPTABLE_TYPE.STRING,
])

const normalizedNumber = LooseNumberNormalizer.create({
  value: '42',
})
  .normalizeValue() // 42
```

### Implement your own normalizer

Extend `BaseValueNormalizer` and override the acceptable types plus the conversion logic.
The three members below form the implementation contract:

- `static get acceptableTypes ()` — the runtime types this normalizer accepts.
- `canNormalize ()` — whether the current value can be normalized.
- `toNormalizedValue ()` — how to convert the value once it is normalizable.

```js
import {
  BaseValueNormalizer,
  ACCEPTABLE_TYPE,
} from '@openreachtech/mentsu-value-normalizer'

class UpperCaseValueNormalizer extends BaseValueNormalizer {
  /** @override */
  static get acceptableTypes () {
    return [
      ACCEPTABLE_TYPE.STRING,
    ]
  }

  /** @override */
  canNormalize () {
    return this.isAcceptableTypeValue()
  }

  /** @override */
  toNormalizedValue () {
    if (!this.canNormalize()) {
      return null
    }

    return String(this.value)
      .toUpperCase()
  }
}

const normalizedText = UpperCaseValueNormalizer.create({
  value: 'hello',
})
  .normalizeValue() // 'HELLO'
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

### BaseValueNormalizer

Abstract base class. Use it directly by extending it, or use one of the provided
normalizers below.

| member | description |
| :-- | :-- |
| `.create({ value, acceptableTypes })` | Factory method. Creates an instance for `value`. `acceptableTypes` defaults to the class's `acceptableTypes`. |
| `.from(types)` | Derives a subclass whose `acceptableTypes` is bound to `types`. Calling it again with the same `types` array reference returns the same subclass. |
| `.get:acceptableTypes` | The runtime types this normalizer accepts. Abstract on the base class — override it in a subclass (or bind it via `.from()`). |
| `#normalizeValue()` | Returns the normalized value, or `null` when the value is not acceptable or cannot be converted. Repeated calls on the same instance reuse the first result. |
| `#toNormalizedValue()` | Converts the value to its normalized form. Abstract — override it in a subclass. |
| `#canNormalize()` | Whether the current value can be normalized. Abstract — override it in a subclass. |
| `#isAcceptableTypeValue()` | Whether the value's runtime type is among the acceptable types. Override it to customize the type guard. |

### Provided normalizers

| class | acceptable types | normalized value |
| :-- | :-- | :-- |
| `NumberValueNormalizer` | `number`, `bigint` | `Number(value)` |
| `IntegerValueNormalizer` | `number`, `bigint` | `Number(value)`, only when it is an integer |
| `DateValueNormalizer` | `string`, `number` | `new Date(value)` |

### ACCEPTABLE_TYPE

A map of `Symbol` constants used to declare acceptable types:
`STRING`, `NUMBER`, `BIGINT`, `BOOLEAN`, `SYMBOL`, `UNDEFINED`, `OBJECT`, `FUNCTION`,
`NULL`.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-value-normalizer.git
cd mentsu-value-normalizer
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
