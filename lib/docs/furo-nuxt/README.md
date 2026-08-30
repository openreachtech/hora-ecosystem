# @openreachtech/furo-nuxt

`furo-nuxt` is a library that brings [furo](https://github.com/openreachtech/furo) into Nuxt applications.

日本語版は [README.ja.md](./README.ja.md) を参照してください。

## Concept

`furo` itself is written in pure JavaScript, so every `furo` feature already works inside a Nuxt application as-is.

`furo-nuxt` adds the Nuxt- and Vue-specific layer on top of it:

- Composables that bind `furo` clients (GraphQL, RESTful API, subscriptions) to Vue refs.
- A context class family that keeps component logic out of `<template>` and `setup()`.
- Ready-made components (dialog, layouts, pagination, tab) and their base stylesheets. Deprecated since 1.12.0, removed in 2.0.0.
- Tools for loading environment values and sharing them across the Nuxt app.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/furo-nuxt
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Features

### (1) GraphQL Client

[Usage of GraphQL client](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/graphql-client.md)

### (2) Form Element Clerk

[Usage of form element clerk](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/form-clerk.md)

### (3) RESTful API Client

[Usage of RESTful API client](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/restful-api-client.md)

### (4) Component Context

[Usage of component context](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/component-context.md)

### (5) Components (deprecated since 1.12.0, removed in 2.0.0)

[Usage of components](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/components.md)

The components, their context classes, `0200.base.css` and `0300.gimmick.css` all leave the package at the next major
version. Copy what you use into your own app first; the doc above carries the migration steps.

### (6) Application Setup

[Usage of application setup](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/features/app-setup.md)

## API

[API references](https://github.com/openreachtech/furo-nuxt/blob/main/docs/en/api/index.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/furo-nuxt.git
cd furo-nuxt
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

© 2025 Open Reach Tech Inc.
