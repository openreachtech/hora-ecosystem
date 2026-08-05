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

## 言語ミラー

両スキルは`.claude/skills/`配下に英語で置かれています。スキルを編集した際は、`.scratch/skills/`配下(gitignore対象、ローカル限定)の日本語ミラーも同期させます。
