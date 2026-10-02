<p align="center">
  <img src="src/app/icon.svg" width="72" alt="NoElons logo: a red stop sign that says NO" />
</p>

<h1 align="center">NoElons</h1>
<p align="center"><strong>Social media, minus the billionaire.</strong><br/>
The best of old-school Twitter and early Instagram — a chronological timeline, a photo grid, real conversations — on a network nobody gets to own.</p>

---

## What it is

- **Chronological, always.** Home is the people you follow, newest first. No "For You", no paid reach.
- **Photos + posts.** Every profile has a Grid tab; there's a global Photos grid; posts take up to 4 photos with alt text.
- **Old-school Twitter energy.** Replies & self-threads, reposts & quotes, hashtags & trends, Lists, the public "Everyone" timeline, pinned posts, RSS.
- **Receipts.** Edits keep a public history. Every moderation action is published in a **transparency log**.
- **Calm by design.** Private likes, optional hidden counts ("Calm mode"), grouped notifications.
- **Your data leaves with you.** One-click JSON export, RSS per profile, account deletion that actually deletes. Federation (ActivityPub) is next.

Read the thinking behind it:

- 📦 [**Product brief**](docs/PRODUCT.md) — the IG × old-Twitter blend, *what else* to add, personas, roadmap, business model, risks
- 🏗️ [**Architecture**](docs/ARCHITECTURE.md) — system design, data model, timelines at scale, hydration, media, moderation, security, federation plan
- 🧭 [**Decision records**](docs/adr) — the why behind the big choices
- 🗺️ [**Roadmap: what's next**](docs/ROADMAP.md) — the next 5 moves, the launch checklist, and the founder-only decisions

## Quick start

Requirements: Node 22+, and Postgres 16 (Docker is easiest).

```bash
docker compose up -d db          # Postgres on :5432 (user/pass/db: noelons)
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed                  # demo people, photos, threads, lists, moderation history
npm run dev                      # http://localhost:3000
```

Log in as **`demo`** / **`noelons-demo`** (or any seeded user: `maya`, `theo`, `priya`, `kofi`, `lena`, …).
**`mod_alex`** is a moderator (see `/admin`), **`noelons`** is an admin.

Make your own account a moderator: `npm run promote -- yourname moderator`.

### Run the whole thing in Docker

```bash
docker compose --profile full up --build    # app on :3000, migrations run on boot
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Generate Next route types + `tsc` |
| `npm test` | Unit tests + service integration tests against a throwaway Postgres DB (`noelons_test`, override with `TEST_DATABASE_URL`). DB suites are skipped locally if Postgres isn't reachable. |
| `npm run db:generate` | Diff `src/server/db/schema.ts` → new SQL migration in `drizzle/` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (only into an empty DB) |
| `npm run db:reset` | Drop everything, migrate, seed (dev only) |
| `npm run promote -- <user> [role]` | Make someone a `moderator` / `admin` / `user` |

## Stack

**Next.js 16** (App Router, React Server Components, Server Actions) · **React 19** · **TypeScript** ·
**PostgreSQL 16** via **Drizzle ORM** · **Tailwind CSS 4** · **sharp** (image pipeline) · **argon2id** · **Vitest**.

One app + one database. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it scales past that, and when.

## Project layout

```
src/app/            routes, layouts, server actions (thin adapters)
src/components/     UI — server components by default, client islands for interactivity
src/server/         the domain: db schema, auth, services (posts, feeds, hydration, moderation…), media, storage
src/lib/            pure shared logic: ids, text tokenizer, validation, rules, limits
drizzle/            SQL migrations
scripts/            migrate, seed (+ a tiny generative-art kit for demo photos), reset, promote
tests/              vitest suites
docs/               product brief, architecture, ADRs
```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://noelons:noelons@localhost:5432/noelons` | |
| `PUBLIC_URL` | `http://localhost:3000` | Absolute links (RSS, export). `https://…` also turns on `Secure` cookies. |
| `MEDIA_DIR` | `./.data/media` | Where the local storage driver writes images |
| `MEDIA_PUBLIC_BASE_URL` | `/media` | Point at your CDN/bucket in production |
| `DATABASE_POOL_MAX` | `10` | Connections per app instance |
| `TRUST_PROXY_HOPS` | `1` | How many proxies (LB/CDN) sit in front of the app; used to read the real client IP for rate limits |
| `SEED_PASSWORD` | `noelons-demo` | Password for seeded accounts |

## License

AGPL-3.0 — if you run a modified NoElons for others, share your changes. Nobody owns it, remember?
