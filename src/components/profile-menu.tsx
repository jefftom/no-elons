"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Ban, Flag, MoreHorizontal, Rss, Shield, Volume2, VolumeX } from "lucide-react";
import { blockAction, muteAction } from "@/app/actions/social";

export function ProfileMenu({
  userId,
  username,
  muting,
  blocking,
  signedIn,
  isModerator,
}: {
  userId: string;
  username: string;
  muting: boolean;
  blocking: boolean;
  signedIn: boolean;
  isModerator: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function run(confirmText: string | null, fn: () => Promise<{ ok: boolean; error?: string }>) {
    if (confirmText && !window.confirm(confirmText)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) alert(res.error);
    });
  }

  const item = "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold hover:bg-surface-2";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="btn-outline size-10 p-0"
        aria-label="More"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
          <a href={`/@${username}/rss`} className={item}>
            <Rss size={16} /> RSS feed
          </a>
          {signedIn ? (
            <>
              <button type="button" className={item} onClick={() => run(null, () => muteAction(userId, !muting))}>
                {muting ? <Volume2 size={16} /> : <VolumeX size={16} />} {muting ? "Unmute" : "Mute"} @{username}
              </button>
              <button
                type="button"
                className={item}
                onClick={() =>
                  run(
                    blocking ? null : `Block @${username}? Neither of you will see the other, and follows are removed.`,
                    () => blockAction(userId, !blocking),
                  )
                }
              >
                <Ban size={16} /> {blocking ? "Unblock" : "Block"} @{username}
              </button>
              <Link href={`/report?user=${userId}`} className={`${item} text-danger`}>
                <Flag size={16} /> Report @{username}
              </Link>
            </>
          ) : null}
          {isModerator ? (
            <Link href={`/admin/user/${username}`} className={item}>
              <Shield size={16} /> Moderate account
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
