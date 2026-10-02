import Link from "next/link";
import { Heart, Layers, MessageCircle } from "lucide-react";
import { compactNumber } from "@/lib/time";
import type { PostView } from "@/server/views";

/** Instagram-style square grid. Hover shows counts (unless the viewer hides them). */
export function PhotoGrid({ posts, hideCounts = false }: { posts: PostView[]; hideCounts?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {posts.map((p) => {
        const cover = p.media[0];
        return (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
            className="group relative block aspect-square overflow-hidden"
            style={{ backgroundColor: cover.color }}
            aria-label={cover.alt || `Photo by @${p.author.username}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.thumbUrl}
              alt={cover.alt}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${p.contentWarning ? "scale-110 blur-2xl" : ""}`}
            />
            {p.contentWarning ? (
              <span className="absolute inset-0 grid place-items-center p-2 text-center text-xs font-bold text-white drop-shadow">
                CW: {p.contentWarning}
              </span>
            ) : null}
            {p.media.length > 1 ? (
              <Layers size={18} className="absolute right-2 top-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.6)]" />
            ) : null}
            {!hideCounts ? (
              <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/35 text-sm font-bold text-white group-hover:flex">
                <span className="flex items-center gap-1.5">
                  <Heart size={18} fill="currentColor" /> {compactNumber(p.counts.likes)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={18} fill="currentColor" /> {compactNumber(p.counts.replies)}
                </span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
