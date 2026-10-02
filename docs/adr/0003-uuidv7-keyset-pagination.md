# ADR 0003: UUIDv7 ids and keyset pagination

- **Status:** accepted
- **Date:** 2026-10-02

## Context

Every screen is a reverse-chronological list. `OFFSET` pagination gets slower with depth and shows duplicates or skips
when new rows arrive. Sequential integer ids leak growth metrics and complicate future sharding and federation.

## Decision

All primary keys are app-generated UUIDv7 (48-bit millisecond timestamp + random). Lists paginate with
`WHERE id < :cursor ORDER BY id DESC LIMIT n+1`, and the cursor is the last id seen (validated as a UUID). Edge tables
(likes, bookmarks, follows, notifications) get their own v7 id so "newest first" over them is also a keyset.

## Consequences

- Constant-time pagination at any depth, stable under concurrent inserts, with no cursor encoding scheme to maintain.
- Ids reveal creation time to the millisecond (acceptable: timestamps are shown anyway).
- Backdated imports and seed data generate ids from their original timestamps, so ordering stays truthful.
- Range partitioning by id is natural if tables outgrow one node.
