# API

Source: `types/index.d.ts` (cross-checked against JSDoc in `lib/`). No member in the source is tagged `@public`; the surface below is the full set of exports the `.d.ts` declares, i.e. the package's natural consumer-facing API.

## Exports (`index.js`)

All exports are named (no default export). Grouped as declared in `index.js`:

- Constants — `FIELD_OPERATOR_KEY`, `LOGICAL_OPERATOR_KEY`, `SOURCE_VALUE_TYPE`, `VALIDATION_OPERATOR_CATEGORY`
- Condition tree tools — `ConditionParser`, `ConditionSerializer`, `ConditionSchemaValidator`, `ConditionEvaluator`, `SuiteRegistry`, `ReferencedColumnIdsCollector`, `FIELD_CONDITION_SUITE_CONSTRUCTORS`
- Condition suites — `BaseFieldConditionSuite`, `BaseMembershipConditionSuite`, `ContainsConditionSuite`, `EqualsConditionSuite`, `InConditionSuite`, `IsNotNullConditionSuite`, `IsNullConditionSuite`, `NotEqualsConditionSuite`, `NotInConditionSuite`
- Path group definition — `PathGroupCloseStatusConfig`, `PathGroupDefinition`, `PathGroupDefinitionParser`, `PathGroupDefinitionValidator`, `PathGroupDisplayColumn`, `PathGroupSelector`, `PathGroupStatusOrder`, `PathGroupStatusTargetColumn`

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

Every class below also exposes a `.create(params)` static factory that just does `new this(params)` (so it also works for a subclass via `this`); this is omitted from the per-class bullet lists below to avoid repetition, except where it defaults or coerces something.

## Constants

- `VALIDATION_OPERATOR_CATEGORY` — `{ FIELD: 'FIELD', LOGICAL: 'LOGICAL' }`. The two node categories in a condition tree.
- `LOGICAL_OPERATOR_KEY` — `{ AND: 'AND', OR: 'OR' }`. `operatorKey` values for a `LOGICAL` node.
- `SOURCE_VALUE_TYPE` — `{ FIXED_VALUE: 'FIXED_VALUE', FIELD_REFERENCE: 'FIELD_REFERENCE', DYNAMIC_VALUE: 'DYNAMIC_VALUE' }`. `sourceValueType` values for a condition hand's value source.
- `FIELD_OPERATOR_KEY` — `{ EQUALS, NOT_EQUALS, CONTAINS, IN, NOT_IN, IS_NULL, IS_NOT_NULL }`. `operatorKey` values for a `FIELD` node.
- `FIELD_CONDITION_SUITE_CONSTRUCTORS` — plain array (not a class) of the 7 built-in FIELD suite constructors, in the order `[ContainsConditionSuite, EqualsConditionSuite, InConditionSuite, IsNotNullConditionSuite, IsNullConditionSuite, NotEqualsConditionSuite, NotInConditionSuite]`. Used as `SuiteRegistry`'s default suite list; spread it to add a custom suite (`[...FIELD_CONDITION_SUITE_CONSTRUCTORS, MySuite]`).

## Condition tree data shapes (not exported as classes)

Plain object shapes passed to/from the tools below. Not runtime classes/exports — documented here because every condition-tree API takes or returns them.

- **ConditionNode** — `{ operatorCategory?, operatorKey?, children?: ConditionNode[], leftHand?: ValueSource, rightHand?: ValueSource }`. `{}` (no keys) always means "no condition / always passes".
- **ValueSource** — one of:
  - `{ sourceValueType: 'FIXED_VALUE', value: unknown }`
  - `{ sourceValueType: 'FIELD_REFERENCE', value: { sourceOriginObjectColumnId: number, sourceFieldPath: string } }`
  - `{ sourceValueType: 'DYNAMIC_VALUE', value: { dynamicValueTypeId, dynamicValueTypeKey, dynamicValueTypeDisplayName, dynamicValueOffsetUnitId, dynamicValueOffsetUnitKey, dynamicValueOffsetValue } }`
