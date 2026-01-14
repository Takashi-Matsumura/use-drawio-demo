# AI Draw.io Demo

AIを使って業務フロー図を生成・管理するデモアプリケーションです。

## 概要

- **AI図形生成**: 自然言語の説明から業務フロー図を自動生成
- **AI図形編集**: 既存の図をAIに指示して修正・追加
- **draw.io エディタ**: 生成した図をGUIで編集可能
- **データ管理**: SQLiteで業務フロー図を保存・管理
- **SVGエクスポート**: ベクターデータとして出力可能

## 技術スタック

- **フロントエンド**: Next.js 16, React 19, TypeScript
- **エディタ**: react-drawio (draw.io埋め込み)
- **データベース**: SQLite + Prisma
- **AI**: OpenAI GPT-4o (または Anthropic Claude)
- **スタイリング**: Tailwind CSS

## アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  このアプリ      │────▶│  next-ai-draw-io │────▶│  OpenAI API │
│  (フロントエンド) │     │  (図形生成エンジン)│     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │
        ▼
┌─────────────────┐
│  SQLite         │
│  (データ保存)    │
└─────────────────┘
```

## セットアップ

### 前提条件

- Node.js 20+
- next-ai-draw-io サーバー（別途起動が必要）
- OpenAI APIキー

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# データベースのセットアップ
npx prisma migrate dev

# 開発サーバーの起動
npm run dev
```

### 環境変数

`.env.local` に以下を設定:

```env
# OpenAI APIキー（必須）
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxx

# 図形生成エンジンのURL
DRAWIO_API_URL=http://localhost:6002

# データベース
DATABASE_URL="file:./dev.db"
```

## 使い方

### 1. 新規作成

1. http://localhost:3000 にアクセス
2. 右パネルの「AI図形生成」タブでプロンプトを入力
3. 「図形を生成」ボタンをクリック
4. 左パネルのdraw.ioエディタで生成された図を確認・編集
5. 「この図を保存」で保存

### 2. 保存済み図の編集

1. 右パネルの「保存済み」タブをクリック
2. 編集したい図を選択（左パネルに読み込まれる）
3. 編集方法を選択:
   - **AI編集**: 「AI図形生成」タブで追加の指示を入力（例：「〇〇の部分を分岐にして」）
   - **手動編集**: 左パネルのdraw.ioエディタで直接編集
4. 「上書き保存」または「別名保存」で更新

### 3. エクスポート

draw.io エディタの「ファイル」→「形式を指定してエクスポート」から:
- SVG (ベクター)
- PNG (ラスター)
- PDF

## プロジェクト構成

```
app/
├── page.tsx                 # メインページ（タブUI）
├── api/
│   ├── chat/route.ts       # AI生成プロキシ
│   └── diagrams/
│       ├── route.ts        # 一覧取得・新規作成
│       └── [id]/route.ts   # 個別取得・更新・削除
├── components/
│   ├── DiagramEditor.tsx   # draw.ioエディタ
│   └── PromptForm.tsx      # プロンプト入力
└── lib/
    ├── diagram-utils.ts    # XML処理・エッジ検証
    └── prisma.ts           # DB接続

prisma/
├── schema.prisma           # データモデル
└── migrations/             # マイグレーション
```

## Docker で起動

Docker Compose を使って、図形生成エンジンとこのアプリを一緒に起動できます。

### クイックスタート

```bash
# 環境変数を設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# Docker Compose で起動
docker compose up -d

# ログを確認
docker compose logs -f
```

### サービス構成

| サービス | ポート | 説明 |
|---------|--------|------|
| `drawio-engine` | 6002 | AI図形生成エンジン ([next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io)) |
| `frontend` | 3000 | このアプリ（フロントエンド） |

### 図形生成エンジン単独で起動

エンジンだけを起動したい場合:

```bash
docker run -d -p 6002:3000 \
  --name drawio-engine \
  ghcr.io/dayuanjiang/next-ai-draw-io:latest
```

> **Note**: エンジン単独ではAPIキーがないため、直接アクセスしても図形生成できません。
> このアプリ経由でAPIキーをヘッダーで送信する設計です（セキュア）。

### コンテナの停止

```bash
docker compose down

# データも削除する場合
docker compose down -v
```

## 図形生成エンジンについて

このアプリは [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) をバックエンドとして使用します。

- **公式Dockerイメージ**: `ghcr.io/dayuanjiang/next-ai-draw-io:latest`
- APIキーはこのアプリが管理（エンジン側には保持しない）
- 単独ではAPIキーがないため生成不可（セキュアな設計）

## ライセンス

MIT
