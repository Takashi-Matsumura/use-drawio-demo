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
- **AI**: OpenAI GPT-4o / Anthropic Claude / Ollama（ローカル・クラウド両対応）
- **スタイリング**: Tailwind CSS

## アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  このアプリ      │────▶│  next-ai-draw-io │────▶│  OpenAI API     │
│  (フロントエンド) │     │  (図形生成エンジン)│     │  Anthropic API  │
└─────────────────┘     └──────────────────┘     │  Ollama (Local) │
        │                                        │  Ollama Connect │
        ▼                                        └─────────────────┘
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
# AI設定（エンジン・フロントエンド共通で使用）
AI_PROVIDER=openai                    # openai, anthropic, ollama
NEXT_PUBLIC_AI_PROVIDER=openai
AI_MODEL=gpt-4o                       # 使用するモデル
NEXT_PUBLIC_AI_MODEL=gpt-4o

# OpenAI APIキー（AI_PROVIDER=openai の場合）
OPENAI_API_KEY=sk-proj-xxxxx
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxx

# Anthropic APIキー（AI_PROVIDER=anthropic の場合）
# ANTHROPIC_API_KEY=sk-ant-xxxxx
# NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxxxx

# 図形生成エンジンのURL
DRAWIO_API_URL=http://localhost:6002

# データベース
DATABASE_URL="file:./dev.db"
```

### AIプロバイダーの切り替え

`.env.local` を編集するだけでOpenAI/Anthropic/Ollamaを切り替えられます:

**Anthropicを使う場合:**
```env
AI_PROVIDER=anthropic
NEXT_PUBLIC_AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
NEXT_PUBLIC_AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-xxxxx
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Ollama（ローカルLLM）を使う場合:**
```env
AI_PROVIDER=ollama
NEXT_PUBLIC_AI_PROVIDER=ollama
AI_MODEL=deepseek-r1:14b              # または qwen2.5, llama3.2 など
NEXT_PUBLIC_AI_MODEL=deepseek-r1:14b
# APIキーは不要
```

**Ollama Connect（クラウドモデル）を使う場合:**
```env
AI_PROVIDER=ollama
NEXT_PUBLIC_AI_PROVIDER=ollama
AI_MODEL=qwen3-coder:480b-cloud       # Ollama Connectクラウドモデル
NEXT_PUBLIC_AI_MODEL=qwen3-coder:480b-cloud
# APIキーは不要（Ollama Connect認証を使用）
```

