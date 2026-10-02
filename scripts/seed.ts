/**
 * Demo data: a small, lively NoElons with photos, threads, quotes, reposts,
 * lists, an edited post and a public moderation history.
 *
 * Everything goes through the real service layer (createPost, follow, ...),
 * so counters, hashtags, mentions and notifications are exactly what the app
 * would have produced. Images are generated locally (scripts/art.ts).
 *
 *   npm run db:seed            # into an empty database
 *   npm run db:reset           # wipe + migrate + seed
 */
import { eq } from "drizzle-orm";
import { db, sql } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { storeAvatar, storeBanner } from "../src/server/media";
import { createPost, editPost, setBookmark, setLike, setPinned, setRepost } from "../src/server/services/posts";
import { follow } from "../src/server/services/relationships";
import { createUser } from "../src/server/services/users";
import { dismissReport, removePost, reportContent, suspendUser } from "../src/server/services/moderation";
import { addListMember, createList } from "../src/server/services/lists";
import { avatarArt, render, rng, SCENES, type SceneName } from "./art";

const PASSWORD = process.env.SEED_PASSWORD ?? "noelons-demo";
const HOUR = 3_600_000;
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * HOUR);

type Person = {
  username: string;
  displayName: string;
  bio: string;
  location?: string;
  website?: string;
  role?: "user" | "moderator" | "admin";
  avatar?: number;
  banner?: [SceneName, number];
  joinedDaysAgo: number;
};

const PEOPLE: Person[] = [
  { username: "maya", displayName: "Maya Okafor", bio: "Landscape photographer. Chasing light on foot. 📷 #goldenhour devotee.", location: "Cascadia", website: "mayaokafor.example", avatar: 11, banner: ["mountains", 4], joinedDaysAgo: 120 },
  { username: "theo", displayName: "Theo Lindqvist", bio: "Making a tiny cozy farming game, one bug at a time. Previously: too many startups.", location: "Malmö", website: "theo.games", avatar: 12, banner: ["forest", 9], joinedDaysAgo: 110 },
  { username: "priya", displayName: "Priya Raman", bio: "Climate scientist. Bikes everywhere. Opinions are my cat's.", location: "Toronto", avatar: 13, banner: ["ocean", 21], joinedDaysAgo: 98 },
  { username: "sam", displayName: "Sam Rivera", bio: "Baker at Crumb & Co. Up at 4am so you don't have to. 🍞", location: "Oakland", avatar: 14, banner: ["dunes", 5], joinedDaysAgo: 90 },
  { username: "june", displayName: "June Park", bio: "Illustrator. Daily sketch since 2019. Commissions open.", location: "Seoul", website: "junepark.art", avatar: 15, banner: ["sketch", 77], joinedDaysAgo: 86 },
  { username: "kofi", displayName: "Kofi Mensah", bio: "Local news + transit nerd. If it has a timetable, I have feelings about it.", location: "Chicago", avatar: 16, banner: ["city", 3], joinedDaysAgo: 80 },
  { username: "lena", displayName: "Lena Fischer", bio: "Birder. 412 species and counting. Will stop mid-sentence for a warbler.", location: "Hamburg", avatar: 17, banner: ["forest", 33], joinedDaysAgo: 75 },
  { username: "ravi", displayName: "Ravi Shah", bio: "Dad jokes, distributed systems, and occasionally both at once.", location: "Austin", avatar: 18, joinedDaysAgo: 60 },
  { username: "demo", displayName: "Demo Account", bio: "Kicking the tyres on NoElons. Log in as me with the seed password!", location: "localhost", avatar: 19, banner: ["night", 8], joinedDaysAgo: 30 },
  { username: "mod_alex", displayName: "Alex (Community Mod)", bio: "Volunteer moderator. Every action I take shows up in the transparency log.", role: "moderator", avatar: 20, joinedDaysAgo: 100 },
  { username: "spambot3000", displayName: "Crypto Gains 🚀🚀🚀", bio: "DM for 1000x returns. Not financial advice (it is).", joinedDaysAgo: 2 },
];

type Seeded = Record<string, string>; // username -> id

async function photo(scene: SceneName, seed: number, w?: number, h?: number) {
  return render(SCENES[scene](seed, w, h));
}

