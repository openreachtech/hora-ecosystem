# API

Source: `lib/SchemaReifier.js`, `lib/DeepSchemaInflater.js`, `lib/scalars/BaseScalar.js`, `lib/scalars/scalar-hash.js`, `lib/scalars/concretes/*.js` (no `.d.ts` shipped; `package.json` has no `"types"` field, and the only `.d.ts` under `types/` — `types/schema.d.ts` — merely declares global helper types (`SchemaType.Scalar`, `SchemaType.ScalarCtor`, ...) via `declare global`, not the actual class shapes, so it isn't a usable API source). Only `BaseScalar` tags any members with `@public` (`normalizeValue`, `denormalizeValue`, `isValidNormalizedValue`, `isValidDenormalizedValue`); no other class in this package uses the tag. The surface below therefore documents those `@public` members plus the natural consumer-facing surface inferred from the class design and from how the classes consume each other (e.g. `SchemaReifier`, `CompositeScalar`, and `UnionScalar` all call `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` on scalar instances, so those are documented too even though untagged). Internal helper statics/methods used only for schema-building or scalar-ctor normalization (e.g. `buildSchema`, `buildArraySchema`, `buildObjectSchema`, `normalizeScalarCtor`, `isCtorValue`, `isPlainObject`, `isArrayScalar`, `resolveScalarCtor`, `resolveScalarCtorFromArray`, `deepNormalizeValueAsArray`/`deepNormalizeValueAsObject`, `deepDenormalizeValueAsArray`/`deepDenormalizeValueAsObject`) are omitted as implementation details, not part of the intended consumer surface.

## Concept

Every scalar class describes a single value and knows how to convert between two representations:

- **denormalized value** — the external/wire form (typically a JSON-safe primitive: `string`, `number`, `boolean`, plain object/array).
- **normalized value** — the internal form used by application code (e.g. `Date`, `bigint`, a `BigNumber` instance, a nested object/array of other scalars' normalized values, or an arbitrary "constraint" value object).

`#normalizeValue()` converts denormalized → normalized. `#denormalizeValue()` converts normalized → denormalized. `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` report whether the currently-held value is acceptable for that scalar, as a boolean.

**Validation never throws for bad data.** Invalid input makes `normalizeValue()`/`denormalizeValue()` return `null` and makes `isFulfilledNormalizedValue()`/`isFulfilledDenormalizedValue()` return `false` — there are no thrown validation errors. The only `Error`s thrown by this package are programmer/config errors: calling an abstract getter that was never bound (`SchemaReifier.rawSchema`, `CompositeScalar.boundSchema`, `RecordScalar.boundSchema`, `UnionScalar.boundSchemas`, `NodeScalar.ConstraintCtor` all throw `Error('<Name>.get:<member> must be inherited'/'must be overridden')` if used without going through `.as()`/`.of()`/`.from()`/`.each()`), or calling `BaseScalar#normalizeValue()`/`#denormalizeValue()` directly without a subclass override (`Error('<Name>#normalizeValue() must be inherited')`).

## Exports (`index.js`)

- `export { SchemaReifier }` — root/entry class used to bind and reify a whole schema.
- `export { DeepSchemaInflater }` — utility that rewrites a schema tree, replacing bare `NodeScalar`-family constructors with `.as(constraint)`-bound versions via a lookup `Map`.
- `export { BaseScalar }` — abstract base class for all scalars.
- `export { BigIntScalar, BigNumberScalar, BooleanScalar, CompositeScalar, DateonlyScalar, DatetimeScalar, DoubleScalar, IntegerScalar, KeywordScalar, NodeScalar, PatternScalar, RecordScalar, SentinelScalar, TextScalar, ToCaseKeywordScalar, UnionScalar }` — the 16 concrete scalar classes, each a named export of its full class name.
- `export const ScalarHash` — a plain object mapping short aliases to the same 16 scalar classes: `{ BigNum: BigNumberScalar, Bool: BooleanScalar, Composite: CompositeScalar, Dateonly: DateonlyScalar, Datetime: DatetimeScalar, Double: DoubleScalar, Integer: IntegerScalar, Long: BigIntScalar, Node: NodeScalar, Pattern: PatternScalar, Record: RecordScalar, Keyword: KeywordScalar, Sentinel: SentinelScalar, Text: TextScalar, ToCaseKeyword: ToCaseKeywordScalar, Union: UnionScalar }`.
- No default export.

## Class: `BaseScalar`

Abstract base class for every scalar. Not meant to be used directly — always extended.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `#normalizedValue`, `#denormalizedValue`, `#isNullable` — instance properties set by the constructor (normally not called directly — use `.create()`).
- `.create({ normalizedValue = null, denormalizedValue = null, isNullable = this.isNullable } = {})` — static factory method. Returns `new this({ ... })`, so calling `.create()` on any subclass returns an instance of that subclass.
- `.get:isNullable` — static getter, defaults to `false`.
- `.get:asNullable` — static getter. Returns a derived subclass of `this` with `isNullable` overridden to `true` (memoized so the derived class keeps `this`'s own `name`). Use this to allow `null` denormalized/normalized values for an otherwise-required scalar.
- `#get:Ctor` — instance getter, returns `this.constructor` (typed as the scalar's own constructor).
- `#normalizeValue()` — instance method, `@public`. Abstract; throws unless overridden by a subclass.
- `#denormalizeValue()` — instance method, `@public`. Abstract; throws unless overridden by a subclass.
- `#isValidNormalizedValue()` / `#isValidDenormalizedValue()` — instance methods, `@public`. Return `true` immediately if `isNullable`; otherwise delegate to `#hasAvailableNormalizedValue()` / `#hasAvailableDenormalizedValue()` (subclass-defined type/format checks).
- `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` — instance methods (untagged, but this is the method schema-consuming code actually calls). Default implementation calls the matching `isValid*` method above; `CompositeScalar`, `RecordScalar`, and `UnionScalar` override these directly to add structural/deep checks.

## Class: `SchemaReifier`

The root entry point for a whole schema: bind a schema shape once with `.as()`, then `.create()` a lightweight reifier that normalizes/denormalizes/validates values against it.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `#instanceMethod()` | instance method |

- `.as(schema)` — static method. Derives a schema-bound subclass whose `static get rawSchema` returns `schema` (an object/array of scalar constructors, plain objects, and/or nested arrays — anything `CompositeScalar`/`inferBootScalar` accepts). Reuses the same bound subclass for an identical `schema` reference (backed by `@openreachtech/mentsu-bound-ctor-registry`).
- `.create({ rawSchema = this.rawSchema } = {})` — static factory method. Infers a "boot scalar" constructor from `rawSchema` via `.inferBootScalar()` and returns `new this({ BootScalar })`.
- `.get:rawSchema` — static getter, abstract; throws unless set via `.as()`.
- `.inferBootScalar({ schema })` — static method. `!schema` → `SentinelScalar`; a scalar constructor (`schema.prototype instanceof BaseScalar`) → used as-is; an `Array` → `CompositeScalar.from(schema)` (tuple/array schema); a plain object → `CompositeScalar.as(schema)`; anything else → `SentinelScalar`.
- `#createBootScalar({ normalizedValue = null, denormalizedValue = null })` — instance method. Builds one instance of the reifier's `BootScalar` for the given value pair.
- `#isFulfilledNormalizedValue({ normalizedValue })` / `#isFulfilledDenormalizedValue({ denormalizedValue })` — instance methods. Build a boot scalar for the given value and delegate to its `isFulfilled*` check.
- `#normalizeValue({ denormalizedValue })` / `#denormalizeValue({ normalizedValue })` — instance methods. Build a boot scalar for the given value and delegate to its `normalizeValue()`/`denormalizeValue()`.

## Class: `DeepSchemaInflater`

Utility for retro-fitting a `NodeScalar` binding onto an already-built schema tree, without hand-rewriting it.

- `.create({ lookup })` — static factory method. `lookup` is a `Map<NodeScalarCtor, ConstraintCtor>` or an array of `[NodeScalarCtor, ConstraintCtor]` pairs; stored as `new Map(lookup)`.
- `.isPlainObject({ value })` — static method, `true` iff `value` is a non-null plain `Object` (not an array, class instance, etc.).
- `#get:Ctor` — instance getter, `this.constructor`.
- `#deepInflateSchema({ schema })` — instance method. Recursively walks `schema` (arrays and plain objects are walked into; leaves are returned unchanged): for any leaf that is `NodeScalar` itself or a subclass of it, and is present as a key in `#lookup`, replaces it with `leaf.as(lookup.get(leaf))` (a constraint-bound `NodeScalar`); everything else — including scalar constructors not in the lookup — passes through unchanged.

## Simple value scalars

These extend `BaseScalar` directly (or, for `Sentinel`, is the pass-through fallback), add no extra static binding method, and only override `normalizeValue`/`denormalizeValue`/`hasAvailableNormalizedValue`/`hasAvailableDenormalizedValue`. All of them inherit `.create(...)` from `BaseScalar` unchanged.

| Class (export) | Alias (`ScalarHash`) | Normalized (`NV`) | Denormalized (`DV`) | Validation rule |
| :-- | :-- | :-- | :-- | :-- |
| `BooleanScalar` | `Bool` | `boolean` | `boolean` | `typeof value === 'boolean'` on both sides; `normalizeValue`/`denormalizeValue` just coerce with `Boolean(...)`. |
| `IntegerScalar` | `Integer` | `number` | `number` | `Number.isSafeInteger(value)` on both sides; value passes through unchanged. |
| `DoubleScalar` | `Double` | `number` | `number` | `Number.isFinite(value)` on both sides; value passes through unchanged. |
| `BigIntScalar` | `Long` | `bigint` | `string` | Denormalized: a safe integer number, or a string matching `/^-?\d+$/` that `BigInt(...)` accepts. `normalizeValue` returns `BigInt(denormalizedValue)`; `denormalizeValue` returns `normalizedValue.toString()`. Normalized side is valid if `typeof value === 'bigint'` or `Number.isSafeInteger(value)`. |
| `BigNumberScalar` | `BigNum` | `BigNumber` (bignumber.js) | `string` | Denormalized must be a `string` that `new BigNumber(str)` parses to a finite number (`isFinite()`); normalized must be `BigNumber.isBigNumber(value) && value.isFinite()`. `normalizeValue` returns `new BigNumber(str)`; `denormalizeValue` returns `value.toFixed()`. |
| `DatetimeScalar` | `Datetime` | `Date` | `string` (ISO 8601) | Denormalized must be a `string` that `new Date(str)` parses to a valid time (`!isNaN(getTime())`); normalized must be a `Date` with a valid time. `normalizeValue` returns `new Date(str)`; `denormalizeValue` returns `value.toISOString()`. |
| `TextScalar` | `Text` | `string` | `string` | `typeof value === 'string'` on both sides; value passes through unchanged. |
| `SentinelScalar` | `Sentinel` | `T` (any) | `T` (any) | Fallback pass-through scalar used when a schema shape can't be recognized (e.g. `SchemaReifier.inferBootScalar` / `CompositeScalar.normalizeScalarCtor` default to it). Always reports both sides as available/fulfilled (`hasAvailable*` and `denormalizeValue`/`normalizeValue` just echo the value back), i.e. it performs no validation at all. |

## Class: `KeywordScalar` (`Keyword`) extends `TextScalar`

Like `TextScalar`, but additionally rejects blank/whitespace-containing strings: `hasAvailableNormalizedValue`/`hasAvailableDenormalizedValue` require `super.hasAvailable*Value()` **and** `value.trim() !== ''` **and** no whitespace character, including full-width space `　` (tested with `/[\s　]/u`).

## Class: `ToCaseKeywordScalar` (`ToCaseKeyword`) extends `KeywordScalar`

Same validation as `KeywordScalar`, but changes case on normalize/denormalize using `@openreachtech/mentsu-text-case-tools`'s `TextCaseConverter`.

- `.get:TextCaseConverterCtor` — static getter, returns `TextCaseConverter`.
- `.get:convertingDelimiter` — static getter, defaults to `'_'`.
- `.createTextCaseConverter({ delimiter = this.convertingDelimiter } = {})` — static method, returns `TextCaseConverterCtor.create({ delimiter })`.
- `#normalizeValue()` — converts the denormalized string **to camelCase** (`toCamelCase({ text })`).
- `#denormalizeValue()` — converts the normalized string **to delimiter-case** using `convertingDelimiter` (`toDelimiterCase({ text, strict: true })`), i.e. `snake_case` by default.

## Class: `PatternScalar` (`Pattern`) extends `TextScalar`

Text validated by a custom predicate function or `RegExp`, bound once via `.use()`.

- `.use(predicate)` — static method. `predicate` is `(value: string) => boolean` or a `RegExp`. Derives a bound subclass whose `static get boundPredicate` returns the (function-normalized) predicate.
- `.get:boundPredicate` — static getter, defaults to `() => true` (accepts anything) if `.use()` was never called.
- `.normalizePredicate({ predicate })` — static method, wraps a `RegExp` as `value => predicate.test(value)`; passes a function through unchanged.
- `.create({ ..., predicate = this.boundPredicate })` — static factory method (overrides `BaseScalar.create`), also accepts an explicit `predicate` (function or `RegExp`) per-instance instead of the class-bound one.
- `hasAvailableNormalizedValue`/`hasAvailableDenormalizedValue` — require `super.hasAvailable*Value()` (i.e. a non-blank string, per `TextScalar`) **and** `value.trim() !== ''` **and** `this.predicate(value)` returning `true`.

## Class: `DateonlyScalar` (`Dateonly`) extends `PatternScalar`

A `PatternScalar` pre-bound with a date-only predicate: `.get:boundPredicate` returns a function that parses the value with `new Date(value)`, rejects `NaN` times, and requires `date.toISOString().slice(0, 10) === value` — i.e. the denormalized string must be an exact `YYYY-MM-DD` date-only string that round-trips through `Date`.

## Class: `NodeScalar` (`Node`) extends `BaseScalar`

Embeds an arbitrary external "constraint" value object (any class with its own `.create(...)`, an instance method `denormalizeSource()`, and an instance method `isValid()`) into the schema system, bound via `.as()`.

- `.as(ConstraintCtor)` — static method. `ConstraintCtor` must expose a static `.create(...)`. Derives a bound subclass whose `static get ConstraintCtor` returns it.
- `.get:ConstraintCtor` — static getter, abstract; throws unless bound via `.as()`.
- `.createConstraintInstance(...args)` — static method, `this.ConstraintCtor.create(...args)`.
- `#normalizeValue()` — if `denormalizedValue === null` returns `null`; otherwise builds the constraint-ctor argument (`buildConstraintCtorArgument()`, which by default just returns `denormalizedValue` unchanged — override to reshape it) and returns `this.Ctor.createConstraintInstance(builtArguments)`, i.e. the normalized value is **an instance of `ConstraintCtor`**.
- `#denormalizeValue()` — if not a valid normalized value, returns `null`; otherwise calls `.denormalizeSource()` on the normalized (constraint-instance) value.
- `#hasAvailableNormalizedValue()` — `normalizedValue instanceof this.Ctor.ConstraintCtor`.
- `#hasAvailableDenormalizedValue()` — builds the normalized value and checks `normalizedValue instanceof ConstraintCtor && normalizedValue.isValid()`, i.e. delegates the actual validity check to the constraint object's own `isValid()`.

## Class: `CompositeScalar` (`Composite`) extends `BaseScalar`

Composes a nested object or array/tuple of other scalars into one scalar. This is what `SchemaReifier.as()` builds for you when you pass a plain object or array schema, and is also usable standalone.

- `.as(schema)` — static method. `schema` is `Record<string, ScalarCtor | object | Array>`. Derives a bound subclass whose `static get boundSchema` returns it (object/keyed schema).
- `.of(...schema)` / `.from(schemaArray)` — static methods. Bind an array/tuple schema (`.from` just spreads its array argument into `.of`).
- `.get:boundSchema` — static getter, abstract; throws unless bound via `.as()`/`.of()`/`.from()`.
- `.buildSchema({ schema })` — static method, normalizes `schema` (object → per-key scalar ctors, array → per-item scalar ctors, bare value → normalized via `.normalizeScalarCtor`); unrecognized shapes fall back to `SentinelScalar`.
- `.create({ ..., schema = this.boundSchema })` — static factory method (overrides `BaseScalar.create`), builds the effective schema via `.buildSchema()`.
- `#isArrayScalar()` — instance method, `true` if `this.schema` is an array (tuple/list schema) rather than a keyed object schema.
- `#normalizeValue()` / `#denormalizeValue()` — recursively normalize/denormalize each key (object schema) or each index (array schema) using the corresponding per-key/per-item scalar constructor, returning `null` if the current value isn't valid or is `null`. **Array schema semantics**: if the bound schema array has more than one element it's a positional tuple (index `i` of the value is validated against `schema[i]`); if it has exactly one element, every item in the value array is validated/converted against that single scalar (homogeneous list). Unresolved object keys fall back to `SentinelScalar`.
- `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` — `true` only if the value itself is structurally valid (right shape/type for object vs. array schema) **and** every key/item, re-wrapped in its per-key/per-item scalar, is itself fulfilled (deep/recursive check).

## Class: `RecordScalar` (`Record`) extends `BaseScalar`

Like `CompositeScalar`'s object mode, but every value in the object shares **one** scalar type (map/dictionary semantics), rather than a schema per key.

- `.each(schema)` — static method. Derives a bound subclass whose `static get boundSchema` returns the single (uniform) value schema.
- `.get:boundSchema` — static getter, abstract; throws unless bound via `.each()`.
- `.buildSchema({ schema })` — static method, normalizes `schema` to a single scalar constructor via `CompositeScalar.normalizeScalarCtor`.
- `#normalizeValue()` / `#denormalizeValue()` — if the denormalized/normalized value isn't a plain object, returns `null`; otherwise maps every `[key, value]` entry through `this.schema.create({ ... }).normalizeValue()` / `.denormalizeValue()` and rebuilds the object.
- `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` — `false` if the value isn't a plain object; otherwise `true` only if every value in the object is fulfilled against `this.schema`.

## Class: `UnionScalar` (`Union`) extends `BaseScalar`

Tries several candidate schemas in order and delegates to the first one whose reifier is fulfilled — a tagged/discriminated-union-free "try each, use the first that matches" scalar.

- `.of(...schemas)` / `.from(schemasArray)` — static methods. Bind an ordered list of candidate schemas (each normalized the same way `CompositeScalar` normalizes a schema entry — scalar ctor, plain object, or array).
- `.get:boundSchemas` — static getter, abstract; throws unless bound via `.of()`/`.from()`.
- `.buildSchemas({ schemas })` — static method, maps each candidate through `CompositeScalar.normalizeScalarCtor`.
- `.create({ ..., schemas = this.boundSchemas })` — static factory method (overrides `BaseScalar.create`). Builds the candidate scalar constructors, then eagerly instantiates one **reifier** per candidate (`candidate.create({ denormalizedValue, normalizedValue })`) up front and stores them in `this.reifiers`.
- `#detectNormalizedValueReifier()` / `#detectDenormalizedValueReifier()` — instance methods, return the first stored reifier whose `isFulfilledNormalizedValue()` / `isFulfilledDenormalizedValue()` is `true`, or `null` if none match.
- `#normalizeValue()` / `#denormalizeValue()` — find the matching reifier for the relevant side; if none found, or the current value is invalid/`null`, return `null`; otherwise delegate to that reifier's `normalizeValue()`/`denormalizeValue()`.
- `#isFulfilledNormalizedValue()` / `#isFulfilledDenormalizedValue()` — `true` iff some candidate reifier reports fulfilled for that side.

## Usage

```js
import {
  SchemaReifier,
  IntegerScalar,
  TextScalar,
  KeywordScalar,
  DatetimeScalar,
} from '@openreachtech/mentsu-schema'

// Bind a schema once (object schema: one scalar per key).
const UserSchema = SchemaReifier.as({
  id: IntegerScalar,
  name: KeywordScalar,
  email: TextScalar,
  createdAt: DatetimeScalar,
  tags: [TextScalar], // single-element array => homogeneous list of TextScalar
})

const reifier = UserSchema.create()

const denormalizedValue = {
  id: 42,
  name: 'alice',
  email: 'alice@example.com',
  createdAt: '2026-08-04T00:00:00.000Z',
  tags: ['admin', 'staff'],
}

reifier.isFulfilledDenormalizedValue({ denormalizedValue })
// -> true

reifier.normalizeValue({ denormalizedValue })
// -> { id: 42, name: 'alice', email: 'alice@example.com', createdAt: Date(...), tags: ['admin', 'staff'] }
```

Nullable and short-alias (`ScalarHash`) usage:

```js
import { ScalarHash } from '@openreachtech/mentsu-schema'

const { Integer, Text } = ScalarHash

const NullableAge = Integer.asNullable

NullableAge.create({ denormalizedValue: null })
  .isFulfilledDenormalizedValue()
// -> true (null is allowed because isNullable is true)

Text.create({ denormalizedValue: 42 })
  .isFulfilledDenormalizedValue()
// -> false (42 is not a string)
```
