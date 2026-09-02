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

`package.json` carries three overrides. Two are ordinary and one is not,
and `package.json` cannot hold a comment saying which.

| Override | Dependant's range | Verdict |
|---|---|---|
| `minimatch@3.1.5` &rarr; `brace-expansion: ^1.1.17` | `^1.1.7` | inside it |
| `minimatch@9.0.9` &rarr; `brace-expansion: ^2.1.3` | `^2.0.2` | inside it |
| `uuid: ^11.1.1` | `sequelize@6.37.8` asks for `^8.3.2` | **three majors outside it** |

The first two raise a package within the major line its dependant
declared, which is what an override is for.

The third does not, and it was taken deliberately. The advisory against
`uuid` is fixed in 11.1.1 and in no 8.x release, so there is no
in-range version to move to — `npm audit` reported it as having no fix
available. What makes it safe here is that `uuid` 11 still ships a CJS
entry, so `sequelize`'s `require('uuid')` resolves, and that `sequelize`
is a devDependency of a package whose `dependencies` are empty and
whose published files are `config/`, `lib/` and `types/`. Nothing this
package ships reaches it.

**Check this override again whenever `sequelize` moves.** A range
violation holds only as long as the code behind it does not change, and
nothing in npm will report when that stops being true.

## Language mirror

Both skills live under `.claude/skills/` in English. A Japanese mirror is kept in sync under `.scratch/skills/` (gitignored, local-only) whenever a skill is edited.
