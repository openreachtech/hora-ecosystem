# API

Source: no `.d.ts` shipped (`package.json` has no `"types"` field, and the bundled
`types/jest.d.ts` is unrelated Jest test-matcher typing, not this package's API);
extracted from JSDoc in `lib/ValueInspector.js`, `lib/numbers/NumberValueInspector.js`,
`lib/numbers/IntegerValueInspector.js`, and `lib/dates/DateValueInspector.js`.

## Exports (`index.js`)

- `export { ValueInspector, NumberValueInspector, IntegerValueInspector, DateValueInspector }`
  — named exports of four classes, each re-exported from its own file's default export
  (`./lib/ValueInspector.js`, `./lib/numbers/NumberValueInspector.js`,
  `./lib/numbers/IntegerValueInspector.js`, `./lib/dates/DateValueInspector.js`). No
  default export from `index.js` itself.

> **Note on `@public`:** Only one method in this package (`ValueInspector#normalizeValue()`)
> carries an explicit `@public` JSDoc tag. None of the `isXxx()` presence/type/shape
> checks below are tagged `@public`. Since those checks are the entire reason this
> package exists (it is a "value inspector"), this document treats them as the natural
> consumer-facing surface and documents all of them, rather than omitting them the way
> untagged internal helpers are omitted for other packages in this catalog. Nothing
> below is a private/underscored member or a helper that exists purely for internal
> bookkeeping.

## Class: `ValueInspector`

Base class. Wraps a `value` plus a `normalizer` instance and exposes nullish/presence
checks. Subclasses override the normalizer to add type-specific "-like" checks.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ value, normalizer = this.createNormalizer({ value }) })` — static factory method. Returns an instance of `ValueInspector` (or subclass, via `this`). If `normalizer` is omitted, one is built via `this.createNormalizer({ value })`.
- `.get:NormalizerCtor` — static getter. Returns the normalizer constructor to use; on the base class this is `SentinelValueNormalizer` (a pass-through "null object" normalizer — its `canNormalize()` always returns `true` and `toNormalizedValue()` returns the value unchanged, so it performs no type checking). Subclasses override this getter to plug in a real normalizer.
- `.createNormalizer({ value })` — static method. Returns `this.NormalizerCtor.create({ value })`.
- `#value` — instance property. The raw value passed at construction.
- `#normalizer` — instance property. The normalizer instance passed at construction (or the one built by `createNormalizer`).
- `#normalizeValue()` — instance method (`@public`). Delegates to `this.normalizer.normalizeValue()` and returns the normalized value (or `null` if the normalizer can't normalize the value).
- `#isNullish()` — instance method. `true` if the value is `null` or `undefined`.
- `#isNull()` — instance method. `true` if the value `=== null`.
- `#isUndefined()` — instance method. `true` if the value `=== undefined`.
- `#isDefined()` — instance method. `true` if the value is not `undefined` (note: `null` counts as "defined").
- `#isPresent()` — instance method. `true` if the value is neither `null` nor `undefined` (`!isNullish()`).

## Class: `NumberValueInspector`

Extends `ValueInspector`. Adds number-specific checks. Its normalizer
(`NumberValueNormalizer` from `@openreachtech/mentsu-value-normalizer`) accepts `number`
or `string` typed values and converts them via `Number(value)`, returning `null` if the
value's type isn't accepted or the conversion is `NaN`.

- `.createNormalizer({ value })` — static method (override). Returns `NumberValueNormalizer.create({ value, acceptableTypes: [ACCEPTABLE_TYPE.NUMBER, ACCEPTABLE_TYPE.STRING] })`.
- `.get:NormalizerCtor` — static getter (override). Returns `NumberValueNormalizer`.
- `#isNumberLike()` — instance method. `true` if `Number.isFinite(this.normalizeValue())` — i.e. the value is a number or a numeric string that normalizes to a finite number.
- `#isNumber()` — instance method. `true` if `typeof value === 'number' && isFinite(value)` (checks the raw value's type directly, no normalization).
- `#isPositiveNumber()` — instance method. `true` if `isNumber()` and the raw value `> 0`.
- `#isPositiveNumberLike()` — instance method. `true` if the normalized value is finite and `> 0`.
- `#isNegativeNumber()` — instance method. `true` if `isNumber()` and the raw value `< 0`.
- `#isNegativeNumberLike()` — instance method. `true` if the normalized value is finite and `< 0`.
- `#isZero()` — instance method. `true` if the raw value `=== 0`.
- `#isNaN()` — instance method. `true` if `Number.isNaN(value)` (checks the raw value; not normalized).
- `#isFinite()` — instance method. `true` if `Number.isFinite(value)` (checks the raw value; not normalized).
- `#isInfinite()` — instance method. `true` if the raw value `=== Infinity` or `=== -Infinity`.

## Class: `IntegerValueInspector`

Extends `NumberValueInspector` (and transitively `ValueInspector`). Adds
integer-specific checks on top of the inherited number checks.

- `#isInteger()` — instance method. `true` if `Number.isInteger(value)` (checks the raw value).
- `#isIntegerLike()` — instance method. `true` if `Number.isInteger(this.normalizeValue())` — i.e. the raw value or a numeric string that normalizes to an integer.
- `#isSafeInteger()` — instance method. `true` if `Number.isSafeInteger(value)` (checks the raw value).
- `#isSafeIntegerLike()` — instance method. `true` if `Number.isSafeInteger(this.normalizeValue())`.

## Class: `DateValueInspector`

Extends `ValueInspector`. Adds date-specific checks. Its normalizer
(`DateValueNormalizer` from `@openreachtech/mentsu-value-normalizer`) accepts `string` or
`number` typed values and converts them via `new Date(value)`, returning `null` if the
value's type isn't accepted or the resulting date is invalid.

- `.get:NormalizerCtor` — static getter (override). Returns `DateValueNormalizer`.
- `#isDate()` — instance method. `true` if the raw value `instanceof Date` and `!Number.isNaN(value.getTime())` — i.e. it is already a valid `Date` instance (not a string or number).
- `#isDateLike()` — instance method. `true` if `this.normalizeValue() !== null` — i.e. the raw value is a valid `Date` instance, or a string/number that `new Date(...)` can parse into a valid date.

## Usage

```js
import {
  ValueInspector,
  NumberValueInspector,
  IntegerValueInspector,
  DateValueInspector,
} from '@openreachtech/mentsu-value-inspector'

// Presence checks (base class)
const presenceInspector = ValueInspector.create({ value: undefined })
presenceInspector.isNullish() // true
presenceInspector.isPresent() // false

// Number checks: raw-type vs. normalized ("-like") checks
const numberInspector = NumberValueInspector.create({ value: '42' })
numberInspector.isNumber() // false, '42' is a string
numberInspector.isNumberLike() // true, '42' normalizes to 42

// Integer checks
const integerInspector = IntegerValueInspector.create({ value: 3.0 })
integerInspector.isInteger() // true
integerInspector.isSafeInteger() // true

// Date checks: raw-type vs. normalized ("-like") checks
const dateInspector = DateValueInspector.create({ value: '2026-08-04' })
dateInspector.isDate() // false, the raw value is a string, not a Date instance
dateInspector.isDateLike() // true, the string parses to a valid Date

const dateInstanceInspector = DateValueInspector.create({ value: new Date('invalid') })
dateInstanceInspector.isDate() // false, Date instance but getTime() is NaN
```
