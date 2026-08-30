# @openreachtech/mentsu-path-group-schema

Shared path group definition and condition schema for frontend and backend.

## Overview

A **path group** is a configurable stage pipeline for records of a category: the
ordered statuses a record moves through, per-stage guidance and display columns,
conditional visibility, and terminal close statuses. This package defines the two
data structures both sides must agree on — the **path group definition** and the
**condition tree** — with parse / validate / evaluate / select tools over plain
objects.

The condition grammar is unified with `@openreachtech/renchan-funnel`
(`operatorCategory` FIELD / LOGICAL, `leftHand` / `rightHand`, value sources
`FIXED_VALUE` / `FIELD_REFERENCE` / `DYNAMIC_VALUE`).

**Data schema only.** The package holds no database schema and never reads
storage; resolving a value source to a concrete value is injected by the host
through the duck-typed `ValueResolver` contract.

### Path group definition

```javascript
{
  originObjectCategoryId: 9001,
  name: 'full-time hiring flow',
  selectionOrder: 1,          // evaluation order among the category's path groups
  selectionCondition: {},     // when this path group applies; {} = always
  statusTargetColumn: {
    statusTargetOriginObjectColumnId: 9003,
    displayOriginObjectColumnId: null,
  },
  statusOrders: [
    {
      statusTargetOriginObjectColumnValue: '1',
      order: 1,
      guidance: 'Confirm the application.',
    },
  ],
  displayColumns: [
    {
      originObjectColumnId: 9004,
      order: 1,
    },
  ],
  closeStatuses: {
    closeStatusTargetOriginObjectColumnId: 9005,
    closeStatusValues: ['1', '2'],
  },
}
```

### Condition tree

```javascript
// LOGICAL node
{
  operatorCategory: 'LOGICAL',
  operatorKey: 'AND',          // or 'OR'
  children: [/* nodes */],
}

// FIELD node
{
  operatorCategory: 'FIELD',
  operatorKey: 'EQUALS',       // EQUALS, NOT_EQUALS, CONTAINS, IN, NOT_IN, IS_NULL, IS_NOT_NULL
  leftHand: {
    sourceValueType: 'FIELD_REFERENCE',
    value: {
      sourceOriginObjectColumnId: 9002,
      sourceFieldPath: 'User.UserBasic.employmentType',
    },
  },
  rightHand: {
    sourceValueType: 'FIXED_VALUE',
    value: 'full-time',
  },
}

// {} (empty object) always passes
```

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-path-group-schema
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Features

### (1) Evaluate a Condition

[Usage of evaluate-condition](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/features/evaluate-condition.md)

### (2) Validate a Definition

[Usage of validate-definition](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/features/validate-definition.md)

### (3) Select the Applicable Path Group

[Usage of select-path-group](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/features/select-path-group.md)

### (4) Collect Referenced Columns

[Usage of collect-referenced-columns](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/features/collect-referenced-columns.md)

### (5) Add a Custom Operator

[Usage of custom-operator](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/features/custom-operator.md)

## API

[API reference](https://github.com/openreachtech/mentsu-path-group-schema/blob/main/docs/en/api/index.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-path-group-schema.git
cd mentsu-path-group-schema
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
