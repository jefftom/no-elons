# ADR 0007: Database sessions, not JWTs

- **Status:** accepted
- **Date:** 2026-10-02

## Context

Moderation must be able to end a suspended account's access *immediately*, and members expect "log out everywhere"
after a password change. Stateless JWTs make revocation awkward.

## Decision

Opaque 160-bit random tokens in an `HttpOnly` cookie. The database stores only `sha256(token)` with a 30-day sliding
expiry (the approach recommended by lucia-auth.com). The request-scoped `getViewer()` is memoised per request with
React `cache()`.

## Consequences

- Instant revocation (suspension, password change, account deletion), and a leaked sessions table is useless.
- One indexed lookup per request. At scale this gets a short-TTL Redis cache in front.
