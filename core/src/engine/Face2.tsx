import React from "react";

/** Expressive face for the big-head hero. All numbers are in units of the head radius r.
 *  brow = [innerY, outerY] relative to the eye line (negative = up). lid: 1 = open dot, 0.35 = heavy lid, 0 = closed. */
type Ex = { brow: [number, number]; lid: number; mouth: string; extra?: string[]; wide?: boolean; arcs?: "u" | "n" };
export const EXPRS: Record<string, Ex> = {
  neutral: { brow: [-0.3, -0.3], lid: 0.78, mouth: "flat" },
  flat: { brow: [-0.3, -0.3], lid: 0.78, mouth: "flat" },
  smile: { brow: [-0.36, -0.3], lid: 1, mouth: "smile" },
  grin: { brow: [-0.4, -0.32], lid: 1, mouth: "grin" },
  smirk: { brow: [-0.26, -0.4], lid: 0.8, mouth: "smirk" },
  proud: { brow: [-0.34, -0.34], lid: 0.62, mouth: "smirk", extra: ["blush"] },
  sad: { brow: [-0.5, -0.2], lid: 0.8, mouth: "frown" },
  cry: { brow: [-0.54, -0.18], lid: 0.7, mouth: "wobble", extra: ["tear"] },
  worry: { brow: [-0.52, -0.24], lid: 1, mouth: "wobble", extra: ["sweat"] },
  angry: { brow: [-0.14, -0.46], lid: 0.8, mouth: "gritted" },
  determined: { brow: [-0.18, -0.42], lid: 0.85, mouth: "smirkSmall" },
  shock: { brow: [-0.6, -0.6], lid: 1, mouth: "o", wide: true },
  scream: { brow: [-0.52, -0.46], lid: 1, mouth: "scream", wide: true },
  tired: { brow: [-0.3, -0.24], lid: 0.34, mouth: "flatSmall", extra: ["bags"] },
  empty: { brow: [-0.32, -0.28], lid: 0.45, mouth: "flatSmall" },
  sleep: { brow: [-0.3, -0.3], lid: 0, mouth: "tiny", arcs: "u" },
  laugh: { brow: [-0.4, -0.36], lid: 0, mouth: "laugh", arcs: "n" },
  think: { brow: [-0.2, -0.46], lid: 0.8, mouth: "flatSmall" },
};
// old face names -> expressive equivalents
const ALIAS: Record<string, string> = { open: "laugh", sad: "sad", shock: "shock", worry: "worry", smile: "smile", flat: "neutral", think: "think", sleep: "sleep" };
export const exOf = (name: string): Ex => EXPRS[name] ?? EXPRS[ALIAS[name]] ?? EXPRS.neutral;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Mouth: React.FC<{ kind: string; cx: number; cy: number; r: number; ink: string; alpha: number }> = ({ kind, cx, cy, r, ink, alpha }) => {
  const w = 0.44 * r, y = cy + 0.46 * r, sw = Math.max(3, r * 0.085);
  const P = (d: string, fill = "none", extra: any = {}) => <path d={d} stroke={ink} strokeWidth={sw} fill={fill} strokeLinecap="round" strokeLinejoin="round" opacity={alpha} {...extra} />;
  switch (kind) {
    case "flat": return P(`M${cx - w / 2} ${y} L${cx + w / 2} ${y}`);
    case "flatSmall": return P(`M${cx - w * 0.32} ${y} L${cx + w * 0.32} ${y}`);
    case "smile": return P(`M${cx - w * 0.6} ${y - 0.04 * r} Q${cx} ${y + 0.3 * r} ${cx + w * 0.6} ${y - 0.04 * r}`);
    case "tiny": return P(`M${cx - w * 0.25} ${y} Q${cx} ${y + 0.1 * r} ${cx + w * 0.25} ${y}`);
    case "grin": return (
      <g opacity={alpha}>
        <path d={`M${cx - w * 0.7} ${y - 0.06 * r} Q${cx} ${y + 0.5 * r} ${cx + w * 0.7} ${y - 0.06 * r} Z`} fill={ink} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        <path d={`M${cx - w * 0.55} ${y - 0.03 * r} L${cx + w * 0.55} ${y - 0.03 * r}`} stroke="#f2eee3" strokeWidth={sw * 1.1} strokeLinecap="round" />
      </g>
    );
    case "smirk": return P(`M${cx - w * 0.5} ${y + 0.04 * r} Q${cx + w * 0.1} ${y + 0.12 * r} ${cx + w * 0.6} ${y - 0.12 * r}`);
    case "smirkSmall": return P(`M${cx - w * 0.38} ${y + 0.02 * r} Q${cx + w * 0.1} ${y + 0.08 * r} ${cx + w * 0.44} ${y - 0.07 * r}`);
    case "frown": return P(`M${cx - w * 0.5} ${y + 0.1 * r} Q${cx} ${y - 0.16 * r} ${cx + w * 0.5} ${y + 0.1 * r}`);
    case "wobble": return P(`M${cx - w * 0.55} ${y + 0.04 * r} q ${w * 0.18} ${-0.14 * r} ${w * 0.37} 0 t ${w * 0.37} 0 t ${w * 0.37} 0`);
    case "gritted": return (
      <g opacity={alpha}>
        <rect x={cx - w * 0.6} y={y - 0.1 * r} width={w * 1.2} height={0.24 * r} rx={0.06 * r} fill="#f2eee3" stroke={ink} strokeWidth={sw * 0.9} />
        {[-0.3, 0, 0.3].map((k) => <path key={k} d={`M${cx + w * k} ${y - 0.1 * r} v ${0.24 * r}`} stroke={ink} strokeWidth={sw * 0.5} />)}
        <path d={`M${cx - w * 0.6} ${y + 0.02 * r} h ${w * 1.2}`} stroke={ink} strokeWidth={sw * 0.5} />
      </g>
    );
    case "o": return <ellipse cx={cx} cy={y + 0.05 * r} rx={0.1 * r} ry={0.13 * r} fill={ink} opacity={alpha} />;
    case "scream": return (
      <g opacity={alpha}>
        <ellipse cx={cx} cy={y + 0.12 * r} rx={0.22 * r} ry={0.3 * r} fill={ink} />
        <ellipse cx={cx} cy={y + 0.26 * r} rx={0.13 * r} ry={0.1 * r} fill="#c9524a" />
      </g>
    );
    case "laugh": return (
      <g opacity={alpha}>
        <path d={`M${cx - w * 0.62} ${y - 0.06 * r} Q${cx} ${y + 0.62 * r} ${cx + w * 0.62} ${y - 0.06 * r} Z`} fill={ink} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        <path d={`M${cx - w * 0.4} ${y + 0.12 * r} Q${cx} ${y + 0.34 * r} ${cx + w * 0.4} ${y + 0.12 * r}`} stroke="#c9524a" strokeWidth={sw * 1.4} fill="none" strokeLinecap="round" />
      </g>
    );
    default: return P(`M${cx - w / 2} ${y} L${cx + w / 2} ${y}`);
  }
};

