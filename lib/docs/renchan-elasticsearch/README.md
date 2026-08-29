# @openreachtech/renchan-elasticsearch

An Elasticsearch client module for the Renchan stack.

You define one `Index` class per Elasticsearch index and one `Document` class that
declares its schema, then drive the index through high-level methods —
`createIndex()`, `insertDocuments()`, `searchDocuments()`, and more — without
hand-writing REST requests.

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

The module is organized around two classes you extend:

- **`BaseIndex`** — one subclass per Elasticsearch index. It carries the index name,
  the connection config, and the document constructor, and exposes the operations
  you call (`createIndex`, `insertDocuments`, `searchDocuments`, …).
- **`BaseDocument`** — one subclass per index. It declares the field `schema` (built
  from scalar types such as `Text`, `Keyword`, and `Datetime`) and the Elasticsearch
  mappings for those fields.

Each operation is fulfilled by a request pipeline (`Payload` → `Launcher` →
`Capsule`) built on [`@openreachtech/mentsu-rocket-client`](https://github.com/openreachtech/mentsu-rocket-client),
so every call returns a `Capsule` whose `.body` holds the parsed Elasticsearch
response. Search queries are written in a camelCase **Query DSL** (and aggregations
in an **Aggregations DSL**) that is reified into Elasticsearch JSON for you.

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
npm install @openreachtech/renchan-elasticsearch
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Features

### (1) Defining an Index and a Document

Subclass `BaseIndex` and `BaseDocument` to model an Elasticsearch index and its
document schema.

[Defining an Index and a Document](https://github.com/openreachtech/renchan-elasticsearch/blob/main/docs/en/features/defining-index.md)

### (2) Managing Indices

Create and delete indices from the definition your `Document` class declares.

[Managing Indices](https://github.com/openreachtech/renchan-elasticsearch/blob/main/docs/en/features/managing-indices.md)

### (3) Writing Documents

Insert, update, put (upsert), and delete documents in bulk.

[Writing Documents](https://github.com/openreachtech/renchan-elasticsearch/blob/main/docs/en/features/writing-documents.md)

### (4) Reading and Searching Documents

Check existence, fetch by UUID, and search with the Query DSL and Aggregations DSL.

[Reading and Searching Documents](https://github.com/openreachtech/renchan-elasticsearch/blob/main/docs/en/features/reading-documents.md)

## API

See the API reference for the classes you extend and the members they expose.

[API Reference](https://github.com/openreachtech/renchan-elasticsearch/blob/main/docs/en/api/index.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-elasticsearch.git
cd renchan-elasticsearch
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
