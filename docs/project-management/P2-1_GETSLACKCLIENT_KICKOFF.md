# P2-1: getSlackClient Utility Implementation

## ✅ P2-0完了確認
- BullMQ v5.56.7最適化完了
- QueueScheduler/QueueEvents実装済み
- Redis監視メトリクス実装済み
- 全Exit Criteria達成

## 🎯 P2-1タスク開始

### Branch Strategy
**Branch**: `feature/phase2-getslackclient`
**Base**: `main` (P2-0マージ後)

### 依存関係追加
```bash
npm install lru-cache@^7.0.0
npm install --save-dev @types/lru-cache
```

### 実装要件

#### 1. Core Utility Interface
```typescript
// src/utils/getSlackClient.ts
interface SlackClientUtil {
  getSlackClient(teamId: string): Promise<WebClient>
  clearCache(teamId?: string): void
  getCacheStats(): CacheStats
  handleInvalidAuth(teamId: string): Promise<void>
}

interface CacheStats {
  size: number
  hitRate: number
  memoryUsage: number
}
```

#### 2. LRU Cache Configuration
```typescript
import LRU from 'lru-cache';

const authCache = new LRU<string, AuthorizeResult>({
  max: 500,                    // Maximum 500 teams
  ttl: 10 * 60 * 1000,        // 10 minutes TTL
  updateAgeOnGet: true,        // Reset TTL on access
  dispose: (value, key) => {
    logger.info(`Disposing auth cache for team ${key}`);
    // Resource cleanup if needed
  }
});
```

#### 3. Prometheus Metrics Export
```typescript
// Required metrics
const authCacheHitRate = new promClient.Gauge({
  name: 'auth_cache_hit_rate',
  help: 'Authentication cache hit rate percentage'
});

const authCacheMemoryUsage = new promClient.Gauge({
  name: 'auth_cache_memory_usage',
  help: 'Memory usage of authentication cache in bytes'
});

const apiLatencyP95 = new promClient.Histogram({
  name: 'api_latency_p95',
  help: '95th percentile API response latency',
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
});
```

#### 4. Error Handling Strategy
```typescript
async handleInvalidAuth(teamId: string): Promise<void> {
  // 1. Clear cache
  authCache.delete(teamId);
  
  // 2. Delete invalid installation
  await slackInstallationStore.deleteInstallation({ teamId });
  
  // 3. Log for monitoring
  logger.error('Invalid auth detected', { teamId });
  
  // 4. Update metrics
  invalidAuthCounter.inc({ teamId });
}
```

### Exit Criteria Verification

#### Performance Targets
- `auth_cache_hit_rate ≥ 90%` under normal load
- `api_latency_p95 < 200ms` for getSlackClient calls
- `auth_cache_memory_usage < 100MB` for 500 cached teams
- Zero invalid_auth errors during 24h canary test

#### Testing Requirements
```bash
# Unit tests
npm run test -- src/utils/getSlackClient.test.ts

# Performance test
npm run test:performance -- --testNamePattern="getSlackClient"

# Memory leak test
npm run test:memory -- --testTimeout=3600000
```

### Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install lru-cache@^7.0.0 @types/lru-cache
   ```

2. **Create Core Utility**
   - `src/utils/getSlackClient.ts`
   - LRU cache implementation
   - OAuth installation resolution
   - Environment token fallback

3. **Add Prometheus Metrics**
   - Cache hit rate tracking
   - Memory usage monitoring
   - API latency measurement

4. **Implement Error Handling**
   - Invalid auth recovery
   - Cache cleanup
   - Automatic retry logic

5. **Write Comprehensive Tests**
   - Unit tests for all functions
   - Integration tests with Redis
   - Performance benchmarks
   - Memory leak detection

### PR Requirements

#### Must Include
- [ ] Package.json diff showing lru-cache addition
- [ ] Unit test coverage ≥90% for new code
- [ ] Performance benchmark results
- [ ] Memory usage analysis (before/after)
- [ ] Prometheus metrics export verification

#### Performance Evidence
- [ ] Cache hit rate measurement under load
- [ ] API latency P95 measurement
- [ ] Memory usage graph (24h test)
- [ ] Error handling verification

#### Documentation
- [ ] README.md update with new utility
- [ ] Inline code documentation
- [ ] Performance characteristics documentation

### Verification Commands

```bash
# Install and verify dependencies
npm install
npm ls lru-cache

# Run all tests
npm run test
npm run typecheck

# Performance verification
curl http://localhost:3100/metrics | grep auth_cache

# Memory monitoring
node --inspect src/app.ts
# Use Chrome DevTools Memory tab
```

### Success Criteria Checklist

- [ ] All unit tests pass
- [ ] TypeScript compilation successful
- [ ] Cache hit rate ≥90% achieved
- [ ] API latency P95 <200ms
- [ ] Memory usage <100MB
- [ ] Prometheus metrics exported
- [ ] Error handling tested
- [ ] Documentation updated

## 🚀 Start Implementation

**Begin immediately with dependency installation and core utility creation.**

Reference: `.kiro/specs/slack-personal-assistant/tasks.md` P2-1 section