const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugThreadDeepLink() {
  console.log('=== Thread Deep-Link Debug ===\n');
  
  console.log('現象: Thread deep-linkがSlackアプリ内ではなくブラウザで開く\n');
  
  console.log('考えられる原因:');
  console.log('1. URL形式の問題');
  console.log('   - 現在: https://app.slack.com/client/TEAM_ID/CHANNEL_ID/thread-TIMESTAMP');
  console.log('   - この形式はブラウザ用かもしれない');
  
  console.log('\n2. Team IDの取得方法の問題');
  console.log('   - event.teamは実際にはteam domainの可能性');
  console.log('   - 正しいteam IDが取得できていない');
  
  console.log('\n3. 代替URL形式の検討:');
  console.log('   a) slack://channel?team=TEAM_ID&id=CHANNEL_ID&message=TIMESTAMP');
  console.log('   b) Permalinkのままにする（最も安全）');
  console.log('   c) Desktop deep-link形式を使う');
  
  console.log('\n推奨対応:');
  console.log('✅ 通常のpermalinkを使用する（確実に動作）');
  console.log('❌ Thread deep-linkは非公式で不安定');
  
  // Check latest mention with permalink
  try {
    const mention = await prisma.inboxItem.findFirst({
      where: { 
        permalink: { not: null },
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (mention && mention.permalink) {
      console.log('\n実際のpermalink例:');
      console.log(mention.permalink);
      
      // Parse the permalink
      const match = mention.permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
      if (match) {
        const [, channelId, timestampRaw] = match;
        const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
        
        console.log('\n変換パターン:');
        console.log('1. ブラウザ用: https://app.slack.com/client/TEAM_ID/' + channelId + '/thread-' + timestamp);
        console.log('2. デスクトップ用: slack://channel?team=TEAM_ID&id=' + channelId + '&message=' + timestamp);
        console.log('3. 安全な選択: ' + mention.permalink + ' (元のpermalink)');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugThreadDeepLink();