# ADR 0001: Modular monolith on Next.js

- **Status:** accepted
- **Date:** 2026-10-02

## Context

NoElons needs to ship a lot of surface area (feeds, profiles, media, moderation) with a tiny team, and its pitch is
that it's understandable and accountable. Splitting into services early adds network hops, deploy choreography and
distributed-systems failure modes without user-facing benefit.

## Decision

One deployable: Next.js (App Router, React Server Components, Server Actions) with a framework-free domain layer in
`src/server/services`. Pages and actions are thin adapters. Services take plain arguments (a viewer id, input objects)
and return plain view models.

## Consequences

- Fast iteration. Type safety runs end to end from SQL to JSX.
- The service layer can be lifted into a separate API, worker, or federation process later without rewriting it.
  It's already exercised outside Next by the seed script and the test suite.
- We must enforce the dependency rule (`services` never import `next/*`) by convention and review.
