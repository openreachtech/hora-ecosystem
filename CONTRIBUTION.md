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

## Language mirror

Both skills live under `.claude/skills/` in English. A Japanese mirror is kept in sync under `.scratch/skills/` (gitignored, local-only) whenever a skill is edited.
