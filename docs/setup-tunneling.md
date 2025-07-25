# Slack App Tunneling Setup / トンネリング設定

## 概要

Slackアプリをローカル開発環境で動作させるには、インターネットからアクセス可能なURLが必要です。
このドキュメントでは、localtunnelを使用したセットアップ方法を説明します。

## 推奨される起動順序

### 1. localtunnelを先に起動する（推奨）

```bash
# Terminal 1: localtunnelを起動
npx localtunnel --port 3000 --subdomain clear-regions-follow

# Terminal 2: アプリケーションを起動
npm run dev
```

**メリット:**
- ポート3000が確実に空いている状態でアプリが起動
- URLが固定されている（--subdomainオプション使用時）
- Slack側の設定を変更する必要がない

### 2. アプリケーションを先に起動する場合

```bash
# Terminal 1: アプリケーションを起動
npm run dev
# ポート3000が使用中の場合、自動的に3001, 3002...を試します

# Terminal 2: 実際に使用されているポートでlocaltunnelを起動
npx localtunnel --port 3001 --subdomain clear-regions-follow
```

**注意点:**
- アプリが別のポートで起動した場合、localtunnelのポート番号も変更が必要
- Slack App設定のURLも更新が必要な場合がある

## トラブルシューティング

### ポート競合の解決

開発環境では、アプリケーションが自動的に利用可能なポートを探します：

1. まずポート3000を試します
2. 使用中の場合、3001, 3002...と順番に試します
3. 実際に使用されているポートがログに表示されます

```
info: Port 3000 was busy, using port 3001 instead
info: ⚡️ Slack Personal Assistant is running on port 3001!
```

### Windows環境での注意点

Windowsでは、Ctrl+Cでの終了が正しく動作しない場合があります。
アプリケーションには適切なシャットダウン処理が実装されています：

- Ctrl+Cを押すと、graceful shutdownが実行されます
- ポートが適切に解放されます
- InboxCleanupServiceなどのバックグラウンドタスクも停止します

### localtunnelが切断された場合

localtunnelは時々接続が切れることがあります。その場合：

1. localtunnelを再起動
2. 同じsubdomainが使用できない場合は、新しいURLをSlack App設定に反映

## 推奨設定

`.env`ファイル：
```env
PORT=3000
SLACK_REDIRECT_URI=https://clear-regions-follow.loca.lt/slack/oauth/redirect
```

## セキュリティ注意事項

- localtunnelは開発環境専用です
- 本番環境では適切なホスティングサービスを使用してください
- 機密情報を含むリクエストは暗号化されていますが、開発時のみの使用を推奨します