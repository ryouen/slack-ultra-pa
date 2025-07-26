const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBlockActionsPayload() {
  console.log('=== Block Actions Payload 構造確認 ===\n');
  
  console.log('Socket ModeでのBlock Actionsイベントペイロード:');
  console.log('{');
  console.log('  type: "block_actions",');
  console.log('  user: { id: "U12345", ... },');
  console.log('  team: {');
  console.log('    id: "T12345",    // teamIdはここから取得');
  console.log('    domain: "workspace"');
  console.log('  },');
  console.log('  // Socket Modeでも team_id は body直下には存在しない');
  console.log('  // body.team.id を使うのが正しい');
  console.log('}\n');
  
  console.log('現在の実装:');
  console.log('mentionRoutes.ts: const teamId = (body as any).team?.id; ✅');
  console.log('quickReplyHandler.ts: teamId: (body as any).team_id || (body as any).team?.id');
  console.log('  → team_id は存在しないので、team?.id にフォールバックされる\n');
  
  console.log('推奨修正:');
  console.log('// quickReplyHandler.ts も以下に統一');
  console.log('teamId: (body as any).team?.id\n');
  
  console.log('teamId取得の確実性:');
  console.log('✅ Block Actions では team オブジェクトは必ず存在');
  console.log('✅ Message イベントでは event.team が存在（ただしbodyではない）');
  console.log('⚠️  混同を避けるため、イベントタイプごとに明確に分離すべき');
  
  await prisma.$disconnect();
}

checkBlockActionsPayload();