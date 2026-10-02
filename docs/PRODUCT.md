# NoElons product brief

**One line:** a chronological, photo-friendly social network that nobody owns. It takes the best of old-school Twitter
and early Instagram, then adds the thing neither had: structural guarantees that no single person can tilt the
platform.

**Tagline:** *Social media, minus the billionaire.*

---

## Why now

The big platforms all drifted the same way. Ranked "For You" feeds replaced the people you chose to follow, reach
became purchasable, rules changed overnight at one person's whim, and moderation became a black box. People who want
the *old* feeling (see what my friends posted, in order, and talk about it) have scattered across Bluesky, Mastodon,
Threads, and group chats. NoElons is a bet that a product built around **trust and calm** can win back the people who
miss it.

---

## The blend

### From old-school Twitter (≈2009–2014)

| Feature | In NoElons |
| --- | --- |
| Chronological home timeline | ✅ The only Home there is. Reply rule included: you see a reply only if you follow who it's replying to. |
| Short posts, quick replies, threads | ✅ 500 characters. Self-threads unroll under the first post. |
| Retweets and quote tweets | ✅ Reposts and quotes |
| Hashtags and trends | ✅ Trends ranked by *distinct people*, with the rule printed under the widget |
| Lists | ✅ Public or private hand-picked timelines |
| The public timeline | ✅ "Everyone": every new post, as it happens |
| Pinned post, header image, bio, location, link | ✅ |
| RSS for every profile | ✅ |

### From early Instagram (≈2011–2015)

| Feature | In NoElons |
| --- | --- |
| The profile photo grid | ✅ A Grid tab on every profile, plus a global Photos grid |
| Photo-first posts, up to 4 per post (carousel-lite) | ✅ With alt text and an ALT badge |
| A feed of only photos from people you follow | ✅ Photos → Following |
| Hiding like counts | ✅ "Calm mode" hides counts everywhere, for you |
| Filters | ⏳ Roadmap: a few tasteful presets, applied server-side so originals are untouched |
| Stories | ⏳ Roadmap as "Today": 24-hour posts with no view counts and no streaks |

### And what else? The NoElons differentiators

These are the reasons to switch rather than just reminders of the good old days. Several ship in the MVP:

1. **The Charter.** ✅ Six promises (chronological, no paid reach, no owner override, data portability, no surveillance,
   edit receipts), shown publicly. Changing them takes a public proposal and a 30-day comment period.
2. **A public transparency log.** ✅ Every removal, suspension, restoration, and dismissed report is published with the
   rule cited, plus 30-day stats. No other major network does this in real time.
3. **Edits with receipts.** ✅ Fix a typo for an hour, and anyone can see what changed. This ends the edit-button
   debate.
4. **Calm mode.** ✅ Hide like and repost counts for yourself. Likes are private by default, so nobody can audit
   what you liked.
5. **Your data leaves with you.** ✅ One-click JSON export, RSS, and stable URLs. ⏳ ActivityPub federation next, so
   Mastodon and Threads users can follow you and you can move without losing followers.
6. **Verified means human, not paying.** ⏳ Free verification via domain `rel=me` links, community vouching, or ID only
   if you opt in. Nobody can buy a checkmark.
7. **Opt-in custom feeds with open rules.** ⏳ Anyone can publish a feed algorithm, and members subscribe explicitly.
   Home stays chronological forever.
8. **Communities ("Clubs").** ⏳ Old-forum energy: topic spaces with their own elected mods and rules, cross-posting
   into your timeline.
9. **Long-form "Notes".** ⏳ Blog posts that live on your profile and share into the timeline as cards.
10. **Starter packs + importers.** ⏳ Curated "follow these 30 people" packs, plus import of your follow graph from
    Bluesky, Mastodon, and an X data export, to beat the cold start.
11. **Composable moderation.** ⏳ Subscribe to community labelers (e.g. "hide spoilers for show X", "blur gore"),
    on top of the house rules.
12. **Member ownership.** ⏳ A platform cooperative or steward-ownership structure, so "nobody owns it" is a legal
    fact, not just a slogan. Members elect the board, and the Charter is in the bylaws.
13. **DMs with E2EE.** ⏳ Messaging Layer Security (MLS), off by default for strangers.

