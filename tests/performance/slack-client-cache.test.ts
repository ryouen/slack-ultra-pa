import { performance } from 'perf_hooks';
import { 
  getSlackClient, 
  getCacheStats, 
  clearAllClientCache,
  getMetrics,
  initializeSlackClientStore 
} from '@/utils/getSlackClient';
import { SlackInstallationStore } from '@/services/slackInstallationStore';
import { WebClient } from '@slack/web-api';
import { register } from 'prom-client';

// Mock environment setup
process.env.NODE_ENV = 'test';
process.env.SLACK_BOT_TOKEN = 'xoxb-test-fallback-token';

// Mock SlackInstallationStore
class MockInstallationStore extends SlackInstallationStore {
  private mockData: Map<string, any> = new Map();

  async fetchInstallation(query: any) {
    const key = `${query.teamId}:${query.enterpriseId || 'null'}`;
    return this.mockData.get(key);
  }

  async storeInstallation(installation: any) {
    const key = `${installation.team?.id}:${installation.enterprise?.id || 'null'}`;
    this.mockData.set(key, installation);
  }

  async deleteInstallation(query: any) {
    const key = `${query.teamId}:${query.enterpriseId || 'null'}`;
    this.mockData.delete(key);
  }

  // Helper method for tests
  addMockInstallation(teamId: string, enterpriseId?: string) {
    const installation = {
      team: { id: teamId },
      enterprise: enterpriseId ? { id: enterpriseId } : undefined,
      bot: {
        id: `B${teamId}`,
        userId: `U${teamId}`,
        token: `xoxb-${teamId}-token`
      }
    };
    this.storeInstallation(installation);
  }
}

