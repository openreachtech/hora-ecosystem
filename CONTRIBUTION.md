# Contribution

This repository's catalog (`config/lookup.js` and `lib/docs/`) is maintained with the help of two Claude Code skills. This document explains what they do and how to use them; it isn't needed to just consume the published package (see [README.md](./README.md) for that).

## Prerequisites

- [Claude Code](https://claude.com/claude-code), with this repository open.
- [`gh`](https://cli.github.com/) installed and logged in (`gh auth status`). Only read access is required — a read-only fine-grained personal access token is enough (Resource owner: `openreachtech`, Permissions: Contents/Metadata Read-only).

## `/lookup`

Regenerates `config/lookup.js`, the whitelist of ecosystem repositories this catalog tracks.

- Fetches the `renchan-*` / `furo-*` / `mentsu-*` / `jest-*` repositories of the `openreachtech` GitHub organization.
- Applies the `includes` / `excludes` / `turned-off` wildcard rules defined in `config/rulesets.js`.
- Reports the diff against the current `config/lookup.js` and asks for confirmation before writing.

Editing `config/rulesets.js` itself (deciding which repositories to include, exclude, or turn off) is a human decision — the skill only reports what's slipping through the current rules; it doesn't add or fix patterns on its own.

See [`.claude/skills/lookup/SKILL.md`](./.claude/skills/lookup/SKILL.md) for the full, current procedure.

## `/scribe`

Generates `lib/docs/<package-name>/README.md` and `API.md` for every package marked `true` in `config/lookup.js`.

- Only covers packages already added to this repository's `devDependencies` (adding a package as a dependency is a separate, manual step — see below).
- Copies the package's own `README.md` verbatim when one exists; otherwise only `API.md` is written (no README is authored from scratch).
- `API.md` is a plain-Markdown summary of the package's exported classes/functions and their public members, extracted from its `.d.ts` or JSDoc — written for Hora (an AI) to consume, not for human readability.
- Skips packages that already have a `lib/docs/<package-name>/`; delete that folder first to force a refresh.
- Automatically deletes any `lib/docs/<package-name>/` that's no longer a target (removed from, or turned `false` in, `config/lookup.js`).

See [`.claude/skills/scribe/SKILL.md`](./.claude/skills/scribe/SKILL.md) for the full, current procedure.

## Typical workflow

1. Run `/lookup` to refresh `config/lookup.js` against the current state of the `openreachtech` organization.
2. For any newly-`true` package that's actually published (to npmjs.com or GitHub Packages) and not yet in `devDependencies`, add it and run `npm install`.
3. Run `/scribe` to generate docs for whatever's newly available.

## Dependency overrides

`package.json` carries four overrides, and every one of them moves a
package outside the range its dependant declared. `package.json`
cannot hold a comment saying why.

| Override | Dependant's range | Verdict |
|---|---|---|
| `glob: ^14.0.2` | `@jest/reporters@30.5.2` asks for `^13.0.6` | **one major outside it** |
| `glob: ^14.0.2` | `jest-config@30.5.2` asks for `^13.0.6` | **one major outside it** |
| `glob: ^14.0.2` | `jest-runtime@30.5.2` asks for `^13.0.6` | **one major outside it** |
| `glob: ^14.0.2` | `@vercel/nft@1.11.1` asks for `^13.0.0` | **one major outside it** |
| `glob: ^14.0.2` | `test-exclude@7.0.2` asks for `^10.4.1` | **four majors outside it** |
| `minimatch@10: ^11.0.1` | `test-exclude@7.0.2` asks for `^10.2.2` | **one major outside it** |
| `minimatch@10: ^11.0.1` | `readdir-glob@3.0.0` asks for `^10.2.2` | **one major outside it** |
| `graphql-middleware` &rarr; `@graphql-tools/delegate: ^12.2.1` | `graphql-middleware@6.1.35` asks for `^8.8.1` | **four majors outside it** |
| `graphql-middleware` &rarr; `@graphql-tools/schema: ^10.1.5` | `graphql-middleware@6.1.35` asks for `^8.5.1` | **two majors outside it** |
| `uuid: ^11.1.1` | `sequelize@6.37.8` asks for `^8.3.2` | **three majors outside it** |

Each was taken deliberately, and for the same reason: the advisory is
fixed in the newer major and in no release inside the dependant's range,
so `npm audit` had no in-range version to move to.

| Package | Advisory | Fixed in |
|---|---|---|
| `glob` | `GHSA-3g3m-2fjr-6pw4` | 14.0.2 |
| `minimatch` | `GHSA-g3hv-75wg-m249` | 11.0.1 |
| `@graphql-tools/utils` | `GHSA-7mx3-vvmw-hjmv` | 12.0.1 |

`@graphql-tools/utils` takes no entry of its own. Version 8 of
`@graphql-tools/delegate` and of `@graphql-tools/schema` pins it at
exactly `8.9.0`, so raising those two is what brings the patched copy in.

The `minimatch` entry is held to the 10.x copies. The 3.x copy that
`eslint` asks for is outside the advisory, and `minimatch` 11 has no
default export, which the ESM entry of `@eslint/config-array` imports.

What makes each of them safe here differs.

- **`glob` and `minimatch`** 10 are reached through `jest` and the build
  tooling of `nuxt`. `npm test -- --coverage` passes with both overrides
  in place, and nothing in this repository runs `nuxt`.
- **`graphql-middleware`** arrives through `@openreachtech/renchan`, which
  is installed here to be read by `/scribe` and is never run.
- **`uuid`** 11 still ships a CJS entry, so `sequelize`'s
  `require('uuid')` resolves.

All of them sit under devDependencies of a package whose `dependencies`
are empty and whose published files are `config/` and `lib/`. Nothing
this package ships reaches them.

**Check these overrides again whenever `jest`, `nuxt`,
`@openreachtech/renchan` or `sequelize` moves.** A range violation holds
only as long as the code behind it does not change, and nothing in npm
will report when that stops being true.

## Language mirror

Both skills live under `.claude/skills/` in English. A Japanese mirror is kept in sync under `.scratch/skills/` (gitignored, local-only) whenever a skill is edited.
