# @openreachtech/mentsu-bound-ctor-registry

`BoundCtorRegistry` — a registry that derives and memoizes bound constructor classes,
keyed by a composite of *bindings* and a *base constructor*.

For the same combination of bindings and base constructor it always returns the
**identical class reference**, so a derived class is declared only once and then reused.
The cache is built entirely on `WeakMap`, so entries are garbage-collected together with
the objects used as keys.

- [Japanese README (日本語)](./README.ja.md)

## Table of contents

- [Concept](#concept)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [How memoization works](#how-memoization-works)
- [Contribution](#contribution)
- [License](#license)
- [Developer](#developer)
- [Copyright](#copyright)

## Concept

Sometimes you need to build a *derived* (bound) class from a base class at runtime — for
example a subclass that carries extra context — and you want the exact same derived class
back whenever the same inputs are given again.

`BoundCtorRegistry` solves this by memoizing the result of a **deriver** function against
two things:

1. **`bindings`** — an ordered array of `WeakKey` values (objects / functions / classes)
   that identifies the derivation. The same sequence of bindings always resolves to the
   same internal key.
2. **`BaseCtor`** — the base constructor the registry was created for.

Given the same `bindings` + `BaseCtor`, `ensureBoundCtor()` returns the cached class
instead of deriving a new one.

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
npm install @openreachtech/mentsu-bound-ctor-registry
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

See [readme/usage.md](https://github.com/openreachtech/mentsu-bound-ctor-registry/blob/main/readme/usage.md)
for usage examples, including the `use` inflator method and a real-world inflator method
example.

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

### `.create({ BaseCtor })`

Static factory method. Returns a new registry instance for the given base constructor.

| Parameter  | Type       | Description                            |
| ---------- | ---------- | -------------------------------------- |
| `BaseCtor` | `new (...args: Array<*>) => *` | The base constructor to derive from.   |

Returns an instance of `BoundCtorRegistry` (or of the calling subclass).

You may also use the constructor directly: `new BoundCtorRegistry({ BaseCtor })`.

### `#ensureBoundCtor({ bindings, deriver })`

The main entry point. Returns the bound constructor for the given `bindings`, deriving and
caching it on the first call and returning the cached reference afterwards.

| Parameter  | Type                  | Description                                                                                     |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `bindings` | `Array<WeakKey>`      | Ordered keys that identify the derivation. Each element must be usable as a `WeakMap` key.       |
| `deriver`  | `({ Ctor }) => new (...args: Array<*>) => *` | Called only on a cache miss. Receives `{ Ctor: BaseCtor }` and must return a derived class.      |

Returns the bound constructor (a subclass of `BaseCtor`).

## How memoization works

A bound class is cached against the combination of its `bindings` and the `BaseCtor`:

1. The ordered `bindings` array is resolved to a single, stable cache key. The same
   sequence of bindings always resolves to the same key.
2. That key, together with the `BaseCtor`, identifies the cached bound class. On the first
   request `deriver` is invoked and its result is stored; every later request with the same
   inputs returns the stored class.

The cache is built on `WeakMap`, so cached derived classes do not keep their key objects
alive: once the bindings or the base constructor are no longer referenced elsewhere, the
corresponding cache entries become eligible for garbage collection.

> **Note:** every element of `bindings`, and the `BaseCtor`, must be a valid `WeakMap`
> key (an object, function, or class). Primitive values cannot be used as bindings.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-bound-ctor-registry.git
cd mentsu-bound-ctor-registry
npm install
npm run lint
npm test
```

## License

This project is released under the MIT License.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