async function main() {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) {
    console.log("Database already has users — skipping seed. Run `npm run db:reset` to start fresh.");
    return;
  }
  console.log("Seeding NoElons…");
  const ids: Seeded = {};

  // The team account uses a reserved name, so it's inserted directly.
  const [team] = await db
    .insert(users)
    .values({
      username: "noelons",
      email: "team@noelons.example",
      passwordHash: await hashPassword(PASSWORD),
      displayName: "NoElons",
      bio: "The team behind NoElons. Chronological forever. Read the Charter, then go post something.",
      website: "https://noelons.example/charter",
      role: "admin",
      avatarKey: null,
      createdAt: ago(24 * 150),
    })
    .returning();
  ids.noelons = team.id;

  for (const p of PEOPLE) {
    const user = await createUser(
      { username: p.username, displayName: p.displayName, email: `${p.username}@example.com`, password: PASSWORD },
      { createdAt: ago(24 * p.joinedDaysAgo) },
    );
    const patch: Partial<typeof users.$inferInsert> = { bio: p.bio, location: p.location ?? "", website: p.website ? `https://${p.website}` : "" };
    if (p.role) patch.role = p.role;
    if (p.avatar) patch.avatarKey = await storeAvatar(await render(avatarArt(p.avatar)));
    if (p.banner) patch.bannerKey = await storeBanner(await photo(p.banner[0], p.banner[1], 1500, 500));
    await db.update(users).set(patch).where(eq(users.id, user.id));
    ids[p.username] = user.id;
  }
  console.log(`  ✓ ${Object.keys(ids).length} accounts`);

  // ── Follow graph ───────────────────────────────────────────────────────
  const graph: Record<string, string[]> = {
    maya: ["lena", "june", "sam", "priya", "noelons"],
    theo: ["ravi", "june", "kofi", "noelons", "maya"],
    priya: ["kofi", "maya", "lena", "theo", "noelons"],
    sam: ["maya", "june", "priya", "noelons"],
    june: ["maya", "theo", "sam", "lena", "noelons"],
    kofi: ["priya", "theo", "ravi", "noelons", "sam"],
    lena: ["maya", "priya", "june", "noelons"],
    ravi: ["theo", "kofi", "priya", "noelons", "demo"],
    demo: ["maya", "theo", "priya", "sam", "june", "kofi", "lena", "ravi", "noelons"],
    mod_alex: ["noelons", "kofi"],
  };
  let edges = 0;
  for (const [who, list] of Object.entries(graph)) {
    for (const target of list) {
      await follow(ids[who], ids[target], ago(24 * (20 + (edges % 9))));
      edges++;
    }
  }
  console.log(`  ✓ ${edges} follows`);

  // ── Posts ──────────────────────────────────────────────────────────────
  const P: Record<string, string> = {};
  type Img = { scene: SceneName; seed: number; w?: number; h?: number; alt: string };
  const post = async (
    key: string,
    author: string,
    hoursAgo: number,
    body: string,
    opts: { images?: Img[]; cw?: string; replyTo?: string; quote?: string } = {},
  ) => {
    const media = [];
    for (const img of opts.images ?? []) media.push({ data: await photo(img.scene, img.seed, img.w, img.h), alt: img.alt });
    P[key] = await createPost(
      ids[author],
      {
        body,
        contentWarning: opts.cw ?? null,
        replyToId: opts.replyTo ? P[opts.replyTo] : null,
        quoteOfId: opts.quote ? P[opts.quote] : null,
        media,
      },
      { createdAt: ago(hoursAgo) },
    );
    return P[key];
  };

  await post("welcome", "noelons", 24 * 6, "Welcome to NoElons 👋\n\nYour Home timeline is the people you follow, newest first. That's it. No “For You”, no paid reach, no owner override.\n\nRead the Charter (it's short), set up your profile, and say hi. #welcome #introductions");
  await post("maya1", "maya", 24 * 5.8, "First light on the north ridge. Hiked up at 4am for twelve minutes of this. Worth it. #goldenhour #photography", {
    images: [{ scene: "mountains", seed: 101, alt: "Layered blue mountain ridges fading into morning haze, with a soft sun glowing behind the peaks." }],
  });
  await post("kofi1", "kofi", 24 * 5.5, "Big news for the 14 bus: from Monday it runs every 8 minutes at peak instead of every 15. Frequency is freedom. #transit");
  await post("theo1", "theo", 24 * 5.4, "Shipped the save-game fix. Three weeks of debugging. One semicolon. I am fine. #gamedev");
  await post("ravi1", "ravi", 24 * 5.2, "I told my wife she should embrace her mistakes.\n\nShe hugged me.");
  await post("ravi1r", "theo", 24 * 5.1, "Ravi I'm reporting this to the authorities (my wife, who laughed)", { replyTo: "ravi1" });
  await post("intro_lena", "lena", 24 * 5, "Hi NoElons! Birder from Hamburg. Mostly here to post blurry photos of warblers and argue about gull identification. #introductions #birding");
  await post("june1", "june", 24 * 4.9, "Daily sketch #1,412 — “the laundromat at 11pm, but make it a painting”. #sketchaday", {
    images: [{ scene: "sketch", seed: 1412, w: 1200, h: 1500, alt: "Abstract illustration: overlapping blue, orange and yellow shapes with loose black ink lines on cream paper." }],
  });
  await post("priya_q", "priya", 24 * 4.8, "This is what climate policy looks like when it actually reaches people. More of this, everywhere. 🚌", { quote: "kofi1" });
  await post("sam1", "sam", 24 * 4.6, "4am starter check: she's alive, she's bubbly, she's named Doughlores. #sourdough");
  await post("maya2", "maya", 24 * 4.3, "Ocean days. Shot from the jetty, waves were doing their best impression of glass. #nofilter", {
    images: [
      { scene: "ocean", seed: 202, alt: "Sun setting over a calm sea, a path of golden reflections on the water." },
      { scene: "ocean", seed: 205, alt: "A violet-and-orange sunset over a flat ocean horizon." },
    ],
  });
  await post("lena_cw", "lena", 24 * 4.1, "Found this one on the hide's window frame. Very polite, very large. Spider fans, this is for you. #nature", {
    cw: "spider (a very polite one)",
    images: [{ scene: "forest", seed: 909, w: 1200, h: 1500, alt: "Misty pine forest in muted greens — the spider is out of frame, sorry arachnophobes and fans alike." }],
  });
  await post("kofi_thread1", "kofi", 24 * 3.9, "Thread: why bus frequency matters more than almost anything else in transit planning 🧵 #transit");
  await post("kofi_thread2", "kofi", 24 * 3.89, "1/ If a bus comes every 30 min, you plan your life around it. If it comes every 8, you just… go. The schedule disappears.", { replyTo: "kofi_thread1" });
  await post("kofi_thread3", "kofi", 24 * 3.88, "2/ That's the whole trick. Ridership follows frequency far more than it follows shiny new vehicles or apps.", { replyTo: "kofi_thread2" });
  await post("kofi_thread4", "kofi", 24 * 3.87, "3/ So when your city says “we can't afford more frequency”, ask what they spent on the app instead. /end", { replyTo: "kofi_thread3" });
  await post("theo2", "theo", 24 * 3.6, "Devlog: the chickens now have pathfinding. They use it exclusively to stand in doorways. #gamedev #indiedev", {
    images: [{ scene: "dunes", seed: 31, alt: "Placeholder game art: rolling golden hills under a pastel sky." }],
  });
  await post("june_cw", "june", 24 * 3.4, "Okay I need to talk about that season finale. The lighthouse scene?? The colour grading alone. I sketched it three times.", {
    cw: "spoilers: Tidewater season finale",
  });
  await post("maya3", "maya", 24 * 3.1, "City at blue hour. Usually I'm a mountains person but the river was doing something special tonight. #bluehour #photography", {
    images: [{ scene: "city", seed: 77, alt: "City skyline at dusk with lit windows reflected in a dark river." }],
  });
  await post("priya1", "priya", 24 * 2.9, "Rode to the lab in the rain again. Bike lanes are climate policy you can feel in your legs. #bikes #climate");
  await post("ravi2", "ravi", 24 * 2.7, "Distributed systems tip: there are only two hard problems.\n\n2. Exactly-once delivery\n1. Guaranteed order\n2. Exactly-once delivery");
  await post("ravi2r", "kofi", 24 * 2.65, "This is also how my bus arrives", { replyTo: "ravi2" });
  await post("lena1", "lena", 24 * 2.5, "Dawn chorus count this morning: 23 species before 6am. The wren was loudest, as is tradition. @maya the herons were back on the north pond btw #birding", {
    images: [{ scene: "forest", seed: 444, w: 1200, h: 1500, alt: "Pale misty forest at dawn, rows of pines fading into fog." }],
  });
  await post("maya_r", "maya", 24 * 2.45, "@lena going tomorrow, thank you!! bringing the long lens", { replyTo: "lena1" });
  await post("sam2", "sam", 24 * 2.2, "Today's bake. The ear on the left loaf is my magnum opus. #sourdough #bread", {
    images: [
      { scene: "dunes", seed: 88, alt: "Warm golden curves, like the crust of a loaf seen up close." },
      { scene: "dunes", seed: 89, alt: "Layered caramel and brown tones in soft waves." },
      { scene: "bokeh", seed: 90, alt: "Soft out-of-focus warm lights from the bakery's string lights." },
    ],
  });
  await post("demo1", "demo", 24 * 2, "Hello NoElons! Testing the chronological timeline. It's… in order? Incredible technology. #introductions");
  await post("demo1r", "ravi", 24 * 1.9, "Welcome! Wait till you discover the Edit button that shows its homework", { replyTo: "demo1" });
  await post("june2", "june", 24 * 1.8, "Night walk sketch. I keep trying to paint stars and they keep looking like stars, which is rude. #sketchaday", {
    images: [{ scene: "night", seed: 2024, alt: "Starry night sky with a bright full moon above a silhouetted pine treeline." }],
  });
  await post("kofi_q", "kofi", 24 * 1.6, "Two weeks in and my timeline is just… my friends? In order? Is this what the internet was supposed to be?", { quote: "welcome" });
  await post("priya2", "priya", 24 * 1.4, "New paper out today on urban heat islands. Short version: trees are air conditioning that also makes oxygen. Plant more trees. #climate");
  await post("theo3", "theo", 24 * 1.2, "Hot take: every game should have a button that just lets you pet the dog. Non-negotiable. #gamedev");

  // Last 24h: give the trends something to chew on.
  await post("maya4", "maya", 20, "Golden hour, take 47. The light just doesn't get old. #goldenhour", {
    images: [
      { scene: "mountains", seed: 4747, alt: "Purple and orange mountains at sunset with a hazy glow." },
      { scene: "mountains", seed: 4748, alt: "Teal dusk over jagged ridgelines." },
      { scene: "ocean", seed: 4749, alt: "Sunset over the sea with streaks of light on the water." },
      { scene: "night", seed: 4750, w: 1600, h: 1000, alt: "The same coast after dark: stars and a bright moon over a dark treeline." },
    ],
  });
  await post("sam3", "sam", 18, "Golden hour at the bakery means the 6pm discount rack. Come get your croissants. #goldenhour #sourdough");
  await post("lena2", "lena", 16, "Golden hour at the marsh: 4 bitterns, 1 marsh harrier, 0 phone signal. Perfect evening. #goldenhour #birding", {
    images: [{ scene: "dunes", seed: 515, alt: "Low golden sun over soft rolling reed beds." }],
  });
  await post("kofi2", "kofi", 14, "City council voted 9-2 to make the 14 bus frequency permanent. Thank you to everyone who showed up and gave public comment. #transit");
  await post("priya3", "priya", 13, "Bike to work week starts Monday. I'll be the one at the lights grinning like an idiot. #bikes #transit");
  await post("june3", "june", 12, "Sketch #1,420 — commuters on the 14 bus, inspired by @kofi's posts. #sketchaday #transit", {
    images: [{ scene: "sketch", seed: 1420, w: 1200, h: 1500, alt: "Abstract illustration of bold shapes and lines suggesting a crowded bus." }],
  });
  await post("theo4", "theo", 10, "Playtest tonight! If you've ever wanted to name a chicken after your manager, now's your chance. #gamedev #indiedev");
  await post("ravi3", "ravi", 9, "Why do programmers prefer dark mode?\n\nBecause light attracts bugs.\n\n(NoElons has dark mode btw. It follows your system setting. No, I don't work here.)");
  await post("maya5", "maya", 7, "Midnight sky from the ridge camp. Ten-second exposure, cold hands, happy heart. #astrophotography #photography", {
    images: [{ scene: "night", seed: 777, alt: "Dense field of stars and a bright moon over a black silhouette of pines." }],
  });
  await post("sam4", "sam", 5, "Doughlores update: she's been fed and she's thriving. More than I can say for myself at 4am. #sourdough");
  await post("lena3", "lena", 4, "PSA: if you find a baby bird on the ground it's probably fine and its parents are nearby. Leave it be! #birding #nature");
  await post("priya4", "priya", 3, "Cities with good transit and bike lanes: lower emissions AND happier people. Funny how that works. #climate #bikes", {
    images: [{ scene: "city", seed: 303, alt: "Evening city skyline over the water, many windows lit." }],
  });
  await post("june4", "june", 2, "Studio light this afternoon was gorgeous. Painting soft focus because I lost my glasses. #sketchaday", {
    images: [{ scene: "bokeh", seed: 1111, alt: "Blurry soft circles of blue and teal light on a dark background." }],
  });
  await post("kofi3", "kofi", 1.5, "Reminder that the 14 now runs every 8 min at peak. If your commute changed because of it, I'd love to hear the story for a piece I'm writing. #transit");
  await post("ravi4", "ravi", 1, "@theo I've been playtesting. My chicken is named Kubernetes. It is constantly restarting.", { replyTo: "theo4" });
  await post("demo2", "demo", 0.8, "Just made my first List. Old-school Twitter energy is back 🫡");

  // Spam, so moderation has something to do.
  await post("spam1", "spambot3000", 30, "🚀🚀 TURN $100 INTO $100,000 🚀🚀 click here → https://example.com/totally-legit-crypto 💎🙌 #crypto #goldenhour");
  await post("spam2", "spambot3000", 29, "Elon who? Our coin goes to the MOON for real 🌕 https://example.com/moon-coin #crypto");
  await post("spam3", "spambot3000", 28, "DM me for guaranteed 1000x. Limited spots!! #gamedev #sourdough #birding");

  // An edited post (edits leave public receipts).
  await post("theo_edit", "theo", 0.2, "Patch notes for v0.4 are up: fixed the bug where chickens could walk through walls. #gamedev");
  await editPost(ids.theo, P.theo_edit, {
    body: "Patch notes for v0.4 are up: fixed the bug where chickens could walk through walls (they were very determined). #gamedev",
  });
  console.log(`  ✓ ${Object.keys(P).length} posts`);

  // ── Reactions ──────────────────────────────────────────────────────────
  const r = rng(42);
  const people = Object.keys(graph);
  let likeCount = 0;
  for (const [key, postId] of Object.entries(P)) {
    if (key.startsWith("spam")) continue;
    for (const who of people) {
      if (r() < 0.38) {
        await setLike(ids[who], postId, true, ago(Math.max(0.05, r() * 20)));
        likeCount++;
      }
    }
  }
  const reposts: Array<[string, string, number]> = [
    ["lena", "maya1", 24 * 5.7],
    ["priya", "kofi_thread1", 24 * 3.8],
    ["theo", "ravi2", 24 * 2.6],
    ["demo", "maya3", 24 * 3],
    ["june", "maya4", 19],
    ["kofi", "priya3", 12],
    ["sam", "june3", 11],
    ["ravi", "theo4", 9.5],
    ["maya", "lena2", 15],
    ["priya", "kofi2", 13.5],
    ["demo", "kofi2", 13],
  ];
  for (const [who, key, h] of reposts) await setRepost(ids[who], P[key], true, ago(h));
  for (const key of ["maya1", "kofi_thread1", "priya2"]) await setBookmark(ids.demo, P[key], true);
  await setPinned(ids.noelons, P.welcome, true);
  await setPinned(ids.maya, P.maya4, true);
  console.log(`  ✓ ${likeCount} likes, ${reposts.length} reposts`);

  // ── Lists ──────────────────────────────────────────────────────────────
  const photographers = await createList(ids.demo, { name: "Photographers", description: "People whose grids I'd frame.", isPrivate: false });
  for (const u of ["maya", "june", "lena"]) await addListMember(ids.demo, photographers, u);
  const transit = await createList(ids.priya, { name: "Transit & bikes", description: "Frequency is freedom.", isPrivate: false });
  for (const u of ["kofi", "priya", "ravi"]) await addListMember(ids.priya, transit, u);

  // ── Moderation, in public ──────────────────────────────────────────────
  await reportContent(ids.lena, { postId: P.spam1 }, { rule: "spam", details: "Crypto scam link, hijacking #goldenhour." });
  await reportContent(ids.kofi, { postId: P.spam2 }, { rule: "spam", details: "" });
  await reportContent(ids.priya, { userId: ids.spambot3000 }, { rule: "spam", details: "Whole account is a scam bot." });
  await reportContent(ids.ravi, { postId: P.theo3 }, { rule: "harassment", details: "This take is too hot. (joking!!)" });
  await reportContent(ids.sam, { postId: P.spam3 }, { rule: "spam", details: "Spamming every hashtag." });

  const [ravisReport] = await sql<{ id: string }[]>`select id from reports where post_id = ${P.theo3}`;
  await removePost(ids.mod_alex, P.spam1, "spam", "Crypto scam link posted into an unrelated hashtag.");
  await removePost(ids.mod_alex, P.spam2, "spam", "Same scam, different coin.");
  await suspendUser(ids.mod_alex, ids.spambot3000, "spam", "Automated scam account. Posts removed, account suspended.");
  await dismissReport(ids.mod_alex, ravisReport.id);
  // One report stays open so the moderation queue isn't empty in the demo.
  await reportContent(ids.demo, { postId: P.ravi2 }, { rule: "spam", details: "Testing the report flow — please dismiss!" });
  console.log("  ✓ reports + moderation log");

  console.log(`\nDone. Log in as @demo (or any seeded user) with password: ${PASSWORD}`);
  console.log("Moderator: @mod_alex · Admin: @noelons");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
