# @openreachtech/mentsu-schema

Schema modules for Mentsu — convert values between their in-application form and their serializable form, and validate them against a declared schema.

## Concept

A value in Mentsu is handled in two representations:

- **Normalized value** — the rich, in-application form. For example a `Date`, a `BigNumber`, a `bigint`, or a constraint document instance.
- **Denormalized value** — the plain, serializable form used at boundaries such as JSON payloads. For example an ISO datetime string, or a decimal string.

A **schema** is declared from scalar constructors and plain JavaScript structures (objects and arrays). `SchemaReifier` walks the schema to:

- **normalize** a denormalized value (inflate it into the in-application form),
- **denormalize** a normalized value (serialize it back to the plain form),
- **validate** whether a value fulfills the schema.

Each leaf of the schema is a **scalar** (see the [scalar catalog](https://github.com/openreachtech/mentsu-schema/blob/main/docs/en/api/index.md)). Scalars can be nested through `CompositeScalar` (objects and tuples/arrays), `RecordScalar` (uniform-valued maps), and `UnionScalar` (alternatives), so a schema can describe an arbitrarily deep structure.

## Installation

Requires Node.js 20.x (the version the CI builds against).

This package is published to GitHub Packages under the `@openreachtech` scope. Before
installing, the following two steps are required:

1. Add the registry to your project's `.npmrc`:

   ```
   @openreachtech:registry=https://npm.pkg.github.com
   ```

2. Authenticate with `npm login`:

   ```sh
   npm login --registry https://npm.pkg.github.com
   ```

Then install:

```sh
npm install @openreachtech/mentsu-schema
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

Declare a schema and reify values with it.

```js
import {
  SchemaReifier,
  IntegerScalar,
  KeywordScalar,
  DatetimeScalar,
} from '@openreachtech/mentsu-schema'

const alphaReifier = SchemaReifier.create({
  rawSchema: {
    id: IntegerScalar,
    label: KeywordScalar,
    pointsAt: DatetimeScalar,
  },
})

// Denormalized (wire) -> normalized (in-application)
const normalizedValue = alphaReifier.normalizeValue({
  denormalizedValue: {
    id: 100001,
    label: 'alpha',
    pointsAt: '2025-08-11T11:00:00.001Z',
  },
})
// normalizedValue.pointsAt is now a Date instance.

// Normalized (in-application) -> denormalized (wire)
const denormalizedValue = alphaReifier.denormalizeValue({
  normalizedValue,
})
// denormalizedValue.pointsAt is back to the ISO string.

// Validation
const isValid = alphaReifier.isFulfilledDenormalizedValue({
  denormalizedValue: {
    id: 100001,
    label: 'alpha',
    pointsAt: '2025-08-11T11:00:00.001Z',
  },
})
```

To reuse a schema, derive a schema-bound reifier class with `.as()`; its `.create()` then needs no schema argument.

```js
const AlphaReifier = SchemaReifier.as({
  id: IntegerScalar,
  label: KeywordScalar,
  pointsAt: DatetimeScalar,
})

const alphaReifier = AlphaReifier.create()
```

A field becomes optional (accepts `null`) with the `asNullable` variant of a scalar.

```js
const betaReifier = SchemaReifier.create({
  rawSchema: {
    id: IntegerScalar,
    label: KeywordScalar.asNullable, // may be null
  },
})
```

## API

See the [API reference](https://github.com/openreachtech/mentsu-schema/blob/main/docs/en/api/index.md) for the full class documentation and the scalar catalog.

The package exports:

- `SchemaReifier` — declares a schema and normalizes / denormalizes / validates values against it.
- `DeepSchemaInflater` — binds `NodeScalar` families in a schema to their constraint constructors.
- `BaseScalar` — the base class for all scalars; extend it to define a custom scalar.
- The concrete scalars: `BigIntScalar`, `BigNumberScalar`, `BooleanScalar`, `CompositeScalar`, `DateonlyScalar`, `DatetimeScalar`, `DoubleScalar`, `IntegerScalar`, `KeywordScalar`, `NodeScalar`, `PatternScalar`, `RecordScalar`, `SentinelScalar`, `TextScalar`, `ToCaseKeywordScalar`, `UnionScalar`.
- `ScalarHash` — a hash of the concrete scalars keyed by short aliases (`BigNum`, `Bool`, `Composite`, `Dateonly`, `Datetime`, `Double`, `Integer`, `Keyword`, `Long`, `Node`, `Pattern`, `Record`, `Sentinel`, `Text`, `ToCaseKeyword`, `Union`).

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-schema.git
cd mentsu-schema
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
