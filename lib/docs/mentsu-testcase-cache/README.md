# @openreachtech/mentsu-testcase-cache

A zero-dependency, runner-agnostic, local-only test-result cache. It reuses a recorded test pass when a verification unit's inputs are unchanged — it never skips, selects, or weakens a test; it only skips the second execution over identical inputs.

## Concept

```
key = sha256( command + node version + platform/arch
              + keyed environment values
              + every git-visible file's path and content hash
              + declared extras )
```

- **Derived inputs, not declared.** The input set is the repository's own visible files; configuration can only *add* to the key. A wrong declaration costs time — it cannot manufacture a green.
- **Only passes are recorded.** A failure is executed every time.
- **Spot audit by default.** When a recorded pass was reused, one reused unit is re-executed at random and compared. A mismatch discards every record and exits with its own code (3), distinct from a test failure (1).
- **Local only.** The cache is a directory on this machine. No server, no network.

## Installation

Requires Node.js 20.x or later (the CI builds against the current LTS).

```sh
npm install @openreachtech/mentsu-testcase-cache
```

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

The commands (`mentsu-testcase-cache [unit...]` / `--cold` / `--no-audit` / `--status` / `--clear`), the `.hora-cache.json` configuration, the exit codes, and the record files are described in the usage document.

[Usage of the mentsu-testcase-cache CLI](https://github.com/openreachtech/mentsu-testcase-cache/blob/main/docs/en/usage/usage.md)

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-testcase-cache.git
cd mentsu-testcase-cache
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