export const Face2: React.FC<{
  cx: number; cy: number; r: number; expr: string; prev?: string; blend?: number; look?: [number, number]; f: number; ink: string; fill: string;
}> = ({ cx, cy, r, expr, prev, blend = 1, look = [0, 0], f, ink, fill }) => {
  const a = exOf(expr), b = prev ? exOf(prev) : a;
  const t = prev ? Math.min(1, Math.max(0, blend)) : 1;
  const brow: [number, number] = [lerp(b.brow[0], a.brow[0], t), lerp(b.brow[1], a.brow[1], t)];
  let lid = lerp(b.lid, a.lid, t);
  const blinkPhase = f % 104;
  if (a.lid > 0.5 && blinkPhase > 99) lid = 0.05;
  const ey = cy - 0.06 * r, ex = 0.38 * r, dot = 0.1 * r, sw = Math.max(3, r * 0.08);
  const lx = look[0] * r * 0.09, ly = look[1] * r * 0.07;
  const eye = (sx: number, side: number) => {
    const x = cx + side * ex;
    if (a.arcs === "u") return <path key={side} d={`M${x - 0.14 * r} ${ey} q ${0.14 * r} ${0.14 * r} ${0.28 * r} 0`} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    if (a.arcs === "n") return <path key={side} d={`M${x - 0.14 * r} ${ey + 0.05 * r} q ${0.14 * r} ${-0.18 * r} ${0.28 * r} 0`} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    if (a.wide) return (
      <g key={side}>
        <circle cx={x} cy={ey} r={0.19 * r} fill="#fbf8ef" stroke={ink} strokeWidth={sw * 0.7} />
        <circle cx={x + lx} cy={ey + ly} r={0.065 * r} fill={ink} />
      </g>
    );
    if (lid < 0.12) return <path key={side} d={`M${x - 0.13 * r} ${ey} l ${0.26 * r} 0`} stroke={ink} strokeWidth={sw} strokeLinecap="round" />;
    return (
      <g key={side}>
        <ellipse cx={x + lx} cy={ey + ly} rx={dot} ry={dot * Math.max(0.5, lid)} fill={ink} />
        {lid < 0.95 && <path d={`M${x - 0.17 * r} ${ey - dot * lid * 0.7} L${x + 0.17 * r} ${ey - dot * lid * 0.7}`} stroke={ink} strokeWidth={sw * 0.8} strokeLinecap="round" />}
      </g>
    );
  };
  const brw = (side: number) => {
    const x0 = cx + side * 0.12 * r, x1 = cx + side * 0.6 * r;
    const y0 = ey + brow[0] * r, y1 = ey + brow[1] * r;
    return <path key={side} d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) - 0.05 * r} ${x1} ${y1}`} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" />;
  };
  const extras = new Set([...(a.extra ?? [])]);
  const tearT = ((f % 70) / 70);
  return (
    <g>
      {extras.has("blush") && [-1, 1].map((s) => <ellipse key={s} cx={cx + s * 0.62 * r} cy={cy + 0.3 * r} rx={0.15 * r} ry={0.09 * r} fill="#e8553d" opacity={0.35} />)}
      {extras.has("bags") && [-1, 1].map((s) => <path key={s} d={`M${cx + s * ex - 0.14 * r} ${ey + 0.22 * r} q ${0.14 * r} ${0.1 * r} ${0.28 * r} 0`} stroke={ink} strokeWidth={sw * 0.55} fill="none" opacity={0.6} strokeLinecap="round" />)}
      {brw(-1)}{brw(1)}
      {eye(0, -1)}{eye(0, 1)}
      {prev && t < 1 && <Mouth kind={b.mouth} cx={cx} cy={cy} r={r} ink={ink} alpha={1 - t} />}
      <Mouth kind={a.mouth} cx={cx} cy={cy} r={r} ink={ink} alpha={prev ? t : 1} />
      {extras.has("tear") && [-1].map((s) => (
        <path key={s} d={`M${cx + s * ex} ${ey + 0.16 * r + tearT * 0.8 * r} q ${0.07 * r} ${0.12 * r} 0 ${0.18 * r} q ${-0.07 * r} ${-0.06 * r} 0 ${-0.18 * r} z`} fill="#6ec6ff" stroke={ink} strokeWidth={sw * 0.4} opacity={1 - tearT * 0.6} />
      ))}
      {extras.has("sweat") && <path d={`M${cx + 0.78 * r} ${cy - 0.35 * r + Math.sin(f * 0.2) * 2} q ${0.1 * r} ${0.18 * r} 0 ${0.26 * r} q ${-0.1 * r} ${-0.08 * r} 0 ${-0.26 * r} z`} fill="#6ec6ff" stroke={ink} strokeWidth={sw * 0.4} />}
    </g>
  );
};
