import { avatarColors, initials } from "@/lib/colors";

type AvatarUser = { username: string; displayName: string; avatarUrl: string | null };

export function Avatar({ user, size = 44, className = "" }: { user: AvatarUser; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={style}
        loading="lazy"
        className={`shrink-0 rounded-full bg-surface-3 object-cover ${className}`}
      />
    );
  }
  const { from, to } = avatarColors(user.username);
  return (
    <span
      aria-hidden="true"
      style={{ ...style, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: Math.max(10, size * 0.36) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold text-white ${className}`}
    >
      {initials(user.displayName || user.username)}
    </span>
  );
}
