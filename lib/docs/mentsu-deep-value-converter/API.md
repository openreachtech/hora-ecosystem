# API

Source: no `.d.ts` shipped (`package.json` has no `"types"` field; the `types/` directory
only contains `jest.d.ts`, unrelated to the public API); extracted from JSDoc in
`lib/DeepValueConverter.js`, `lib/DeepConverterSchemaBuilder.js`, `lib/ValueConverterScalar.js`,
`lib/converters/BaseValueConverter.js` and `lib/converters/concretes/*.js`.

## Exports (`index.js`)

No default export. Named exports only:

- `export { DeepValueConverter }`
- `export { DeepConverterSchemaBuilder }`
- `export { ValueConverterScalar }`
- `export { BaseValueConverter }`
- `export { BigNumberToFixedValueConverter }`
- `export { DateonlyToDateValueConverter }`
- `export { DateToDateonlyValueConverter }`

## Class: `DeepValueConverter`

Recursively converts values in a nested plain object, using a `converterHash` that mirrors
the object's shape and marks the properties to convert with `ValueConverter` classes.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.create({ converterHash })` — static factory method. Builds a schema from `converterHash`
  (via `DeepConverterSchemaBuilder`), wraps it in a `SchemaReifier` (from
  `@openreachtech/mentsu-schema`), and returns a new instance of `DeepValueConverter` (or a
  subclass, via `this`) holding that reifier.
- `#deepConvert({ value })` — instance method (`@public`). Calls
  `this.reifier.normalizeValue({ denormalizedValue: value })` and returns the converted
  object. `value` is expected to have the same nested shape as `converterHash`.

Other members (`.get:DeepConverterSchemaBuilderCtor`, `.get:SchemaReifierCtor`,
`.buildSchema()`, `.createDeepConverterSchemaBuilder()`, `.createSchemaReifier()`) are internal
(not `@public`) and are omitted here. They exist as overridable hooks for subclasses that want
to swap in a different schema-builder or reifier implementation.

## Class: `DeepConverterSchemaBuilder`

Recursively replaces `ValueConverter` classes with `ValueConverterScalar` classes inside a
`converterHash`, producing a schema object consumable by `mentsu-schema`'s `SchemaReifier`.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.create({ converterHash })` — static factory method.
- `#buildSchema()` — instance method (`@public`). Returns the schema built by recursively
  walking `this.converterHash` (via the internal `deepInflateScalar()`).

Traversal rule, precisely (from `deepInflateScalar()`, internal but load-bearing for
understanding `converterHash` authoring):

- A falsy `source` (e.g. `undefined`, `null`) is returned unchanged.
- A **plain object** (`value.constructor.name === 'Object'`) is recursed into: every entry is
  mapped through `deepInflateScalar()` again, preserving keys.
- A value whose `.prototype instanceof BaseValueConverter` (i.e. a `ValueConverter` class,
  including one returned by `.by(...)`) is replaced with `ValueConverterScalar.as(ValueConverterCtor)`.
- **Anything else — including arrays — is passed through unchanged.** In particular, arrays
  are *not* recursed into: a `ValueConverter` class nested inside an array value of
  `converterHash` will **not** be scalar-ified. Only plain-object nesting is supported for
  automatic recursion.

Other members (`.isPlainObject()`, `.get:Ctor`, `deepInflateScalar()`, `defineBoundScalar()`)
are internal (not `@public`) and are omitted from the bullet list above (though
`deepInflateScalar()`'s behavior is described above since it directly determines what shapes
of `converterHash` work).

## Class: `ValueConverterScalar`

No members are tagged `@public`; the surface below is the natural consumer-facing API
inferred from the class design. Extends `BaseScalar` from `@openreachtech/mentsu-schema`;
adapts a `ValueConverter` class (see `BaseValueConverter`) so it can be used as a
`mentsu-schema` scalar.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `#instanceMethod()` | instance method |

- `.as(ValueConverterCtor)` — static method. Returns a subclass of `ValueConverterScalar`
  bound to `ValueConverterCtor`, memoized via `BoundCtorRegistry` (the same
  `ValueConverterCtor` argument always yields the identical class reference). This is what
  `DeepConverterSchemaBuilder` calls internally to turn a `ValueConverter` class found in a
  `converterHash` into a schema-compatible scalar; it can also be called directly when
  building a `mentsu-schema` schema by hand.
- `.get:ValueConverterCtor` — abstract static getter, supplied by the subclass returned from
  `.as(...)`. Throws `Error` if accessed on `ValueConverterScalar` itself (not inherited).
- `.createValueConverter(params)` — static method. Shorthand for
  `this.ValueConverterCtor.create(params)`.
- `#normalizeValue()` — instance method, override of `BaseScalar#normalizeValue()`. Returns
  `null` if `this.denormalizedValue === null`; otherwise instantiates the bound
  `ValueConverter` with `sourceValue: this.denormalizedValue` and returns
  `converter.convertValue()` if `converter.canConvertValue()` is `true`, else `null`. Invoked
  internally by the `mentsu-schema` reifier machinery, not normally called directly.
- `#hasAvailableNormalizedValue()` — instance method, override. `false` if
  `denormalizedValue === null`; otherwise delegates to `converter.canConvertValue()`.

## Class: `BaseValueConverter`

Abstract base class for writing value converters (`SV` source value → `CV` converted value).
`BigNumberToFixedValueConverter`, `DateonlyToDateValueConverter` and
`DateToDateonlyValueConverter` all extend this class.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `#instanceMethod()` | instance method |

