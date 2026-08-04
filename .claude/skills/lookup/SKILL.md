---
name: lookup
description: >
  Regenerate config/target-repositories.js by fetching openreachtech's
  renchan-/furo-/mentsu- repositories from GitHub and applying the
  include/exclude wildcard rules in config/rulesets.js. Use this skill
  whenever the user asks to refresh, update, or regenerate the target
  repository list/whitelist for the Hora ecosystem catalog.
---

# Target Repositories Skill

`config/target-repositories.js` is the aggregate file holding the list of ORT repositories to target for the Hora ecosystem catalog, shaped as `{ 'repo-name': boolean, ... }`. A repository matching `excludes` is not listed as `false` — its key is omitted entirely. Regenerate it following the steps below.

## Prerequisites

- `gh` must be logged in (check with `gh auth status`). Write access is not required; a read-only token is enough.
- `config/rulesets.js` defines the `includes`/`excludes`/`turned-off` wildcard patterns.

## Steps

1. Check whether `gh` is usable (`which gh`, `gh auth status`). If it's missing or not logged in, don't try to fix it yourself here — stop and guide the user through setting it up. Specifically:
   - If `gh` itself is missing, point them to installing it via Homebrew (`brew install gh`).
   - If not logged in, `gh auth login` is an interactive login flow, so ask the user to run it themselves (e.g. `!gh auth login`). Write access isn't needed, so recommend a read-only fine-grained PAT (Resource owner set to `openreachtech`, Repository access scoped to the target repositories, Permissions set to Contents/Metadata Read-only).
   - Don't fetch anything from GitHub until the setup is complete.

2. Fetch the list of repositories in the `openreachtech` organization from GitHub.

   ```
   gh repo list openreachtech --limit 500 --json name,isArchived,isTemplate,description,visibility
   ```

3. Keep only the candidates whose repository name matches one of the `includes` patterns in `config/rulesets.js`.

4. Remove from the candidates any repository with `isArchived: true` (actually archived on GitHub). This is a separate axis from naming-convention matches like `*-archive` — it catches repositories that were archived without renaming.

5. Remove from the candidates any repository matching one of the `excludes` patterns. The `*` wildcard expands across hyphen-delimited substrings, but match it in a way that's aware of segment boundaries rather than a naive substring match (e.g. so that `mapper` doesn't falsely match `*-app`). **A matched repository is omitted from the output entirely — it is not written as `false`.**

6. If candidates remain that the `excludes`/`turned-off` wildcards can't resolve on their own (misspelled repository names, repositories still pending a decision, etc.), don't edit `config/rulesets.js` yourself. **Deciding which patterns to add to `excludes`/`turned-off` is the human's call** — the AI should stop at reporting "this repository is slipping through, here's why" and wait for the human to add to or fix `config/rulesets.js`.

7. For candidates that survived `excludes`, set the value to `false` for any matching a `turned-off` pattern, and `true` for the rest. Unlike `excludes`, a repository matching `turned-off` still gets a key in the output.

8. Prepare to write out `config/target-repositories.js` from the resulting `{ 'repo-name': boolean }` list. If `config/target-repositories.js` already exists, compare its contents against the freshly generated result, report the diff (keys added, keys removed, keys whose `true`/`false` value changed), and **prompt for confirmation before overwriting**. Don't write the file until you have that confirmation. Once confirmed, write it out with keys in alphabetical order. Repositories removed by `excludes` don't get a key at all. Append a trailing `// ❌️` comment to any line whose value is `false`.

   ```js
   /**
    * Target repositories of the ORT ecosystem (renchan-/furo-/mentsu-) to
    * catalog for Hora.
    *
    * @type {Record<string, boolean>}
    */
   const TARGET_REPOSITORIES = {
     'repo-name': true,
     'other-repo-name': false, // ❌️
     // ...
   }

   export default TARGET_REPOSITORIES
   ```

9. Verify with `npm run lint`.

## Note

- When regenerating, always check the diff between the rule-applied result and the current file, and never overwrite without confirmation.
