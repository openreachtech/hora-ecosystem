# @openreachtech/mentsu-text-case-tools

Utilities for converting text case, and for deeply converting the keys of plain objects, between camelCase, PascalCase, and delimiter case (such as `snake_case` or `kebab-case`).

## Table of contents

- [Installation](#installation)
- [Features](#features)
- [API](#api)
- [Contribution](#contribution)
- [License](#license)
- [Developer](#developer)
- [Copyright](#copyright)

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
npm install @openreachtech/mentsu-text-case-tools
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Features

### (1) Text case conversion

[Usage of TextCaseConverter](https://github.com/openreachtech/mentsu-text-case-tools/blob/main/docs/en/features/text-case-converter.md)

### (2) Deep object key case conversion

[Usage of DeepKeyCaseConverter](https://github.com/openreachtech/mentsu-text-case-tools/blob/main/docs/en/features/deep-key-case-converter.md)

## API

This package exposes the `TextCaseConverter` and `DeepKeyCaseConverter` classes.

See the [API reference](https://github.com/openreachtech/mentsu-text-case-tools/blob/main/docs/en/api/index.md) for the members of each class.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-text-case-tools.git
cd mentsu-text-case-tools
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
