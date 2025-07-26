# Thread Deep-Link実装

## 概要
スレッドへの移動を1クリックで実現し、さらに「Reply in thread」クリックを不要にする改善を実装しました。

## 実装内容

### 1. Desktop Deep-Link形式への変換
標準のSlack permalinkをデスクトップdeep-link形式に変換することで、以下を実現：
- Slackデスクトップアプリ内で直接開く
- スレッドパネルが自動的に開く
- 入力欄に自動フォーカス
- 「Reply in thread」クリック不要

### 2. 変換例
```
標準形式: https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869
↓
Desktop Deep-link: slack://channel?team=T0979H6R0H7&id=C0979H6S0P8&message=1753404206.917869&tab=thread_ts
```

**重要**: `tab=thread_ts`パラメータを追加することで、スレッドパネルが即座に開き、入力欄にフォーカスが当たります。

### 3. 実装ファイル
- `src/utils/threadDeepLink.ts`: 変換ユーティリティ
- `src/ui/SmartReplyUIBuilder.ts`: UIビルダーで変換適用
- `src/routes/mentionRoutes.ts`: teamId取得・渡し
- `src/handlers/quickReplyHandler.ts`: teamId取得・渡し

## 改善後のフロー（4ステップ）

1. **Quick Reply** → 返信案表示
2. **返信案コピー** → Ctrl/Cmd+C
3. **スレッドへ** → スレッドパネル自動表示・入力欄フォーカス
4. **ペースト&送信** → Ctrl/Cmd+V → Enter

**削減された操作**: 「Reply in thread」クリック

## Team ID設定

正しいTeam IDを設定する必要があります：

1. Slackワークスペースで任意のチャンネルを開く
2. URLを確認: `https://app.slack.com/client/T12345/C67890`
3. `T12345`の部分がTeam ID

## 誤爆ゼロ方針の遵守

- ✅ Bot送信ではなく、ユーザー操作による送信を維持
- ✅ 手動コピー&ペーストによる確認機会を保持
- ✅ 意図しない送信のリスクなし

## テスト方法

1. `/mention`コマンドを実行
2. 任意のメンションで「Quick Reply」をクリック
3. 「スレッドへ」ボタンをクリック
4. スレッドパネルが開き、入力欄にフォーカスされることを確認
5. Ctrl/Cmd+Vで返信内容をペースト
6. Enterで送信

これにより、ユーザー体験が大幅に向上し、返信までの操作がよりスムーズになりました。