# Changelog

All notable changes to the Slack Personal Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Phase 2] - 2025-07-27

### Added
- **P2-0**: BullMQ v5 optimization and monitoring
  - QueueScheduler and QueueEvents components for v5 compliance
  - Shared Redis connection implementation
  - Redis connection monitoring (30s interval, alert at 800 connections)
  - Worker metrics collection (Prometheus compatible)
  - Rate limiter configuration (59 req/min for Slack API)

- **P2-1**: getSlackClient Utility Implementation (Requirement 10)
  - Dynamic token resolution with OAuth → environment fallback
  - LRU cache implementation (500 teams, 10min TTL)
  - Prometheus metrics for cache performance monitoring
  - Automatic invalid_auth error recovery
  - Performance test suite (`npm run test:performance`)
  - Cache statistics API endpoint (`/api/cache/stats`)

### Fixed
- **P2-0**: CleanupJob Date serialization error
  - Changed olderThan from Date to number (epoch milliseconds)
  - BullMQ v5 type compliance for removeOnComplete/removeOnFail

### Changed
- **P2-0**: Worker configuration updates
  - removeOnComplete/removeOnFail now use KeepJobs object format
  - Graceful shutdown with queue pause and timeout handling

- **P2-1**: WebClient instantiation
  - Migrated from direct WebClient creation to centralized getSlackClient utility
  - Updated jobQueueService and oauthService to use cached clients

### Technical
- BullMQ v5.56.7 (already exceeds v4.7+ requirement)
- Redis metrics: redis_connected_clients, redis_used_memory_bytes
- Worker metrics: bull_jobs_completed_total, bull_jobs_failed_total
- Cache metrics: auth_cache_hits/misses, auth_cache_hit_rate, auth_cache_memory_usage_bytes
- Performance targets: cache hit rate ≥90%, API latency P95 <200ms, memory <100MB

## [Phase 1] - 2025-07-26

### Added
- OAuth authentication infrastructure
- Slack installation store with PostgreSQL
- Multi-workspace support foundation
- Environment token fallback mechanism

### Infrastructure
- ExpressReceiver for OAuth support
- SlackInstallationStore implementation
- Automatic token revocation handling