- **ExtractedValue** — `string | number | boolean | Date | Array<*> | null`; the shape a hand resolves to after `ValueResolver.resolveValueSource()`.
- **ValueResolver** — host-supplied duck-typed contract: `{ resolveValueSource ({ valueSource }): ExtractedValue }`. The package never implements this itself and never touches storage; the host supplies an object satisfying it.

## Class: `ConditionParser`

Parses a stored condition JSON string into a condition tree object (the counterpart of `ConditionSerializer`).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |

- `#conditionJson` — instance property, the JSON string (or `null`) passed at construction.
- `#parseCondition()` — instance method. A nullish/empty `conditionJson` returns `null` (no condition). Otherwise `JSON.parse`s it; if the parsed result is not an `Object` it returns `null`; if the JSON itself is malformed it **throws** `Error` with `{ cause: <original error> }`.

## Class: `ConditionSerializer`

Serializes a condition tree object back into its stored JSON string form (the counterpart of `ConditionParser`).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |

- `#condition` — instance property, the condition tree (or `null`) passed at construction.
- `#serializeCondition()` — instance method. A nullish held condition returns `null`; otherwise returns `JSON.stringify(condition)`.

## Class: `ConditionSchemaValidator`

Validates that a condition tree matches the grammar (node categories, operator keys, `children` shape of `LOGICAL` nodes, value-source shape of `FIELD` hands). Returns every violation as a string message carrying the node path (e.g. `"condition.children[0]: unknown FIELD operatorKey \"FOO\""`); an empty array means the tree is valid.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ condition, allowedFieldOperatorKeys = this.collectAllowedFieldOperatorKeys() })` — static factory; defaults `allowedFieldOperatorKeys` to every built-in `FIELD_OPERATOR_KEY` value. Pass a superset (e.g. `[...Object.values(FIELD_OPERATOR_KEY), 'MY_CUSTOM_OP']`) to allow a custom operator key through validation.
- `.collectAllowedFieldOperatorKeys()` — static method, returns `Object.values(FIELD_OPERATOR_KEY)`.
- `#condition` / `#allowedFieldOperatorKeys` — instance properties.
- `#validateCondition()` — instance method. Entry point; validates from the root (`nodePath: 'condition'`).
- `#validateNode({ condition, nodePath })` — instance method. `{}`/nullish returns `[]` (valid); dispatches to `validateLogicalNode` or `validateFieldNode` by `operatorCategory`; an unrecognized category yields one violation.
- `#validateLogicalNode({ condition, nodePath })` — checks `operatorKey` is `AND`/`OR`, that `children` is an array (else short-circuits with just that violation plus the operator-key one), and recurses into each child.
- `#validateFieldNode({ condition, nodePath })` — checks `operatorKey` against `allowedFieldOperatorKeys`; `leftHand` is **required** (missing → violation); `rightHand` is optional (single-hand operators like `IS_NULL`/`IS_NOT_NULL` may omit it — no violation if absent, but validated if present).
- `#validateValueSource({ valueSource, nodePath })` — checks `sourceValueType` is a known `SOURCE_VALUE_TYPE`; for `FIELD_REFERENCE` also delegates to `validateFieldReferenceValue`.
- `#validateFieldReferenceValue({ valueSource, nodePath })` — checks `value.sourceOriginObjectColumnId` is a `number` and `value.sourceFieldPath` is a `string`.

## Class: `ConditionEvaluator`

Evaluates a condition tree against a `ValueResolver`, returning whether it holds. Walks `LOGICAL` `AND`/`OR` nodes recursively; for a `FIELD` leaf, resolves both hands through the injected resolver and asks the matching suite. Used for both display-column/selection-condition visibility.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ valueResolver, suiteRegistry = this.createSuiteRegistry() })` — static factory; `valueResolver` has no default (required); `suiteRegistry` defaults to a fresh registry of only the 7 built-in suites.
- `.get SuiteRegistryCtor()` — returns `SuiteRegistry` (override point for a custom registry class).
- `.createSuiteRegistry()` — returns `this.SuiteRegistryCtor.create()`.
- `#valueResolver` / `#suiteRegistry` — instance properties.
- `#evaluateCondition({ condition })` — instance method. Nullish or `{}` condition → `true` (always passes). Dispatches on `operatorCategory` to `evaluateLogicalNode`/`evaluateFieldNode`; an unrecognized/missing category → `true`.
- `#evaluateLogicalNode({ condition })` — empty/missing `children` → `true`; `AND` → `children.every(...)`; `OR` → `children.some(...)`; unrecognized `operatorKey` → `true`.
- `#evaluateFieldNode({ condition })` — looks up the suite for `condition.operatorKey` via the suite registry; **no matching suite → `false`** (fails closed, does not throw). Otherwise resolves `leftHand`/`rightHand` via `valueResolver.resolveValueSource()` and returns `suite.isSatisfied({ leftHand, rightHand })`.

