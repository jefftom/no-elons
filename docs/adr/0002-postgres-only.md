# ADR 0002: Postgres is the only stateful dependency (for now)

- **Status:** accepted
- **Date:** 2026-10-02

## Context

Social apps are often drawn as Postgres + Redis + Kafka + Elasticsearch + a graph database on day one. Each extra
stateful system is something to back up, monitor, secure, and keep consistent.

## Decision

Use PostgreSQL 16 for everything stateful: relational data, full-text search (`tsvector` + GIN), fuzzy people search
(`pg_trgm`), trends (indexed 24h window), and (when needed) a job queue (`pg-boss`). Media blobs go to a filesystem or
object store behind an interface. Rate limiting and trend caching are in-process until we run more than one instance.

## Consequences

- One backup and restore story, one consistency model, transactional side effects (counters, notifications).
- Each "graduation" has a documented trigger in ARCHITECTURE.md §12: Redis for rate limits and timelines, a search
  cluster, and so on.
- In-process caches and rate limits are per-instance. That's acceptable until stage 1, when they move to Redis.
