/**
 * Tiny generative-art kit for demo content. Every scene is a deterministic
 * SVG (seeded PRNG) rasterised by sharp, so the seed data needs no network
 * and no stock photos — and it looks like a real photo grid.
 */
import sharp from "sharp";

export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)].map((v) => Math.round(v).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
}

const SKIES = [
  ["#1d2b64", "#f8cdda", "#ffd6a5"], // dawn
  ["#0f2027", "#2c5364", "#f7b267"], // dusk teal
  ["#ff7e5f", "#feb47b", "#ffe8c2"], // sunset
  ["#355c7d", "#6c5b7b", "#c06c84"], // violet hour
  ["#4facfe", "#9be7ff", "#e0f7ff"], // clear day
  ["#232526", "#414345", "#a8a8a8"], // overcast
  ["#41295a", "#2f0743", "#f39c12"], // magenta night
];

function ridge(r: Rng, w: number, base: number, amp: number, steps = 28): string {
  const pts: string[] = [`0,${base}`];
  let y = base;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    y = base - amp * (0.35 + 0.65 * Math.abs(Math.sin(i * (0.4 + r() * 0.5) + r() * 3))) - r() * amp * 0.25;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function skyDefs(id: string, colors: string[]) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    ${colors.map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`).join("")}
  </linearGradient>`;
}

export function mountains(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const sky = pick(r, SKIES);
  const sunX = lerp(w * 0.2, w * 0.8, r());
  const sunY = lerp(h * 0.25, h * 0.5, r());
  const layers = 4;
  let shapes = "";
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const base = lerp(h * 0.55, h * 0.95, t);
    const color = mix(mix(sky[1], "#1a1a2e", 0.35), "#0b0b14", t * 0.85);
    shapes += `<polygon points="${ridge(r, w, base, lerp(h * 0.28, h * 0.12, t))} ${w},${h} 0,${h}" fill="${color}" opacity="${0.92 + t * 0.08}"/>`;
    if (i < layers - 1) shapes += `<rect x="0" y="${base - h * 0.08}" width="${w}" height="${h * 0.16}" fill="url(#mist)" opacity="0.35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${skyDefs("sky", sky)}
    <radialGradient id="glow"><stop offset="0%" stop-color="#fff6d5" stop-opacity="0.95"/><stop offset="100%" stop-color="#fff6d5" stop-opacity="0"/></radialGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="50%" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.28}" fill="url(#glow)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.06}" fill="#fff4cf"/>
  ${shapes}
</svg>`;
}

export function ocean(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const sky = pick(r, SKIES);
  const horizon = lerp(h * 0.5, h * 0.62, r());
  const sunX = lerp(w * 0.3, w * 0.7, r());
  let streaks = "";
  for (let i = 0; i < 60; i++) {
    const y = lerp(horizon + 6, h, Math.pow(r(), 1.6));
    const spread = (y - horizon) / (h - horizon);
    const len = lerp(20, 220, spread) * (0.4 + r());
    const x = sunX + (r() - 0.5) * lerp(40, w * 0.5, spread);
    streaks += `<rect x="${x - len / 2}" y="${y}" width="${len}" height="${lerp(1.5, 5, spread)}" rx="2" fill="#fff3d1" opacity="${lerp(0.75, 0.15, spread) * r()}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${skyDefs("sky", sky)}${skyDefs("sea", [mix(sky[2], "#0a2540", 0.55), "#06142b"])}
    <radialGradient id="glow"><stop offset="0%" stop-color="#fff2c4" stop-opacity="0.9"/><stop offset="100%" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="${horizon}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${horizon - h * 0.04}" r="${h * 0.3}" fill="url(#glow)"/>
  <circle cx="${sunX}" cy="${horizon - h * 0.02}" r="${h * 0.055}" fill="#fff1c1"/>
  <rect y="${horizon}" width="100%" height="${h - horizon}" fill="url(#sea)"/>
  ${streaks}
</svg>`;
}

export function night(seed: number, w = 1200, h = 1500): string {
  const r = rng(seed);
  let stars = "";
  for (let i = 0; i < 380; i++) {
    stars += `<circle cx="${r() * w}" cy="${Math.pow(r(), 1.4) * h * 0.75}" r="${r() < 0.95 ? r() * 1.6 + 0.3 : 2.4}" fill="#fff" opacity="${0.3 + r() * 0.7}"/>`;
  }
  const moonX = lerp(w * 0.2, w * 0.8, r());
  let trees = "";
  for (let x = -20; x < w + 40; x += 18 + r() * 26) {
    const th = lerp(h * 0.08, h * 0.22, r());
    const base = h * 0.86 + r() * 20;
    trees += `<polygon points="${x},${base} ${x + th * 0.22},${base - th} ${x + th * 0.44},${base}" fill="#05060d"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${skyDefs("sky", ["#02030a", "#0b1640", pick(r, ["#2c3e7a", "#3a2a6b", "#1f4f6b"])])}
    <radialGradient id="mg"><stop offset="0%" stop-color="#e8f0ff" stop-opacity="0.6"/><stop offset="100%" stop-color="#e8f0ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  ${stars}
  <circle cx="${moonX}" cy="${h * 0.22}" r="${w * 0.22}" fill="url(#mg)"/>
  <circle cx="${moonX}" cy="${h * 0.22}" r="${w * 0.06}" fill="#f4f1e8"/>
  <circle cx="${moonX + w * 0.02}" cy="${h * 0.21}" r="${w * 0.012}" fill="#dcd6c4"/>
  <circle cx="${moonX - w * 0.018}" cy="${h * 0.232}" r="${w * 0.008}" fill="#dcd6c4"/>
  <polygon points="${ridge(r, w, h * 0.88, h * 0.08)} ${w},${h} 0,${h}" fill="#070912"/>
  ${trees}
  <rect y="${h * 0.9}" width="100%" height="${h * 0.1}" fill="#04050a"/>
</svg>`;
}

export function city(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const sky = pick(r, [SKIES[1], SKIES[3], SKIES[6], SKIES[2]]);
  const waterline = h * 0.72;
  let buildings = "";
  let reflections = "";
  for (let x = 0; x < w; ) {
    const bw = lerp(40, 120, r());
    const bh = lerp(h * 0.12, h * 0.55, Math.pow(r(), 1.3));
    const y = waterline - bh;
    const shade = mix("#0e1020", "#2a2440", r() * 0.6);
    buildings += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${shade}"/>`;
    reflections += `<rect x="${x}" y="${waterline}" width="${bw}" height="${bh * 0.6}" fill="${shade}" opacity="0.35"/>`;
    for (let wy = y + 10; wy < waterline - 10; wy += 16) {
      for (let wx = x + 7; wx < x + bw - 10; wx += 14) {
        if (r() < 0.34) buildings += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="${pick(r, ["#ffd27a", "#ffe9b0", "#9ad1ff"])}" opacity="${0.6 + r() * 0.4}"/>`;
      }
    }
    x += bw + lerp(2, 10, r());
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${skyDefs("sky", sky)}${skyDefs("water", ["#151a33", "#05070f"])}</defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  ${buildings}
  <rect y="${waterline}" width="100%" height="${h - waterline}" fill="url(#water)"/>
  ${reflections}
</svg>`;
}

export function dunes(seed: number, w = 1350, h = 1350): string {
  const r = rng(seed);
  const tones = pick(r, [
    ["#f6d365", "#e2a35a", "#b86b3c", "#7a3e2b"],
    ["#fbe3c5", "#e9b384", "#c97b4b", "#8c4a32"],
    ["#ffd1a9", "#f29e7a", "#d0695b", "#7c3a4f"],
  ]);
  let layers = "";
  for (let i = 0; i < 4; i++) {
    const base = lerp(h * 0.5, h * 0.9, i / 3);
    const c1 = lerp(-0.2, 0.3, r()) * w;
    const c2 = lerp(0.6, 1.2, r()) * w;
    layers += `<path d="M0 ${base} C ${c1} ${base - h * 0.25}, ${c2} ${base + h * 0.15}, ${w} ${base - h * 0.1} L ${w} ${h} L 0 ${h} Z" fill="${tones[i]}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${skyDefs("sky", ["#8ec5fc", "#e0c3fc", "#fde2c4"])}</defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  <circle cx="${lerp(w * 0.2, w * 0.8, r())}" cy="${h * 0.28}" r="${w * 0.07}" fill="#fff6e0"/>
  ${layers}
</svg>`;
}

export function forest(seed: number, w = 1200, h = 1500): string {
  const r = rng(seed);
  const base = pick(r, ["#cfe3dc", "#d9e4f5", "#e8e0d0"]);
  let rows = "";
  for (let row = 0; row < 5; row++) {
    const t = row / 4;
    const color = mix(mix(base, "#2d4a3e", 0.35), "#0d1a14", t);
    const ground = lerp(h * 0.55, h * 1.02, t);
    for (let x = -30; x < w + 30; x += lerp(30, 60, r()) * (1 + t)) {
      const th = lerp(h * 0.12, h * 0.3, r()) * (0.6 + t * 0.8);
      const tw = th * 0.32;
      rows += `<polygon points="${x},${ground} ${x + tw / 2},${ground - th} ${x + tw},${ground}" fill="${color}"/>`;
    }
    rows += `<rect y="${ground - 4}" width="${w}" height="${h - ground + 4}" fill="${color}"/>`;
    rows += `<rect y="${ground - h * 0.1}" width="${w}" height="${h * 0.12}" fill="${base}" opacity="${0.25 * (1 - t)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${base}"/>
  ${rows}
</svg>`;
}

export function bokeh(seed: number, w = 1350, h = 1350): string {
  const r = rng(seed);
  const hues = pick(r, [
    ["#ffb347", "#ff6f61", "#ffd700"],
    ["#7f7fd5", "#86a8e7", "#91eae4"],
    ["#f857a6", "#ff5858", "#ffc371"],
  ]);
  let dots = "";
  for (let i = 0; i < 70; i++) {
    dots += `<circle cx="${r() * w}" cy="${r() * h}" r="${lerp(20, 110, Math.pow(r(), 2))}" fill="${pick(r, hues)}" opacity="${0.15 + r() * 0.5}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs>
  <rect width="100%" height="100%" fill="#0d0b12"/>
  <g filter="url(#b)">${dots}</g>
</svg>`;
}

export function sketch(seed: number, w = 1200, h = 1500): string {
  const r = rng(seed);
  const inks = ["#ff5a3c", "#1f3c88", "#f2b134", "#0f9f6e", "#18141d"];
  let shapes = "";
  for (let i = 0; i < 9; i++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = lerp(60, 260, r());
    const c = pick(r, inks);
    shapes +=
      r() < 0.5
        ? `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${c}" opacity="0.85"/>`
        : `<rect x="${cx - rad}" y="${cy - rad / 2}" width="${rad * 2}" height="${rad}" rx="${rad * 0.2}" fill="${c}" opacity="0.85" transform="rotate(${lerp(-25, 25, r())} ${cx} ${cy})"/>`;
  }
  let lines = "";
  for (let i = 0; i < 14; i++) {
    lines += `<path d="M${r() * w} ${r() * h} Q ${r() * w} ${r() * h} ${r() * w} ${r() * h}" stroke="#18141d" stroke-width="${lerp(2, 6, r())}" fill="none" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#f6f0e6"/>
  ${shapes}${lines}
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#18141d" stroke-width="3"/>
</svg>`;
}

export function avatarArt(seed: number): string {
  const r = rng(seed);
  const pal = pick(r, [
    ["#ff5a3c", "#ffb199", "#18141d"],
    ["#2f80ed", "#8fc1ff", "#0b1d3a"],
    ["#0f9f6e", "#7ee2bd", "#0b2b20"],
    ["#a855f7", "#e9d5ff", "#2a1144"],
    ["#f59e0b", "#fde68a", "#3b2506"],
    ["#ec4899", "#fbcfe8", "#3b0a22"],
  ]);
  const s = 400;
  let rings = "";
  for (let i = 0; i < 5; i++) {
    rings += `<circle cx="${lerp(120, 280, r())}" cy="${lerp(120, 280, r())}" r="${lerp(40, 170, r())}" fill="${pick(r, pal)}" opacity="${0.55 + r() * 0.45}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="100%" height="100%" fill="${pal[1]}"/>${rings}
</svg>`;
}

export const SCENES = { mountains, ocean, night, city, dunes, forest, bokeh, sketch } as const;
export type SceneName = keyof typeof SCENES;

/** Rasterise an SVG scene to a JPEG buffer, as if it came off a phone. */
export async function render(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}
