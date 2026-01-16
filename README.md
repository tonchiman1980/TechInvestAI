
# TechInvest AI

最新のテックニュースを「プロの視点」と「やさしい解説」で学ぶ、投資家向けiPhoneニュースアプリ。

## 🚀 セットアップ手順

1. **GitHubにアップロード**:
   - このリポジトリの内容をそのまま自分のGitHubにアップロードしてください。
   - **重要**: 自分で作成した `icon.png` をルートディレクトリ（このファイルと同じ場所）に保存してください。

2. **Netlifyでデプロイ**:
   - Netlifyにログインし、「Import from GitHub」からこのリポジトリを選択。
   - **Environment variables** (環境変数) に以下を設定：
     - `API_KEY`: Google Gemini APIのキー

3. **iPhoneでアイコンとして追加**:
   - NetlifyのURLをiPhoneのSafariで開きます。
   - 画面中央下の「共有ボタン（矢印）」を押し、**「ホーム画面に追加」**をタップ。
   - ホーム画面に `icon.png` がアイコンとして表示され、アプリのように起動できるようになります。

## 📂 フォルダ構成
- `App.tsx`: メインUI
- `index.html`: iPhone/PWA設定
- `manifest.json`: アプリ情報
- `icon.png`: あなたが作成するアイコン画像
- `netlify/functions/api.ts`: バックエンド処理
