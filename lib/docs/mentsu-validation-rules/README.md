# @openreachtech/mentsu-validation-rules

A **DB-independent, pure-logic** validation rule engine extracted from crm-kit (renchan)'s validation foundation.

It evaluates a condition tree (a recursive composition of `AND` / `OR` plus field operators) and reports "which column, with which operator, was violated / satisfied / unevaluable." Retrieving the actual values (from a DB, an entity, or the clock) is delegated to a `ValueResolver` injected by the host, so the package itself carries no vocabulary for DB, GraphQL, or fieldPath concepts.

> See [`docs/v1.0.0/`](./docs/v1.0.0/) for design details.
> See [`docs/operators.md`](./docs/operators.md) for the per-operator `operands` / `options` specification.

## Basic Contract

- **I/O**: `execute({ rules, record })` → `ColumnValidationParcel`. The input is an array of "parsed condition trees plus metadata."
- **No-Throw (fail-safe)**: the public entry point never throws / rejects. Unknown operators, value-resolution failures, and the like are separated out as "errored" and are not counted as violations by default (switch to fail-closed with `treatErrorAsViolation: true`).
- **Extensibility (Open-Closed)**: every class has a `constructor` plus a `static create()`, with behavior kept in instance methods. Any class can be swapped out via `extends`. Operators can be injected on top of the built-ins via `create({ customSuites })`, and the same `operatorKey` can be overridden — the last registration wins.
- **Sync / Async**: operators and record validators can be implemented either synchronously or asynchronously (the evaluation path always `await`s).

## Quick Start

```javascript
import {
  ValidationEngine,
} from '@openreachtech/mentsu-validation-rules'

// 値解決はホストが実装（BaseValueResolver を継承し resolveValueSource を実装）
const engine = ValidationEngine.create({
  resolver,                 // 必須: ValueSource → 具体値
  context: { db },          // 任意: カスタム演算子／レコードバリデータへ透過的に渡る
  // customSuites: [ ... ]  // 任意: 組み込み38種へ追加注入（同 operatorKey は後勝ち）
})

// ルールは呼び出し側が DB からロード＆パース済みで渡す
const parcel = await engine.execute({ rules, record })

parcel.hasValidationError()     // boolean（errored は含めない）
parcel.hasEvaluationError()     // boolean（評価不能）
parcel.extractViolatedRules()   // 違反ルール（errorMessage 付き）
parcel.toPlainResult()          // シリアライズ可能なサマリ
```

The shape of one rule (`RuleInput`) passed to `execute()`:

```jsonc
{
  "id": 1, "isActive": true, "executionOrder": 10,
  "hasTriggerConditions": false, "errorMessage": "…",
  "OriginObjectColumnId": 1010401,
  "validationTree": { "operatorCategory": "FIELD", "operatorKey": "REQUIRED",
    "subject": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 1010401 } },
    "operands": {}, "options": {} },
  "triggerTree": null
}
```

## Main Public API

| export | role |
| :-- | :-- |
| `ValidationEngine` | Public entry point. `create()` / `execute({ rules, record })` |
| `ConditionEvaluator` / `SuiteRegistry` / `ValueSourceResolverDispatcher` | Evaluator / suite resolution / value-source resolution dispatch |
| `ConditionSchemaValidator` (+ `SCHEMA_ERROR_CODE`) | **Structural validation** of condition-tree JSON (at save/load time) |
| `ReferencedColumnIdsCollector` | Collects the column IDs a tree references (for change detection) |
| `BaseConditionSuite` / `BaseCustomValidationSuite` | Base classes for operators (custom operators extend these) |
| `BaseRecordValidator` | Base class for cross-field, record-level validation |
| `BaseValueResolver` | The value-resolution contract (the host extends this) |
| `ColumnValidationParcel` / `RuleValidationParcel` / `RecordValidationParcel` | Result parcels |
| `builtinSuites` + each `XxxConditionSuite` | The 38 built-in operators |
| `VALIDATION_TYPE` / `SOURCE_VALUE_TYPE` / `OPERATOR_CATEGORY` / `LOGICAL_OPERATOR_KEY` / … | Enum groups |

See the individual documents for details: [Operators](./docs/operators.md) / [Schema validation](./docs/schema-validation.md) / [Referenced column collection](./docs/referenced-columns.md) / [Custom extensions](./docs/custom-extensions.md).

