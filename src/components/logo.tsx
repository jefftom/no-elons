/**
 * The mark: a stop sign. Social media, minus the one guy.
 *
 * The small mark spells "NO" with strokes (not text) so it renders identically
 * as a favicon and at 16px. <StopSign label="NO ELONS"> is the big hero version.
 */

const OUTER = "58.33,42.91 42.91,58.33 21.09,58.33 5.67,42.91 5.67,21.09 21.09,5.67 42.91,5.67 58.33,21.09";
const INNER = "54.73,41.41 41.41,54.73 22.59,54.73 9.27,41.41 9.27,22.59 22.59,9.27 41.41,9.27 54.73,22.59";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <polygon points={OUTER} fill="var(--stop)" stroke="var(--stop)" strokeWidth="7" strokeLinejoin="round" />
      <polygon points={INNER} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16.5 40.5V23.5L27.5 40.5V23.5" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="40.5" cy="32" rx="6.6" ry="8.5" fill="none" stroke="#fff" strokeWidth="4.6" />
    </svg>
  );
}

export function Logo({ className = "", mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark ? <LogoMark /> : null}
      <span className="font-display text-[22px] font-black tracking-tight">
        no<span className="text-stop">elons</span>
      </span>
    </span>
  );
}

const BIG_OUTER = "237.02,173.16 173.16,237.02 82.84,237.02 18.98,173.16 18.98,82.84 82.84,18.98 173.16,18.98 237.02,82.84";
const BIG_INNER = "224.08,167.80 167.80,224.08 88.20,224.08 31.92,167.80 31.92,88.20 88.20,31.92 167.80,31.92 224.08,88.20";

/** A full-size stop sign reading "NO ELONS" — for the landing page and other big moments. */
export function StopSign({ className = "size-40", title = "NO ELONS" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} role="img" aria-label={`Stop sign: ${title}`}>
      <title>{title}</title>
      <polygon points={BIG_OUTER} fill="var(--stop)" stroke="var(--stop)" strokeWidth="20" strokeLinejoin="round" />
      <polygon points={BIG_INNER} fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      {/* textLength pins the width so the words fit inside the border whatever font the system substitutes. */}
      <text
        x="128"
        y="121"
        textAnchor="middle"
        fill="#fff"
        fontFamily="'Helvetica Neue', Arial, ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="80"
        textLength="112"
        lengthAdjust="spacingAndGlyphs"
      >
        NO
      </text>
      <text
        x="128"
        y="178"
        textAnchor="middle"
        fill="#fff"
        fontFamily="'Helvetica Neue', Arial, ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="47"
        textLength="138"
        lengthAdjust="spacingAndGlyphs"
      >
        ELONS
      </text>
    </svg>
  );
}
