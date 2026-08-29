# @openreachtech/mentsu-validation-rules

A **DB-agnostic, pure-logic** validation rule engine, extracted from the crm-kit
(renchan) validation core.

It evaluates a condition tree (`AND` / `OR` recursion plus field operators) and reports
which column violated, passed, or could not be evaluated — and with which operator.
Resolving the actual value (from the DB, an entity, or the clock) is delegated to a
host-injected `ValueResolver`, so the package itself carries no vocabulary of DB, GraphQL,
or field paths.

## Concept

- **Input / output**: `execute({ rules, record })` → a `ColumnValidationParcel`. The input
  is an array of "parsed condition tree plus metadata".
- **No-throw (fail-safe)**: the public entry never throws or rejects. Unknown operators,
  value-resolution failures, and the like are isolated as *errored* and, by default, are
  not counted as violations (switch to fail-closed with `treatErrorAsViolation: true`).
- **Open–Closed**: every class has a `constructor` plus a `static create()`, with behavior
  on instance methods, so any class can be replaced by `extends`. Operators are added
  through `create({ customSuites })`, and a duplicate `operatorKey` overrides the built-in
  (last one wins).
- **Sync / async**: operators and record validators may be implemented either
  synchronously or asynchronously (the evaluation path always `await`s).

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-validation-rules
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### Quick start

```javascript
import {
  ValidationEngine,
} from '@openreachtech/mentsu-validation-rules'

// The host implements value resolution
// (extend BaseValueResolver, implement resolveValueSource).
const engine = ValidationEngine.create({
  resolver,
  context: {
    db,
  },
})

// The caller loads and parses the rules from the DB, then passes them in.
const parcel = await engine.execute({
  rules,
  record,
})

parcel.hasValidationError()     // boolean (does not include errored)
parcel.hasEvaluationError()     // boolean (unevaluatable)
parcel.extractViolatedRules()   // violated rules (with errorMessage)
parcel.toPlainResult()          // a serializable summary
```

The shape of one rule passed to `execute()` (a `RuleInput`):

```jsonc
{
  "id": 1,
  "isActive": true,
  "executionOrder": 10,
  "hasTriggerConditions": false,
  "errorMessage": "…",
  "OriginObjectColumnId": 1010401,
  "validationTree": {
    "operatorCategory": "FIELD",
    "operatorKey": "REQUIRED",
    "subject": {
      "sourceValueType": "FORM_FIELD_REFERENCE",
      "value": { "sourceOriginObjectColumnId": 1010401 }
    },
    "operands": {},
    "options": {}
  },
  "triggerTree": null
}
```

### Custom operators

A custom operator extends `BaseCustomValidationSuite`, may be sync or async, and can read
the injected `context`.

```javascript
import {
  BaseCustomValidationSuite,
} from '@openreachtech/mentsu-validation-rules'

class UniqueEmailConditionSuite extends BaseCustomValidationSuite {
  static get operatorKey () {
    return 'CUSTOM_UNIQUE_EMAIL'
  }

  async evaluate ({
    subject,
    context,
  }) {
    const duplicate = await context.db.findByEmail({
      email: subject,
    })

    return duplicate === null
  }
}

const engine = ValidationEngine.create({
  customSuites: [
    UniqueEmailConditionSuite,
  ],
  resolver,
  context: {
    db,
  },
})
```

### Record-level validation

A record validator is a `BaseRecordValidator` subclass, or a duck-typed
`{ key, validate }`, for checks that span several fields.

```javascript
const engine = ValidationEngine.create({
  resolver,
  recordValidators: [
    {
      key: 'startBeforeEnd',
      validate: ({ record }) => ({
        isValid: record.startAt <= record.endAt,
        errorMessage: 'The start date must be on or before the end date',
      }),
    },
  ],
})
```

### A value-resolution adapter

The host implements how a `ValueSource` becomes a concrete value from the record being
validated. Application-specific concerns — the column-id → field-name mapping, generating
dynamic values — are confined here.

