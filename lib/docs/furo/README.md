# Overview

`furo` is a library that supports front-end development.

Since it is written in pure JavaScript, it works with any front-end framework or library, such as Vue or React.

# Installation

## (1) `Node.js` and `npm`

Node.js is required. If you haven't installed it yet, please do so first.

| Tool | Version |
| :-- | :-- |
| Node.js | ^20.19.2 |
| npm | ^10.9.0 |

## (2) Setting up `.npmrc`

Create a `.npmrc` file in your project's root directory and add the necessary configuration.

Add the following line to your `.npmrc` file:

```
@openreachtech:registry=https://npm.pkg.github.com
```

## (3) Install Command

You can install `furo` with the following command:

```
npm install @openreachtech/furo
```

# Features

## (1) GraphQL Client

[Usage of GraphQL client](graphql-client.doc.md)

## (2) Form Element Clerk

[Usage of Form element clerk](form-clerk.doc.md)

## (3) Storage Clerk

[Usage of Storage clerk](storage-clerk.doc.md)

# License

This project is released under the MIT License.

See [LICENSE](./LICENSE) for details.

# Contributing

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/furo-core.git
cd furo-core
npm install
npm run lint
npm test
```

# Developers

[Open Reach Tech Inc.](https://openreach.tech)

# Copyright

© 2025 Open Reach Tech Inc.
