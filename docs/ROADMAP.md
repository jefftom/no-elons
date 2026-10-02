# What's next for NoElons

> Written 2026-10-02 from a structured review of this repo: 6 lens-specific planners (launch/legal, growth, product, open network, trust & safety, business), a codebase gap scan, a completeness critic and a 3-judge scoring panel (impact, launch risk, leverage). ✅ marks items already shipped on the MVP branch.

The MVP proves the product works: a chronological Home, the photo Grid, the Charter and a public moderation log. It has not yet shown that people want it, and it isn't ready to launch. It runs only on localhost. It sends no email. Media lives on one Docker volume. There are no Terms, no public takedown path and no budget. This roadmap puts real testers on a private staging site within two weeks. It closes the launch blockers in the order risk requires, and holds the big bets (federation, packs, push) until testers show they matter. The NO ELONS stop sign stays as the mark, but counsel signs off on it before anything is filed or announced in public.

## The next 5 moves

1. **Merge, tag `v0.1.0`, protect `main`, then finish the post-merge fix pack (S, 1-2 days).** Most of it already shipped on the MVP branch:
   - ✅ Logout works at every screen size (it used to be desktop-only), and phones reach Bookmarks, Lists, the Charter and Transparency from Settings.
   - ✅ `@maya@mastodon.social` no longer pings the local `maya`. Mentions are capped at 10 per post, and abuse, postmaster, legal and similar names are reserved.
   - ✅ `addListMember` checks blocks. `scripts/seed.ts` refuses to run when `NODE_ENV=production`.
   - ✅ Light-theme contrast now passes AA: white on the accent is 4.8:1, and links on paper are 5.4:1.
   - Still to do: a "remove me from this list" control, and a script that finds username collisions.
