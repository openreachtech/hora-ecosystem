# @openreachtech/hora-ecosystem

Open Reach Techのエコシステムパッケージ群(`renchan-*` / `furo-*` / `mentsu-*`)のモジュールカタログです。Open Reach Techの「AIによる全自動アプリケーション生成」ツールであるHoraが、これらのパッケージの使い方を学習できるように整備されています。

## コンセプト

このパッケージは実行可能なアプリケーションコードを配布するものではありません。配布するのは**カタログデータ**です: 現在追跡対象になっているエコシステムパッケージの一覧(機械可読な形式)と、各パッケージのクラス群とその使い方をまとめた仕様(各パッケージ自身のREADMEやJSDoc/型定義から抽出したもの)です。

カタログの内容は人間の読みやすさを目的としていません。Hora(AI)がパッケージの公開されている機能を理解し、正しく使えるだけの精度があれば十分です。

## インストール

Node.js 20.0.0 以降と npm 11.10.0 以降が必要です(`package.json` の `engines` が宣言している下限)。CI は現行の LTS でビルドしています。

```sh
npm install @openreachtech/hora-ecosystem
```

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

### `lib/docs/`

カタログの本体です。配下のディレクトリ1つがカタログ済みのパッケージ1つにあたるので、これを列挙すればカタログの中身が分かります。

```
lib/docs/
├── furo/
│   ├── README.md
│   └── API.md
├── mentsu-rootpath/
│   ├── README.md
│   └── API.md
├── renchan/
│   ├── README.md
│   └── API.md
└── ...
```

- `README.md` — そのパッケージ自身のREADMEをそのまま複写したもの。上流がREADMEを持たない場合は置かれません。
- `API.md` — パッケージがexportするクラス・関数と、その public なメンバー・メソッド・シグネチャの要約(`.d.ts`またはJSDocから抽出)。

ディレクトリ名は**npmのパッケージ名**から`@openreachtech/`スコープを除いたものです。`config/lookup.js`のキー(リポジトリ名)とは別物で、`furo-core`は`furo`として、`renchan-core`は`renchan`として公開されています。

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