## Class: `SuiteRegistry`

Registry of `BaseFieldConditionSuite` instances, looked up by operator key.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |

- `.create({ SuiteConstructors = FIELD_CONDITION_SUITE_CONSTRUCTORS } = {})` — static factory. Instantiates one suite per constructor (`SuiteConstructor.create()`). To add an operator, extend `BaseFieldConditionSuite` and pass `SuiteConstructors: [...FIELD_CONDITION_SUITE_CONSTRUCTORS, MySuite]`.
- `#suites` — instance property, array of suite instances.
- `#extractSuite({ operatorKey })` — instance method. Returns the first suite whose `operatorKey` matches, or `null` if none.

## Class: `ReferencedColumnIdsCollector`

Collects the `FIELD_REFERENCE` targets a condition tree refers to, so a host can hydrate exactly the columns/associations a condition needs before evaluation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |

- `#condition` — instance property.
- `#collectReferencedColumnIds()` — instance method. Returns the **distinct** (`Set`-deduplicated), truthy `sourceOriginObjectColumnId` values across every `FIELD_REFERENCE` hand in the tree.
- `#collectReferencedFieldPaths()` — instance method. Same, but for distinct truthy `sourceFieldPath` values.
- `#extractFieldReferenceValues({ condition })` — instance method. `{}` → `[]`; if `condition.children` is an array, recurses into each child and flattens; otherwise collects `leftHand`/`rightHand` that are `FIELD_REFERENCE` sources and returns their `.value`.
- `#isFieldReferenceValueSource({ valueSource })` — instance method. `valueSource.sourceValueType === SOURCE_VALUE_TYPE.FIELD_REFERENCE`.

## Condition suites

One suite class per `FIELD` operator key. Every concrete suite is stateless (only overrides `static get operatorKey()` and `isSatisfied()`); `ConditionEvaluator` resolves both hands before calling `isSatisfied()`, so suites never touch storage or a resolver themselves.

### Class: `BaseFieldConditionSuite` (abstract base)

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create()` — static factory. Seeds the new instance's `operatorKey` from `this.operatorKey` (the concrete subclass's static getter); i.e. call `.create()` on the concrete suite class, not on the base class directly.
- `.get operatorKey()` — abstract static getter; base implementation **throws** `Error('Static getter operatorKey must be implemented.')`. Each concrete suite overrides it to return its `FIELD_OPERATOR_KEY` value.
- `#operatorKey` — instance property, set from the constructor/`.create()`.
- `#isSatisfied({ leftHand, rightHand })` — abstract instance method; base implementation **throws** `Error('Method isSatisfied() must be implemented.')`. `rightHand` is present in the signature for every suite but single-hand operators (`IS_NULL`/`IS_NOT_NULL`) ignore it.

### Class: `BaseMembershipConditionSuite` (abstract, extends `BaseFieldConditionSuite`)

Base for the two membership operators (`IN` / `NOT_IN`); normalizes the right-hand value into an array before the concrete suite tests membership.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |

- `#extractArray({ value })` — instance method. Returns `value` as-is if `Array.isArray(value)`; otherwise delegates to `parseJsonArray`.
- `#parseJsonArray({ value })` — instance method. Returns `null` if `value` is not a string; otherwise `JSON.parse`s it and returns the parsed array, or `null` if parsing fails or the parsed value is not an array.

### Class: `EqualsConditionSuite` (`operatorKey: 'EQUALS'`)