> **Note**: Ollamaを使用するには、事前に https://ollama.ai/ からOllamaをインストールし、使用するモデルを `ollama pull deepseek-r1:14b` などでダウンロードしておく必要があります。図の生成には高性能なモデル（DeepSeek R1、Qwen2.5など）を推奨します。
>
> **Ollama Connectについて**: `qwen3-coder:480b-cloud` などの `-cloud` サフィックス付きモデルは、[Ollama Connect](https://ollama.com/blog/ollama-is-now-available-on-all-devices) を使用してクラウド上で実行されます。事前に `ollama connect` コマンドで認証を完了しておく必要があります。

**llama.cpp / LM Studio（OpenAI互換API）を使う場合:**
```env
AI_PROVIDER=openai
NEXT_PUBLIC_AI_PROVIDER=openai
AI_MODEL=gemma-3n-E4B-it              # ロードしたモデル名
NEXT_PUBLIC_AI_MODEL=gemma-3n-E4B-it
OPENAI_API_KEY=llama-cpp-local        # ダミー値でOK
NEXT_PUBLIC_OPENAI_API_KEY=llama-cpp-local
OPENAI_BASE_URL=http://localhost:8080/v1  # llama.cppのポート
```

> **Note**: llama.cppやLM StudioはOpenAI互換APIを提供するため、`AI_PROVIDER=openai` を使用します。`OPENAI_BASE_URL` でローカルサーバーのエンドポイントを指定します。APIキーはダミー値で構いません。

変更後はDockerコンテナを再起動してください:
```bash
docker compose up -d drawio-engine
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

| サービス | ポート | 説明 | プロファイル |
|---------|--------|------|-------------|
| `drawio-engine` | 6002 | AI図形生成エンジン（OpenAI/Anthropic/llama.cpp/LM Studio用） | デフォルト |
| `ollama` | 11434 | Ollama LLMサーバー | `ollama` |
| `drawio-engine-ollama` | 6002 | AI図形生成エンジン（Ollama専用） | `ollama` |

> **Note**: フロントエンドは開発サーバー（`npm run dev`）を使用します。

### llama.cpp / LM Studio + Docker での起動

llama.cppやLM Studioなど、ホストで動作するOpenAI互換APIを使用する場合：

```bash
# ホストでllama.cppまたはLM Studioを起動（ポート8080）
# その後、Dockerコンテナを起動
docker compose up -d drawio-engine
```

drawio-engineは `OPENAI_BASE_URL` 環境変数を認識し、`host.docker.internal` 経由でホストのAPIサーバーに接続します。

### Ollama + Docker での起動

Ollamaを使用する場合は `ollama` プロファイルを指定：

```bash
docker compose --profile ollama up -d
```

この構成では：
- Ollamaコンテナが起動
- drawio-engine-ollamaがOllamaとネットワークを共有（`network_mode: "service:ollama"`）
- ホストの `~/.ollama` をマウントしてOllama Connect認証情報を共有

**重要**: Ollama Connectクラウドモデル（`qwen3-coder:480b-cloud`など）を使用する場合、ホストの `~/.ollama` ディレクトリをマウントすることで、認証情報がDockerコンテナに引き継がれます。

### なぜOllamaだけDockerコンテナが必要か

drawio-engineイメージは**OllamaのURLを`127.0.0.1:11434`にハードコード**しており、Ollama用の環境変数では変更できません。

一方、**OpenAI互換API**（llama.cpp、LM Studio）の場合は `OPENAI_BASE_URL` 環境変数が認識されるため、ホストで動作するサーバーを `host.docker.internal` 経由で利用できます。

#### Ollamaで試した方法と失敗理由

| 方法 | 結果 | 理由 |
|------|------|------|
| `OLLAMA_BASE_URL` 環境変数 | ❌ | イメージが無視する |
| `OLLAMA_HOST` 環境変数 | ❌ | イメージが無視する |
| `host.docker.internal` | ❌ | イメージが読み取らない |
| `network_mode: "host"` | ❌ | Mac版Docker Desktopでは機能しない（VMの制限） |
| `OPENAI_BASE_URL` 環境変数 | ✅ | **OpenAI互換APIでは認識される** |

#### Dockerコンテナ内の `localhost` の問題

Dockerコンテナ内の `localhost` はコンテナ自身を指すため、ホストで動作しているOllamaには到達できません：

```
┌─────────────────────────────────────────────────────────┐
│  Docker Desktop (Linux VM)                              │
│  ┌─────────────────┐                                    │
│  │ drawio-engine   │                                    │
│  │ localhost:11434 │ ──→ コンテナ自身（Ollamaなし）❌    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
         ↓ 到達不可
┌─────────────────┐
│  Mac (ホスト)    │
│  Ollama :11434  │
└─────────────────┘
```

#### 解決策: ネットワーク名前空間の共有

`network_mode: "service:ollama"` を使用することで、drawio-engineとOllamaコンテナが同じネットワーク名前空間を共有します：

```
┌─────────────────────────────────────────────────────────┐
│  Docker Desktop (Linux VM)                              │
│  ┌─────────────────────────────────────────────┐        │
│  │ 共有ネットワーク名前空間                      │        │
│  │  ┌─────────────┐    ┌─────────────────┐     │        │
│  │  │   Ollama    │◀───│  drawio-engine  │     │        │
│  │  │   :11434    │    │  localhost:11434│     │        │
│  │  └─────────────┘    └─────────────────┘     │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

この構成により、drawio-engineが `localhost:11434` に接続すると、同じネットワーク名前空間内のOllamaコンテナに到達します。

### Apple Silicon (M1/M2/M3) での注意

DockerHub上のnext-ai-draw-ioイメージはすべて **AMD64 (x86_64)** 用です。
Apple Silicon Macでは**エミュレーション**で動作するため、パフォーマンスが低下する可能性があります。

最適なパフォーマンスが必要な場合は、ソースからARM64用にビルドしてください:

```bash
# next-ai-draw-ioをクローン
git clone https://github.com/DayuanJiang/next-ai-draw-io.git
cd next-ai-draw-io

# ARM64用にビルド
docker build --platform linux/arm64 -t next-ai-draw-io:arm64 .
```

### 図形生成エンジン単独で起動

エンジンだけを起動したい場合:

```bash
docker run -d -p 6002:3000 \
  --name drawio-engine \
  -e AI_PROVIDER=openai \
  -e AI_MODEL=gpt-4o \
  -e OPENAI_API_KEY=sk-proj-xxxxx \
  wbsu2003/next-ai-draw-io:latest
```

> **Note**: 図形生成エンジンには `AI_PROVIDER`、`AI_MODEL`、および対応するAPIキー（Ollama以外）の環境変数が必須です。

### コンテナの停止

```bash
docker compose down

# データも削除する場合
docker compose down -v
```

## 図形生成エンジンについて

このアプリは [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) をバックエンドとして使用します。

- **Dockerイメージ**: `wbsu2003/next-ai-draw-io:latest` (DockerHub)
- **必須環境変数**: `AI_PROVIDER`、`AI_MODEL`、APIキー（Ollama以外）
- **対応プロバイダー**: OpenAI, Anthropic, Ollama（ローカルLLM）
- `.env.local` で一元管理し、エンジンとフロントエンドで共有

## 検証済みモデル

以下のモデルで動作確認済みです：

| プロバイダー | モデル | 備考 |
|-------------|--------|------|
| OpenAI | `gpt-4o` | 推奨 |
| Anthropic | `claude-sonnet-4-20250514` | 推奨 |
| Ollama (Cloud) | `qwen3-coder:480b-cloud` | Ollama Connect経由、高性能 |
| Ollama (Local) | `deepseek-r1:14b`, `qwen2.5` | ローカル実行 |
| llama.cpp | `gemma-3n-E4B-it` | OpenAI互換API経由 |
| LM Studio | - | OpenAI互換API経由 |

> **検証環境**: macOS (Apple Silicon M3), Docker Desktop, Next.js 16

## ライセンス

MIT