```javascript
import {
  BaseValueResolver,
} from '@openreachtech/mentsu-validation-rules'

class RecordValueResolver extends BaseValueResolver {
  constructor ({
    record,
    columnFieldMap,
  }) {
    super()

    this.record = record
    this.columnFieldMap = columnFieldMap
  }

  static create ({
    record,
    columnFieldMap,
  }) {
    return new this({
      record,
      columnFieldMap,
    })
  }

  resolveValueSource ({
    valueSource,
  }) {
    if (valueSource.sourceValueType === 'FIXED_VALUE') {
      return valueSource.value
    }

    if (valueSource.sourceValueType === 'FORM_FIELD_REFERENCE') {
      const field = this.columnFieldMap[valueSource.value.sourceOriginObjectColumnId]

      return this.record[field]
        ?? null
    }

    if (valueSource.sourceValueType === 'DYNAMIC_VALUE') {
      return this.resolveDynamicValue({
        valueSource,
      })
    }

    return null
  }

  resolveDynamicValue ({
    valueSource,
  }) {
    if (valueSource.value.dynamicValueTypeKey === 'TODAY') {
      return new Date()
        .toISOString()
        .slice(0, 10)
    }

    return new Date()
      .toISOString()
  }
}
```

## API

| export | role |
| :-- | :-- |
| `ValidationEngine` | The public entry. `create()` / `execute({ rules, record })`. |
| `ConditionEvaluator` / `SuiteRegistry` / `ValueSourceResolverDispatcher` | Evaluator / suite resolution / value-resolution dispatch. |
| `ConditionSchemaValidator` (plus `SCHEMA_ERROR_CODE`) | **Structural** validation of the condition-tree JSON (on save / load). |
| `ReferencedColumnIdsCollector` | Collects the column ids a tree references (for change detection). |
| `BaseConditionSuite` / `BaseCustomValidationSuite` | Operator base classes (custom operators extend these). |
| `BaseRecordValidator` | Base for cross-field, record-level validation. |
| `BaseValueResolver` | The value-resolution contract (the host extends it). |
| `ColumnValidationParcel` / `RuleValidationParcel` / `RecordValidationParcel` | Result parcels. |
| `builtinSuites` plus each `XxxConditionSuite` | The 38 built-in operators. |
| `VALIDATION_TYPE` / `SOURCE_VALUE_TYPE` / `OPERATOR_CATEGORY` / `LOGICAL_OPERATOR_KEY` / `DYNAMIC_VALUE_TYPE_KEY` / `DYNAMIC_VALUE_OFFSET_UNIT_KEY` / `REGEX` | The enums. |

### Built-in operators

`builtinSuites` bundles 38 operators, covering presence (`REQUIRED`, `EXISTS`), equality
(`EQUALS`, `NOT_EQUALS`, `IN`, `NOT_IN`), numeric range (`MIN`, `MAX`, `BETWEEN`,
`INTEGER`, `DECIMAL`), string (`CONTAINS`, `MIN_LENGTH`, `EXACT_LENGTH`), date / datetime
(`MIN_DATE`, `BETWEEN_DATES`, `FUTURE_DATE`, `GREATER_THAN_DATETIME`, …), array / object
existence, file (`FILE_SIZE`, `FILE_TYPE`), and format (`REGEX`, `URL`) checks. Each is a
class under `lib/suites/builtin/`; pass extra ones through `create({ customSuites })`.

## Dependency boundary

- **The core is zero runtime dependency** — importing it pulls in nothing beyond the Node
  standard library.
- Directory-scanning suite auto-loading is isolated in the optional `./lib/adapters` entry
  point (`DirectorySuiteLoader`), so the core stays dependency-free.

```javascript
import {
  DirectorySuiteLoader,
} from '@openreachtech/mentsu-validation-rules/lib/adapters/index.js'

const loader = DirectorySuiteLoader.create({
  directoryPath,
})

const suites = await loader.loadSuites()

const engine = ValidationEngine.create({
  suites,
  resolver,
})
```

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-validation-rules.git
cd mentsu-validation-rules
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
