<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NoElons — notes for agents and contributors

Start with `docs/ARCHITECTURE.md` (system design) and `docs/PRODUCT.md` (what we're building and why).

## Layering (keep it this way)

- `src/app` → `src/app/actions` → `src/server/services` → `src/server/db`.
- **Services never import `next/*`** or `src/server/auth/viewer.ts`; they take a `viewerId` argument. That's what lets
  the seed script, tests, and future API/workers reuse them.
- Every feed = a skeleton query (ordered ids) + `hydration.ts` (rendering data + visibility). Don't hand-roll post
  loading in a page; add a skeleton function in `services/feeds.ts`.
- Mutations go through Server Actions in `src/app/actions/*` which: authenticate, rate-limit, call one service,
  `refresh()`. Return `ActionResult` via `guarded()` so `AppError` messages reach the UI.
- User text is rendered via `PostBody` (tokenizer → React nodes). Never `dangerouslySetInnerHTML`.

## Product rules that are also code rules

- Feeds are reverse-chronological by UUIDv7 id. Don't add ranking.
- Moderation actions must write to `moderation_actions` (the public log).
- Rule codes in `src/lib/rules.ts` are stable ids — append, never renumber or rename.
- Likes and bookmarks are private to their owner.

## Commands

- `npm run dev`, `npm run typecheck`, `npm test` (needs Postgres; see README), `npm run build`
- Schema change: edit `src/server/db/schema.ts` → `npm run db:generate` → commit the SQL in `drizzle/`.
- `npm run db:reset` re-creates the dev database with seed data.