2. **Stand up a private staging site and invite 15-30 testers (S).** Use the existing Dockerfile on one host with managed Postgres (PITR), TLS behind a proxy, Cloudflare Access and `X-Robots-Tag: noindex`. Run migrations only. Before day one, write down the kill, pivot and proceed criteria, for example "≥50% of testers post unprompted in week 3".
3. **Production runtime minimum (M), done alongside staging.** Add a zod `src/server/env.ts` that fails fast, `src/instrumentation.ts` with error reporting, `global-error.tsx` and `/api/health`. Run node under `tini`/exec so it receives SIGTERM, and set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` plus `deploymentId`.
4. **Transactional email against a console driver (M).** Password reset comes first. Today a forgotten password means an account that can't even be deleted, because `changePassword` and `deleteAccount` both require the current password. Verification and email change follow. Only the sending domain waits for brand clearance.
5. **Founder work that doesn't need code (S, this week, in parallel):**
   - Brief counsel on the mark and launch geography.
   - Use a registered agent and keep your home address off every filing.
   - Put hardware keys on every account.
   - Name a break-glass second person.
   - Write a one-page budget with a stop condition.
   - Apply for NCMEC ESP registration, PhotoDNA/Safer and StopNCII now, because approvals take weeks.

## Launch checklist (must be true before public sign-ups)

- [ ] Counsel's opinion on NO ELONS (Lanham §2(c), *Vidal v. Elster*, right of publicity). The entity and domain are held under a neutral parent brand.
- [ ] The entity is formed and owns the repo, registrar, cloud and payment accounts. No home address appears in any public record.
- [ ] `/terms`, `/privacy`, `/guidelines` (rendered from `RULES`) and `/legal` exist. A `SiteFooter` appears at every breakpoint. There is a `LICENSE` file, a source link (AGPL §13) and `security.txt`.
- [ ] Launch geography is decided as a country allowlist (Australia's 16+ law, UK OSA), plus a 13+ age screen. Sexually explicit media is prohibited at launch.
- [ ] Charter v1.0 is published. The rulebook covers self-harm, violent extremism, public figures and credible threats, synthetic media, automated accounts, civic integrity, copyright and underage users.
- [ ] Password reset, email verification and verified-only posting are live.
- [ ] `signup_mode` (open, invite, closed) works as the kill switch, and every change to it is logged on `/transparency`.
- [ ] Staff role changes go through a logged `setRole`, so `promote.ts` can no longer change roles silently.
- [ ] Media sits in a private bucket behind a CDN, `/media` checks visibility, and purge-on-removal works. PITR is on, and one restore drill has passed inside the cloud account.
- [ ] The report queue is sorted by severity then age. P0 reports page the founder and one paid backup. `docs/MODERATION.md` exists.
- [ ] CSAM launch slice: NCMEC reporting by hand, legal holds, removed posts can't be deleted by their author, `reports` foreign keys no longer cascade, quarantine and blurred review.
- [ ] A public notice form that works without logging in (NCII within 48h, DMCA, illegal content, law enforcement). Today `report/page.tsx` calls `requireViewer`.
- [ ] Suspended members receive a statement of reasons with a signed link to appeal and to export their data.
- [ ] Staff sign in with passkeys. `TRUST_PROXY_HOPS=0` is supported, CSP and HSTS are on, and the missing rate limits are added.
- [ ] A CDN/WAF sits in front of the whole origin. The k6 load test has run and `docs/runbooks/siege-mode.md` exists.
- [ ] Suspended profiles are `noindex` and no longer unfurl their bio or avatar.
- [x] Light-theme contrast passes AA. ✅ Fixed: `--accent` was 3.10:1 and `--link` was 4.14:1.

## Now (next ~2 weeks)

| What | Why | Effort | Depends on | First PRs |
|---|---|---|---|---|
| Post-merge fix pack (mostly ✅) | Small bugs that get worse once real accounts exist | S | — | ✅ logout and phone navigation, ✅ `@user@domain` handling, ✅ reserved names, ✅ list block check, ✅ mention cap. Still to do: "remove me from this list", a collision script, and a proper `handle` token for remote accounts once federation lands |
| Private staging and dogfood | The cheapest test of the core bet. Also the rehearsal target for everything below | S | Fix pack | Infrastructure as described in move 2. An env check in `signupAction` closes signup. Tester agreement, weekly calls |
| Runtime minimum | Silent dev fallbacks: known DB credentials, cookies without `Secure`, the seed admin | M | — | `env.ts`, instrumentation, health and ready checks, `tini`, pinned images, migrations run under an advisory lock |
| Transactional email | Account recovery, plus defence against email squatting | M | — | `src/server/email/` modelled on `BlobStorage`. `email_tokens` stored as sha256, following `session.ts`. `/forgot` and `/reset/[token]` |
| Logged `setRole` | Closes the most quotable hole in the "no owner override" claim | S | — | `grant_role` and `revoke_role` actions. `promote.ts` calls `setRole` |
| Moderation minimum | Today `openReports` sorts by `desc(reports.id)` (`moderation.ts:85`), so CSAM reports sink under spam | S | — | Severity per rule, `reports.priority`, `MOD_PAGER_WEBHOOK_URL`, `docs/MODERATION.md` |
| Contrast tokens (✅ tokens fixed) | Primary buttons and every link failed AA | S | — | ✅ `globals.css` tokens. Still to do: a `tests/contrast.test.ts` guard so it can't regress |

## Next (2-8 weeks)

**Before the first invite wave (closed alpha, ≤300 people):**

| What | Why | Effort | Depends on | First PRs |
|---|---|---|---|---|
| `signup_mode` and invites | Kill switch, cold-start tool and wave pacing | M | Email | `site_settings`. `invites` consumed atomically in `createUser`. A `/join/[code]` page with auto-follow of the inviter |
| Onboarding launch slice | Waves are gated on D7 activation, so new members can't land on an empty Home | S | Invites | `whoToFollow` excludes staff and empty accounts. A "follow 5" step. A prefilled #introductions post |
| Wave-gate metrics | Gates must be measurable | S | — | D7 activation and newcomer time-to-first-reply as admin SQL. Median and p90 of `resolved_at` on `/transparency` |
| Minimal worker | The email outbox, purge retries, retention and the NCII alarm all need a scheduler | S/M | Runtime | pg-boss plus a `src/worker` service in the Dockerfile and compose |
| Durable storage | One lost disk means every photo is lost, because originals aren't kept (ADR 0005) | L | — | `S3Storage` with MinIO in compose and CI. A `CdnPurger` hook. A restore drill run inside the cloud account, with quarantined media kept out of cross-provider replication. Also correct the README's advice about a public bucket |
| Legal foundation | The founder is personally liable today | L | Counsel (only the entity filing waits on clearance) | Legal pages under `(legal)/`. `SiteFooter`. `LICENSE`. Age and terms columns. `copyright` and `underage` rules |
| Rulebook and Charter v1.0 | After the freeze, every new rule costs a 30-day proposal | M | Legal drafts | Append the new rules. `CHARTER_VERSION`, `docs/charter/CHANGELOG.md`, a hash test with an **emergency-amendment path** |
| CSAM launch slice | `rules.ts:39` promises reports to authorities that nothing implements | M | Storage | `legal_holds`. `deletePost` refuses once a post has been removed. Reports foreign keys switch to `SET NULL`. Quarantine prefix. Blurred review |
| Founder safety and crisis | The brand will draw pile-ons | S | — | `docs/runbooks/threats.md`, `crisis.md` and a media policy. Tabletop exercises before the first public wave |

**Before open signups:**

| What | Why | Effort | Depends on |
|---|---|---|---|
| Public notice-and-takedown | TAKE IT DOWN Act (48h, in force since May 2026), DMCA §512 | L | Legal, email, worker |
| Notices and appeals (signed links, no new session mode) | DSA Art. 17, UK OSA complaints, Charter promise #4 | M | Email |
| Security hardening | Staff passkeys, CSP and HSTS, `clientIp` (`viewer.ts:83`), kill switches. Plus an external review of auth, sessions, uploads and `/media` | M | Runtime |
| Edge protection and surge plan | One viral quote-post would hit a single Node process with a pool of 10 connections | M | Staging |
| Rest of the anti-spam baseline | Trust tiers, a durable Postgres rate limiter, ALTCHA, display-name confusable checks | L | Email |
| Share-card fix | Suspended profiles leak their bio and avatar in previews. Add full OG metadata and canonical URLs | S | — |
| Data rights, launch slice | Media bytes in the export zip, username tombstones, a retention script | M | Worker |
| Support desk | A `/help` section, a signed-out `/contact` form, a recovery policy and a `staff_actions` audit log | M | Email |
| rel=me verification | Protects arriving journalists from impersonation | S | Minimal outbound fetcher |
| AI-training stance | A one-line Terms clause, robots rules for AI crawlers and a TDMRep header | S | Legal |
| Local times and `dir=auto` | Every timestamp currently shows in UTC | S | — |

## Later (after traction)

| What | Effort | Depends on | Notes |
|---|---|---|---|
| Harassment and filter controls | L | A11y primitives | Reply policies, hidden replies, muted words, notification preferences |
| Starter packs and `followMany` | L | Invites | Consent-based, public only |
| Reading experience | XL | Storage | Image variants and srcset, a lightbox, a "N new posts" pill, a real caught-up marker |
| Composer | L | Worker, SSRF fetcher | Drafts, client-side resize first. Link previews last |
| PWA, push and calm digest | L | Worker, email | Ship after there is evidence people engage |
| Search upgrades | M | — | Operators, indexed alt text, typeahead |
| Public projections and API v1 | L | — | Start with `src/server/public/` and a contract test |
| ActivityPub (publish-only, opt-in) | L | Projections, worker, `LOCAL_DOMAIN` | A good candidate for NLnet funding |
| Two-way federation and Move | XL | Federated moderation, hash matching | — |
| Importers | L | Verified identities | Match only on verified identities |
| Moderator workbench v2, published integrity rules and labels | L each | Real report volume | — |
| Stripe memberships | M | Entity | A GitHub Sponsors or Open Collective link goes live at launch instead |
| Member governance | L | Charter v1.0 | Proposals, elections, ownership conversion |
| Full metrics, `/stats` and Open Books | L | Worker | — |

## Deliberately not yet

- **`src/lib/brand.ts` and a `BRAND_CAMPAIGN` flag.** A rename is an afternoon of find-and-replace across about 30 files. Do only the cheap renames now: the cookie name, the export format string, and the preview at `signup-form.tsx:40`. Build the flag only if counsel clears the mark with conditions.
- **Trademark filings on NO ELONS.** It is probably unregistrable after *Vidal v. Elster*. File on the parent brand only.
- **16-20 hours a day of paid moderation coverage for the alpha.** That costs about $10-18k a month with no revenue. Start with the founder plus one paid backup, and grow coverage with each wave.
- **Volunteer community moderators.** Today the moderator role is global and can see every reporter's identity. Define a steward role that can only escalate before handing out anything.
- **A restricted "standing" session for suspended accounts.** Signed links meet the same duties without adding a new auth mode.
- **CI-enforced 30-day freeze before Charter v1.0,** or making outside stewards a launch requirement.
- **PDQ hashing, a `HashMatcher` abstraction, or the PhotoDNA and StopNCII integrations on the critical path.** Apply now, and don't wait on approvals you don't control.
- **AS2 and Mastodon-format exports, the SSRF-heavy features, and multi-instance work.** Nothing uses them until federation ships, and a single-instance alpha doesn't need them.
- **A native app.** Go PWA first, then a Play Store Trusted Web Activity. A stop sign naming a real person is an App Store review risk.

## Decisions only the founder can make

1. **The mark and the parent brand.** If counsel advises against it, do you keep the stop sign as a campaign mark under a neutral company name, or rename? Which neutral name?
2. **Entity type.** LLC or Delaware PBC, and how firmly the Charter is written into the governing documents.
3. **Launch geography.** Which countries are on the allowlist? Do you comply with the UK OSA or geo-block the UK? Are EU users in scope (DSA, and the EU's 1-hour terrorist-content orders)?
4. **Adult content.** Prohibited at launch (recommended), or allowed later behind age assurance?
5. **Moderation staffing.** Who is the paid P0 backup, and how do coverage hours grow with each wave?
6. **Money.** Maximum monthly burn, runway, the stop condition, whether a donation link is live at launch, and future membership pricing.
7. **Public identity.** Whether to name yourself on `/governance`, and who the break-glass person is.
8. **Kill, pivot and proceed criteria** for the dogfood period, and the gates for each invite wave.
9. **Ownership.** Co-op, steward ownership with a golden share, or PBC alone, and when to convert.
10. **AI training and scraping.** Does the "we never license member content for AI training" promise go into Charter v1.0?
11. **Interop priority.** ActivityPub first, or a Bluesky bridge?