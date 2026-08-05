---
name: scribe
description: >
  Generate lib/docs/<package-name>/ documentation (README.md + API.md) for
  each ORT ecosystem module marked true in config/lookup.js, so
  Hora can learn how to use that package's classes. Use this skill whenever
  the user asks to generate, refresh, or regenerate the module docs/spec
  under lib/docs.
---

# Scribe Skill

For every package marked `true` in `config/lookup.js`, create documentation under `lib/docs/<package-name>/` for Hora to reference. Human readability isn't the goal — it only needs to be enough for Hora (an AI) to understand "how do I use this package's classes."

`config/lookup.js` keys are **repo names** (e.g. `renchan-core`, `furo-core`), but the folder under `lib/docs/` must be named after the **npm package name** (the `"name"` field in the installed package's `package.json`, with the `@openreachtech/` scope stripped — e.g. `renchan`, `furo`), whenever the two differ. Reason: a consuming repo like `hora-boilerplate` only ever sees the installed npm package name — the original GitHub repo name isn't recorded anywhere from that side.

## Prerequisites

- The target package is already added to `devDependencies`, with a real copy under `node_modules/@openreachtech/`.
- Adding the dependency itself is not this skill's job. If a target package isn't in `node_modules`, don't run `npm install` or add it to `package.json` yourself — report that it's not there yet and drop that target from this run.

## Steps

1. Read `config/lookup.js` and target every key (the repo name, with `@openreachtech/` stripped) whose value is `true`.

2. For each target, locate its installed package under `node_modules/@openreachtech/`:
   - First try `node_modules/@openreachtech/<repo-name>/` directly.
   - If that doesn't exist, the npm package name may differ from the repo name (as with `renchan-core` → `@openreachtech/renchan`, `furo-core` → `@openreachtech/furo`). Search the `"repository"`/`"homepage"` field of every installed `@openreachtech/*` package's `package.json` for a GitHub URL containing `/<repo-name>` (e.g. `github.com/openreachtech/renchan-core`), and use that package if found.
   - Collect anything still unresolved into one list, report it, and drop those from the run. Adding the dependency isn't this skill's job, so don't run `npm install` or touch `package.json` yourself.
   - Once resolved, read that package's own `"name"` field (scope stripped) — this is the **package name** used for the `lib/docs/` folder in every step below, not the repo name.

3. Scan the existing `lib/docs/*/` folders. `config/lookup.js` is the single source of truth for what belongs under `lib/docs/` — for any existing folder whose name doesn't match a currently-resolved, currently-`true` target (by repo name or resolved package name), **delete it outright, along with its `.scratch/lib/docs/<name>/` mirror**. No confirmation needed for this cleanup; it's expected behavior whenever a repository is removed or turned `false` in `config/lookup.js`.

4. Among the remaining targets, any whose `lib/docs/<package-name>/` already exists gets **skipped entirely — do nothing**. Don't diff or regenerate it; just drop it from the run. Only generate docs for targets that don't yet have a `lib/docs/<package-name>/`. To update an existing one, explicitly delete `lib/docs/<package-name>/` (and `.scratch/lib/docs/<package-name>/`) before running `/scribe` again.

5. If the installed package's `README.md` actually exists, copy it verbatim to `lib/docs/<package-name>/README.md` (don't copy other-language variants like `README.ja.md`). **If no `README.md` ships with the package, don't create one at all** — don't author one from scratch and don't go fetch one from another directory or from GitHub. In that case, only write `API.md`.

6. Decide what to base the API reference on.
   - If the installed package's `package.json`'s `"types"` field points to a `.d.ts` file, read that type declaration file.
   - Otherwise, read the JSDoc-annotated source under its `lib/` directory.

7. From what you read in step 6, write `lib/docs/<package-name>/API.md`: a simple Markdown bullet list summarizing the classes/functions the package exports and their public members, methods, and signatures. Don't include private members or internal implementation detail. Whether the source was a `.d.ts` or JSDoc, keep the output in this same bullet-list format.

8. Verify with `npm run lint`.

9. Run `npm pack --dry-run --json` to get the exact list of files this package would publish (this repo is published publicly, so this is the actual exposure surface — broader than just `lib/`/`config/`, but that's where generated content concentrates). Scan the content of those specific files for anything that shouldn't go public:
   - Secret-looking values (API keys, passwords, tokens, private key blocks, JWTs).
   - Internal hostnames/IPs, or confidentiality markers (e.g. "internal only", "do not publish").
   - Example emails/domains in copied `README.md` content that use a **real, live, non-reserved domain** instead of a safe placeholder (`example.com`, `example.org`, `example.net`, `test.com` are IANA-reserved for documentation and always safe; anything else — verify by resolving it — e.g. `dig`/`curl` — before assuming it's fake).
   - This mainly turns up in verbatim-copied `README.md` files (step 5), since that content originates from each package's own upstream repo, not from anything authored here.

   Report every finding (file, line, what was found, and — for a domain/email check — whether it resolves to something real) without editing anything. Don't silently fix or drop content; this is a report-only check, since the source material is a verbatim copy of someone else's README and any change should be a deliberate, separate decision.

## Note

- Don't generate `lib/docs/` for a package that's `false` in `config/lookup.js`, or not listed there at all.
- Out-of-scope cleanup (step 3) is automatic — `config/lookup.js` is authoritative, so no confirmation is needed to delete a `lib/docs/<package-name>/` that's no longer a target.
- The publish-exposure check (step 9) never modifies files. Any fix (e.g. swapping a real domain for `example.com` in a copied README) is a separate, explicit decision. Only report what's concretely found — don't speculate about content you haven't actually checked.
