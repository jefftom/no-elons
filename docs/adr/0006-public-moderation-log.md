# ADR 0006: A public moderation log

- **Status:** accepted
- **Date:** 2026-10-02

## Context

"No owner override" is our core promise. Without visibility into enforcement, it's unfalsifiable.

## Decision

Every moderation action (remove, restore, suspend, unsuspend, dismiss) is appended to `moderation_actions` in the same
transaction as the action itself, and rendered publicly at `/transparency` with the rule cited and 30-day aggregates.
Moderator ids are stored for internal audit but never exposed. Reports must cite a stable rule code.

## Consequences

- Enforcement becomes auditable by anyone, including journalists and researchers.
- Moderators need clear rule text and short public notes, so there's a training cost.
- Dismissals are logged without naming the reported account, so a false report can't become a public smear.
