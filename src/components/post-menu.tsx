"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Ban, Flag, Link2, MoreHorizontal, Pencil, Pin, PinOff, Shield, Trash2, VolumeX } from "lucide-react";
import { deletePostAction, pinPostAction } from "@/app/actions/posts";
import { blockAction, muteAction } from "@/app/actions/social";

type Props = {
  postId: string;
  authorId: string;
  authorUsername: string;
  isOwn: boolean;
  canEdit: boolean;
  isPinned: boolean;
  signedIn: boolean;
  isModerator: boolean;
};

export function PostMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function run(confirmText: string | null, action: () => Promise<{ ok: boolean; error?: string }>) {
    if (confirmText && !window.confirm(confirmText)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await action();
      if (!res.ok && res.error) alert(res.error);
    });
  }

  const item = "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold hover:bg-surface-2";

  return (
    <div className="pointer-events-auto relative ml-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="-m-1.5 rounded-full p-1.5 text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"
        aria-label="More options"
        aria-expanded={open}
        disabled={pending}
      >
        <MoreHorizontal size={18} />
      </button>
      {open ? (
        <div className="absolute right-0 top-7 z-30 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
          {props.isOwn ? (
            <>
              {props.canEdit ? (
                <Link href={`/p/${props.postId}/edit`} className={item}>
                  <Pencil size={16} /> Edit post
                </Link>
              ) : null}
              <button type="button" className={item} onClick={() => run(null, () => pinPostAction(props.postId, !props.isPinned))}>
                {props.isPinned ? <PinOff size={16} /> : <Pin size={16} />} {props.isPinned ? "Unpin from profile" : "Pin to profile"}
              </button>
              <button
                type="button"
                className={`${item} text-danger`}
                onClick={() => run("Delete this post? This can't be undone.", () => deletePostAction(props.postId))}
              >
                <Trash2 size={16} /> Delete post
              </button>
            </>
          ) : props.signedIn ? (
            <>
              <button
                type="button"
                className={item}
                onClick={() => run(`Mute @${props.authorUsername}? You won't see their posts. They won't know.`, () => muteAction(props.authorId, true))}
              >
                <VolumeX size={16} /> Mute @{props.authorUsername}
              </button>
              <button
                type="button"
                className={item}
                onClick={() =>
                  run(`Block @${props.authorUsername}? Neither of you will see the other, and any follows are removed.`, () =>
                    blockAction(props.authorId, true),
                  )
                }
              >
                <Ban size={16} /> Block @{props.authorUsername}
              </button>
              <Link href={`/report?post=${props.postId}`} className={`${item} text-danger`}>
                <Flag size={16} /> Report post
              </Link>
            </>
          ) : null}
          <button
            type="button"
            className={item}
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/p/${props.postId}`);
              setOpen(false);
            }}
          >
            <Link2 size={16} /> Copy link
          </button>
          {props.isModerator ? (
            <Link href={`/admin/post/${props.postId}`} className={item}>
              <Shield size={16} /> Moderate
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
