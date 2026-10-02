import Link from "next/link";
import { Clock, Images, Scale, Sparkles } from "lucide-react";
import { Composer } from "@/components/composer";
import { EmptyState, Feed } from "@/components/feed";
import { StopSign } from "@/components/logo";
import { PageHeader } from "@/components/page-header";
import { getViewerInfo } from "@/server/auth/viewer";
import { everyoneFeed, homeFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";

type Props = { searchParams: Promise<{ cursor?: string; welcome?: string; goodbye?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const cursor = parseCursor(sp.cursor);
  const viewer = await getViewerInfo();

  if (!viewer) {
    const page = await everyoneFeed(null, cursor);
    return (
      <>
        {!cursor ? <Landing goodbye={!!sp.goodbye} /> : <PageHeader title="Happening now" />}
        <div className="border-t border-line">
          <h2 className="px-4 pt-4 pb-1 font-display text-lg font-extrabold">Happening now on NoElons</h2>
          <Feed page={page} viewer={null} basePath="/" hasCursor={!!cursor} />
        </div>
      </>
    );
  }

  const page = await homeFeed(viewer.id, cursor);
  return (
    <>
      <PageHeader
        title="Home"
        subtitle="People you follow · newest first"
        right={
          <span className="hidden items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted sm:flex" title="Your timeline is never re-ranked.">
            <Clock size={13} /> Chronological
          </span>
        }
      />
      {sp.welcome ? (
        <div className="m-4 rounded-2xl bg-accent-soft p-4">
          <p className="font-display text-lg font-extrabold">Welcome to NoElons, {viewer.displayName}! 🎉</p>
          <p className="mt-1 text-[15px]">
            Your Home timeline shows people you follow, newest first — nothing else. Find some folks in{" "}
            <Link href="/explore" className="font-bold text-accent hover:underline">
              Explore
            </Link>
            , set up your{" "}
            <Link href="/settings" className="font-bold text-accent hover:underline">
              profile
            </Link>
            , then say hi.
          </p>
        </div>
      ) : null}
      {!cursor ? (
        <div className="border-b border-line">
          <Composer viewer={viewer} />
        </div>
      ) : null}
      <Feed
        page={page}
        viewer={viewer}
        basePath="/"
        hasCursor={!!cursor}
        empty={
          <EmptyState title="Your timeline is quiet" icon={<Sparkles />}>
            Follow a few people from{" "}
            <Link href="/explore" className="link font-semibold">
              Explore
            </Link>{" "}
            or browse{" "}
            <Link href="/everyone" className="link font-semibold">
              Everyone
            </Link>
            . Their posts will show up here, in order. No algorithm required.
          </EmptyState>
        }
      />
    </>
  );
}

function Landing({ goodbye }: { goodbye: boolean }) {
  const pillars = [
    { icon: <Clock size={20} />, title: "Chronological, always", body: "Home is the people you follow, newest first. Nobody re-ranks it." },
    { icon: <Images size={20} />, title: "Photos & posts", body: "A photo grid on every profile, quick posts in the timeline." },
    { icon: <Scale size={20} />, title: "No owner override", body: "Public rules, a public moderation log, and no paid reach." },
  ];
  return (
    <section className="relative overflow-hidden px-6 pt-10 pb-8">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-40 size-64 rounded-full bg-repost/15 blur-3xl" />
      {goodbye ? (
        <p className="relative mb-6 rounded-xl bg-surface-2 px-4 py-3 text-sm">Your account and everything in it has been deleted. Take care. 👋</p>
      ) : null}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-[44px] font-black leading-[1.02] tracking-tight sm:text-[56px]">
            Social media,
            <br />
            <span className="text-accent">minus the billionaire.</span>
          </h1>
          <StopSign className="size-24 shrink-0 rotate-[8deg] drop-shadow-lg sm:size-36" />
        </div>
        <p className="mt-4 max-w-md text-lg text-muted">
          The best parts of old-school Twitter and early Instagram — a chronological timeline, a photo grid, real conversations —
          on a network nobody gets to own.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary h-12 px-6 text-base">
            Join NoElons
          </Link>
          <Link href="/charter" className="btn-outline h-12 px-6 text-base">
            Read the Charter
          </Link>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="card p-4">
              <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">{p.icon}</div>
              <h3 className="mt-3 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
