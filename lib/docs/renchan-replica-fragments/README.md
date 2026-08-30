# @openreachtech/renchan-replica-fragments

An Elasticsearch index for records whose columns are defined at runtime — write a record as a list of typed columns, and search it with operators instead of hand-written Query DSL.

## Table of contents

- [Concept](#concept)
- [Installation](#installation)
- [Features](#features)
- [API](#api)
- [Contribution](#contribution)
- [License](#license)
- [Developer](#developer)
- [Copyright](#copyright)

## Concept

A replica fragment is one record copied into Elasticsearch. Its columns are not known when
the index is defined — each column arrives with an id and a type, so a single mapping has
to serve every record.

That is solved by grouping values into one nested field per type:

| Column type | Nested field |
| :-- | :-- |
| `BOOLEAN` | `booleanColumns` |
| `DATETIME` | `datetimeColumns` |
| `DOUBLE` | `doubleColumns` |
| `INTEGER` | `integerColumns` |
| `KEYWORD` | `keywordColumns` |
| `TEXT` | `textColumns` |

Each nested entry carries its `columnId` alongside its value, so a query for "column 12
equals `paid`" becomes a nested query matching both at once.

Three families of classes cover the round trip:

| Family | Responsibility |
| :-- | :-- |
| **Entries** | Turn one incoming column into the nested entries it belongs in. One class per column type, resolved from the type. |
| **Predicates** | Turn one filter — a column, an operator, and an operand — into a nested Query DSL clause. One class per operator. |
| **Builders** | Compose entries into a document source, and predicates into a search query or sort. |

`BaseReplicaFragmentIndex` ties them together, extending `BaseIndex` from
[`@openreachtech/renchan-elasticsearch`](https://github.com/openreachtech/renchan-elasticsearch).

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
npm install @openreachtech/renchan-replica-fragments
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Features

### (1) Defining an Index

Subclass `BaseReplicaFragmentIndex` to model one replica fragment index.

[Defining an Index](https://github.com/openreachtech/renchan-replica-fragments/blob/main/docs/en/features/defining-an-index.md)

### (2) Writing Documents

Put and upsert documents from column sources, without composing the nested source by hand.

[Writing Documents](https://github.com/openreachtech/renchan-replica-fragments/blob/main/docs/en/features/writing-documents.md)

### (3) Searching Documents

Search with filters and operators, and order results by column.

[Searching Documents](https://github.com/openreachtech/renchan-replica-fragments/blob/main/docs/en/features/searching-documents.md)

## API

See the API reference for the classes you extend and the members they expose.

[API reference](https://github.com/openreachtech/renchan-replica-fragments/blob/main/docs/en/api/index.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-replica-fragments.git
cd renchan-replica-fragments
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