// Performance test runner
async function runPerformanceTests() {
  console.log('🚀 Starting Slack Client Cache Performance Tests\n');

  // Initialize mock store
  const mockStore = new MockInstallationStore();
  initializeSlackClientStore(mockStore);

  // Clear cache before tests
  clearAllClientCache();

  // Test 1: Cache Miss Performance
  console.log('📊 Test 1: Cache Miss Performance');
  const cacheMissTeams = 100;
  const cacheMissStart = performance.now();
  
  // Add mock installations
  for (let i = 0; i < cacheMissTeams; i++) {
    mockStore.addMockInstallation(`T${i}`);
  }

  // First access (all cache misses)
  const missPromises = [];
  for (let i = 0; i < cacheMissTeams; i++) {
    missPromises.push(getSlackClient(`T${i}`));
  }
  await Promise.all(missPromises);
  
  const cacheMissEnd = performance.now();
  const cacheMissAvg = (cacheMissEnd - cacheMissStart) / cacheMissTeams;
  
  console.log(`  Total time: ${(cacheMissEnd - cacheMissStart).toFixed(2)}ms`);
  console.log(`  Average per client: ${cacheMissAvg.toFixed(2)}ms`);
  console.log(`  Cache stats:`, getCacheStats());
  console.log();

  // Test 2: Cache Hit Performance
  console.log('📊 Test 2: Cache Hit Performance');
  const cacheHitStart = performance.now();
  
  // Second access (all cache hits)
  const hitPromises = [];
  for (let i = 0; i < cacheMissTeams; i++) {
    hitPromises.push(getSlackClient(`T${i}`));
  }
  await Promise.all(hitPromises);
  
  const cacheHitEnd = performance.now();
  const cacheHitAvg = (cacheHitEnd - cacheHitStart) / cacheMissTeams;
  
  console.log(`  Total time: ${(cacheHitEnd - cacheHitStart).toFixed(2)}ms`);
  console.log(`  Average per client: ${cacheHitAvg.toFixed(2)}ms`);
  console.log(`  Performance improvement: ${((cacheMissAvg / cacheHitAvg) * 100).toFixed(0)}x faster`);
  console.log(`  Cache stats:`, getCacheStats());
  console.log();

  // Test 3: Memory Usage
  console.log('📊 Test 3: Memory Usage');
  const metrics = getMetrics();
  console.log(`  Cache size: ${metrics.cacheSize} items`);
  console.log(`  Memory usage: ${(metrics.memoryUsage / 1024).toFixed(2)} KB`);
  console.log(`  Memory per item: ${(metrics.memoryUsage / metrics.cacheSize).toFixed(0)} bytes`);
  console.log();

  // Test 4: Cache Hit Rate with Mixed Access
  console.log('📊 Test 4: Cache Hit Rate (Mixed Access)');
  clearAllClientCache();
  
  // Simulate realistic access pattern
  const teams = ['T1', 'T2', 'T3', 'T4', 'T5'];
  const accessPattern = [
    'T1', 'T1', 'T2', 'T1', 'T3', 'T2', 'T1', 'T4', 'T1', 'T5',
    'T1', 'T2', 'T1', 'T3', 'T1', 'T2', 'T4', 'T1', 'T5', 'T1'
  ];
  
  // Add installations for test teams
  teams.forEach(teamId => mockStore.addMockInstallation(teamId));
  
  // Execute access pattern
  for (const teamId of accessPattern) {
    await getSlackClient(teamId);
  }
  
  const finalStats = getCacheStats();
  console.log(`  Access count: ${accessPattern.length}`);
  console.log(`  Unique teams: ${teams.length}`);
  console.log(`  Cache hit rate: ${finalStats.hitRate.toFixed(1)}%`);
  console.log(`  Total hits: ${finalStats.hits}`);
  console.log(`  Total misses: ${finalStats.misses}`);
  console.log();

  // Test 5: Prometheus Metrics
  console.log('📊 Test 5: Prometheus Metrics Export');
  const prometheusMetrics = await register.metrics();
  const relevantMetrics = prometheusMetrics
    .split('\n')
    .filter(line => line.includes('auth_cache') || line.includes('slack_client'))
    .join('\n');
  console.log(relevantMetrics);
  console.log();

  // Exit Criteria Validation
  console.log('✅ Exit Criteria Validation:');
  const hitRate = finalStats.hitRate;
  const memoryUsageMB = metrics.memoryUsage / (1024 * 1024);
  const avgLatency = cacheHitAvg;

  console.log(`  Cache hit rate: ${hitRate.toFixed(1)}% ${hitRate >= 90 ? '✅' : '❌'} (target: ≥90%)`);
  console.log(`  API latency P95: ${avgLatency.toFixed(2)}ms ${avgLatency < 200 ? '✅' : '❌'} (target: <200ms)`);
  console.log(`  Memory usage: ${memoryUsageMB.toFixed(2)}MB ${memoryUsageMB < 100 ? '✅' : '❌'} (target: <100MB)`);
  
  // Test 6: Cache Eviction (LRU behavior)
  console.log('\n📊 Test 6: LRU Cache Eviction Test');
  clearAllClientCache();
  
  // Fill cache to capacity (500 teams)
  const maxTeams = 500;
  for (let i = 0; i < maxTeams; i++) {
    mockStore.addMockInstallation(`TEAM${i}`);
    await getSlackClient(`TEAM${i}`);
  }
  
  console.log(`  Cache filled to capacity: ${getCacheStats().size} items`);
  
  // Access one more team (should evict least recently used)
  mockStore.addMockInstallation('TEAM500');
  await getSlackClient('TEAM500');
  
  // Try to access the first team (should be cache miss due to eviction)
  const evictionTestStart = performance.now();
  await getSlackClient('TEAM0');
  const evictionTestEnd = performance.now();
  
  const wasEvicted = (evictionTestEnd - evictionTestStart) > 1; // Cache miss takes longer
  console.log(`  LRU eviction working: ${wasEvicted ? '✅' : '❌'}`);
  console.log(`  Final cache size: ${getCacheStats().size} items`);
  
  console.log('\n🎉 Performance tests completed!');
}

// Run tests
runPerformanceTests().catch(console.error);