# API

Source: `types/index.d.ts` (declared by package.json's `"types"` field), cross-referenced with the JSDoc in `lib/**/*.js` for the exact semantics of each built-in operator. Note: the header comment inside `types/index.d.ts` still names the package `@openreachtech/renchan-validation-rule-engine` (its pre-rename name) — the published/runtime package is `@openreachtech/mentsu-validation-rules`; this does not affect the API surface described below.

## Exports (`index.js`)

`index.js` is `export * from './lib/index.js'`. `lib/index.js` re-exports the following (no default export — everything is a named export):

- `ValidationEngine` — the engine entry point.
- `ConditionEvaluator`, `SuiteRegistry`, `ValueSourceResolverDispatcher` — evaluation / suite-resolution / value-resolution internals (usable directly, but normally driven via `ValidationEngine`).
- `ConditionSchemaValidator`, `SCHEMA_ERROR_CODE` — structural (schema) validation of a condition tree.
- `ReferencedColumnIdsCollector` — collects the column IDs referenced by a condition tree.
- `BaseConditionSuite`, `BaseCustomValidationSuite` — extension points for operator suites.
- `BaseRecordValidator` — extension point for record-spanning validators.
- `BaseValueResolver` — extension point / contract the host implements to resolve `ValueSource` → concrete value.
- `ColumnValidationParcel`, `RuleValidationParcel`, `RecordValidationParcel` — result parcels.
- `builtinSuites` — array of all 38 built-in operator suite classes, plus each suite class individually exported by name (`RequiredConditionSuite`, `MinLengthConditionSuite`, …, `ExistsObjectConditionSuite`; full list in the "Built-in Operator Suites" section below).
- Enums/constants from `constants.js`: `VALIDATION_TYPE`, `OPERATOR_CATEGORY`, `LOGICAL_OPERATOR_KEY`, `SOURCE_VALUE_TYPE`, `DYNAMIC_VALUE_TYPE_KEY`, `DYNAMIC_VALUE_OFFSET_UNIT_KEY`, `REGEX` (contains `REGEX.DATETIME_STRING`).

Optional, separate entry point (not re-exported from `.`; the core stays dependency-free) — import directly from `@openreachtech/mentsu-validation-rules/lib/adapters/index.js`:

- `DirectorySuiteLoader` — loads operator suite classes from a directory tree instead of listing them explicitly.

## Class: `ValidationEngine`

The engine entry point: filters rules by their trigger tree, evaluates each surviving rule's validation tree and every registered record validator, and aggregates everything into a `ColumnValidationParcel`. **Never throws** — unknown operators, resolver exceptions, and any other failure are captured as "errored" results instead of propagating.

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#get:instanceGetter` | instance getter |
| `#instanceMethod()` | instance method |

- `.create({ customSuites = [], suites = null, resolver, recordValidators = [], context, parcelClass = ColumnValidationParcel, ruleParcelClass = RuleValidationParcel, recordParcelClass = RecordValidationParcel, treatErrorAsViolation = false, logger })` — static factory method. `resolver` (implementing `ValueResolver`) is required. `suites`, when given, replaces the built-in catalog entirely; otherwise the final suite list is `[...builtinSuites, ...customSuites]` (a `customSuites` entry with the same `operatorKey` as a built-in overrides it — last registration wins). `context` is passed through untouched to every suite's `evaluate()` and every record validator's `validate()`. `treatErrorAsViolation: true` makes evaluation errors count as validation violations (fail-closed) instead of being reported separately (fail-safe, the default).
- `#get:suiteRegistry` — instance getter. Returns the underlying `SuiteRegistry` built from the resolved suite list.
- `#execute({ rules = [], record })` — instance method, `async`. Returns `Promise<ColumnValidationParcel>`. For each `RuleInput`: skips it (no parcel produced) when `isActive` is false; if `hasTriggerConditions` is true, evaluates `triggerTree` first and skips the rule when the trigger does not hold; otherwise evaluates `validationTree` and produces a `RuleValidationParcel` (`isValid` = whether the tree was satisfied). Also runs every registered record validator against `record` and produces a `RecordValidationParcel` for each. Never throws — any exception during tree evaluation or record validation becomes an errored parcel (`RuleValidationParcel.createErrored` / `RecordValidationParcel.createErrored`) instead of rejecting.

## Class: `ConditionEvaluator`

Evaluates a parsed condition tree (`LogicalConditionNode` / `FieldConditionNode`) against resolved values, recursing through `AND` / `OR` composition and dispatching `FIELD` nodes to the matching operator suite.

- `.create({ suiteRegistry, resolverDispatcher, context })` — static factory method.
- `#evaluateTree({ tree })` — instance method, `async`. Returns `Promise<boolean>`. `tree: null` evaluates to `true` (vacuous pass — used for an absent trigger tree). A `LOGICAL` node short-circuits `AND` (first `false` wins) / `OR` (first `true` wins) over its `children`. A `FIELD` node resolves `subject`/`operands` via the injected `resolverDispatcher`, looks up the suite for `operatorKey` in `suiteRegistry`, and awaits its `evaluate({ subject, operands, options, context })`. An unknown `operatorKey` (no suite registered) or a resolver/suite exception propagates up to whichever caller is not shielding it (`ValidationEngine#execute` is the one that catches it and turns it into an errored parcel).

## Class: `SuiteRegistry`

Registry that maps `operatorKey` → suite instance, built once from a suite class array and consulted by `ConditionEvaluator` on every `FIELD` node.

- `.create({ suites, logger })` — static factory method. Instantiates every suite class in `suites` (via each class's own `.create()`) and registers it under its `operatorKey`.
- `#registerSuites({ suites })` — instance method. Registers an array of suite classes in order.
- `#registerSuite({ suite })` — instance method. Registers a single suite class; if `logger` was supplied and the `operatorKey` is already registered, logs a warning before overwriting (last registration wins).
- `#getSuite({ operatorKey })` — instance method. Returns the registered `BaseConditionSuite` instance for `operatorKey`, or `null` if none is registered.
- `#hasSuite({ operatorKey })` — instance method. Returns whether `operatorKey` has a registered suite.
- `#extractOperatorKeys()` — instance method. Returns every registered `operatorKey` as a string array.

## Class: `ConditionSchemaValidator` (+ `SCHEMA_ERROR_CODE`)

Structural (shape) validator for a condition tree — intended to be run when a rule is saved or loaded, before it is ever handed to `ValidationEngine#execute`. It does not evaluate values; it checks the JSON shape itself (required keys, valid `operatorCategory`/`operatorKey`, well-formed `ValueSource`s, etc.).

- `.create({ operatorKeys = [] })` — static factory method. `operatorKeys` is the set of valid `FIELD` operator keys to accept (built-ins plus any custom operator keys the host has registered).
- `#validate({ tree })` — instance method. Returns `SchemaError[]` (`{ path, message, code }`) — an empty array means the tree is structurally valid. `code` values come from the `SCHEMA_ERROR_CODE` map exported alongside this class.

## Class: `ReferencedColumnIdsCollector`

Walks a condition tree and collects every `sourceOriginObjectColumnId` referenced anywhere in it (subject and operands, at any depth) — useful for change-detection ("does this rule need re-evaluation given which columns changed").

- `.create()` — static factory method.
- `#collectColumnIds({ tree })` — instance method. Returns `number[]` of every referenced column ID; `tree: null` returns an empty array.

## Class: `ValueSourceResolverDispatcher`

Thin dispatch layer between a condition tree's raw `ValueSource` objects and the host-supplied `ValueResolver`; used internally by `ConditionEvaluator` so the evaluator itself never touches `resolveValueSource` directly.

- `.create({ resolver })` — static factory method. `resolver` is the host's `ValueResolver` (or `BaseValueResolver` subclass instance).
- `#resolveValueSource({ valueSource })` — instance method, `async`. Delegates straight to `resolver.resolveValueSource({ valueSource })`.
- `#resolveSubject({ subject })` — instance method, `async`. Resolves a `FieldConditionNode`'s `subject` (a single `ValueSource`).
- `#resolveOperands({ operands })` — instance method, `async`. Resolves every entry of an `Operands` map (each value may be a single `ValueSource` or an array of them) to a plain `Record<string, unknown>`.
- `#resolveOperand({ operand })` — instance method, `async`. Resolves one operand value, which may be a single `ValueSource` or a `ValueSource[]` (variadic operators such as `IN_STRING`); an array resolves to an array of resolved values.

## Class: `BaseConditionSuite`

Base class for every operator suite, built-in or custom. A suite is a **pure predicate**: given already-resolved `subject`/`operands` plus scalar `options` and an opaque `context`, it returns whether the condition holds. It has no knowledge of value sources, columns, fieldPath, or the DB.

- `.create()` — static factory method. Takes no arguments — suites are dependency-free by default.
- `#get:operatorKey` — instance getter, abstract. Must be overridden to return the operator key string (e.g. `'REQUIRED'`, `'BETWEEN'`) this suite handles; the base getter throws `Error('Property operatorKey must be implemented.')`.
- `#evaluate({ subject, operands, options, context })` — instance method, abstract. Must be overridden. May return `boolean` or `Promise<boolean>` — `true` means the condition is satisfied. The base method throws `Error('Method evaluate() must be implemented.')`.
- `#isEmpty({ value = null })` — instance method, implemented. Shared helper: `true` when `value` is `null` or an all-whitespace string; `false` for every other value (including `0`, `false`, `[]`). Nearly every built-in suite calls this first and treats an empty subject as a vacuous pass — `RequiredConditionSuite` is the one exception (see below).

## Class: `BaseCustomValidationSuite extends BaseConditionSuite`

Intent-revealing alias of `BaseConditionSuite` for host-defined custom operators — same contract (`operatorKey` getter + `evaluate()`), no additional members. Extend this (rather than `BaseConditionSuite` directly) to signal that a suite is app-specific. `evaluate()` may be `async` (the engine always awaits it, so a suite may hit a DB or API), and `context` — whatever was passed to `ValidationEngine.create({ context })` — is forwarded to every call. Register instances via `ValidationEngine.create({ customSuites: [...] })`.

## Class: `BaseRecordValidator`

Base class for a **record-spanning custom validator** — a business rule that cannot be expressed as a single-field operator (e.g. `startAt <= endAt`). Unlike an operator suite (which judges one resolved `subject`), a record validator receives the whole `record`.

- `.create({ key = null })` — static factory method.
- `#get:key` — instance getter. Returns the identifier reported on this validator's result parcel (the `key` passed to the constructor, or override the getter to hard-code one).
- `#validate({ record, resolver, context })` — instance method, abstract. Must be overridden. May return `RecordValidationResult` (`{ isValid, errorMessage }`) or a `Promise` of one; the base method throws `Error('Method validate() must be implemented.')`. Register instances (or any duck-typed `{ key, validate }` object) via `ValidationEngine.create({ recordValidators: [...] })`.

## Class: `BaseValueResolver`

The contract the host implements to turn a `ValueSource` into a concrete value (from a DB row, an entity, `Date.now()`, etc.). This is the one interface the package requires the host to provide.

- `.create()` — static factory method. Takes no arguments.
- `#resolveValueSource({ valueSource })` — instance method, abstract (not implemented on the base class in the `.d.ts`; a host subclass must implement it). May return a value directly or a `Promise` of one. Passed to `ValidationEngine.create({ resolver })`.

## Class: `RuleValidationParcel`

The result of evaluating one `RuleInput`'s validation tree — a tri-state outcome (`isValid` may be `true`, `false`, or `null` when errored).

- `.create({ rule, isValid, errorMessage })` — static factory method. Produces a resolved (non-errored) parcel.
- `.createErrored({ rule, error })` — static factory method. Produces an errored parcel (`isValid: null`) from a caught exception.
- `#rule` — readonly instance property, the original `RuleInput`.
- `#isValid` — readonly instance property (`boolean | null`).
- `#errorMessage` — readonly instance property (the rule's configured `errorMessage`, populated only when violated).
- `#evaluationError` — readonly instance property (`string | null`), populated only on an errored parcel.
- `#extractIsValid()` — instance method. Returns `#isValid`.
- `#extractErrorMessage()` — instance method. Returns `#errorMessage`.
- `#get:originObjectColumnId` — instance getter (`number | null`), from `rule.OriginObjectColumnId`.
- `#get:operatorKey` — instance getter (`string | null`), from `rule.validationTree.operatorKey` (or `null` when not applicable).
- `#get:isErrored` — instance getter (`boolean`), `true` when this parcel was created via `.createErrored()`.

## Class: `RecordValidationParcel`

The result of running one record-spanning custom validator — same tri-state shape as `RuleValidationParcel`, keyed by the validator's `key` instead of a rule/column.

- `.create({ key, isValid, errorMessage })` — static factory method.
- `.createErrored({ key, error })` — static factory method.
- `#key` — readonly instance property.
- `#isValid` — readonly instance property (`boolean | null`).
- `#errorMessage` — readonly instance property.
- `#evaluationError` — readonly instance property (`string | null`).
- `#extractIsValid()` — instance method.
- `#extractErrorMessage()` — instance method.
- `#get:isErrored` — instance getter (`boolean`).

## Class: `ColumnValidationParcel`

The top-level result returned by `ValidationEngine#execute()`, aggregating every `RuleValidationParcel` and `RecordValidationParcel` produced for one `execute()` call.

- `.create({ ruleParcels = [], recordParcels = [] } = {})` — static factory method.
- `#ruleParcels` — readonly instance property (`RuleValidationParcel[]`).
- `#recordParcels` — readonly instance property (`RecordValidationParcel[]`).
- `#hasValidationError()` — instance method. `true` if any non-errored parcel (rule or record) is violated (`isValid === false`).
- `#hasEvaluationError()` — instance method. `true` if any parcel is errored (`isErrored === true`).
- `#extractRuleParcels()` / `#extractRecordParcels()` — instance methods. Return the full parcel arrays.
- `#extractViolatedRules()` — instance method. Returns rule parcels where `isValid === false` (excludes errored).
- `#extractSatisfiedRules()` — instance method. Returns rule parcels where `isValid === true`.
- `#extractErroredRules()` — instance method. Returns rule parcels where `isErrored === true`.
- `#extractViolatedRecords()` / `#extractErroredRecords()` — instance methods. Same distinctions, for record parcels.
- `#extractParcelsByColumnId({ originObjectColumnId })` — instance method. Returns rule parcels whose `originObjectColumnId` matches.
- `#extractAllParcels()` — instance method. Returns every rule and record parcel combined.
- `#toPlainResult()` — instance method. Returns a serializable `PlainResult`: `{ hasError, violated: [{ originObjectColumnId, operatorKey, errorMessage }], errored: [{ originObjectColumnId, operatorKey, evaluationError }], violatedRecords: [{ key, errorMessage }], erroredRecords: [{ key, evaluationError }] }`.

## Class: `DirectorySuiteLoader` (optional adapter — `lib/adapters/index.js`)

Loads operator suite classes from a directory tree (recursively, path-sorted for deterministic last-wins registration) so a host can drop `*.js` suite files into a folder instead of listing classes explicitly. Kept out of the core entry point so the core has zero filesystem/runtime dependencies.

- `.create({ directoryPath, importer = <dynamic import()> })` — static factory method. `importer` is injectable (for tests); defaults to a thin wrapper over dynamic `import()`.
- `#loadSuites()` — instance method, `async`. Returns `Promise<Array<typeof BaseConditionSuite>>` — every `*.js` file under `directoryPath` (recursive) whose module has a `default` export, filtered to non-`null`/non-`undefined` and path-sorted. The result is passed straight to `ValidationEngine.create({ suites, resolver })`.

## Built-in Operator Suites (`builtinSuites`, 38 classes)

All 38 extend `BaseConditionSuite` (several via an intermediate `Base*ConditionSuite` that adds a shared coercion/normalization helper — `BaseStringConditionSuite#normalize()`, `BaseNumberConditionSuite#toNumber()`, `BaseDateConditionSuite#toTime()`/`#now()`, `BaseEqualityConditionSuite#formatValue()` — none of which are exported). Every suite shares the same member shape, so it is documented once here rather than 38 times:

| notation | members |
| :-- | :-- |
| `.create()` | static factory (no arguments) — shared by every suite below |
| `#get:operatorKey` | instance getter, returns the matching `VALIDATION_TYPE` constant — shared by every suite below |
| `#evaluate({ subject, operands, options, context })` | instance method, returns `boolean` (all built-ins are synchronous) |

**General rule**: almost every operator treats an empty subject (`null`, or an all-whitespace string, per `BaseConditionSuite#isEmpty()`) as a vacuous **pass** (`true`) — presence is `REQUIRED`'s job alone. Exceptions to "empty passes" are called out explicitly below.

### String

- **`RequiredConditionSuite`** (`REQUIRED`) — the subject must be present (not empty). **The only operator that fails on an empty value** — every other operator treats an empty subject as satisfied.
- **`MinLengthConditionSuite`** (`MIN_LENGTH`) — `String(subject).length >= operands.length`. Empty subject passes.
- **`MaxLengthConditionSuite`** (`MAX_LENGTH`) — `String(subject).length <= operands.length`. Empty subject passes.
- **`ExactLengthConditionSuite`** (`EXACT_LENGTH`) — `String(subject).length === operands.length`. Empty subject passes.
- **`RegexConditionSuite`** (`REGEX`) — `subject` matches `new RegExp(operands.pattern, options.flags)`. Empty subject passes. **A malformed `pattern` throws** (`SyntaxError` from `RegExp`), which propagates out of `evaluate()` and is caught by `ValidationEngine#execute` as an errored (not violated) result — a configuration error, not a business violation.
- **`UrlConditionSuite`** (`URL`) — `subject` parses as a valid URL (`new URL(...)`). Empty subject passes. `operands.protocols` (optional array, e.g. `['https']`, without the colon) restricts the accepted scheme. `options.requireProtocol` (default `true`); when `false`, a scheme-less string (e.g. `example.com/x`) is retried with an assumed `http://` prefix before being rejected.
- **`ContainsConditionSuite`** (`CONTAINS`) — normalized `subject` includes normalized `operands.substring` (`options.caseSensitive` default `false`, `options.trimWhitespace` default `true`). Empty subject passes.
- **`NotContainsConditionSuite`** (`NOT_CONTAINS`) — the negation of `CONTAINS`. Empty subject passes.
- **`InStringConditionSuite`** (`IN_STRING`) — normalized `subject` equals one of normalized `operands.allowedValues`. Empty subject passes.
- **`NotInStringConditionSuite`** (`NOT_IN_STRING`) — normalized `subject` equals none of normalized `operands.disallowedValues`. Empty subject passes.

### Number

- **`MinConditionSuite`** (`MIN`) — numeric `subject >= operands.threshold` (`>` when `options.inclusive` is `false`, default `true`). Empty subject passes; a non-numeric subject or threshold is **violated**.
- **`MaxConditionSuite`** (`MAX`) — numeric `subject <= operands.threshold` (`<` when `options.inclusive` is `false`). Empty subject passes; non-numeric is violated.
- **`BetweenConditionSuite`** (`BETWEEN`) — numeric `subject` within `operands.min`..`operands.max`, each bound inclusive unless `options.minInclusive`/`options.maxInclusive` is `false`. Empty subject passes; non-numeric subject or bound is violated.
- **`IntegerConditionSuite`** (`INTEGER`) — `subject` coerces to a number and `Number.isInteger(value)`. Empty subject passes; non-integer or non-numeric is violated.
- **`DecimalConditionSuite`** (`DECIMAL`) — numeric `subject` fits within `options.precision` total digits and `options.scale` decimal places. Empty subject passes; non-numeric subject, or a missing `precision`/`scale`, is violated.
- **`InNumberConditionSuite`** (`IN_NUMBER`) — numeric `subject` equals one of `operands.allowedValues` (each coerced to a number). Empty subject passes; non-numeric subject is violated.
- **`NotInNumberConditionSuite`** (`NOT_IN_NUMBER`) — numeric `subject` equals none of `operands.disallowedValues`. Empty subject passes; a non-numeric subject also passes (it cannot equal any disallowed number).

### Date / Datetime

- **`MinDateConditionSuite`** (`MIN_DATE`) — `subject` date is on/after `operands.date` (strictly after when `options.inclusive` is `false`). Empty subject passes; unparseable subject or bound is violated.
- **`MaxDateConditionSuite`** (`MAX_DATE`) — `subject` date is on/before `operands.date` (strictly before when `options.inclusive` is `false`). Empty subject passes; unparseable is violated.
- **`BetweenDatesConditionSuite`** (`BETWEEN_DATES`) — `subject` date within `operands.minDate`..`operands.maxDate`, each bound inclusive unless `options.minInclusive`/`options.maxInclusive` is `false`. Empty subject passes; unparseable subject or bound is violated.
- **`FutureDateConditionSuite`** (`FUTURE`) — `subject` date is after `operands.currentDate` (or "now" when omitted); `options.allowPresent` (default `true`) lets "now" itself count as future. Empty subject passes; unparseable subject is violated.
- **`PastDateConditionSuite`** (`PAST`) — `subject` date is before `operands.currentDate` (or "now"); `options.allowPresent` (default `true`) lets "now" count as past. Empty subject passes; unparseable subject is violated.
- **`GreaterThanDatetimeConditionSuite`** (`GREATER_THAN_DATETIME`) — `subject` datetime strictly after `operands.datetime`. **Also usable as a trigger condition**: compares directly, so an empty or unparseable subject/target is **violated, not skipped**.
- **`LessThanDatetimeConditionSuite`** (`LESS_THAN_DATETIME`) — `subject` datetime strictly before `operands.datetime`. Same "not skipped when empty" behavior as above.
- **`GreaterThanOrEqualDatetimeConditionSuite`** (`GREATER_THAN_OR_EQUAL_DATETIME`) — `subject` datetime at/after `operands.datetime`. Same "not skipped when empty" behavior.
- **`LessThanOrEqualDatetimeConditionSuite`** (`LESS_THAN_OR_EQUAL_DATETIME`) — `subject` datetime at/before `operands.datetime`. Same "not skipped when empty" behavior.

### Boolean

- **`IsTrueConditionSuite`** (`IS_TRUE`) — `subject === true` (strict). Empty subject passes; any other non-empty value (including `false`, `0`, `'true'`) is violated.
- **`IsFalseConditionSuite`** (`IS_FALSE`) — `subject === false` (strict). Empty subject passes; any other non-empty value (including `true`, `0`, `'false'`) is violated.

### File

- **`FileSizeConditionSuite`** (`FILE_SIZE`) — numeric `subject` (a byte count) within optional `operands.minBytes`/`operands.maxBytes` (either bound may be omitted). Empty subject passes; non-numeric subject, or a supplied non-numeric bound, is violated.
- **`FileTypeConditionSuite`** (`FILE_TYPE`) — `subject` (a MIME type string) is one of `operands.mimeTypes`, compared case-insensitively. Empty subject passes.

### Equality / Existence / Membership

- **`EqualsConditionSuite`** (`EQUALS`) — `subject` equals `operands.comparison` after normalization (dates/datetime strings compare by parsed instant; plain strings use `caseSensitive`/`trimWhitespace`). **Compares directly — no empty skip**; an empty subject equals only another empty value. Also usable as a trigger (e.g. `status == 'PUBLISHED'`).
- **`NotEqualsConditionSuite`** (`NOT_EQUALS`) — the negation of `EQUALS`. Same direct-comparison, no-empty-skip behavior.
- **`InConditionSuite`** (`IN`) — `subject` is one of `operands.values` (string members compared with `options.caseSensitive`/`options.trimWhitespace`; non-strings compared as-is). When `subject` is itself an array, `options.matchAny` (default `true`) requires at least one element to match; `false` requires every element to match. **Compares directly — does not skip an empty subject**; an empty `operands.values` always violates.
- **`IsNullConditionSuite`** (`IS_NULL`) — `subject === null || subject === undefined`. A presence predicate — does **not** skip empty and does not treat a blank string as null.
- **`ExistsConditionSuite`** (`EXISTS`) — `subject` is neither `null` nor `undefined`, regardless of type (an empty string, `0`, `false`, `[]` all count as existing). A presence predicate — does not skip empty. (Defined by this package to cover the general `EXISTS` key; the legacy engine only had the typed variants below.)
- **`ExistsPrimitiveConditionSuite`** (`EXISTS_PRIMITIVE`) — `subject` is a present primitive: a non-blank string (unless `options.allowEmptyString` is `true`), a boolean, a non-`NaN` number, or a valid `Date`. Does not skip empty.
- **`ExistsArrayConditionSuite`** (`EXISTS_ARRAY`) — `subject` is a non-empty array. Does not skip empty (nullish / non-array / empty-array all violate).
- **`ExistsObjectConditionSuite`** (`EXISTS_OBJECT`) — `subject` is a non-empty plain object (not an array, not a `Date`). Does not skip empty.

## Usage

```js
import {
  ValidationEngine,
  BaseValueResolver,
  BaseCustomValidationSuite,
} from '@openreachtech/mentsu-validation-rules'

// 1. Implement the host's value resolver (turns a ValueSource into a concrete value).
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
      default:
        return null
    }
  }
}

// 2. (Optional) Define a custom async operator.
class UniqueEmailConditionSuite extends BaseCustomValidationSuite {
  get operatorKey () {
    return 'CUSTOM_UNIQUE_EMAIL'
  }

  async evaluate ({ subject, context }) {
    const duplicate = await context.db.findByEmail({ email: subject })
    return duplicate === null
  }
}

// 3. Build the engine and evaluate.
const engine = ValidationEngine.create({
  resolver: RecordValueResolver.create({ record, columnFieldMap: PRODUCT_COLUMN_FIELD_MAP }),
  customSuites: [UniqueEmailConditionSuite],
  context: { db },
})

const parcel = await engine.execute({ rules, record })

if (parcel.hasEvaluationError()) {
  // Configuration mistake (unknown operator, resolver failure, bad regex) — not a business violation.
  console.error('validation misconfiguration', parcel.extractErroredRules())
}

if (parcel.hasValidationError()) {
  const { violated } = parcel.toPlainResult()
  // violated: [{ originObjectColumnId, operatorKey, errorMessage }, ...]
}
```
