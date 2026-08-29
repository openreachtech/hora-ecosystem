# @openreachtech/mentsu-deep-loader

Deep class loader modules — recursively import modules under a directory and collect their exports, with optional filtering by constructor.

## Concept

`mentsu-deep-loader` walks a directory tree (a "pool") recursively, dynamically
`import()`s every JavaScript file it finds, and collects the values you care
about. It is useful for auto-registering models, resolvers, config objects, or
any set of modules that live under a directory without listing them one by one.

- `DeepLoader` — the base loader. Collects the `default` export of every module
  under a pool path. Its behavior is customizable through override hooks.
- `DeepCtorsLoader` — a loader specialized for constructors. It keeps only the
  loaded values that are (or extend) one of the acceptable constructors you
  bind to it.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-deep-loader
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### Load default exports from a directory

```js
import { DeepLoader } from '@openreachtech/mentsu-deep-loader'

const alphaLoader = DeepLoader.create({
  poolPath: 'app/models',
})

const loadedModules = await alphaLoader.deepLoad()
// => the default export of every module found recursively under app/models
```

### Load only constructors of a given base class

Bind acceptable constructors with `.of()`, then load. Only values that are one
of the acceptable constructors — or a subclass of them — are kept.

```js
import { DeepCtorsLoader } from '@openreachtech/mentsu-deep-loader'

import BaseModel from './app/models/BaseModel.js'

const ModelLoader = DeepCtorsLoader.of(BaseModel)

const betaLoader = ModelLoader.create({
  poolPath: 'app/models',
})

const loadedCtors = await betaLoader.deepLoad()
// => only constructors that are BaseModel or extend it
```

You can also pass the acceptable constructors directly to `.create()`:

```js
const gammaLoader = DeepCtorsLoader.create({
  poolPath: 'app/models',
  acceptableCtors: [
    BaseModel,
  ],
})
```

### Customize loading behavior

Subclass `DeepLoader` and override the hooks to change which files are imported,
which value is collected per module, and which values are kept.

```js
import { DeepLoader } from '@openreachtech/mentsu-deep-loader'

class JsonModuleLoader extends DeepLoader {
  /** @override */
  defineFileNameFilter () {
    return ({ filename }) =>
      filename.endsWith('.config.js')
  }
}
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

See the [API reference](https://github.com/openreachtech/mentsu-deep-loader/blob/main/docs/en/api/index.md) for each class.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-deep-loader.git
cd mentsu-deep-loader
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
