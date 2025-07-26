# Slack App Settings Checklist

このファイルは、Slack App設定で必要な3つのURL設定を確認するためのチェックリストです。

## ngrok URL
現在のngrok URL: `https://6c6f7ffe797a.ngrok-free.app`

## 必要な設定箇所

### 1. OAuth & Permissions
- **Redirect URLs**: 
  ```
  https://6c6f7ffe797a.ngrok-free.app/slack/oauth/callback
  ```
  
### 2. Event Subscriptions
- **Request URL**: 
  ```
  https://6c6f7ffe797a.ngrok-free.app/slack/events
  ```
  
### 3. Interactivity & Shortcuts
- **Request URL**: 
  ```
  https://6c6f7ffe797a.ngrok-free.app/slack/actions
  ```

## 確認手順

1. https://api.slack.com/apps へアクセス
2. 対象のアプリを選択
3. 各セクションでURLを確認・更新：
   - OAuth & Permissions → Redirect URLs
   - Event Subscriptions → Enable Events → Request URL
   - Interactivity & Shortcuts → Turn On → Request URL

## 重要な注意事項

- ngrokを再起動した場合は、新しいURLですべての設定を更新する必要があります
- Event SubscriptionsとInteractivityのURLは検証が必要です（Challenge verification）
- すべてのURLはHTTPSである必要があります