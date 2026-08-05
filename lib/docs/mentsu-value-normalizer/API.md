# API

Source: no `.d.ts` shipped (`package.json` has no `"types"` field, and `types/jest.d.ts` is only a Jest ambient-types shim, not the package's own API types); extracted from JSDoc in `lib/BaseValueNormalizer.js` and `lib/concretes/*.js`.

## Exports (`index.js`)

- `export { BaseValueNormalizer }` — named export of the abstract base class (no default export).
- `export { DateValueNormalizer }` — named export, concrete subclass that normalizes to `Date`.
- `export { IntegerValueNormalizer }` — named export, concrete subclass that normalizes to an integer `number`.
- `export { NumberValueNormalizer }` — named export, concrete subclass that normalizes to `number`.
- `export { ACCEPTABLE_TYPE }` — named export, a constant object of `Symbol` values used to configure acceptable input types.

## Class: `BaseValueNormalizer`

Abstract base class of all value normalizers. Wraps a raw `value` plus the list of JS types it is allowed to come in as (`acceptableTypes`), and exposes a single `@public` entry point, `normalizeValue()`, that returns either the normalized value or `null`.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ value, acceptableTypes = this.acceptableTypes })` — static factory method. Returns an instance of `BaseValueNormalizer` (or subclass, via `this`).
- `.from(types)` — static factory method. Returns a derived (bound) subclass of `this` whose `.get:acceptableTypes` is overridden to return `types`. Internally uses `@openreachtech/mentsu-bound-ctor-registry` (`BoundCtorRegistry`) to memoize the derived class per `types` array, so calling `.from(sameTypes)` again returns the same derived class rather than creating a new one each time.
- `#normalizeValue()` — instance method (`@public`). Returns the normalized value (or `null`), computing it on first call via `#toNormalizedValue()` and caching the result in a per-instance `WeakMap` (`.normalizedValuePool`) so subsequent calls on the same instance return the cached value instead of recomputing.

Other members (`.normalizedValuePool` static property, `.get:acceptableTypes` abstract static getter, `#get:Ctor`, `#ensureNormalizedValue()`, `#hasNormalizedValue()`, `#setNormalizedValue()`, `#extractNormalizedValue()`, `#toNormalizedValue()`, `#canNormalize()`, `#isAcceptableTypeValue()`) are internal (not `@public`) and are omitted from the member list above. However, `#toNormalizedValue()`, `#canNormalize()`, and `#isAcceptableTypeValue()` form the abstract contract that each concrete subclass overrides, and that contract is exactly what determines the normalization behavior, so it is summarized here:

- `#isAcceptableTypeValue()` — determines whether `this.value`'s JS type is in `this.acceptableTypes`. The base implementation simply returns `true` (accepts anything); each concrete subclass below overrides it to actually check `typeof this.value` (with `value === null` mapped to `ACCEPTABLE_TYPE.NULL`) against `this.acceptableTypes`.
- `#canNormalize()` — abstract; must return whether `this.value` can currently be converted. Base implementation throws `Error` if not overridden.
- `#toNormalizedValue()` — abstract; must return the actual converted value, or `null` when `#canNormalize()` is false. Base implementation throws `Error` if not overridden.

## Class: `DateValueNormalizer`

`extends BaseValueNormalizer<Date>`. No additional `@public` members; consumers call the inherited `#normalizeValue()`.

- Acceptable types (`.get:acceptableTypes` override): `ACCEPTABLE_TYPE.STRING`, `ACCEPTABLE_TYPE.NUMBER`. A `string` or `number` value is type-acceptable; anything else (including `null`, since `ACCEPTABLE_TYPE.NULL` is not in this list) is not.
- Normalization performed: `#toNormalizedValue()` returns `new Date(this.value)` when `#canNormalize()` is true, otherwise `null`. No trimming or casing is applied — the value is passed straight into the `Date` constructor.
- `#canNormalize()` override: true only when the value's type is acceptable AND `new Date(this.value).getTime()` is not `NaN` (i.e. it parses to a valid date).

## Class: `NumberValueNormalizer`

`extends BaseValueNormalizer<number>`. No additional `@public` members; consumers call the inherited `#normalizeValue()`.

- Acceptable types (`.get:acceptableTypes` override): `ACCEPTABLE_TYPE.NUMBER`, `ACCEPTABLE_TYPE.BIGINT`. Only actual JS `number` or `bigint` values are type-acceptable — a numeric string such as `'42'` is *not* type-acceptable (its `typeof` is `'string'`, which isn't in this list), so it normalizes to `null`.
- Normalization performed: `#toNormalizedValue()` returns `Number(this.value)` when `#canNormalize()` is true, otherwise `null` (this coerces a `bigint` down to `number`).
- `#canNormalize()` override: true only when the value's type is acceptable AND `Number(this.value)` is not `NaN`.

## Class: `IntegerValueNormalizer`

`extends NumberValueNormalizer`. No additional `@public` members; consumers call the inherited `#normalizeValue()`.

- Acceptable types: inherited unchanged from `NumberValueNormalizer` (`ACCEPTABLE_TYPE.NUMBER`, `ACCEPTABLE_TYPE.BIGINT`) — not overridden.
- Normalization performed: `#toNormalizedValue()` is inherited from `NumberValueNormalizer` (returns `Number(this.value)`).
- `#canNormalize()` override: true only when the value's type is acceptable (per the inherited check) AND `Number.isInteger(Number(this.value))` — i.e. it additionally rejects non-integer numbers (like `4.2`) that `NumberValueNormalizer` would otherwise accept.

## Constant: `ACCEPTABLE_TYPE`

Not a class — a plain object mapping type names to unique `Symbol` values, used to build the `acceptableTypes` array passed to `.create()` / `.from()`:

`STRING`, `NUMBER`, `BIGINT`, `BOOLEAN`, `SYMBOL`, `UNDEFINED`, `OBJECT`, `FUNCTION`, `NULL`.

`NULL` is a synthetic entry (there is no `typeof null === 'null'` in JS) — the normalizers' `#isAcceptableTypeValue()` checks map `value === null` to `ACCEPTABLE_TYPE.NULL` explicitly, so it must be added to `acceptableTypes` if `null` should be treated as acceptable.

## Usage

```js
import {
  DateValueNormalizer,
  IntegerValueNormalizer,
  NumberValueNormalizer,
  BaseValueNormalizer,
  ACCEPTABLE_TYPE,
} from '@openreachtech/mentsu-value-normalizer'

const dateNormalizer = DateValueNormalizer.create({ value: '2024-01-01' })
dateNormalizer.normalizeValue() // -> Date instance for 2024-01-01

const numberNormalizer = NumberValueNormalizer.create({ value: 42 })
numberNormalizer.normalizeValue() // -> 42

const brokenNumberNormalizer = NumberValueNormalizer.create({ value: '42' })
brokenNumberNormalizer.normalizeValue() // -> null (string is not an acceptable type)

const integerNormalizer = IntegerValueNormalizer.create({ value: 4.2 })
integerNormalizer.normalizeValue() // -> null (4.2 is not an integer)

// Deriving a custom-typed normalizer via BaseValueNormalizer.from()
class TrimmedStringNormalizer extends BaseValueNormalizer.from([ACCEPTABLE_TYPE.STRING]) {
  canNormalize () {
    return this.isAcceptableTypeValue()
  }

  toNormalizedValue () {
    return this.canNormalize()
      ? this.value.trim()
      : null
  }
}

TrimmedStringNormalizer.create({ value: '  hello  ' })
  .normalizeValue() // -> 'hello'
```