## Extension

**Custom operators** (sync/async, `context` available):

```javascript
import { BaseCustomValidationSuite } from '@openreachtech/mentsu-validation-rules'

class UniqueEmailConditionSuite extends BaseCustomValidationSuite {
  get operatorKey () {
    return 'CUSTOM_UNIQUE_EMAIL'
  }

  async evaluate ({ subject, context }) {
    const duplicate = await context.db.findByEmail({ email: subject })

    return duplicate === null
  }
}

const engine = ValidationEngine.create({ customSuites: [UniqueEmailConditionSuite], resolver, context: { db } })
```

**Record-level validation** (`BaseRecordValidator` or a duck-typed `{ key, validate }`):

```javascript
const engine = ValidationEngine.create({
  resolver,
  recordValidators: [
    {
      key: 'startBeforeEnd',
      validate: ({ record }) => ({
        isValid: record.startAt <= record.endAt,
        errorMessage: '開始日は終了日以前にしてください',
      }),
    },
  ],
})
```

## Application Examples

### JSON for a Moderately Complex Condition Tree

A rule stating "**only when switching a product to published** (trigger), all of the following must hold": the name is required / the price is between `100` and `maxPrice` (another column) inclusive / the contact is **either email-formatted or a required phone number** (OR). In addition, the scheduled publish datetime must be **later than now** (compared against the dynamic value `NOW`).

> Column mapping (example): `2001=name` / `2002=price` / `2003=maxPrice` / `2004=email` / `2005=phone` / `2006=publishAt` / `2010=status`

```jsonc
[
  {
    "id": 7001, "isActive": true, "executionOrder": 10,
    "hasTriggerConditions": true,
    "errorMessage": "公開に必要な項目を確認してください",
    "OriginObjectColumnId": 2001,

    // status が "PUBLISHED" のときだけ検証を発火
    "triggerTree": {
      "operatorCategory": "FIELD", "operatorKey": "EQUALS",
      "subject":  { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2010 } },
      "operands": { "comparison": { "sourceValueType": "FIXED_VALUE", "value": "PUBLISHED" } },
      "options": {}
    },

    "validationTree": {
      "operatorCategory": "LOGICAL", "operatorKey": "AND",
      "children": [
        { "operatorCategory": "FIELD", "operatorKey": "REQUIRED",
          "subject": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2001 } },
          "operands": {}, "options": {} },

        { "operatorCategory": "FIELD", "operatorKey": "BETWEEN",
          "subject": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2002 } },
          "operands": {
            "min": { "sourceValueType": "FIXED_VALUE", "value": 100 },
            "max": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2003 } }
          },
          "options": { "minInclusive": true, "maxInclusive": true } },

        { "operatorCategory": "LOGICAL", "operatorKey": "OR",
          "children": [
            { "operatorCategory": "FIELD", "operatorKey": "REGEX",
              "subject": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2004 } },
              "operands": { "pattern": { "sourceValueType": "FIXED_VALUE", "value": "^[^@\\s]+@[^@\\s]+$" } },
              "options": { "flags": "u" } },
            { "operatorCategory": "FIELD", "operatorKey": "REQUIRED",
              "subject": { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2005 } },
              "operands": {}, "options": {} }
          ] }
      ]
    }
  },

  {
    "id": 7002, "isActive": true, "executionOrder": 20,
    "hasTriggerConditions": false,
    "errorMessage": "公開予定日時は現在より後にしてください",
    "OriginObjectColumnId": 2006,
    "triggerTree": null,
    "validationTree": {
      "operatorCategory": "FIELD", "operatorKey": "GREATER_THAN_DATETIME",
      "subject":  { "sourceValueType": "FORM_FIELD_REFERENCE", "value": { "sourceOriginObjectColumnId": 2006 } },
      "operands": { "datetime": { "sourceValueType": "DYNAMIC_VALUE", "value": { "dynamicValueTypeKey": "NOW" } } },
      "options": {}
    }
  }
]
```

### Usage Image in an Application (Inside an API)

**① Value-resolution adapter** (host-implemented) — turns a `ValueSource` into a concrete value taken from the record currently being validated, and so on. App-specific concerns such as the column-ID → field-name mapping and dynamic-value generation are contained here.

