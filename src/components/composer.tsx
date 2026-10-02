"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, TriangleAlert, X } from "lucide-react";
import { createPostAction } from "@/app/actions/posts";
import { LIMITS } from "@/lib/limits";
import { Avatar } from "./avatar";

type Attachment = { id: string; file: File; url: string; alt: string };

type Props = {
  viewer: { username: string; displayName: string; avatarUrl: string | null };
  replyToId?: string;
  quoteOfId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** After posting, open the new post (used by /compose). Otherwise stay and refresh. */
  openAfterPost?: boolean;
  /** Server-rendered preview of the quoted post. */
  children?: React.ReactNode;
  submitLabel?: string;
};

const segmenter = typeof Intl !== "undefined" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
function graphemes(text: string) {
  if (!segmenter) return text.length;
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

function CharRing({ count }: { count: number }) {
  const left = LIMITS.postChars - count;
  const r = 10;
  const c = 2 * Math.PI * r;
  const progress = Math.min(count / LIMITS.postChars, 1);
  const color = left < 0 ? "var(--danger)" : left <= 20 ? "var(--warn)" : "var(--accent)";
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      {left <= 20 ? <span className="text-sm font-semibold tabular-nums" style={{ color }}>{left}</span> : null}
      <svg width="26" height="26" viewBox="0 0 26 26" className="-rotate-90">
        <circle cx="13" cy="13" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="2.5" />
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function Composer({
  viewer,
  replyToId,
  quoteOfId,
  placeholder = "What's going on?",
  autoFocus = false,
  openAfterPost = false,
  children,
  submitLabel,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [cw, setCw] = useState<string | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(autoFocus);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const count = useMemo(() => graphemes(body.trim()), [body]);
  const over = count > LIMITS.postChars;
  const canPost = !pending && !over && (body.trim().length > 0 || files.length > 0);
  const expanded = focused || body.length > 0 || files.length > 0 || cw !== null || !!quoteOfId;

  // Free preview object URLs if the composer unmounts with attachments still in it.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`;
  }, [body]);

  function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    const room = LIMITS.mediaPerPost - files.length;
    if (incoming.length > room) setError(`Up to ${LIMITS.mediaPerPost} photos per post.`);
    const accepted: Attachment[] = [];
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      if (file.size > LIMITS.mediaBytes) {
        setError(`${file.name} is over ${LIMITS.mediaBytes / 1024 / 1024} MB.`);
        continue;
      }
      accepted.push({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file), alt: "" });
    }
    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const gone = prev.find((f) => f.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((f) => f.id !== id);
    });
  }

  function submit() {
    if (!canPost) return;
    setError(null);
    const fd = new FormData();
    fd.set("body", body);
    if (cw) fd.set("contentWarning", cw);
    if (replyToId) fd.set("replyToId", replyToId);
    if (quoteOfId) fd.set("quoteOfId", quoteOfId);
    for (const f of files) {
      fd.append("media", f.file);
      fd.append("alt", f.alt);
    }
    startTransition(async () => {
      const res = await createPostAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setBody("");
      setCw(null);
      setFiles([]);
      if (openAfterPost) router.push(`/p/${res.postId}`);
    });
  }

  return (
    <form
      className={`relative flex gap-3 px-4 pt-3 pb-2 ${dragging ? "bg-accent-soft/50" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <Avatar user={viewer} size={44} className="mt-1" />
      <div className="min-w-0 flex-1">
        {cw !== null ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2">
            <TriangleAlert size={16} className="shrink-0 text-warn" />
            <input
              value={cw}
              onChange={(e) => setCw(e.target.value)}
              maxLength={LIMITS.contentWarningChars}
              placeholder="Content warning (e.g. spoilers, gore, flashing lights)"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted"
              aria-label="Content warning"
            />
            <button type="button" onClick={() => setCw(null)} className="text-muted hover:text-ink" aria-label="Remove content warning">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <textarea
          ref={textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setFocused(true)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          autoFocus={autoFocus}
          rows={expanded ? 3 : 1}
          placeholder={placeholder}
          aria-label="Post text"
          className="block w-full resize-none bg-transparent py-2 text-[19px] leading-7 outline-none placeholder:text-muted"
        />

        {files.length ? (
          <div className={`mt-2 grid gap-2 ${files.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {files.map((f, i) => (
              <div key={f.id} className="overflow-hidden rounded-2xl border border-line bg-surface-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className={`w-full object-cover ${files.length === 1 ? "max-h-[420px]" : "aspect-square"}`} />
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black/85"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={f.alt}
                  onChange={(e) => setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, alt: e.target.value } : p)))}
                  maxLength={LIMITS.altTextChars}
                  placeholder="Describe this image (alt text)"
                  className="w-full border-t border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
                  aria-label={`Alt text for image ${i + 1}`}
                />
              </div>
            ))}
          </div>
        ) : null}

        {children ? <div className="mt-1">{children}</div> : null}

        {error ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        {expanded ? (
          <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= LIMITS.mediaPerPost}
              className="rounded-full p-2 text-accent hover:bg-accent-soft disabled:opacity-40"
              aria-label="Add photos"
              title="Add photos"
            >
              <ImagePlus size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCw((v) => (v === null ? "" : null))}
              className={`rounded-full p-2 hover:bg-accent-soft ${cw !== null ? "bg-accent-soft text-accent" : "text-accent"}`}
              aria-label="Add content warning"
              title="Content warning"
            >
              <TriangleAlert size={20} />
            </button>
            <div className="ml-auto flex items-center gap-3">
              <CharRing count={count} />
              <button type="submit" disabled={!canPost} className="btn-primary px-5">
                {pending ? "Posting…" : (submitLabel ?? (replyToId ? "Reply" : "Post"))}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
