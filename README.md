# @openreachtech/hora-ecosystem

A module catalog of Open Reach Tech's ecosystem packages (`renchan-*` / `furo-*` / `mentsu-*`), maintained so that Hora — Open Reach Tech's tool for fully-automated, AI-driven application generation — can learn how to use them.

## Concept

This package doesn't ship runnable application code. It ships **catalog data**: a machine-readable list of which ecosystem packages are currently tracked, plus a per-package specification of each package's classes and how to use them, extracted from that package's own README and JSDoc/type declarations.

The catalog content isn't written for human readability — it only needs to be precise enough for Hora (an AI) to understand a package's public surface and use it correctly.

## Installation

Requires Node.js 20.0.0 or newer, the floor `engines` declares. The CI builds against the current LTS.

```sh
npm install @openreachtech/hora-ecosystem
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

### `config/lookup.js`

The ledger the catalog is generated from: every ORT repository that has been considered, mapped to whether it is currently catalogued.

```js
const TARGET_REPOSITORIES = {
  'furo-core': true,
  'mentsu-rootpath': true,
  'renchan-core': true,
  'renchan-tools-twilio': false,
  // ...
}
```

The keys are **GitHub repository names** with the `openreachtech/` owner dropped — not npm package names. The two differ wherever a repository publishes under a different name.

A repository with value `false` is known to exist but intentionally excluded from the catalog (e.g. deprecated, or not yet decided on); one absent from this object entirely was never a candidate.

This file exists so that the generation skills know what to fetch. To find what the catalog holds, read `lib/docs/` below.

### `lib/docs/<package-name>/`

For every package name that's `true` in `config/lookup.js`, this directory holds:

- `README.md` — a verbatim copy of that package's own README, when one exists.
- `API.md` — a summary of the package's exported classes/functions and their public members, methods, and signatures, derived from its `.d.ts` or JSDoc.

```js
import { readFile } from 'node:fs/promises'

const apiReference = await readFile(
  new URL(
    '../node_modules/@openreachtech/hora-ecosystem/lib/docs/mentsu-rootpath/API.md',
    import.meta.url
  ),
  'utf-8'
)
```

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

The catalog under `config/lookup.js` and `lib/docs/` is maintained with Claude Code skills — see [CONTRIBUTION.md](https://github.com/openreachtech/hora-ecosystem/blob/main/CONTRIBUTION.md) for how to use them.

```sh
git clone https://github.com/openreachtech/hora-ecosystem.git
cd hora-ecosystem
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
