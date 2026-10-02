# ADR 0004: Feeds are skeletons + hydration; fan-out-on-read first

- **Status:** accepted
- **Date:** 2026-10-02

## Context

There are about a dozen list views (home, everyone, photos, profile tabs, hashtags, search, lists, bookmarks, likes,
thread replies, notifications). Each needs identical rendering and identical privacy rules (blocks, mutes,
suspensions, removals). We also know the home timeline's storage will change at scale.

## Decision

Split every feed into:

1. a **skeleton** query returning ordered post ids (one indexed query), and
2. **hydration**, which batch-loads posts, authors, media, quotes, and viewer state with a constant number of
   queries and decides visibility.

The home skeleton starts as **fan-out-on-read** (a Postgres query over follows). The documented upgrade is hybrid
fan-out-on-write into Redis, with celebrity accounts merged at read time.

## Consequences

- No N+1 queries. A new feed is a 20-line skeleton function.
- Visibility rules can't be forgotten by a new feed, because they live in hydration.
- Some pages can come back slightly short when hydration drops hidden items. The cursor still advances correctly.
- Moving home to Redis (or adding third-party feeds) changes only the skeleton.
