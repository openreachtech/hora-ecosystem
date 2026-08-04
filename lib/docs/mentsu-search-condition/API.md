# API

Source: `types/index.d.ts` (shipped `.d.ts`; cross-checked against the JSDoc in
`lib/SearchConditionParser.js`, `lib/SearchConditionValidator.js`, and
`lib/constants.js`).

## Exports (`index.js`)

`index.js` is `export * from './lib/index.js'`, which re-exports:

- `export { SearchConditionParser }` — the wire ↔ canonical parser class.
- `export { SearchConditionValidator }` — the structural validator class.
- `export * from './constants.js'` — the canonical schema vocabulary:
  `OPERATOR_CATEGORY`, `LOGICAL_OPERATOR_KEY`, `LOGICAL_OPERATOR`, `OPERATOR_KEY`,
  `OPERATOR_KEYS_WITHOUT_VALUE`, `FIELD_DATA_CATEGORY`, `UNSET_OPERATOR_ID`,
  `VALIDATION_ISSUE_CODE`, `DEFAULT_MAX_TREE_DEPTH`.

No default export.

## The canonical data model

A **search condition** is a recursive tree. Every node is one of two shapes
(declared in `types/index.d.ts` as `CanonicalNode = CanonicalLogicalNode |
CanonicalFieldNode`):

- **`CanonicalLogicalNode`** — `{ operatorCategory: 'LOGICAL', operatorKey: 'AND'
  | 'OR' | null, operatorId: number, children: CanonicalNode[] }`. Composes its
  `children` with a boolean operator. `operatorKey` is the stable identity;
  `operatorId` is the legacy master-data id (`LOGICAL_OPERATOR.AND.ID` = 101,
  `LOGICAL_OPERATOR.OR.ID` = 201), kept only so the parser can round-trip the
  id-keyed wire shape.
- **`CanonicalFieldNode`** — `{ operatorCategory: 'FIELD', operatorKey: string |
  null, operatorId: number, originObjectColumnId: number | null, filterValue:
  FilterValue | null, filterValueMultiple: FilterValue[], dynamicValueTypeId:
  number | null, dynamicValueOffsetUnitId: number | null,
  dynamicValueOffsetValue: number | null }`. A leaf predicate: one column, one
  operator (from `OPERATOR_KEY`, e.g. `EQUALS`, `IN`, `IS_NULL`, `BETWEEN`,
  `IN_LAST`), and a value carried as a single `filterValue`, a
  `filterValueMultiple` list, or a dynamic value (`dynamicValueTypeId` + offset).
  Every field is always present, filled with `null` / `[]` when unused —
  operators in `OPERATOR_KEYS_WITHOUT_VALUE` (e.g. `IS_NULL`, `IS_EMPTY`,
  `IS_TRUE`, `EXISTS`) carry no value at all.
- **`FilterValue`** — `{ displayValue: string | null, actualValue: string |
  null }`. `actualValue` is what a consuming backend filters on; `displayValue`
  is the persisted UI label. Both are persisted data, not frontend editing
  state.
- **`SearchConditionWireInput`** — the id-keyed shape the parser serializes to
  (the GraphQL `ListViewSearchConditionInput`). Same fields as a canonical node
  minus `operatorKey` (the input schema omits it), plus `children` present on
  every node (empty array on a FIELD node).

The package never builds SQL, Elasticsearch, or any other query — it only
produces/consumes this canonical tree and the wire shape. Turning the tree into
an actual query filter is the consuming backend's job.

## Class: `SearchConditionParser`

Maps a search condition between the id-keyed GraphQL **wire** shape and the
**canonical** model, via two pure, recursive, non-mutating transforms.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ logicalOperators = Object.values(LOGICAL_OPERATOR) } = {})` —
  static factory method. Returns an instance of `SearchConditionParser` (or
  subclass, via `this`), configured with the `{ ID, KEY }` master-data entries
  used to bridge a logical node's `operatorKey` ↔ `operatorId`. Defaults to both
  built-in logical operators (`AND`, `OR`).
- `#parse({ node })` — instance method. Parses one wire node (typed `unknown`,
  since it's untrusted input) into a `CanonicalNode`, recursively. Derives
  `operatorCategory` when the wire omits it (a node with non-empty `children` or
  a recognised logical operator is `LOGICAL`, otherwise `FIELD`), bridges a
  logical node's id/key, and normalizes every field value to `{ displayValue,
  actualValue }`. Returns `null` when `node` is nullish or omitted.
- `#serialize({ node })` — instance method. The inverse transform: maps a
  `CanonicalNode` the caller already owns into a `SearchConditionWireInput`,
  recursively. Supplies a logical node's `operatorId` from its `operatorKey`
  when needed, and drops `operatorKey` itself (the wire input schema doesn't
  carry it). Returns `null` when `node` is nullish or omitted.

Other members (`parseNode`, `parseLogicalNode`, `parseFieldNode`,
`resolveOperatorCategory`, `findLogicalOperator`, `serializeNode`,
`serializeLogicalNode`, `serializeFieldNode`, `normalizeFilterValue`,
`normalizeFilterValueMultiple`, `isNullish`, and the `logicalOperators`
instance property) are internal recursion/normalization helpers not declared in
the shipped `types/index.d.ts`, so they are treated as non-public and omitted
here.

## Class: `SearchConditionValidator`

