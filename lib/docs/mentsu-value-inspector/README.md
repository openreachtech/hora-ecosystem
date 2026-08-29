# @openreachtech/mentsu-value-inspector

Readable predicate methods for inspecting JavaScript values (numbers, integers, dates), backed by pluggable normalizers.

Each inspector wraps a single value and exposes self-describing checks — `isNumber()`, `isPositiveNumberLike()`, `isDate()`, and so on — so scattered, error-prone type checks can be replaced with a consistent API.

## Concept

Inspectors provide two families of predicates:

- **Strict** predicates check the raw JavaScript value as-is (`isNumber()`, `isInteger()`, `isDate()`).
- **`*Like`** predicates first normalize the value, so loosely-typed inputs such as numeric strings are accepted (`isNumberLike()`, `isIntegerLike()`, `isDateLike()`).

Normalization is delegated to a normalizer from [`@openreachtech/mentsu-value-normalizer`](https://github.com/openreachtech/mentsu-value-normalizer). A default normalizer is created per inspector, but you may inject your own.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-value-inspector
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

```js
import {
  NumberValueInspector,
  IntegerValueInspector,
  DateValueInspector,
} from '@openreachtech/mentsu-value-inspector'

// Numbers: strict vs. *Like
const numberInspector = NumberValueInspector.create({ value: '42' })

numberInspector.isNumber() // false (the raw value is a string)
numberInspector.isNumberLike() // true  (the string is normalized to a number)

NumberValueInspector.create({ value: -3 }).isNegativeNumber() // true
NumberValueInspector.create({ value: '1.5' }).isPositiveNumberLike() // true

// Integers
const integerInspector = IntegerValueInspector.create({ value: '10' })

integerInspector.isInteger() // false (the raw value is a string)
integerInspector.isIntegerLike() // true
IntegerValueInspector.create({ value: 10.5 }).isSafeInteger() // false

// Dates
const dateInspector = DateValueInspector.create({ value: '2020-01-01' })

dateInspector.isDate() // false (the raw value is a string)
dateInspector.isDateLike() // true
DateValueInspector.create({ value: new Date('invalid') }).isDate() // false
```

## API

See the [API reference](https://github.com/openreachtech/mentsu-value-inspector/blob/main/docs/en/api/index.md).

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-value-inspector.git
cd mentsu-value-inspector
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
