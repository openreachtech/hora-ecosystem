# @openreachtech/mentsu-deep-value-converter

Recursively converts values in a nested object using declarative ValueConverter mappings.

## Overview

`mentsu-deep-value-converter` lets you declare, once, how each leaf value inside a
nested object should be converted, and then apply that declaration to any object with
the same shape.

You describe the conversion as a **converter hash**: a plain object that mirrors the
shape of your data, whose leaves are configured `ValueConverter` classes. A
`DeepValueConverter` walks the input object along that shape and converts every matching
leaf. Leaves that cannot be converted become `null`, and unmapped leaves are left
untouched.

The package ships with ready-to-use converters (BigNumber, date-only string, and `Date`
conversions) and exposes an abstract base class so you can write your own.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-deep-value-converter
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

Build a converter hash whose leaves are configured converters (each built-in converter
is configured with `.by()`), create a `DeepValueConverter`, then call `deepConvert()`:

```js
import {
  DeepValueConverter,
  DateToDateonlyValueConverter,
  DateonlyToDateValueConverter,
} from '@openreachtech/mentsu-deep-value-converter'

const alphaConverter = DeepValueConverter.create({
  converterHash: {
    user: {
      pointsOn: DateToDateonlyValueConverter.by({
        timezone: 'Asia/Tokyo',
      }),
      profile: {
        savedOn: DateonlyToDateValueConverter.by({
          timezone: 'UTC',
        }),
      },
    },
  },
})

const alphaConvertedValue = alphaConverter.deepConvert({
  value: {
    user: {
      pointsOn: new Date('2026-03-01T00:00:00.000Z'),
      profile: {
        savedOn: '2026-03-20',
      },
    },
  },
})

// alphaConvertedValue:
// {
//   user: {
//     pointsOn: '2026-03-01',                          // Date -> 'yyyy-mm-dd'
//     profile: {
//       savedOn: new Date('2026-03-20T00:00:00.000Z'), // 'yyyy-mm-dd' -> Date
//     },
//   },
// }
```

A leaf whose value cannot be converted (wrong type, invalid format, etc.) becomes
`null`. Passing a nullish `value` returns `null`.

### Built-in converters

- `BigNumberToFixedValueConverter` — `BigNumber` to a fixed-point string.
- `DateonlyToDateValueConverter` — a `yyyy-mm-dd` string to a `Date`.
- `DateToDateonlyValueConverter` — a `Date` to a `yyyy-mm-dd` string.

You can also write your own converter by extending `BaseValueConverter`. See the API
reference for details.

## API

See the [API reference](https://github.com/openreachtech/mentsu-deep-value-converter/blob/main/docs/en/api/index.md).

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-deep-value-converter.git
cd mentsu-deep-value-converter
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
