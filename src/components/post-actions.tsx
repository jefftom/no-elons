"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, Heart, MessageCircle, PenLine, Repeat2, Share } from "lucide-react";
import { toggleBookmarkAction, toggleLikeAction, toggleRepostAction } from "@/app/actions/posts";
import { compactNumber } from "@/lib/time";

type Props = {
  postId: string;
  counts: { likes: number; reposts: number; replies: number; quotes: number };
  viewerState: { liked: boolean; reposted: boolean; bookmarked: boolean } | null;
  hideCounts: boolean;
  size?: "md" | "lg";
};

function Count({ n, hidden }: { n: number; hidden: boolean }) {
  if (hidden || n <= 0) return null;
  return <span className="tabular-nums">{compactNumber(n)}</span>;
}

export function PostActions({ postId, counts, viewerState, hideCounts, size = "md" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState({
    liked: viewerState?.liked ?? false,
    reposted: viewerState?.reposted ?? false,
    bookmarked: viewerState?.bookmarked ?? false,
    likes: counts.likes,
    reposts: counts.reposts,
  });
  const [repostMenu, setRepostMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const signedIn = viewerState !== null;
  const icon = size === "lg" ? 22 : 18;

  useEffect(() => {
    if (!repostMenu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setRepostMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setRepostMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [repostMenu]);

  function requireSignIn(): boolean {
    if (signedIn) return true;
    router.push(`/login?next=${encodeURIComponent(`/p/${postId}`)}`);
    return false;
  }

  function optimistic(patch: (s: typeof state) => typeof state, run: () => Promise<{ ok: boolean; error?: string }>) {
    if (!requireSignIn()) return;
    const before = state;
    setState(patch);
    startTransition(async () => {
      const res = await run();
      if (!res.ok) {
        setState(before);
        if (res.error) alert(res.error);
      }
    });
  }

  const toggleLike = () =>
    optimistic(
      (s) => ({ ...s, liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) }),
      () => toggleLikeAction(postId, !state.liked),
    );

  const toggleRepost = () => {
    setRepostMenu(false);
    optimistic(
      (s) => ({ ...s, reposted: !s.reposted, reposts: s.reposts + (s.reposted ? -1 : 1) }),
      () => toggleRepostAction(postId, !state.reposted),
    );
  };

  const toggleBookmark = () =>
    optimistic(
      (s) => ({ ...s, bookmarked: !s.bookmarked }),
      () => toggleBookmarkAction(postId, !state.bookmarked),
    );

  async function share() {
    const url = `${window.location.origin}/p/${postId}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* user cancelled */
    }
  }

  const btn =
    "pointer-events-auto relative inline-flex items-center gap-1.5 rounded-full p-2 -m-2 text-[13px] text-muted transition-colors";

  return (
    <div className={`mt-3 flex items-center justify-between ${size === "lg" ? "max-w-none px-2" : "max-w-[440px]"}`}>
      <Link href={`/p/${postId}#reply`} className={`${btn} hover:text-accent`} aria-label="Reply">
        <MessageCircle size={icon} />
        <Count n={counts.replies} hidden={hideCounts} />
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => requireSignIn() && setRepostMenu((v) => !v)}
          className={`${btn} ${state.reposted ? "text-repost" : "hover:text-repost"}`}
          aria-label={state.reposted ? "Undo repost" : "Repost"}
          aria-expanded={repostMenu}
        >
          <Repeat2 size={icon} />
          <Count n={state.reposts} hidden={hideCounts} />
        </button>
        {repostMenu ? (
          <div className="pointer-events-auto absolute left-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
            <button type="button" onClick={toggleRepost} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-surface-2">
              <Repeat2 size={16} /> {state.reposted ? "Undo repost" : "Repost"}
            </button>
            <Link
              href={`/compose?quote=${postId}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-surface-2"
            >
              <PenLine size={16} /> Quote
            </Link>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={toggleLike}
        className={`${btn} ${state.liked ? "text-like" : "hover:text-like"}`}
        aria-label={state.liked ? "Unlike" : "Like"}
        aria-pressed={state.liked}
      >
        <Heart size={icon} fill={state.liked ? "currentColor" : "none"} className={state.liked ? "animate-[pop_.25s_ease-out]" : ""} />
        <Count n={state.likes} hidden={hideCounts} />
      </button>

      <button
        type="button"
        onClick={toggleBookmark}
        className={`${btn} ${state.bookmarked ? "text-accent" : "hover:text-accent"}`}
        aria-label={state.bookmarked ? "Remove bookmark" : "Bookmark"}
        aria-pressed={state.bookmarked}
      >
        <Bookmark size={icon} fill={state.bookmarked ? "currentColor" : "none"} />
      </button>

      <button type="button" onClick={share} className={`${btn} hover:text-accent`} aria-label="Share">
        <Share size={icon} />
        {copied ? <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-bg">Link copied</span> : null}
      </button>
    </div>
  );
}