My recommendation for **what else** to emphasise in launch messaging: **#1 + #2 + #5**. They're the most defensible
(competitors can copy features but rarely copy governance), easy to explain in one sentence, and directly address why
people left their old platform.

---

## Who it's for (launch personas)

- **The Lapsed Poster:** posted daily in 2012 and lurks now. Wants their friends back, in order. *Hook: chronological
  Home, Lists, import your follows.*
- **The Photographer / Illustrator:** left Instagram when it became video-first and ad-heavy. *Hook: the grid,
  metadata stripping, alt text, no algorithmic burial.*
- **The Local Reporter / Civic Nerd:** needs reach that isn't throttled for links. *Hook: links aren't
  down-ranked (nothing is ranked), RSS, public moderation.*
- **The Small Community:** a hobby, a fandom, a neighbourhood. *Hook: Lists today, Clubs next, elected mods.*

---

## MVP: what's in this repo

- Accounts (argon2id), sessions, rate limits
- Profiles with avatar, banner, bio, links, pinned post, and Posts / Replies / Grid / Likes (private) tabs
- Composer: 500 chars, 4 photos with alt text, content warnings, paste and drag-drop, ⌘↩ to post
- Home (chronological), Everyone, Photos (everyone / following), Explore, Search (posts and people), hashtags,
  trends, who-to-follow
- Replies and threads, reposts, quotes, likes, bookmarks, pin, edit with history, delete with tombstones
- Follow, mute, block (symmetric visibility)
- Grouped notifications with an unread badge
- Lists
- Reports, moderator queue, suspensions, public transparency log, the Charter
- Calm mode, JSON export, RSS, account deletion
- Responsive (phone bottom tab bar), dark mode, keyboard and screen-reader friendly basics

## Roadmap

> The detailed, prioritised plan (launch checklist, now/next/later, founder decisions) is in [ROADMAP.md](ROADMAP.md). The table below is the original product-level sketch.

| Phase | Theme | Highlights |
| --- | --- | --- |
| **1 (next 6–8 weeks)** | Polish and growth loops | Infinite scroll, image lightbox, link preview cards, email verification and password reset, onboarding with starter packs, follow import, Web Push, PWA install |
| **2** | Open network | ActivityPub federation (follow from Mastodon/Threads), `rel=me` verification, account migration, public read API |
| **3** | Community | Clubs, Notes (long-form), polls, "Today" (24h posts), appeals flow, elected moderators |
| **4** | Choice | Opt-in custom feeds marketplace, composable labelers, E2EE DMs, video |

## Business model (no ads, no data sales)

- **Membership:** pay-what-you-want ($3–$8/month). Supporters get cosmetic perks only (themes, early features,
  a supporter badge they can hide), never reach.
- **Pro tools** for creators and organisations: scheduling, analytics *about your own posts only*, team accounts,
  custom domains as handles.
- **Grants and donations** for the trust-and-safety team, which is the largest cost line.
- Unit economics target: infra < $0.05 per MAU per month at stage 1 (Postgres + CDN + object storage), with
  trust and safety staffed at about 1 moderator per 50k MAU, supplemented by elected volunteer mods.

## Metrics that matter (and ones we refuse to optimise)

- ✅ **Weekly posting members**, replies per post, % of Home sessions that reach "You're all caught up", 30-day
  retention, report resolution time (median, published).
- 🚫 Time-on-site and "engagement" as north stars. A calm network that people *finish* is the goal.

## Risks and open questions

1. **The name.** "NoElons" is memorable and instantly communicates the positioning, but it references a real,
   litigious person and defines the brand by opposition. **Get a trademark/legal review before launch**, and consider
   a neutral parent brand (e.g. the co-op's name) with NoElons as the launch campaign or a nickname. Copy is written
   so a rename is cheap: product text says "NoElons" in a handful of places, and the Charter never mentions any
   individual.
2. **Cold start.** Chronological feeds feel empty without a graph. Mitigations: starter packs, follow import, the
   Everyone timeline, and federation (borrow the fediverse's graph).
3. **Trust and safety cost.** Public moderation invites scrutiny of every call. That's the point, but it needs
   staffing, clear rule text, and an appeals process before scale.
4. **Spam.** No algorithm also means no algorithmic spam suppression. Rate limits and distinct-people trends are a
   start. Next come new-account friction (email verification, posting limits for 24h) and community reports feeding a
   simple classifier, whose rules are also published.