```javascript
import { BaseValueResolver } from '@openreachtech/mentsu-validation-rules'

class RecordValueResolver extends BaseValueResolver {
  constructor ({ record, columnFieldMap }) {
    super()
    this.record = record
    this.columnFieldMap = columnFieldMap
  }

  static create ({ record, columnFieldMap }) {
    return new this({ record, columnFieldMap })
  }

  resolveValueSource ({ valueSource }) {
    switch (valueSource.sourceValueType) {
      case 'FIXED_VALUE':
        return valueSource.value
      case 'FORM_FIELD_REFERENCE': {
        const field = this.columnFieldMap[valueSource.value.sourceOriginObjectColumnId]
        return this.record[field] ?? null
      }
      case 'DYNAMIC_VALUE':
        return valueSource.value.dynamicValueTypeKey === 'TODAY'
          ? new Date().toISOString().slice(0, 10)
          : new Date().toISOString()
      default:
        return null
    }
  }
}
```

**② API handler** (framework-agnostic; the same shape works for either Express or GraphQL) — loads the rules, evaluates them with the engine, and formats violations into a 422 response.

```javascript
import { ValidationEngine } from '@openreachtech/mentsu-validation-rules'

async function validateProductForPublish ({ record, db }) {
  const rules = await ruleStore.load({ objectId: PRODUCT_OBJECT_ID }) // アプリ側のロード層（JSON パース＋スキーマ検証済み）
  const engine = ValidationEngine.create({
    resolver: RecordValueResolver.create({ record, columnFieldMap: PRODUCT_COLUMN_FIELD_MAP }),
    context: { db }, // カスタム演算子／レコードバリデータへ透過的に渡る
  })

  const parcel = await engine.execute({ rules, record })

  // 設定ミス由来（未知演算子・解決失敗）は errored として分離される。監視へ回す。
  if (parcel.hasEvaluationError()) {
    logger.error('validation misconfiguration', parcel.extractErroredRules())
  }

  const { violated, violatedRecords } = parcel.toPlainResult()
  return {
    isValid: !parcel.hasValidationError(),
    errors: [
      ...violated.map(it => ({ field: PRODUCT_COLUMN_FIELD_MAP[it.originObjectColumnId], message: it.errorMessage })),
      ...violatedRecords.map(it => ({ field: it.key, message: it.errorMessage })),
    ],
  }
}

// Express の例
app.post('/products/:id/publish', async (req, res) => {
  const { isValid, errors } = await validateProductForPublish({ record: req.body, db })

  if (!isValid) {
    return res.status(422).json({ errors })
  }

  const saved = await productRepository.save(req.body)
  return res.status(200).json(saved)
})
```

> Key point: the package **never throws**, so no try/catch is needed on the API side. Business violations (`hasValidationError()` / `violated`) and **configuration mistakes (`hasEvaluationError()` / errored)** are kept as separate roles (fail-safe by default; use `treatErrorAsViolation: true` for strict operation).

## Dependency Boundary

- **The core (`src/`) has zero external runtime dependencies.** Importing it brings in no runtime dependency beyond the Node standard library.
- Automatic suite loading via directory traversal is isolated in the optional `./adapters` adapter (`DirectorySuiteLoader`).

```
exports
├── "."          → src/index.js        （コア。無依存）
└── "./adapters" → adapters/index.js   （任意。ディレクトリ走査ローダ）
```

```javascript
import { DirectorySuiteLoader } from '@openreachtech/mentsu-validation-rules/lib/adapters/index.js'

const suites = await DirectorySuiteLoader.create({ directoryPath }).loadSuites()
const engine = ValidationEngine.create({ suites, resolver })
```

## Development

```bash
npm install
npm test        # jest（--experimental-vm-modules）
npm run lint    # eslint（@openreachtech/eslint-config）
```

## Status

The package itself (core + 38 built-in operators + schema validation + referenced-column collection + custom extensions + public API / optional adapter) is implemented and tested. Conversion from the legacy schema to the new schema (`LegacyConditionConverter`) is an app-specific migration process and is not included in this package; it lives as a reference implementation under [`migration/`](./migration/) (excluded from `npm pack`, on a separate branch). App-side integration, DB migration, and front-end integration are follow-up work on the crm-kit side itself.
