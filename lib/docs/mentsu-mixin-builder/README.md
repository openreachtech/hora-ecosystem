# @openreachtech/mentsu-mixin-builder

Builds a mixin-extended object by layering mixin objects on top of a root object.

## Concept

`MixinBuilder` takes a *root* object and any number of *mixin* objects, and produces
a single object that exposes the members of all of them.

Property access on the built object resolves to the **first** target that defines the
property, in the order `root` → mixins (in the order they were added). Methods keep
`this` bound to the built object, so a method borrowed from one mixin can read
properties provided by another.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/mentsu-mixin-builder
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

```js
import MixinBuilder from '@openreachtech/mentsu-mixin-builder'

const rootTarget = {
  greet () {
    return `Hello, ${this.name}`
  },
}

const alphaMixin = {
  name: 'Alpha',
}

const betaMixin = {
  farewell () {
    return `Bye, ${this.name}`
  },
}

const built = MixinBuilder.create({ root: rootTarget })
  .addMixins(alphaMixin, betaMixin)
  .build()

built.greet()    // "Hello, Alpha"   (greet from root, name from alphaMixin)
built.farewell() // "Bye, Alpha"     (farewell from betaMixin, name from alphaMixin)
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

### `.create({ root })`

Factory method. Creates a `MixinBuilder` for the given root object.

- `root` — The base object to be extended. Defaults to `{}`.
- Returns a `MixinBuilder` instance.

### `#addMixins(...objects)`

Adds mixin objects to layer on top of the root. Chainable.

- `...objects` — Mixin objects to add.
- Returns the same `MixinBuilder` (for method chaining).

### `#build()`

Builds and returns the mixin-extended object.

- Returns the extended object. Property access resolves to the first target that
  defines the property, in the order `root` → mixins.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-mixin-builder.git
cd mentsu-mixin-builder
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
