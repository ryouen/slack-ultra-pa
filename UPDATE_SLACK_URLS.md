# Slack URL更新手順（ngrok再起動時）

## ngrokで新しいURLが発行されたら

### 1. ngrokのURLを確認
```
Forwarding: https://[新しいID].ngrok-free.app -> http://localhost:3000
```

### 2. Slackアプリ設定を更新

https://api.slack.com/apps でアプリを選択して以下を更新：

#### Event Subscriptions
- Request URL: `https://[新しいID].ngrok-free.app/slack/events`

#### Interactivity & Shortcuts  
- Request URL: `https://[新しいID].ngrok-free.app/slack/events`

#### Slash Commands
各コマンドのRequest URLを更新：
- `/todo`: `https://[新しいID].ngrok-free.app/slack/events`
- `/mention`: `https://[新しいID].ngrok-free.app/slack/events`
- `/collect`: `https://[新しいID].ngrok-free.app/slack/events`

### 3. 開発サーバーを再起動
```bash
npm run dev
```

## 効率化のヒント

1. **Slack App Manifestを使用**
   - App Manifestで一括更新が可能
   - Settings → App Manifest

2. **環境変数にngrok URLを設定**
   ```bash
   NGROK_URL=https://[新しいID].ngrok-free.app
   ```

3. **有料プランの検討**
   - 月$10で固定サブドメイン
   - 開発効率が大幅に向上