- `#isSatisfied({ leftHand, rightHand })` — `leftHand === rightHand` (strict equality).

### Class: `NotEqualsConditionSuite` (`operatorKey: 'NOT_EQUALS'`)

- `#isSatisfied({ leftHand, rightHand })` — `leftHand !== rightHand` (strict inequality).

### Class: `ContainsConditionSuite` (`operatorKey: 'CONTAINS'`)

- `#isSatisfied({ leftHand, rightHand })` — `false` if either hand is `null`; otherwise `String(leftHand).includes(String(rightHand))`.

### Class: `InConditionSuite` (extends `BaseMembershipConditionSuite`, `operatorKey: 'IN'`)

- `#isSatisfied({ leftHand, rightHand })` — extracts `rightHand` as an array (see `extractArray`); if it isn't array-like (extraction yields `null`), returns `false`; otherwise `members.includes(leftHand)`.

### Class: `NotInConditionSuite` (extends `BaseMembershipConditionSuite`, `operatorKey: 'NOT_IN'`)

- `#isSatisfied({ leftHand, rightHand })` — extracts `rightHand` as an array; **if it isn't array-like, returns `false`** (not `true` — a non-array right-hand never passes this operator either, mirroring `InConditionSuite`'s requirement); otherwise `!members.includes(leftHand)`.

### Class: `IsNullConditionSuite` (`operatorKey: 'IS_NULL'`, single-hand — ignores `rightHand`)

- `#isSatisfied({ leftHand })` — `true` if `leftHand` is one of `[null, '', 'null', 'undefined']` (an actual `null`, empty string, or the literal strings `'null'`/`'undefined'` all count as null-like).

### Class: `IsNotNullConditionSuite` (`operatorKey: 'IS_NOT_NULL'`, single-hand — ignores `rightHand`)

- `#isSatisfied({ leftHand })` — the negation of `IsNullConditionSuite`'s check: `true` unless `leftHand` is one of `[null, '', 'null', 'undefined']`.

## Path group definition value classes

Plain value-holder classes composing a `PathGroupDefinition`. Each has a `.create(params)` factory (just `new this(params)`) and boolean `hasValid*`/`hasFilled*` predicates consumed by `PathGroupDefinitionValidator` — construction itself never throws or coerces.

### Class: `PathGroupStatusTargetColumn`

Which origin object column carries the path group status, and the optional column displayed alongside it.

- `#statusTargetOriginObjectColumnId` (`number`), `#displayOriginObjectColumnId` (`number | null`, `null` = no display column) — instance properties.
- `#hasValidStatusTargetOriginObjectColumnId()` — `Number.isFinite(this.statusTargetOriginObjectColumnId)`.

### Class: `PathGroupStatusOrder`

One stage of the pipeline: the status column value the stage matches, its position, and its guidance text.

- `#statusTargetOriginObjectColumnValue` (`string`), `#order` (`number`), `#guidance` (`string`) — instance properties.
- `#hasFilledStatusTargetOriginObjectColumnValue()` — `true` iff the value is a non-empty string.
- `#hasValidOrder()` — `Number.isFinite(this.order)`.

### Class: `PathGroupDisplayColumn`

One origin object column shown on the path group board and its display position.

- `#originObjectColumnId` (`number`), `#order` (`number`) — instance properties.
- `#hasValidOrder()` / `#hasValidOriginObjectColumnId()` — `Number.isFinite(...)` on the respective property.

### Class: `PathGroupCloseStatusConfig`

Which origin object column carries the close status, and the column values that mean a record is closed.

- `#closeStatusTargetOriginObjectColumnId` (`number`), `#closeStatusValues` (`Array<string>`) — instance properties.
- `#hasValidCloseStatusTargetOriginObjectColumnId()` — `Number.isFinite(...)`.
- `#hasFilledCloseStatusValues()` — `true` iff `closeStatusValues` is an array with `length > 0`.

### Class: `PathGroupDefinition`

The canonical path group definition both sides agree on: flat root fields, the selection condition (`{}` = always applies), and the four composed parts above.