Structural validator for a search-condition tree, meant to run at save/load
time — before any query is generated and independent of record data — on both
the frontend (before save) and the backend (defensively, at the resolver
boundary).

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ maxDepth = DEFAULT_MAX_TREE_DEPTH, knownOperatorKeys =
  Object.values(OPERATOR_KEY) } = {})` — static factory method. Returns an
  instance of `SearchConditionValidator` (or subclass, via `this`), configured
  with the injected policy: `maxDepth` (nesting limit, root is depth 0) and
  `knownOperatorKeys` (the field-operator catalog membership is checked
  against).
- `#validate({ tree })` — instance method. Walks the whole tree and returns
  **every** structural problem found, each as a `ValidationIssue` — `{ path,
  code, message }`, where `path` locates the node (`$`, `$.children[0]`, …) and
  `code` is one of the stable `VALIDATION_ISSUE_CODE` values. An empty array
  means the tree is structurally valid. Checks include: the root must be a
  `LOGICAL` node and the tree must contain at least one configured field node;
  every node must have a valid `operatorCategory` and respect `maxDepth`; a
  `LOGICAL` node's `operatorKey` must be `AND`/`OR` and its `children` a
  non-empty array; a `FIELD` node's `operatorKey` must be present and known,
  its `originObjectColumnId` a number, and its value must be present/absent in
  accordance with whether the operator is in `OPERATOR_KEYS_WITHOUT_VALUE`.
  Column-aware checks (operator↔column allow-lists, per-widget value rules) are
  intentionally **not** performed here — they belong to the crm-kit editing
  overlay, which composes this validator and adds its own issues.

Other members (`buildRootIssues`, `validateNode`,
`buildOperatorCategoryIssues`, `buildDepthIssues`, `validateLogicalNode`,
`buildLogicalOperatorIssues`, `buildChildrenIssues`, `validateFieldNode`,
`buildFieldOperatorIssues`, `buildColumnIssues`, `buildValueCoherenceIssues`,
`buildValueForbiddenIssues`, `buildValueRequiredIssues`, `hasAnyValue`,
`hasConfiguredFieldNode`, `isLogicalNode`, `isValuelessOperator`,
`isKnownOperatorKey`, `isPlainObject`, `isNullish`, `buildIssue`, and the
`maxDepth` / `knownOperatorKeys` instance properties) are internal — each rule
is its own method so a host can subclass and override one rule without
rewriting the walk, but none is declared in `types/index.d.ts`, so they are
treated as non-public and omitted here.

> Neither class's JSDoc uses `@public` tags. The shipped `types/index.d.ts`
> declares only `create`/`parse`/`serialize` (Parser) and `create`/`validate`
> (Validator) as the classes' members, so that file — not a `@public` tag — is
> treated as the authoritative boundary of the public surface for this package.

## Constants

Exported alongside the two classes as the canonical schema vocabulary (all from
`lib/constants.js`, re-declared in `types/index.d.ts`):

- `OPERATOR_CATEGORY` — `{ LOGICAL: 'LOGICAL', FIELD: 'FIELD' }`.
- `LOGICAL_OPERATOR_KEY` — `{ AND: 'AND', OR: 'OR' }`, the `operatorKey` values
  allowed on a logical node.
- `LOGICAL_OPERATOR` — `{ AND: { ID: 101, KEY: 'AND' }, OR: { ID: 201, KEY: 'OR'
  } }`, the logical-operator master data (`SearchConditionParser.create`'s
  default `logicalOperators`).
- `OPERATOR_KEY` — the full catalog of field-operator keys (`EQUALS`, `IN`,
  `IS_NULL`, `CONTAINS`, `BETWEEN`, `IN_LAST`, `FULLTEXT_MATCH_NATURAL`, …),
  ported from cloudlink's operator catalog.
- `OPERATOR_KEYS_WITHOUT_VALUE` — the subset of `OPERATOR_KEY` that must carry
  no value (`IS_NULL`, `IS_NOT_NULL`, `IS_EMPTY`, `IS_NOT_EMPTY`, `IS_TRUE`,
  `IS_FALSE`, and the `EXISTS`/`NOT_EXISTS` variants).
- `FIELD_DATA_CATEGORY` — the kind of data a column holds (`STRING`, `NUMBER`,
  `INTEGER`, `FLOAT`, `BOOLEAN`, `DATE`, `TIME`, `DATETIME`, `EMAIL`); the
  widget a category maps to is a frontend concern, not modelled here.
- `UNSET_OPERATOR_ID` — `0`; the operator id on a freshly created, not-yet
  configured field node. The parser treats a node with this id and no
  `operatorKey` as unconfigured.
- `VALIDATION_ISSUE_CODE` — the stable machine-readable codes attached to every
  `ValidationIssue` (e.g. `tree.rootMustBeLogical`, `field.valueRequired`,
  `logical.childrenEmpty`), kept identical to the frontend's reference codes so
  the crm-kit overlay can map an issue straight onto a node.
- `DEFAULT_MAX_TREE_DEPTH` — `5`; the fallback nesting limit used by
  `SearchConditionValidator.create` when `maxDepth` isn't supplied.

## Usage

```js
import {
  SearchConditionParser,
  SearchConditionValidator,
} from '@openreachtech/mentsu-search-condition'

const parser = SearchConditionParser.create()

// wire (from the GraphQL listView query) -> canonical
const tree = parser.parse({ node: wireSearchCondition })

// validate structurally before use (both frontend and backend)
const validator = SearchConditionValidator.create({ maxDepth: 5 })
const issues = validator.validate({ tree })

if (issues.length > 0) {
  // every problem, as { path, code, message }
}

// canonical -> wire input (for create/update-list-view)
const wireInput = parser.serialize({ node: tree })
```
