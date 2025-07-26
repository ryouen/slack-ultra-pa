const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTeamIdExtraction() {
  console.log('=== Team ID取得方法の確認 ===\n');
  
  console.log('Socket Modeイベントの構造:');
  console.log('1. メッセージイベント (message):');
  console.log('   - event.team: team domain (例: "T0979H6R0H7")');
  console.log('   - 通常これがteam IDです');
  
  console.log('\n2. インタラクションイベント (block_actions):');
  console.log('   - body.team.id: team ID');
  console.log('   - body.team.domain: team domain');
  
  console.log('\n3. アプリメンションイベント (app_mention):');
  console.log('   - event.team: team ID');
  
  console.log('\n修正が必要な箇所:');
  console.log('- quickReplyHandler.ts: event.teamをそのまま使用（おそらく正しい）');
  console.log('- mentionRoutes.ts: body.team?.idを使用（正しい）');
  
  console.log('\nデスクトップdeep-link形式:');
  console.log('slack://channel?team=TEAM_ID&id=CHANNEL_ID&message=TIMESTAMP');
  console.log('- Slackデスクトップアプリで直接開く');
  console.log('- スレッドパネルが自動的に開く（messageパラメータでスレッドを指定）');
  
  try {
    // Get installation info to find team ID
    const installation = await prisma.slackInstallation.findFirst();
    if (installation) {
      console.log('\n実際のTeam ID (データベースから):');
      console.log('Team ID:', installation.teamId);
      console.log('Team Name:', installation.teamName);
    }
  } catch (error) {
    console.log('\nSlackInstallationテーブルが見つかりません');
  } finally {
    await prisma.$disconnect();
  }
}

checkTeamIdExtraction();