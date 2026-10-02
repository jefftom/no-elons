import type { MediaView } from "@/server/views";

function Tile({
  m,
  className = "",
  priority = false,
  aspectRatio,
}: {
  m: MediaView;
  className?: string;
  priority?: boolean;
  aspectRatio?: number;
}) {
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener"
      className={`group pointer-events-auto relative block overflow-hidden ${className}`}
      style={{ backgroundColor: m.color, aspectRatio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.url}
        alt={m.alt}
        width={m.width}
        height={m.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
      />
      {m.alt ? (
        <span
          title={m.alt}
          className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
        >
          ALT
        </span>
      ) : null}
    </a>
  );
}

/** Twitter-style 1–4 photo layouts. */
export function MediaGrid({ media, rounded = "rounded-2xl" }: { media: MediaView[]; rounded?: string }) {
  if (!media.length) return null;
  const wrap = `mt-3 overflow-hidden border border-line ${rounded}`;
  if (media.length === 1) {
    const m = media[0];
    // Clamp extreme aspect ratios: between 4:5 portrait and ~2:1 landscape.
    const ratio = Math.min(Math.max(m.width / m.height, 0.8), 2);
    return (
      <div className={wrap}>
        <Tile m={m} className="max-h-[560px] w-full" aspectRatio={ratio} priority />
      </div>
    );
  }
  if (media.length === 2) {
    return (
      <div className={`${wrap} grid aspect-[16/10] grid-cols-2 gap-0.5`}>
        {media.map((m) => (
          <Tile key={m.id} m={m} />
        ))}
      </div>
    );
  }
  if (media.length === 3) {
    return (
      <div className={`${wrap} grid aspect-[16/10] grid-cols-2 grid-rows-2 gap-0.5`}>
        <Tile m={media[0]} className="row-span-2" />
        <Tile m={media[1]} />
        <Tile m={media[2]} />
      </div>
    );
  }
  return (
    <div className={`${wrap} grid aspect-[16/10] grid-cols-2 grid-rows-2 gap-0.5`}>
      {media.slice(0, 4).map((m) => (
        <Tile key={m.id} m={m} />
      ))}
    </div>
  );
}