- `.create({ sourceValue })` — static factory method.
- `.by(argument)` — static method. Declares (and memoizes, via `BoundCtorRegistry`) a
  subclass with `.get:boundArgument` bound to `argument`. This is the standard mechanism
  concrete converters use to accept constructor-time configuration (e.g.
  `BigNumberToFixedValueConverter.by({ decimalPlace: 2 })`) without a public constructor
  parameter for it. The result is a `ValueConverter` class, suitable for placing directly in a
  `converterHash`.
- `.get:boundArgument` — abstract static getter; throws `Error` unless the class was produced
  by `.by(...)`.
- `#canConvertValue()` — instance method (`@public`), abstract. Must be overridden; throws
  `Error` otherwise.
- `#convertValue()` — instance method (`@public`), abstract. Must be overridden; throws
  `Error` otherwise.

## Class: `BigNumberToFixedValueConverter`

Extends `BaseValueConverter<BigNumber, string>`. Converts `bignumber.js` `BigNumber`
instances to fixed-point strings.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.by({ decimalPlace, roundingMode })` — static method (inherited from `BaseValueConverter`).
  Binds `decimalPlace` (number of decimal places) and/or `roundingMode` (a
  `BigNumber.RoundingMode` value), both optional, for use by `BigNumber#toFixed()`.
- `.create({ sourceValue })` — static factory method (inherited).
- `#canConvertValue()` — instance method (`@public`). `true` only if `sourceValue` is a
  `BigNumber` instance (`BigNumber.isBigNumber(sourceValue)`) and `sourceValue.isFinite()`.
- `#convertValue()` — instance method (`@public`). Returns `null` if not convertible;
  otherwise `sourceValue.toFixed(decimalPlace, roundingMode)`, where `decimalPlace` /
  `roundingMode` come from the bound argument (`.by(...)`) and fall back to `undefined` (i.e.
  `BigNumber.js`'s own defaults) when not bound.

The static getters `.get:decimalPlace` / `.get:roundingMode` are internal accessors over
`.get:boundArgument` and are not called directly by consumers; omitted from the list above.

## Class: `DateonlyToDateValueConverter`

Extends `BaseValueConverter<string, Date>`. Converts date-only strings (`yyyy-mm-dd`) to
`Date` instances, handling DST-transition days correctly.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.by({ timezone })` — static method (inherited). Binds an IANA timezone identifier
  (defaults to `'UTC'` when not bound) used when computing local midnight.
- `.create({ sourceValue })` — static factory method (inherited).
- `#canConvertValue()` — instance method (`@public`). `true` only if `sourceValue` is a
  string matching `/^\d{4}-\d{2}-\d{2}$/u` **and** the parsed year/month/day round-trip
  exactly through `Date.UTC` (so e.g. `'2024-02-30'` is rejected).
- `#convertValue()` — instance method (`@public`). Returns `null` if not convertible;
  otherwise a `Date` representing local midnight of that date in the bound timezone. The
  timestamp is computed with a **two-pass DST-aware offset refinement**: it first estimates
  the timezone offset at UTC midnight, then recomputes the offset using that estimate applied
  to the timestamp, so days that fall exactly on a DST transition still resolve to the correct
  local midnight.

Internal helpers (`.calculateLocalMidnightTimestamp()`, `.calculateMillisecondTimezoneOffset()`,
`.buildDateTimePartHash()`, `.createIntlDateTimeFormat()`, `.get:timezone`,
`#isDateonlyFormat()`) are not `@public` and are omitted from the list above, though the
DST-handling behavior they implement is described above since it is not obvious from the
method names alone.

## Class: `DateToDateonlyValueConverter`

Extends `BaseValueConverter<Date, string>`. Converts `Date` instances to date-only strings
(`yyyy-mm-dd`).

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.by({ timezone })` — static method (inherited). Binds an IANA timezone identifier
  (defaults to `'UTC'` when not bound).
- `.create({ sourceValue })` — static factory method (inherited).
- `#canConvertValue()` — instance method (`@public`). `true` only if `sourceValue instanceof
  Date` and it is not an invalid date (`!Number.isNaN(sourceValue.getTime())`).
- `#convertValue()` — instance method (`@public`). Returns `null` if not convertible;
  otherwise formats `sourceValue` in the bound timezone via
  `new Intl.DateTimeFormat('en-CA', { timeZone: timezone, dateStyle: 'short' }).format(sourceValue)`,
  which yields `yyyy-mm-dd`.

The static `.get:timezone` getter and `.createIntlDateTimeFormat()` are internal and omitted
from the list above.

## Usage

```js
import {
  DeepValueConverter,
  BigNumberToFixedValueConverter,
  DateToDateonlyValueConverter,
} from '@openreachtech/mentsu-deep-value-converter'
import BigNumber from 'bignumber.js'

const converter = DeepValueConverter.create({
  converterHash: {
    price: BigNumberToFixedValueConverter.by({ decimalPlace: 2 }),
    createdOn: DateToDateonlyValueConverter.by({ timezone: 'Asia/Tokyo' }),
    nested: {
      total: BigNumberToFixedValueConverter.by({ decimalPlace: 0 }),
    },
  },
})

converter.deepConvert({
  value: {
    price: new BigNumber('19.999'),
    createdOn: new Date('2026-08-04T12:00:00Z'),
    nested: {
      total: new BigNumber('1000'),
    },
  },
})
// -> {
//   price: '20.00',
//   createdOn: '2026-08-04',
//   nested: { total: '1000' },
// }
```

To write a custom converter, extend `BaseValueConverter` and override `canConvertValue()` /
`convertValue()`, using `.by(...)` if the converter needs bound configuration:

```js
import { BaseValueConverter } from '@openreachtech/mentsu-deep-value-converter'

class UpperCaseValueConverter extends BaseValueConverter {
  canConvertValue () {
    return typeof this.sourceValue === 'string'
  }

  convertValue () {
    return this.canConvertValue()
      ? this.sourceValue.toUpperCase()
      : null
  }
}
```
