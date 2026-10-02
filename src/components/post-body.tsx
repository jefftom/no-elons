import Link from "next/link";
import { tokenize } from "@/lib/text";

/** Renders post text from tokens — never as HTML — so user content can't inject markup. */
export function PostBody({ body, className = "" }: { body: string; className?: string }) {
  if (!body) return null;
  return (
    <div className={`post-text ${className}`}>
      {tokenize(body).map((t, i) => {
        switch (t.type) {
          case "text":
            return <span key={i}>{t.value}</span>;
          case "link":
            return (
              <a key={i} href={t.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="link pointer-events-auto relative">
                {t.display}
              </a>
            );
          case "hashtag":
            return (
              <Link key={i} href={`/tags/${encodeURIComponent(t.tag)}`} className="link pointer-events-auto relative">
                {t.value}
              </Link>
            );
          case "mention":
            return (
              <Link key={i} href={`/@${t.username}`} className="link pointer-events-auto relative">
                {t.value}
              </Link>
            );
        }
      })}
    </div>
  );
}
