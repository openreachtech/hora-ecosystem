# コントリビューション

このリポジトリのカタログ(`config/lookup.js`と`lib/docs/`)は、2つのClaude Codeスキルを使って保守されています。このドキュメントはその使い方を説明するものです — 公開済みパッケージを利用するだけであれば不要です([README.ja.md](./README.ja.md)を参照してください)。

## 前提

- [Claude Code](https://claude.com/claude-code)で、このリポジトリを開いていること。
- [`gh`](https://cli.github.com/)がインストール済みでログイン済みであること(`gh auth status`で確認)。読み取り権限のみで十分です — 読み取り専用のfine-grained personal access token(Resource owner: `openreachtech`、Permissions: Contents/Metadata Read-only)で足ります。

## `/lookup`

このカタログが追跡するエコシステムリポジトリのホワイトリスト、`config/lookup.js`を再生成します。

- `openreachtech` GitHub organizationの`renchan-*` / `furo-*` / `mentsu-*` / `jest-*`リポジトリを取得する。
- `config/rulesets.js`で定義された`includes` / `excludes` / `turned-off`のワイルドカードルールを適用する。
- 現行の`config/lookup.js`との差分を報告し、書き込み前に確認を取る。

`config/rulesets.js`自体の編集(どのリポジトリを含める・除外する・無効にするかの判断)は人間が決めることです — このスキルは、今のルールで拾いきれていないものを報告するところまでに留め、パターンを自分で追加・修正することはありません。

最新の手順は[`.claude/skills/lookup/SKILL.md`](./.claude/skills/lookup/SKILL.md)を参照してください。

## `/scribe`

`config/lookup.js`で`true`になっている各パッケージについて、`lib/docs/<package-name>/README.md`と`API.md`を生成します。

- 既にこのリポジトリの`devDependencies`に追加済みのパッケージのみが対象です(パッケージを依存として追加すること自体は別の、手動の作業です。下記参照)。
- そのパッケージ自身の`README.md`が存在すればそのまま複写し、無ければ`API.md`のみを書き出します(READMEを一から執筆することはありません)。
- `API.md`は、パッケージがexportするクラス・関数とその public なメンバーを、`.d.ts`またはJSDocから抽出した単純なMarkdownの要約です — 人間向けの読みやすさではなく、Hora(AI)が読むために書かれています。
- 既に`lib/docs/<package-name>/`があるパッケージはスキップします。更新したい場合は、先にそのフォルダを削除してください。
- `config/lookup.js`から削除された、または`false`になったパッケージの`lib/docs/<package-name>/`は自動的に削除されます。

最新の手順は[`.claude/skills/scribe/SKILL.md`](./.claude/skills/scribe/SKILL.md)を参照してください。

## 典型的な作業の流れ

1. `/lookup`を実行し、`openreachtech` organizationの現状に合わせて`config/lookup.js`を更新する。
2. 新しく`true`になったパッケージのうち、実際に公開済み(npmjs.comまたはGitHub Packages)でまだ`devDependencies`に無いものを追加し、`npm install`を実行する。
3. `/scribe`を実行し、新たに利用可能になった分のドキュメントを生成する。

## 依存の上書き

`package.json` は 4 つの `overrides` を持ち、そのすべてが、依存元の宣言した範囲の
外へ版を動かしています。そして `package.json` には、その理由を書く
コメントが置けません。

| 上書き | 依存元の宣言範囲 | 判定 |
|---|---|---|
| `glob: ^14.0.2` | `@jest/reporters@30.5.2` は `^13.0.6` を要求 | **メジャー1つ分の範囲外** |
| `glob: ^14.0.2` | `jest-config@30.5.2` は `^13.0.6` を要求 | **メジャー1つ分の範囲外** |
| `glob: ^14.0.2` | `jest-runtime@30.5.2` は `^13.0.6` を要求 | **メジャー1つ分の範囲外** |
| `glob: ^14.0.2` | `@vercel/nft@1.11.1` は `^13.0.0` を要求 | **メジャー1つ分の範囲外** |
| `glob: ^14.0.2` | `test-exclude@7.0.2` は `^10.4.1` を要求 | **メジャー4つ分の範囲外** |
| `minimatch@10: ^11.0.1` | `test-exclude@7.0.2` は `^10.2.2` を要求 | **メジャー1つ分の範囲外** |
| `minimatch@10: ^11.0.1` | `readdir-glob@3.0.0` は `^10.2.2` を要求 | **メジャー1つ分の範囲外** |
| `graphql-middleware` &rarr; `@graphql-tools/delegate: ^12.2.1` | `graphql-middleware@6.1.35` は `^8.8.1` を要求 | **メジャー4つ分の範囲外** |
| `graphql-middleware` &rarr; `@graphql-tools/schema: ^10.1.5` | `graphql-middleware@6.1.35` は `^8.5.1` を要求 | **メジャー2つ分の範囲外** |
| `uuid: ^11.1.1` | `sequelize@6.37.8` は `^8.3.2` を要求 | **メジャー3つ分の範囲外** |

どれも意図して採った判断で、理由は同じです。advisory は新しいメジャーで修正され、
依存元の範囲内のどの版にも修正がありません。つまり `npm audit` には、範囲内に
移れる版がありませんでした。

| パッケージ | advisory | 修正版 |
|---|---|---|
| `glob` | `GHSA-3g3m-2fjr-6pw4` | 14.0.2 |
| `minimatch` | `GHSA-g3hv-75wg-m249` | 11.0.1 |
| `@graphql-tools/utils` | `GHSA-7mx3-vvmw-hjmv` | 12.0.1 |

`@graphql-tools/utils` 自体には上書きを置いていません。`@graphql-tools/delegate` と
`@graphql-tools/schema` の 8 系がこれを `8.9.0` ちょうどに固定しているため、この
2 つを上げることで修正済みの版が入ります。

`minimatch` の上書きは 10 系だけに絞っています。`eslint` が要求する 3 系は advisory の
対象外です。また `minimatch` 11 には default export がなく、`@eslint/config-array` の
ESM エントリはそれを import しています。

ここで安全だと言える理由は、それぞれ違います。

- **`glob` と `minimatch`** 10 は、`jest` と `nuxt` のビルド用ツールを通って入ります。
  両方の上書きを置いた状態で `npm test -- --coverage` が通り、このリポジトリは
  `nuxt` を実行しません。
- **`graphql-middleware`** は `@openreachtech/renchan` を通って入ります。`renchan` は
  `/scribe` が読むためにここへ入れているもので、実行されることはありません。
- **`uuid`** 11 は CJS のエントリを維持しているため、`sequelize` の
  `require('uuid')` が解決します。

いずれも、このパッケージの devDependencies の下にあります。このパッケージの
`dependencies` は空で、公開されるのは `config/`・`lib/` だけです。同梱物がここに
触れる経路はありません。

**`jest`・`nuxt`・`@openreachtech/renchan`・`sequelize` のどれかが動いたら、これらの
上書きを必ず見直してください。** 範囲違反が成り立つのはその裏のコードが変わらない
間だけで、それが崩れたことを npm は何も報告しません。

## 言語ミラー

両スキルは`.claude/skills/`配下に英語で置かれています。スキルを編集した際は、`.scratch/skills/`配下(gitignore対象、ローカル限定)の日本語ミラーも同期させます。