- `#originObjectCategoryId` (`number`), `#name` (`string`), `#selectionOrder` (`number`), `#selectionCondition` (`ConditionNode`), `#statusTargetColumn` (`PathGroupStatusTargetColumn`), `#statusOrders` (`Array<PathGroupStatusOrder>`), `#displayColumns` (`Array<PathGroupDisplayColumn>`), `#closeStatuses` (`PathGroupCloseStatusConfig`) — instance properties.
- `#hasFilledName()` — non-empty string.
- `#hasSelectionCondition()` — `true` iff `selectionCondition` has at least one key (i.e. `{}` → `false`, meaning "always applies").
- `#hasUniqueStatusOrderValues()` — `true` iff every `statusOrders[].order` value is distinct (compares via a `Set`).
- `#hasValidOriginObjectCategoryId()` / `#hasValidSelectionOrder()` — `Number.isFinite(...)`.

## Class: `PathGroupDefinitionParser`

Normalizes a raw path group create/update payload (loose types, possibly missing fields) into a canonical `PathGroupDefinition` instance. Coerces id/order fields to `Number(...)` and text fields to `String(...)`, fills defaults, and sorts `statusOrders`/`displayColumns` ascending by `order`. **A missing/malformed part still produces an instance** — ids coerce to `NaN`, arrays default to `[]` — parsing never throws or validates; that is `PathGroupDefinitionValidator`'s job.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `#rawDefinition` — instance property, the raw payload passed at construction.
- `.get PathGroupDefinitionCtor()` / `.get PathGroupCloseStatusConfigCtor()` / `.get PathGroupDisplayColumnCtor()` / `.get PathGroupStatusOrderCtor()` / `.get PathGroupStatusTargetColumnCtor()` — static getters, override points returning the corresponding value class.
- `#get Ctor()` — instance getter, returns `this.constructor` (typed as `typeof PathGroupDefinitionParser`); used internally so subclass overrides of the static `*Ctor` getters take effect.
- `#parseDefinition()` — instance method, the entry point. Coerces `originObjectCategoryId` to `Number`, `name` to `String(... ?? '')`, `selectionOrder` to `Number(... ?? 1)` (defaults to `1` when absent), `selectionCondition` defaults to `{}`; delegates the four composed parts to the methods below; returns a `PathGroupDefinition`.
- `#parseStatusTargetColumn()` — instance method. `statusTargetOriginObjectColumnId` → `Number(...)`; `displayOriginObjectColumnId` defaults to `null` and stays `null` if explicitly `null`, otherwise coerced to `Number(...)`.
- `#parseStatusOrders()` — instance method. Maps `rawDefinition.statusOrders` (defaults to `[]`) through `parseStatusOrder`, then sorts ascending by `order`.
- `#parseStatusOrder({ rawStatusOrder })` — instance method. `statusTargetOriginObjectColumnValue` → `String(...)`; `order` → `Number(...)`; `guidance` → `String(... ?? '')` (defaults to empty string).
- `#parseDisplayColumns()` — instance method. Maps `rawDefinition.displayColumns` (defaults to `[]`) through `parseDisplayColumn`, then sorts ascending by `order`.
- `#parseDisplayColumn({ rawDisplayColumn })` — instance method. `originObjectColumnId` and `order` → `Number(...)`.
- `#parseCloseStatuses()` — instance method. `closeStatusTargetOriginObjectColumnId` → `Number(...)`; `closeStatusValues` defaults to `[]`, each entry coerced to `String(...)`.

## Class: `PathGroupDefinitionValidator`

Validates a `PathGroupDefinition` instance built by the parser. Asks each part's own `hasValid*`/`hasFilled*` predicates, plus the selection condition through `ConditionSchemaValidator`, and returns every violation as a string message carrying the field path (e.g. `"definition: name must be a non-empty string"`). An empty array means the definition is valid.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.get:staticGetter` | static getter |

