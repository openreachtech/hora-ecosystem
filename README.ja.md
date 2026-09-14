# @openreachtech/hora-ecosystem

Open Reach Techのエコシステムパッケージ群(`renchan-*` / `furo-*` / `mentsu-*`)のモジュールカタログです。Open Reach Techの「AIによる全自動アプリケーション生成」ツールであるHoraが、これらのパッケージの使い方を学習できるように整備されています。

## コンセプト

このパッケージは実行可能なアプリケーションコードを配布するものではありません。配布するのは**カタログデータ**です: 現在追跡対象になっているエコシステムパッケージの一覧(機械可読な形式)と、各パッケージのクラス群とその使い方をまとめた仕様(各パッケージ自身のREADMEやJSDoc/型定義から抽出したもの)です。

カタログの内容は人間の読みやすさを目的としていません。Hora(AI)がパッケージの公開されている機能を理解し、正しく使えるだけの精度があれば十分です。

## インストール

Node.js 20.0.0 以降が必要です(`package.json` の `engines` が宣言している下限)。CI は現行の LTS でビルドしています。

```sh
npm install @openreachtech/hora-ecosystem
```

ES モジュール(`"type": "module"`)です。ESM の `import` 構文でインポートしてください。

## 使い方

### `config/lookup.js`

カタログを生成するための台帳です。検討対象になったORTのリポジトリを、現在カタログ化されているかどうかにマッピングしています。

```js
const TARGET_REPOSITORIES = {
  'furo-core': true,
  'mentsu-rootpath': true,
  'renchan-core': true,
  'renchan-tools-twilio': false,
  // ...
}
```

キーは**GitHubのリポジトリ名**から`openreachtech/`のオーナー部分を除いたものであり、npmのパッケージ名ではありません。リポジトリと公開名が異なる場合、両者は食い違います。

値が`false`のリポジトリは、存在は認識しているものの意図的にカタログ対象から外されているもの(非推奨、または未決定など)です。このオブジェクトに全く現れないリポジトリは、そもそも候補になったことがないものです。

このファイルは、生成スキルが何を取得すべきかを知るために存在します。カタログの中身を知るには、下の`lib/docs/`を読んでください。

### `lib/docs/<package-name>/`

`config/lookup.js`で`true`になっているパッケージ名ごとに、このディレクトリには以下が置かれます:

- `README.md` — そのパッケージ自身のREADMEが存在する場合、その内容をそのまま複写したもの。
- `API.md` — パッケージがexportするクラス・関数と、その public なメンバー・メソッド・シグネチャの要約(`.d.ts`またはJSDocから抽出)。

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

## コントリビューション

バグ報告・機能要望・コード貢献を歓迎します。

GitHub Issues からお気軽にご連絡ください。

`config/lookup.js`と`lib/docs/`配下のカタログは、Claude Codeのスキルで保守されています。使い方は[CONTRIBUTION.ja.md](https://github.com/openreachtech/hora-ecosystem/blob/main/CONTRIBUTION.ja.md)を参照してください。

```sh
git clone https://github.com/openreachtech/hora-ecosystem.git
cd hora-ecosystem
npm install
npm run lint
npm test
```

## ライセンス

本プロジェクトは Apache License 2.0 で公開されています。

詳細は [LICENSE ファイル](./LICENSE) を参照してください。

## 開発者

[Open Reach Tech Inc.](https://openreach.tech)

## 著作権

© 2026 Open Reach Tech Inc.
