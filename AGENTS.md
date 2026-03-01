# AGENTS.md

このドキュメントはAIエージェントおよび新規参入者向けに、本リポジトリの構成・開発手順・規約をまとめたものです。

---

## プロジェクト概要

GitHub リポジトリの Issues をノードグラフとして可視化するWebアプリケーションです。
`@xyflow/react`（React Flow）の動作確認・学習目的のサンドボックスプロジェクトです。

- Issueの親子関係・依存関係をエッジで結び、BFSによる階層レイアウトで表示します。
- **実質的なアプリ本体は `client/` 配下のみです。** `app/` ディレクトリは未使用の残骸です。

---

## 技術スタック

| カテゴリ       | 技術・バージョン                                   |
| -------------- | -------------------------------------------------- |
| フレームワーク | Next.js 15（App Router）                           |
| UIライブラリ   | React 19                                           |
| フローグラフ   | @xyflow/react 12                                   |
| 言語           | TypeScript 5                                       |
| スタイリング   | Tailwind CSS 3.4 / CSS Modules（SCSS）             |
| コンテナ       | Docker / Docker Compose                            |
| Node.js        | 23.6（Docker内）                                   |
| Lint           | ESLint 9（next/core-web-vitals + next/typescript） |

---

## ディレクトリ構造

```
react-flow/
├── Makefile                 # 開発コマンド集（make up / make build 等）
├── docker-compose.yml       # コンテナ定義
├── docker/
│   └── client.Dockerfile    # マルチステージビルド（local / build / production）
├── scripts/
│   └── setup.sh             # gcloud ADC 認証セットアップ
├── app/                     # ※未使用。無視してください。
└── client/                  # ★ メインのNext.jsアプリ
    ├── app/
    │   ├── layout.tsx           # ルートレイアウト（ReactFlowProvider を包含）
    │   ├── page.tsx             # ホームページ（/）
    │   ├── flows/
    │   │   └── page.tsx         # フローページ（/flows）
    │   └── api/
    │       └── github/issues/
    │           └── route.ts     # GitHub Issues APIプロキシ（GET /api/github/issues）
    ├── components/
    │   ├── RightSheet.tsx        # 右サイドパネル（ノード一覧表示）
    │   └── flows/
    │       ├── index.tsx         # メインFlowコンポーネント（キャンバス本体）
    │       ├── nodes/
    │       │   ├── index.tsx         # ノード型定義・nodeTypes マップ
    │       │   ├── DefaultNode.tsx   # テキスト入力付きデフォルトノード
    │       │   ├── IssueNode.tsx     # GitHub Issue表示ノード
    │       │   └── PositionLoggerNode.tsx # 座標表示デバッグノード
    │       └── edges/
    │           ├── index.tsx         # エッジ型定義・edgeTypes マップ
    │           └── ButtonEdge.tsx    # 削除ボタン付きエッジ
    ├── hooks/
    │   └── flowProvider.tsx     # FlowContext（useReducer による状態管理）
    ├── styles/
    │   ├── globals.css
    │   ├── flows.module.scss
    │   ├── issueNode.module.scss
    │   └── rightsheet.module.scss
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── eslint.config.mjs
    └── package.json
```

---

## 開発セットアップ

### 前提条件

- Docker Desktop がインストールされていること
- `gcloud` CLI がインストールされていること（GitHub API の認証には不要）

### 初回セットアップ

```bash
# gcloud の Application Default Credentials を設定（Google Cloud を使う場合）
make setup

# Dockerイメージをビルド
make build

# 依存パッケージをインストール（コンテナ内 npm ci）
make install
```

### 開発サーバー起動

```bash
make up
# → http://localhost:3000 でアクセス可能
```

### その他のコマンド

| コマンド     | 内容                             |
| ------------ | -------------------------------- |
| `make down`  | コンテナ停止・削除               |
| `make sh`    | 実行中コンテナのbashに接続       |
| `make logs`  | クライアントコンテナのログを追跡 |
| `make lint`  | ESLint実行（`npm run lint`）     |
| `make audit` | `npm audit fix --force` 実行     |

### コンテナを使わずローカルで実行する場合

```bash
cd client
npm install
npm run dev
```

---

## 環境変数

`.env.local`（`client/.env.local`）を作成して設定します。いずれも省略可能ですがGitHub API のレート制限を避けるため `GITHUB_TOKEN` の設定を推奨します。

| 変数名         | デフォルト値   | 説明                                                   |
| -------------- | -------------- | ------------------------------------------------------ |
| `GITHUB_OWNER` | `kogatakanori` | GitHub リポジトリのオーナー名                          |
| `GITHUB_REPO`  | `react-flow`   | GitHub リポジトリ名                                    |
| `GITHUB_TOKEN` | （未設定）     | GitHub Personal Access Token（任意・レート制限回避用） |

---

## APIエンドポイント

### `GET /api/github/issues`

GitHub API からIssueを取得し、Issue間の依存関係を解析して返します。

**レスポンス形式:**

```json
{
  "issues": [
    /* GitHubIssueオブジェクト配列（PRを除外済み） */
  ],
  "relationships": [{ "source": 1, "target": 2 }]
}
```

**関係検出パターン**（Issueのbodyをパース）:

| パターン                              | 意味                  |
| ------------------------------------- | --------------------- |
| `parent: #123` / `parent issue: #123` | 親Issue               |
| `depends on #123`                     | 依存先                |
| `blocked by #123`                     | ブロッカー            |
| `- [ ] #123` / `- [x] #123`           | タスクリスト          |
| `closes #123` / `fixes #123`          | 完了により閉じるIssue |

**キャッシュ:** 60秒（`next: { revalidate: 60 }`）

---

## コーディング規約・注意事項

### ノードを追加する場合

1. `client/components/flows/nodes/` に新しいコンポーネントファイルを作成する。
2. `client/components/flows/nodes/index.tsx` の `nodeTypes` マップに登録する。

### エッジを追加する場合

1. `client/components/flows/edges/` に新しいコンポーネントファイルを作成する。
2. `client/components/flows/edges/index.tsx` の `edgeTypes` マップに登録する。

### スタイリング

- コンポーネント固有のスタイルは `client/styles/` 配下の **CSS Modules（SCSS）** を使用する。
- レイアウト・ユーティリティには **Tailwind CSS** を使用する。

### 状態管理

- `client/hooks/flowProvider.tsx` の `FlowProvider` / `useFlow` は現状ほぼ未活用です。
  状態管理を変更・拡張する場合はこのファイルへの対応も検討してください。

### TypeScript

- `any` 型の使用は避けてください。
- `npm run lint`（ESLint）がエラーなしで通ることを確認してから変更を提出してください。