- `.get ConditionSchemaValidatorCtor()` — static getter, override point returning `ConditionSchemaValidator`.
- `#definition` — instance property.
- `#get Ctor()` — instance getter, `this.constructor`.
- `#validateDefinition()` — instance method, the entry point. Concatenates the results of the six methods below.
- `#validateRootFields()` — `originObjectCategoryId`/`name`/`selectionOrder` checks.
- `#validateStatusTargetColumn()` — one violation if `statusTargetOriginObjectColumnId` isn't a valid number.
- `#validateStatusOrders()` — **requires a non-empty `statusOrders` array** (empty → one violation, and per-entry checks are skipped that call); otherwise validates each entry (`validateStatusOrder`) plus a whole-array "order values must be unique" check.
- `#validateStatusOrder({ statusOrder, index })` — per-entry column-value/order checks.
- `#validateDisplayColumns()` / `#validateDisplayColumn({ displayColumn, index })` — per-entry column-id/order checks (the array itself may be empty — no violation for that).
- `#validateCloseStatuses()` — column-id and non-empty-values checks.
- `#validateSelectionCondition()` — if `definition.hasSelectionCondition()` is `false` (i.e. `{}`, "always applies"), returns `[]` immediately without invoking the condition validator; otherwise creates a `ConditionSchemaValidator` and calls its `validateNode({ condition: definition.selectionCondition, nodePath: 'definition.selectionCondition' })`.
- `#createConditionSchemaValidator({ condition })` — instance method, `this.Ctor.ConditionSchemaValidatorCtor.create({ condition })`.

## Class: `PathGroupSelector`

Selects the one path group definition that applies to a record, out of several definitions for the same category. Each definition carries a `selectionCondition` and a `selectionOrder`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ definitions, valueResolver, conditionEvaluator = this.createConditionEvaluator({ valueResolver }) })` — static factory. Pass either `valueResolver` (a `ConditionEvaluator` is built for you) or a ready-made `conditionEvaluator` directly.
- `.get ConditionEvaluatorCtor()` — static getter, override point returning `ConditionEvaluator`.
- `.createConditionEvaluator({ valueResolver })` — static method, `this.ConditionEvaluatorCtor.create({ valueResolver })`.
- `#definitions` (`Array<PathGroupDefinition>`) / `#conditionEvaluator` (`ConditionEvaluator`) — instance properties.
- `#selectPathGroupDefinition()` — instance method. Sorts `definitions` ascending by `selectionOrder` (does not mutate the original array — uses `toSorted`), then returns the **first** definition whose `selectionCondition` evaluates to `true` via `conditionEvaluator.evaluateCondition(...)`. Since `{}` always evaluates to `true`, a catch-all definition should be given the highest `selectionOrder` so it's tried last. Returns `null` if no definition matches.

## Usage

```js
import {
  ConditionEvaluator,
  PathGroupDefinitionParser,
  PathGroupDefinitionValidator,
  PathGroupSelector,
  ReferencedColumnIdsCollector,
} from '@openreachtech/mentsu-path-group-schema'

// 1. Parse + validate a raw definition payload (e.g. from an admin form).
const parser = PathGroupDefinitionParser.create({
  rawDefinition: rawPayloadFromRequest,
})
const definition = parser.parseDefinition()

const violations = PathGroupDefinitionValidator.create({ definition })
  .validateDefinition()
if (violations.length > 0) {
  throw new Error(violations.join('\n'))
}

// 2. Know which columns/field paths a selectionCondition needs, before hydrating a record.
const referencedColumnIds = ReferencedColumnIdsCollector.create({
  condition: definition.selectionCondition,
}).collectReferencedColumnIds()

// 3. Resolve field references against a hydrated record (host-supplied contract).
const valueResolver = {
  resolveValueSource ({ valueSource }) {
    // ... look up valueSource.value.sourceFieldPath on the record, etc.
    return someResolvedValue
  },
}

// 4. Pick the definition (of several for the category) that applies to this record.
const selector = PathGroupSelector.create({
  definitions: [definition /* , ...otherDefinitionsForTheCategory */],
  valueResolver,
})
const selectedDefinition = selector.selectPathGroupDefinition()

// Or evaluate a single condition tree directly (e.g. a display column's visibility).
const evaluator = ConditionEvaluator.create({ valueResolver })
const isVisible = evaluator.evaluateCondition({
  condition: someDisplayColumnCondition,
})
```
