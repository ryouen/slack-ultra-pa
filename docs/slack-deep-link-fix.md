# Slack Deep-Link 修正実装

## 問題
`https://app.slack.com/client/...`形式のURLを使用していたため、Slackアプリ内ではなくWebブラウザで開いてしまっていた。

## 解決策
Slackの公式Deep-Link形式を使用：
```
slack://channel?team=TEAM_ID&id=CHANNEL_ID&message=TIMESTAMP&tab=thread_ts
```

## 重要ポイント
- `slack://`プロトコル: OSレベルでSlackクライアントにハンドリングされる
- `tab=thread_ts`パラメータ: スレッドパネルを即座に開き、入力欄にフォーカス

## 実装の効果
1. **Quick Reply** → 返信案表示
2. **返信案コピー** → Ctrl/Cmd+C
3. **スレッドへ** → Slack内でスレッドパネル開く（ブラウザに飛ばない）
4. **ペースト&送信** → Ctrl/Cmd+V → Enter

## 誤爆ゼロ方針の維持
- ✅ Bot送信ではなく、ユーザー操作による送信
- ✅ 手動コピー&ペーストによる確認機会
- ✅ 意図しない送信のリスクなし