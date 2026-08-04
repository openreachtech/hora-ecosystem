# `@openreachtech/mentsu-search-condition`

The shared **list-view search-condition** contract: the canonical data model of a
list view's saved filter, a parser that maps it to/from the GraphQL wire shape,
and a structural validator. One package, used by **both** the frontend (crm-kit)
and the backend, so the two never drift on "what a search condition is" or "what
counts as valid".

Data schema only — **never** a DB schema. The package does not import Vue,
GraphQL, or a database, and it does **not** generate a query. Turning a canonical
tree into SQL / Elasticsearch is the consuming backend's job.

> Read [`docs/en/ai-context.md`](https://github.com/openreachtech/mentsu-search-condition/blob/main/docs/en/ai-context.md)
> for the full API reference and the backend integration contract.

## Install

GitHub Packages, with a token that has `read:packages`:

```ini
# .npmrc
@openreachtech:registry = https://npm.pkg.github.com
```

```sh
npm install @openreachtech/mentsu-search-condition
```

Pure ESM (`"type": "module"`), zero runtime dependencies.

## The model

A **search condition** is a recursive **tree** of **nodes**. Every node is one of:

- **Logical node** — groups `children` under a boolean `operatorKey` (`AND` / `OR`).
- **Field node** — a leaf predicate: one column (`originObjectColumnId`), one
  field `operatorKey`, and a value (`filterValue`, `filterValueMultiple`, or a
  dynamic value).

The **canonical** model is clean and id-keyed: `operatorCategory` is always set,
the stable `operatorKey` is the identity, and every value is normalized to
`{ displayValue, actualValue }`. The legacy `operatorId` is retained only so the
parser can round-trip the still-id-keyed GraphQL **wire** shape.

## A sample condition

This canonical tree is the filter:

> prefecture **=** Tokyo **AND** ( status **IN** [Active, Trial] **OR** canceledAt
> **IS NULL** ) **AND** createdAt **IN LAST** 30 days

It covers every shape a field node can take — a single value, a multi value, a
valueless operator, and a dynamic value — and shows that **every field is always
present**, filled with `null` / `[]` when unused. Nothing is optional.

```json
{
  "operatorCategory": "LOGICAL",
  "operatorKey": "AND",
  "operatorId": 101,
  "children": [
    {
      "operatorCategory": "FIELD",
      "operatorKey": "EQUALS",
      "operatorId": 11,
      "originObjectColumnId": 501,
      "filterValue": {
        "displayValue": "Tokyo",
        "actualValue": "tokyo"
      },
      "filterValueMultiple": [],
      "dynamicValueTypeId": null,
      "dynamicValueOffsetUnitId": null,
      "dynamicValueOffsetValue": null
    },
    {
      "operatorCategory": "LOGICAL",
      "operatorKey": "OR",
      "operatorId": 201,
      "children": [
        {
          "operatorCategory": "FIELD",
          "operatorKey": "IN",
          "operatorId": 13,
          "originObjectColumnId": 502,
          "filterValue": null,
          "filterValueMultiple": [
            {
              "displayValue": "Active",
              "actualValue": "active"
            },
            {
              "displayValue": "Trial",
              "actualValue": "trial"
            }
          ],
          "dynamicValueTypeId": null,
          "dynamicValueOffsetUnitId": null,
          "dynamicValueOffsetValue": null
        },
        {
          "operatorCategory": "FIELD",
          "operatorKey": "IS_NULL",
          "operatorId": 15,
          "originObjectColumnId": 503,
          "filterValue": null,
          "filterValueMultiple": [],
          "dynamicValueTypeId": null,
          "dynamicValueOffsetUnitId": null,
          "dynamicValueOffsetValue": null
        }
      ]
    },
    {
      "operatorCategory": "FIELD",
      "operatorKey": "IN_LAST",
      "operatorId": 41,
      "originObjectColumnId": 504,
      "filterValue": null,
      "filterValueMultiple": [],
      "dynamicValueTypeId": 3,
      "dynamicValueOffsetUnitId": 2,
      "dynamicValueOffsetValue": 30
    }
  ]
}
```

Note the two node kinds carry different fields: a logical node has only
`operatorKey` / `operatorId` / `children`, a field node has no `children` at all.
Column ids and field `operatorId`s come from the list view's column metadata at
runtime — only the logical ids (`AND` 101, `OR` 201) are master data.

[`docs/en/ai-context.md`](https://github.com/openreachtech/mentsu-search-condition/blob/main/docs/en/ai-context.md)
walks the same tree through the wire round-trip and shows the validator's output
for a malformed tree.

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

## What lives elsewhere

- **UI widget resolution and tree editing** (which input a field renders, add /
  remove by node id) stay in the crm-kit frontend overlay.
- **Query generation** (canonical tree → SQL / Elasticsearch) stays in the
  backend, which feeds it the canonical nodes this package produces.

## Scripts

```sh
npm test        # jest (node, --experimental-vm-modules)
npm run lint    # eslint (@openreachtech/eslint-config)
```

`node playground/demo.js` runs the parser and validator against a sample
condition by hand.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-search-condition.git
cd mentsu-search-condition
npm install
npm run lint
npm test
```

## License

UNLICENSED

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
