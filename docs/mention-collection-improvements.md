# メンション収集機能の改善案

## 現在の実装と制約

### 現在の仕組み
- **ボットトークン使用**: ボットが参加しているチャンネルのみ監視可能
- **Event API**: `message`イベントで`<@UserID>`を検出
- **制約**: ボットが参加していないチャンネルのメンションは収集不可

### 技術的制約（Slack API）
1. `app_mention`イベントはボット自身へのメンションのみ
2. ユーザーへのメンション専用イベントは存在しない
3. `search.messages` APIは`search:read`スコープが必要（エンタープライズ限定）
4. ボットトークンではチャンネルメンバーシップが必須

## 改善案

### 1. User Token アプローチ（推奨）
ユーザートークン（`xoxp-`）を使用することで、ボットがチャンネルに参加していなくても、そのユーザーが見えるチャンネルの履歴を取得可能。

**メリット**:
- ボットを多数のチャンネルに招待する必要がない
- ユーザーが参加している全チャンネルをカバー可能
- プライベートチャンネルも自動的にカバー

**実装方法**:
```typescript
// 1. OAuth設定でuser scopeを追加
// channels:history, groups:history, im:history, mpim:history

// 2. ユーザー認証フローの実装
app.get('/slack/oauth/authorize', async (req, res) => {
  const authUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `scope=channels:history,groups:history&` +
    `user_scope=channels:history,groups:history,im:history`;
  res.redirect(authUrl);
});

// 3. ユーザートークンでの履歴取得
const userClient = new WebClient(userToken);
const history = await userClient.conversations.history({
  channel: channelId,
  limit: 100
});
```

### 2. ハイブリッドアプローチ
Event API（リアルタイム）とWeb API（定期取得）の組み合わせ。

**実装例**:
- **リアルタイム**: ボットが参加しているチャンネルはEvent APIで即座に検出
- **定期取得**: 1時間ごとにユーザートークンで全チャンネルをスキャン
- **メリット**: 重要なチャンネルは即座に、その他は定期的に収集

### 3. 段階的な実装計画

#### Phase 1: 現在の実装の最適化
- [x] Event APIでの基本的なメンション収集
- [x] データベースへの保存と管理
- [x] /mentionコマンドでの表示

#### Phase 2: User Token統合（将来）
- [ ] OAuth認証フローの実装
- [ ] ユーザートークンの安全な保存
- [ ] 定期的な履歴スキャン機能
- [ ] ユーザーごとの収集設定

#### Phase 3: 高度な機能（将来）
- [ ] メンションの重要度自動判定
- [ ] スレッド返信の追跡
- [ ] メンション統計とレポート

## 実装時の注意事項

1. **レート制限**: Slack APIのレート制限に注意（Tier 3: 50+ requests/minute）
2. **データプライバシー**: ユーザートークンは暗号化して保存
3. **スコープの最小化**: 必要最小限のスコープのみ要求
4. **エラーハンドリング**: チャンネルアクセス権限エラーの適切な処理

## 参考実装

```typescript
// メンション収集サービスの拡張例
class EnhancedMentionService {
  private botClient: WebClient;
  private userClients: Map<string, WebClient>;

  async collectMentionsHybrid(userId: string) {
    const mentions = [];
    
    // 1. ボットが参加しているチャンネルからリアルタイム収集
    const botMentions = await this.collectFromBotChannels(userId);
    mentions.push(...botMentions);
    
    // 2. ユーザートークンで全チャンネルから定期収集
    if (this.userClients.has(userId)) {
      const userMentions = await this.collectFromUserChannels(userId);
      mentions.push(...userMentions);
    }
    
    // 3. 重複を除去して返す
    return this.deduplicateMentions(mentions);
  }
}
```

## まとめ

現在の実装はボットトークンベースで堅実に動作していますが、将来的にはUser Tokenアプローチを導入することで、より包括的なメンション収集が可能になります。段階的に実装することで、リスクを最小化しながら機能を拡張できます。