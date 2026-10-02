"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { followAction } from "@/app/actions/social";

export function FollowButton({
  userId,
  following,
  signedIn,
  size = "md",
}: {
  userId: string;
  following: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [isFollowing, setFollowing] = useState(following);
  const [hover, setHover] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !isFollowing;
    setFollowing(next);
    startTransition(async () => {
      const res = await followAction(userId, next);
      if (!res.ok) {
        setFollowing(!next);
        if (res.error) alert(res.error);
      }
    });
  }

  const pad = size === "sm" ? "px-3.5 py-1.5" : "px-4 py-2";
  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`btn-outline pointer-events-auto relative min-w-[104px] ${pad} hover:border-danger/40 hover:bg-danger/10 hover:text-danger`}
      >
        {hover ? "Unfollow" : "Following"}
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} disabled={pending} className={`btn-ink pointer-events-auto relative ${pad}`}>
      Follow
    </button>
  );
}
