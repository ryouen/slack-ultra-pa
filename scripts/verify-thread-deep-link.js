const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyThreadDeepLink() {
  try {
    console.log('Thread Deep-Link実装の検証\n');
    
    console.log('1. 実装確認:');
    console.log('✅ convertToThreadDeepLink関数を実装');
    console.log('✅ SmartReplyUIBuilderで変換を適用');
    console.log('✅ 各呼び出し元でteamIdを取得');
    
    console.log('\n2. 潜在的な問題:');
    console.log('⚠️  teamIdが常に取得できるとは限らない');
    console.log('   - body.team?.idはundefinedの可能性');
    console.log('   - Socket Modeでは異なる構造の可能性');
    
    console.log('\n3. Thread Deep-Link形式について:');
    console.log('⚠️  非公式のURL形式');
    console.log('   - Slackの内部実装に依存');
    console.log('   - 将来的に動作しなくなる可能性');
    console.log('   - デスクトップアプリとWebで動作が異なる可能性');
    
    console.log('\n4. 現在の実装の動作:');
    console.log('- teamIdが取得できた場合: thread deep-link形式に変換');
    console.log('- teamIdが取得できない場合: 通常のpermalinkを使用（フォールバック）');
    
    console.log('\n5. テスト結果:');
    console.log('❓ 実際のSlack環境でのテストが必要');
    console.log('   - teamIdが正しく取得できるか');
    console.log('   - thread deep-linkが期待通り動作するか');
    console.log('   - 異なる環境での動作確認');
    
    // Check if we have mentions with permalinks
    const mentionsWithPermalinks = await prisma.inboxItem.findMany({
      where: {
        permalink: { not: null },
        status: 'PENDING'
      },
      take: 3
    });
    
    console.log(`\n6. テスト可能なメンション: ${mentionsWithPermalinks.length}件`);
    mentionsWithPermalinks.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.messageText.substring(0, 50)}...`);
    });
    
    console.log('\n結論:');
    console.log('実装は技術的には正しいが、以下の確認が必要:');
    console.log('1. Slack Socket ModeでteamIdが取得できるか');
    console.log('2. Thread deep-link形式が実際に機能するか');
    console.log('3. 異なる環境（デスクトップ/Web）での動作');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyThreadDeepLink();