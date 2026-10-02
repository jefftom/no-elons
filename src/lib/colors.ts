/** Deterministic, pleasant colours for avatar/banner fallbacks. */

const PALETTE = [
  ["#ff6b4a", "#ffb199"],
  ["#2f80ed", "#8fc1ff"],
  ["#10b981", "#7ee2bd"],
  ["#a855f7", "#d9b3ff"],
  ["#f59e0b", "#fcd77f"],
  ["#ec4899", "#f9a8d4"],
  ["#14b8a6", "#99f0e3"],
  ["#6366f1", "#b4b6fb"],
] as const;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarColors(seed: string): { from: string; to: string } {
  const [from, to] = PALETTE[hash(seed) % PALETTE.length];
  return { from, to };
}

export function bannerGradient(seed: string): string {
  const a = PALETTE[hash(seed) % PALETTE.length];
  const b = PALETTE[hash(`${seed}!`) % PALETTE.length];
  return `linear-gradient(135deg, ${a[0]} 0%, ${b[1]} 55%, ${a[1]} 100%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}
