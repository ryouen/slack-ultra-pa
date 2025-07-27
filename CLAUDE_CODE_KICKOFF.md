# Phase 2 Implementation Kickoff - Claude Code

## Task Execution Order

### P2-0: Dependency Upgrade (IMMEDIATE START)
**Branch**: `feature/phase2-dependency-upgrade`
**Reference**: `.kiro/specs/slack-personal-assistant/tasks.md` line 84

**Required Actions**:
1. Update `package.json`: `"bullmq": "^4.7.0"`
2. Update `package.json`: `"ioredis": "^5.0.0"`  
3. Run `npm install` and commit package-lock.json changes
4. Test all existing workers function correctly
5. Verify Redis connection count with `redis-cli info clients`

**PR Requirements**:
- Package-lock.json diff screenshot
- Redis clients before/after comparison
- All Jest tests passing
- TypeScript compilation successful

**Exit Criteria Verification**:
- `redis_connected_clients ≤ 30` after implementation
- No worker job processing errors in logs
- BullMQ version confirmed: `npm ls bullmq`

---

### P2-1: getSlackClient Utility (AFTER P2-0)
**Branch**: `feature/phase2-getslackclient`
**Reference**: `.kiro/specs/slack-personal-assistant/tasks.md` line 95

**Implementation Requirements**:
```typescript
// Required interface
interface SlackClientUtil {
  getSlackClient(teamId: string): Promise<WebClient>
  clearCache(teamId?: string): void
  getCacheStats(): CacheStats
}

// LRU Configuration
const authCache = new LRU<string, AuthorizeResult>({
  max: 500,
  ttl: 10 * 60 * 1000, // 10 minutes
  updateAgeOnGet: true
});
```

**Metrics Export Required**:
- `auth_cache_hit_rate` (Prometheus gauge)
- `auth_cache_memory_usage` (Prometheus gauge)
- `api_latency_p95` (Prometheus histogram)

---

## PR Review Checklist

### Required Attachments
- [ ] Package-lock.json diff (for dependency changes)
- [ ] Redis connection count before/after screenshots
- [ ] Jest test results (all passing)
- [ ] TypeScript compilation output
- [ ] Metrics export verification (curl /metrics)

### Code Quality Gates
- [ ] ESLint passes with zero warnings
- [ ] TypeScript strict mode compilation
- [ ] Unit test coverage ≥80% for new code
- [ ] Integration tests for Redis connectivity

### Performance Verification
- [ ] `auth_cache_hit_rate ≥ 90%` under load test
- [ ] `api_latency_p95 < 200ms` for getSlackClient calls
- [ ] Memory usage stable under sustained load
- [ ] No memory leaks detected in 1h test run

### Documentation Updates
- [ ] README.md updated with new dependencies
- [ ] CHANGELOG.md entry added
- [ ] Inline code comments for complex logic
- [ ] API documentation for new utilities

## Escalation Process

### Immediate Escalation (Same Day)
- Dependency conflicts preventing installation
- Breaking changes in BullMQ API
- Redis connection failures
- Test suite failures blocking progress

### Standard Escalation (Next Business Day)
- Performance targets not met
- Complex implementation questions
- Architecture clarification needed
- Scope change requests

## Success Criteria

### P2-0 Success
- All existing functionality preserved
- Redis connection count reduced
- No performance regression
- Clean dependency tree

### P2-1 Success  
- Cache hit rate ≥90% achieved
- API latency targets met
- Memory usage within limits
- Comprehensive error handling

## Communication Protocol

### Daily Updates Required
- Progress on current task
- Blockers encountered
- Metrics achieved vs targets
- Next day plan

### PR Submission Format
```
## Summary
Brief description of changes

## Requirements Addressed
- R10: OAuth Dynamic Token Management
- R2.5: Quick-Reply re-enablement (if applicable)

## Metrics Results
- auth_cache_hit_rate: X%
- api_latency_p95: Xms
- redis_connected_clients: X

## Testing
- Unit tests: X/X passing
- Integration tests: X/X passing
- Performance tests: PASS/FAIL

## Screenshots
[Attach relevant screenshots]
```

**START IMMEDIATELY**: Begin with P2-0 Dependency Upgrade task.