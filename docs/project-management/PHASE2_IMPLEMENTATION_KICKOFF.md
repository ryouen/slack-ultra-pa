# Phase 2 - Implementation Kick-off

## Branch Strategy
- **Branch**: `feature/phase2/<task-id>`
- **Base**: `main`
- **Merge**: PR → main after review

## Priority Order
1. **P2-0**: Dependency upgrade (BullMQ v4.7+)
2. **P2-1**: getSlackClient util - create util with LRU<500, TTL 600s
3. **P2-2**: QuickReply OAuth re-enable - add global middleware; measure latency
4. **P2-3**: Worker canary (reminder queue) - switch to util, enable reuseRedis, limiter(50/60000)
5. **P2-4**: Performance optimization & monitoring
6. **P2-5**: Error handling & user experience

## Definition of Done (DoD)
- **Performance**: API `/help` p95 < 200ms (Prometheus `api_latency_p95`)
- **Cache**: `auth_cache_hit_rate ≥ 90%`
- **Reliability**: No new `invalid_auth` failures during 24h canary
- **Memory**: `auth_cache_memory_usage < 100MB`

## PR Checklist
- [ ] Unit tests added/updated
- [ ] Update CHANGELOG.md under Phase 2 section
- [ ] Link to requirement numbers (2.5, 10) in PR description
- [ ] Screenshots or logs proving metrics targets met
- [ ] Exit criteria verified and documented

## Technical Notes
- **LRU Cache**: Use `lru-cache@^7.0.0` package
- **BullMQ**: Requires v4.7+ for `reuseRedis: true`
- **Monitoring**: Prometheus metrics integration required
- **Error Handling**: Graceful degradation on cache miss/API failure

## Start Command
Please acknowledge and start with **P2-0: Dependency Upgrade**.

## Reference Documents
- Requirements: `.kiro/specs/slack-personal-assistant/requirements.md` (Requirement 10)
- Design: `.kiro/specs/slack-personal-assistant/design.md` (Phase 2 section)
- Tasks: `.kiro/specs/slack-personal-assistant/tasks.md` (Phase 2 section)