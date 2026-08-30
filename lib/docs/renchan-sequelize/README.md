# Renchan Sequelize

A Renchan facade over Sequelize that layers reusable models, mixins, and tooling
on top of Sequelize's complex model definitions.

## Overview

`@openreachtech/renchan-sequelize` centralizes the boilerplate of a Sequelize
setup — activating a client, loading models, building `include` options, and
generating subqueries — and exposes a family of base models and mixin models so
that features such as pagination, backup history, referral trees, and versioned
suites can be composed into a model without rewriting them each time.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/renchan-sequelize
```

When using GitHub Packages (the `@openreachtech` scope), the following two items are
required:

1. Add the registry to your project's `.npmrc`:

   ```
   @openreachtech:registry=https://npm.pkg.github.com
   ```

2. Authenticate with `npm login`:

   ```sh
   npm login --registry https://npm.pkg.github.com
   ```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

Define a model by extending `RenchanModel` and declaring its attributes with
`ModelAttributeFactory`:

```javascript
import {
  RenchanModel,
  ModelAttributeFactory,
} from '@openreachtech/renchan-sequelize'

export default class UserModel extends RenchanModel {
  /** @override */
  static createAttributes (DataTypes) {
    const attributeFactory = ModelAttributeFactory.create(DataTypes)

    return {
      ...attributeFactory.ID_BIGINT,

      username: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
    }
  }
}
```

Compose reusable behavior by extending a mixin model — for example, add
pagination to a query result:

```javascript
import {
  PaginationMixinModel,
} from '@openreachtech/renchan-sequelize'

export default class PaymentModel extends PaginationMixinModel {
  // ...
}

const responsePagination = await PaymentModel.findAllWithPagination({
  // ...
})
```

## API

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `#set:instanceSetter` | instance setter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `.set:staticSetter` | static setter |

The package exposes the following classes, grouped by role.

### Models

| Class | Description |
| :-- | :-- |
| `BaseRenchanModel` | Base Sequelize model that provides the shared query facade (attribute helpers, transactions, quoting). |
| `RenchanModel` | Abstract model extending `BaseRenchanModel`, the standard base for application models. |
| `FertileForestModel` | `RenchanModel` wired to the fertile-forest algorithm for hierarchical (tree) data. |

### Mixin models

| Class | Description |
| :-- | :-- |
| `BaseMixinModel` | Base class for mixin models, defining the mixin-target composition points. |
| `AttributesLinearizerMixinModel` | Flattens nested attribute nodes into a linear set of attributes. |
| `BackupMixinModel` | Mirrors saves and destroys into a backup table to retain history. |
| `LatestStatusMixinModel` | Resolves and includes the latest status of an entity. |
| `PaginationMixinModel` | Adds pagination scopes and `findAllWithPagination` support. |
| `ReferralMixinModel` | Manages invite codes and referral-tree nodes. |
| `SuiteVersionMixinModel` | Builds and finds versioned suites of related records. |

### Hook payloads

| Class | Description |
| :-- | :-- |
| `BaseHookPayload` | Base payload passed through model lifecycle hooks. |
| `ReferralMixinHookPayload` | Hook payload for `ReferralMixinModel` operations. |

### Request / response tools

| Class | Description |
| :-- | :-- |
| `RequestPagination` | Normalizes an incoming pagination request (limit / offset). |
| `RequestSort` | Normalizes an incoming sort request. |
| `ResponsePagination` | Builds the pagination metadata returned in a response. |

### Sequelize infrastructure

| Class | Description |
| :-- | :-- |
| `SequelizeActivator` | Activates Sequelize: resolves config, generates a client, and loads models. |
| `SequelizeClientGenerator` | Generates a configured Sequelize client instance. |
| `SequelizeConfigResolver` | Resolves the Sequelize configuration for the current environment. |
| `RenchanModelsLoader` | Loads and registers Renchan model classes from a directory. |

### Tools

| Class | Description |
| :-- | :-- |
| `ModelAttributeFactory` | Produces common Sequelize attribute definitions (e.g. `ID_BIGINT`). |
| `MigrationAttributeFactory` | Produces common attribute definitions for migrations. |
| `TimestampSeedsSupplier` | Supplies timestamp fields for seed records. |
| `SubqueryGenerator` | Generates named subqueries for models. |
| `SubqueryRegExpBuilder` | Builds the regular expressions that match subquery names. |
| `WhereClauseExtractor` | Extracts a `where` clause from query parameters. |
| `IncludeOptionBuilder` | Builds Sequelize `include` options from a node tree. |
| `IncludeOptionNode` | A single node in the `include` option tree. |
| `DeepBulkClassLoader` | Recursively loads classes from a directory tree. |
| `RootPath` | Resolves the application root path. |

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-sequelize.git
cd renchan-sequelize
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
