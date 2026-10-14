import React from "react";
import { interpolate, random } from "remotion";
import { CL, EASE, HAND, MARKER, col } from "./theme";
import type { Ctx } from "./Objs";

type P = { o: Record<string, any>; f: number; a: number; ctx: Ctx };
const CREAM = "#e9e4d4";
const RED = "#e8553d";
const useId = (o: Record<string, any>, p: string) => `${p}${o.id ?? `${Math.round(o.x ?? 0)}_${Math.round(o.y ?? 0)}`}`;

/* ---------- light blob (sun, moon, lamp, phone glow) ---------- */
export const Orb: React.FC<P> = ({ o, f }) => {
  const size = o.size ?? 300, c = col(o.color ?? "#ffd88a");
  const fl = o.flicker ? 0.82 + Math.sin(f * 0.9) * 0.08 + random(`fl${Math.floor(f / 2)}`) * 0.1 : 1;
  const core = o.core ?? 0.0;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${c} 0%, ${c}${o.solid ? "" : "aa"} ${Math.round(core * 100 + 8)}%, ${c}00 70%)`, opacity: fl * (o.alpha ?? 1) }}>
      {o.solid && <div style={{ position: "absolute", left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: o.solidColor ?? "#fff3d6" }} />}
    </div>
  );
};

/* ---------- parallax city ---------- */
const TONES: Record<string, { far: string; mid: string; near: string; win: string; lamp: string; ground: string; stars: boolean }> = {
  night: { far: "#0d1220", mid: "#131a2e", near: "#1b243c", win: "#ffd88a", lamp: "#ffcf80", ground: "#0a0c14", stars: true },
  dawn: { far: "#4a2c3e", mid: "#5c3544", near: "#6e4048", win: "#ffd9a0", lamp: "#ffd9a0", ground: "#2a1820", stars: false },
  day: { far: "#8a9bbd", mid: "#6f82a8", near: "#56688f", win: "#e8f0ff", lamp: "#fff3c4", ground: "#2e3550", stars: false },
};
const TW = 2400;
const tile = (seed: string, base: number, minH: number, maxH: number, winP: number) => {
  const out: { x: number; w: number; h: number; wins: [number, number, boolean][] }[] = [];
  let x = 0, k = 0;
  while (x < TW) {
    const w = 130 + Math.floor(random(`${seed}w${k}`) * 110);
    const h = minH + random(`${seed}h${k}`) * (maxH - minH);
    const wins: [number, number, boolean][] = [];
    for (let wy = 30; wy < h - 30; wy += 54) for (let wx = 22; wx < w - 30; wx += 40) wins.push([wx, wy, random(`${seed}${k}-${wx}-${wy}`) < winP]);
    out.push({ x, w: Math.min(w, TW - x), h, wins });
    x += w + 6; k++;
  }
  return out;
};
const CACHE: Record<string, ReturnType<typeof tile>> = {};
export const City: React.FC<P> = ({ o, f }) => {
  const t = TONES[o.tone ?? "night"] ?? TONES.night;
  const sp = o.scroll ?? 0;
  const gid = useId(o, "g");
  const layers = [
    { key: "far", k: 0.22, base: 700, min: 200, max: 420, c: t.far, wp: 0.12 },
    { key: "mid", k: 0.55, base: 760, min: 230, max: 520, c: t.mid, wp: 0.22 },
    { key: "near", k: 1.0, base: 800, min: 280, max: 600, c: t.near, wp: 0.32 },
  ];
  const lampSp = sp * 1.5;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: "hidden" }}>
      <defs>
        <radialGradient id={gid}>
          <stop offset="0%" stopColor={t.lamp} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.lamp} stopOpacity="0" />
        </radialGradient>
      </defs>
      {t.stars && Array.from({ length: 42 }, (_, i) => (
        <circle key={i} cx={random(`sx${i}`) * 1920} cy={random(`sy${i}`) * 420} r={1.2 + random(`sr${i}`) * 1.8} fill="#fff" opacity={0.3 + 0.5 * Math.abs(Math.sin(f * 0.05 + i))} />
      ))}
      {layers.map((L) => {
        const ck = `${o.seed ?? "c"}-${L.key}`;
        const tl = (CACHE[ck] ??= tile(ck, L.base, L.min, L.max, L.wp));
        const off = -((f * sp * L.k) % TW);
        return [0, 1, 2].map((rep) => (
          <g key={`${L.key}${rep}`} transform={`translate(${off + rep * TW} 0)`}>
            {tl.map((b, i) => (
              <g key={i} transform={`translate(${b.x} ${L.base - b.h})`}>
                <rect width={b.w} height={b.h + 40} fill={L.c} />
                {b.wins.map(([wx, wy, lit], j) => lit && <rect key={j} x={wx} y={wy} width={20} height={28} fill={t.win} opacity={0.75} />)}
              </g>
            ))}
          </g>
        ));
      })}
      <rect x={0} y={800} width={1920} height={280} fill={t.ground} />
      {sp > 0 && o.fg !== false && [0, 1, 2].map((i) => {
        const span = 1100, x = ((i * span - f * sp * 2.6) % (span * 3) + span * 3) % (span * 3) - 300;
        return <rect key={`fg${i}`} x={x} y={-40} width={46} height={1160} fill="#040509" opacity={0.92} style={{ filter: "blur(5px)" }} />;
      })}
      <rect x={0} y={800} width={1920} height={6} fill="#ffffff" opacity={0.12} />
      {o.lamps !== false && [0, 1, 2, 3, 4, 5].map((i) => {
        const span = 640;
        const x = ((i * span - (f * lampSp)) % (span * 6) + span * 6) % (span * 6) - 200;
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            <ellipse cx={30} cy={806} rx={190} ry={26} fill={`url(#${gid})`} opacity={0.55} />
            <circle cx={30} cy={470} r={150} fill={`url(#${gid})`} opacity={0.65} />
            <rect x={26} y={480} width={9} height={326} fill="#06070c" />
            <rect x={26} y={474} width={46} height={8} fill="#06070c" rx={3} />
            <circle cx={30} cy={470} r={11} fill={t.lamp} />
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- speed lines ---------- */
export const SpeedLines: React.FC<P> = ({ o, f }) => {
  const n = o.n ?? 22, sp = o.speed ?? 70;
  return (
    <svg width={1920} height={1080} style={{ overflow: "hidden" }}>
      {Array.from({ length: n }, (_, i) => {
        const len = 260 + random(`sl${i}`) * 520, y = 200 + random(`sy${i}`) * 560;
        const x = 1920 + 200 - ((f * (sp + random(`ss${i}`) * 50) + random(`sx${i}`) * 3000) % (2300 + len));
        return <rect key={i} x={x} y={y} width={len} height={3 + random(`sh${i}`) * 3} fill="#fff" opacity={0.1 + random(`so${i}`) * 0.18} rx={3} />;
      })}
    </svg>
  );
};

/* ---------- alarm clock ---------- */
export const Alarm: React.FC<P> = ({ o, f, a, ctx }) => {
  const e = f - a;
  const ring = o.ringAt !== undefined ? f >= ctx.T.at(ctx.i, o.ringAt, 1e9) : o.ring !== false;
  const sh = ring ? Math.sin(e * 2.3) * 6 : 0;
  let time = o.t ?? "5:00";
  for (const q of (o.times ?? []) as { at: any; t: string }[]) if (f >= ctx.T.at(ctx.i, q.at, 0)) time = q.t;
  return (
    <svg width={460} height={460} viewBox="0 0 460 460" style={{ overflow: "visible" }}>
      {ring && [0, 1, 2].map((k) => {
        const ph = ((e * 0.09 + k * 0.33) % 1);
        return (
          <g key={k} opacity={(1 - ph) * 0.8} stroke={RED} strokeWidth={9} strokeLinecap="round" fill="none">
            <path d={`M${60 - ph * 50} ${150 - ph * 30} q -22 40 0 80`} />
            <path d={`M${400 + ph * 50} ${150 - ph * 30} q 22 40 0 80`} />
          </g>
        );
      })}
      <g transform={`rotate(${sh} 230 250)`}>
        <circle cx={140} cy={92} r={52} fill="#c7b9a0" stroke="#0b0b0e" strokeWidth={8} />
        <circle cx={320} cy={92} r={52} fill="#c7b9a0" stroke="#0b0b0e" strokeWidth={8} />
        <circle cx={230} cy={262} r={176} fill="#d9d2c0" stroke="#0b0b0e" strokeWidth={10} />
        <circle cx={230} cy={262} r={140} fill="#14141a" stroke="#0b0b0e" strokeWidth={6} />
        <text x={230} y={298} textAnchor="middle" fontSize={112} fill={RED} style={{ fontFamily: MARKER, filter: `drop-shadow(0 0 10px ${RED})` }}>{time}</text>
        <rect x={110} y={418} width={26} height={34} fill="#0b0b0e" rx={6} />
        <rect x={324} y={418} width={26} height={34} fill="#0b0b0e" rx={6} />
      </g>
    </svg>
  );
};

/* ---------- bed (+ sleeper) ---------- */
export const Bed: React.FC<P> = ({ o, f, ctx }) => {
  const awake = o.awakeAt !== undefined && f >= ctx.T.at(ctx.i, o.awakeAt, 0);
  const lying = o.lying !== false && !awake;
  const br = Math.sin(f * 0.08) * 3;
  return (
    <svg width={860} height={460} viewBox="0 0 860 460" style={{ overflow: "visible" }}>
      <rect x={20} y={150} width={36} height={290} fill="#4a3a30" rx={10} />
      <rect x={804} y={250} width={30} height={190} fill="#4a3a30" rx={10} />
      <rect x={40} y={300} width={780} height={90} fill="#3a4a6a" rx={14} />
      <rect x={40} y={282} width={780} height={34} fill="#d6d0c0" rx={14} />
      <rect x={60} y={392} width={26} height={50} fill="#2b2118" />
      <rect x={778} y={392} width={26} height={50} fill="#2b2118" />
      <ellipse cx={150} cy={268} rx={92} ry={34} fill="#ece7d8" stroke="#0b0b0e" strokeWidth={5} />
      {lying && (
        <g>
          <circle cx={160} cy={236 + br * 0.3} r={50} fill={CREAM} stroke="#0b0b0e" strokeWidth={7} />
          <path d="M138 232 q10 8 20 0 M176 232 q10 8 20 0" stroke="#0b0b0e" strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M210 ${272 + br} Q 430 ${180 + br} 640 ${232 + br} L 780 ${254} L 780 300 L 210 300 Z`} fill="#6a7fb0" stroke="#0b0b0e" strokeWidth={7} strokeLinejoin="round" />
        </g>
      )}
      {!lying && <path d="M520 296 Q 640 270 780 292 L 780 304 L 520 304 Z" fill="#6a7fb0" stroke="#0b0b0e" strokeWidth={6} />}
    </svg>
  );
};

/* ---------- sofa ---------- */
export const Sofa: React.FC<P> = ({ o }) => {
  const c = o.color ?? "#3b3552";
  return (
    <svg width={820} height={400} viewBox="0 0 820 400" style={{ overflow: "visible" }}>
      <rect x={90} y={70} width={640} height={190} rx={50} fill={c} stroke="#0b0b0e" strokeWidth={7} />
      <rect x={20} y={170} width={130} height={170} rx={40} fill={c} stroke="#0b0b0e" strokeWidth={7} />
      <rect x={670} y={170} width={130} height={170} rx={40} fill={c} stroke="#0b0b0e" strokeWidth={7} />
      <rect x={110} y={215} width={600} height={112} rx={32} fill="#4a4366" stroke="#0b0b0e" strokeWidth={7} />
      <rect x={70} y={330} width={24} height={50} fill="#0b0b0e" />
      <rect x={726} y={330} width={24} height={50} fill="#0b0b0e" />
    </svg>
  );
};

/* ---------- calendar ---------- */
export const Calendar: React.FC<P> = ({ o, f, a, ctx }) => {
  const days = o.days ?? 28, cols = 7, cw = 118, ch = 104;
  const marks: { n: number; at: any; t?: string }[] = o.marks ?? [];
  const stagger = o.stagger ?? 1.2;
  const rows = Math.ceil(days / cols);
  const W = cols * cw + 40, H = rows * ch + 120;
  const cur = o.cur;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <rect x={0} y={0} width={W} height={H} rx={26} fill="#ece7d8" stroke="#0b0b0e" strokeWidth={8} />
      <rect x={0} y={0} width={W} height={84} rx={26} fill={RED} stroke="#0b0b0e" strokeWidth={8} />
      <text x={W / 2} y={62} textAnchor="middle" fontSize={52} fill="#fff7e6" style={{ fontFamily: MARKER }}>{o.title ?? "DAYS"}</text>
      {Array.from({ length: days }, (_, i) => {
        const n = i + 1, cx = 20 + (i % cols) * cw + cw / 2, cy = 120 + Math.floor(i / cols) * ch + ch / 2;
        const sc = interpolate(f - a - i * stagger, [0, 6], [0, 1], { ...CL, easing: EASE });
        const m = marks.find((q) => q.n === n);
        const mf = m ? ctx.T.at(ctx.i, m.at, 1e9) : 1e9;
        const mp = interpolate(f - mf, [0, 7], [0, 1], { ...CL, easing: EASE });
        return (
          <g key={n} transform={`translate(${cx} ${cy}) scale(${sc})`}>
            {cur === n && <circle r={42} fill="#ffd23f" opacity={0.9} />}
            <text y={16} textAnchor="middle" fontFamily={HAND} fontSize={50} fill="#1d1d22">{n}</text>
            {m && mp > 0 && (m.t === "ok"
              ? <path d="M-30 4 L-8 28 L34 -26" stroke="#2fa84f" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} pathLength={1} strokeDashoffset={1 - mp} />
              : <g stroke={RED} strokeWidth={13} strokeLinecap="round" opacity={mp}><path d={`M-34 -34 L${-34 + 68 * mp} ${-34 + 68 * mp}`} /><path d={`M34 -34 L${34 - 68 * mp} ${-34 + 68 * mp}`} /></g>)}
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- running shoes ---------- */
export const Shoes: React.FC<P> = ({ o }) => {
  const c = col(o.color ?? "#e8553d");
  const shoe = (dx: number, flip = 1) => (
    <g transform={`translate(${dx} 0) scale(${flip} 1)`}>
      <path d="M20 150 Q10 100 40 80 L110 70 Q140 40 170 60 Q230 80 290 110 Q330 130 330 160 Z" fill="#eee9da" stroke="#0b0b0e" strokeWidth={8} strokeLinejoin="round" />
      <path d="M20 150 L330 160 L330 178 Q320 192 290 192 L40 192 Q18 190 20 150Z" fill={c} stroke="#0b0b0e" strokeWidth={8} strokeLinejoin="round" />
      <path d="M130 78 l34 22 M150 70 l34 22 M172 66 l30 20" stroke="#0b0b0e" strokeWidth={7} strokeLinecap="round" />
      <path d="M200 120 Q250 125 290 140" stroke={c} strokeWidth={10} fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg width={780} height={260} viewBox="0 0 780 260" style={{ overflow: "visible" }}>
      {shoe(0)}{shoe(400)}
    </svg>
  );
};

/* ---------- door with light ---------- */
export const Door: React.FC<P> = ({ o, f, ctx }) => {
  const t0 = o.openAt !== undefined ? ctx.T.at(ctx.i, o.openAt, 1e9) : 1e9;
  const q = interpolate(f - t0, [0, o.openDur ? o.openDur * 30 : 30], [0, 1], { ...CL, easing: EASE });
  const gid = useId(o, "d");
  const lc = o.light ?? "#ffe2a8";
  return (
    <svg width={900} height={1000} viewBox="0 0 900 1000" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="1" /><stop offset="100%" stopColor={lc} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={gid + "f"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={lc} stopOpacity="0.55" /><stop offset="100%" stopColor={lc} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={290} y={80} width={320} height={800} fill="#05060a" stroke="#0b0b0e" strokeWidth={14} />
      <rect x={290} y={80} width={320} height={800} fill={`url(#${gid})`} opacity={q} />
      {q > 0 && <polygon points={`290,880 610,880 ${610 + 700 * q},1000 ${290 - 100 * q},1000`} fill={`url(#${gid}f)`} opacity={0.9} />}
      <polygon points={`290,80 ${290 + 320 * (1 - q) * 0.9 + 18},${80 + 22 * q} ${290 + 320 * (1 - q) * 0.9 + 18},${880 - 22 * q} 290,880`} fill="#3a2d28" stroke="#0b0b0e" strokeWidth={8} />
      <rect x={270} y={60} width={360} height={26} fill="#2a1f1a" />
      <rect x={270} y={60} width={26} height={832} fill="#2a1f1a" />
      <rect x={604} y={60} width={26} height={832} fill="#2a1f1a" />
    </svg>
  );
};

/* ---------- window with rain ---------- */
export const Window: React.FC<P> = ({ o, f }) => {
  const clip = useId(o, "w");
  return (
    <svg width={640} height={760} viewBox="0 0 640 760" style={{ overflow: "visible" }}>
      <defs><clipPath id={clip}><rect x={30} y={30} width={580} height={640} /></clipPath></defs>
      <rect x={14} y={14} width={612} height={672} fill="#2a1f1a" stroke="#0b0b0e" strokeWidth={8} />
      <rect x={30} y={30} width={580} height={640} fill="#18233f" />
      <g clipPath={`url(#${clip})`}>
        <circle cx={470} cy={140} r={46} fill="#e8eeff" opacity={0.85} />
        <circle cx={470} cy={140} r={120} fill="#9fb4e6" opacity={0.18} />
        {Array.from({ length: 46 }, (_, i) => {
          const x = 30 + random(`wx${i}`) * 580, sp = 22 + random(`ws${i}`) * 18, len = 40 + random(`wl${i}`) * 60;
          const y = ((random(`wy${i}`) * 700 + f * sp) % 760) - 40;
          return <line key={i} x1={x} y1={y} x2={x - len * 0.15} y2={y + len} stroke="#9fb4e6" strokeWidth={3} opacity={0.5} strokeLinecap="round" />;
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const x = 70 + random(`dx${i}`) * 500, y = ((random(`dy${i}`) * 600 + f * (2 + random(`dv${i}`) * 3)) % 700);
          return <circle key={i} cx={x} cy={y} r={7} fill="#c9d6f5" opacity={0.5} />;
        })}
      </g>
      <rect x={316} y={30} width={8} height={640} fill="#2a1f1a" />
      <rect x={30} y={346} width={580} height={8} fill="#2a1f1a" />
      <rect x={0} y={682} width={640} height={26} fill="#3a2d28" stroke="#0b0b0e" strokeWidth={6} />
    </svg>
  );
};

/* ---------- spotlight cone with dust ---------- */
export const Spot: React.FC<P> = ({ o, f }) => {
  const w = o.w ?? 560, h = o.h ?? 900, gid = useId(o, "s");
  const c = o.color ?? "#fff0c8";
  return (
    <svg width={w + 300} height={h} viewBox={`${-150} 0 ${w + 300} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.55" /><stop offset="100%" stopColor={c} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <polygon points={`${w / 2 - 40},0 ${w / 2 + 40},0 ${w + 120},${h} ${-120},${h}`} fill={`url(#${gid})`} />
      {Array.from({ length: 26 }, (_, i) => {
        const y = ((random(`py${i}`) * h + f * (0.5 + random(`pv${i}`))) % h);
        const half = 40 + (y / h) * (w / 2 + 80);
        const x = w / 2 + (random(`px${i}`) * 2 - 1) * half * 0.9 + Math.sin(f * 0.03 + i) * 10;
        return <circle key={i} cx={x} cy={y} r={1.6 + random(`pr${i}`) * 2.4} fill="#fff" opacity={0.25 + 0.5 * random(`po${i}`)} />;
      })}
    </svg>
  );
};

/* ---------- day counter ---------- */
export const Counter: React.FC<P> = ({ o, f, ctx }) => {
  const items: { n: number | string; at: any }[] = o.items ?? [];
  let cur = items[0], t0 = 0;
  for (const it of items) { const fr = ctx.T.at(ctx.i, it.at, 0); if (f >= fr) { cur = it; t0 = fr; } }
  const s = interpolate(f - t0, [0, 8], [1.35, 1], { ...CL, easing: EASE });
  return (
    <div style={{ width: 520, textAlign: o.align ?? "left", fontFamily: HAND, fontSize: o.size ?? 64, color: col(o.color ?? "#9a958a"), transform: `scale(${s})`, transformOrigin: o.align === "center" ? "50% 50%" : "0 50%", letterSpacing: 2 }}>
      {o.prefix ?? "DAY"} {cur?.n}
    </div>
  );
};

/* ---------- hills silhouette (parallax) ---------- */
export const Hills: React.FC<P> = ({ o, f }) => {
  const sp = o.scroll ?? 0, tones = o.colors ?? ["#2a1a24", "#1c1118", "#0f0a10"];
  const lift = o.lift ?? 0;
  const mk = (k: number, amp: number, base0: number, ph: number) => {
    const off = f * sp * k, base = base0 - lift;
    let d = `M0 1080 L0 ${base}`;
    for (let x = 0; x <= 1920; x += 40) d += ` L${x} ${base - Math.sin((x + off) * 0.0045 + ph) * amp - Math.sin((x + off) * 0.011 + ph * 2) * amp * 0.35}`;
    return d + " L1920 1080 Z";
  };
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: "hidden" }}>
      <path d={mk(0.3, 70, 720, 0)} fill={tones[0]} />
      <path d={mk(0.6, 60, 800, 2)} fill={tones[1]} />
      <path d={mk(1, 40, 880, 4)} fill={tones[2]} />
    </svg>
  );
};

/* ---------- streak HUD (flame counter that can shatter) ---------- */
export const Streak: React.FC<P> = ({ o, f, ctx }) => {
  const items: { n: number; at: any; brk?: boolean; total?: number }[] = o.items ?? [];
  let cur = items[0], t0 = 0, prevN = items[0]?.n ?? 0, gain = false;
  for (let i = 0; i < items.length; i++) {
    const fr = ctx.T.at(ctx.i, items[i].at, 0);
    if (f >= fr) { prevN = cur?.n ?? 0; cur = items[i]; t0 = fr; gain = i > 0 && !items[i].brk && items[i].n > prevN; }
  }
  const e = f - t0, broke = !!cur?.brk;
  const bump = interpolate(e, [0, 8], [1.4, 1], { ...CL, easing: EASE });
  const shakeX = broke && e < 14 ? Math.sin(e * 2.6) * 10 * (1 - e / 14) : 0;
  const W = 400, H = 118;
  const flame = (c1: string, c2: string, s: number) => (
    <g transform={`translate(66 ${60}) scale(${s})`}>
      <path d="M0 -44 C 30 -12 34 16 0 36 C -34 16 -26 -12 0 -44 Z" fill={c1} />
      <path d="M0 -14 C 14 2 16 16 0 26 C -16 16 -12 2 0 -14 Z" fill={c2} />
    </g>
  );
  const flick = 1 + Math.sin(f * 0.7) * 0.05;
  return (
    <svg width={W + 80} height={H + 140} viewBox={`-40 -70 ${W + 80} ${H + 140}`} style={{ overflow: "visible" }}>
      <g transform={`translate(${shakeX} 0)`}>
        <rect x={0} y={0} width={W} height={H} rx={59} fill="#13131a" stroke={broke ? "#4a4a55" : "#ff8a3a"} strokeWidth={5} opacity={0.96} />
        {broke && e > 3 && <path d="M170 4 L190 40 L168 62 L196 112" stroke="#6a6a78" strokeWidth={4} fill="none" strokeLinejoin="round" />}
        {broke ? flame("#55555f", "#3a3a44", 1) : flame("#ff7a1a", "#ffd23f", flick)}
        <text x={118} y={42} fontFamily={HAND} fontSize={30} fill="#9a958a" letterSpacing={3}>{o.labels?.streak ?? "STREAK"}</text>
        {cur?.total !== undefined && (
          <g>
            <rect x={W + 14} y={10} width={210} height={H - 20} rx={49} fill="#13131a" stroke="#7be07b" strokeWidth={4} opacity={0.96} />
            <text x={W + 44} y={44} fontFamily={HAND} fontSize={26} fill="#9a958a" letterSpacing={3}>{o.labels?.total ?? "TOTAL"}</text>
            <text x={W + 46} y={96} fontSize={50} fill="#bff0bf" style={{ fontFamily: MARKER }}>{cur.total}</text>
          </g>
        )}
        <g transform={`translate(0 0)`}>
          <text x={122} y={100} fontSize={62 * bump} fill={broke ? "#7a7a86" : CREAM} style={{ fontFamily: MARKER, transformOrigin: "122px 92px" }}>{cur?.n}</text>
        </g>
      </g>
      {gain && e < 28 && (
        <text x={W - 70} y={-14 - e * 1.2} fontFamily={HAND} fontSize={54} fill="#7be07b" opacity={1 - e / 28}>+{(cur?.n ?? 0) - prevN}</text>
      )}
      {broke && e < 36 && Array.from({ length: 16 }, (_, k) => {
        const ang = random(`sh${k}`) * Math.PI * 2, v = 6 + random(`sv${k}`) * 12;
        const x = 100 + Math.cos(ang) * v * e, y = H / 2 + Math.sin(ang) * v * e + 0.55 * e * e;
        return <polygon key={k} points="0,-12 14,6 -10,10" transform={`translate(${x} ${y}) rotate(${e * (10 + k * 3)})`} fill={k % 2 ? "#ff8a3a" : "#e9e4d4"} opacity={1 - e / 36} />;
      })}
    </svg>
  );
};

/* ---------- floating embers ---------- */
export const Embers: React.FC<P> = ({ o, f }) => {
  const n = o.n ?? 30, w = o.w ?? 600, h = o.h ?? 700, c = col(o.color ?? RED), sp = o.speed ?? 1.2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {Array.from({ length: n }, (_, i) => {
        const u = ((f * sp * (0.6 + random(`ev${i}`)) + random(`ey${i}`) * h) % h) / h;
        const x = random(`ex${i}`) * w + Math.sin(f * 0.04 + i * 2) * 18, y = h - u * h;
        const op = Math.sin(u * Math.PI) * (0.5 + random(`eo${i}`) * 0.5);
        return <circle key={i} cx={x} cy={y} r={2.2 + random(`er${i}`) * 4.2} fill={c} opacity={op} style={{ filter: `drop-shadow(0 0 5px ${c})` }} />;
      })}
    </svg>
  );
};

/* ---------- shockwave ring ---------- */
export const Ring: React.FC<P> = ({ o, f, a }) => {
  const e = Math.max(0, f - a), sp = o.speed ?? 34;
  return (
    <svg width={2400} height={2400} viewBox="-1200 -1200 2400 2400" style={{ overflow: "visible" }}>
      {[0, 8, 18].map((d, k) => {
        const q = Math.max(0, e - d);
        return <circle key={k} cx={0} cy={0} r={40 + q * sp} fill="none" stroke={col(o.color ?? "#ffd88a")} strokeWidth={Math.max(1, (o.w ?? 26) - q * 0.45)} opacity={Math.max(0, 0.9 - q / 40) * (1 - k * 0.25)} style={{ filter: `drop-shadow(0 0 14px ${col(o.color ?? "#ffd88a")})` }} />;
      })}
    </svg>
  );
};

/* ---------- logo-style face badge (head in a halo) ---------- */
import { Face2 } from "./Face2";
export const FaceBadge: React.FC<P> = ({ o, f }) => {
  const R = 78, e = o.expr ?? "determined";
  return (
    <svg width={340} height={340} viewBox="-170 -170 340 340" style={{ overflow: "visible" }}>
      <circle r={142} fill="none" stroke="#ffd88a" strokeWidth={9} opacity={0.9} style={{ filter: "drop-shadow(0 0 18px #ffb35a)" }} />
      <circle r={142} fill="none" stroke="#fff1c4" strokeWidth={3} opacity={0.8} />
      <path d="M-100 150 Q-92 62 0 60 Q92 62 100 150 Z" fill="#2a2a32" stroke="#0b0b0e" strokeWidth={7} />
      <circle cx={0} cy={-6} r={R} fill={CREAM} stroke="#0b0b0e" strokeWidth={8} />
      <path d={`M${-R + 2} ${-6 - R * 0.36} Q0 ${-6 - R * 0.58} ${R - 2} ${-6 - R * 0.36}`} stroke={RED} strokeWidth={13} fill="none" strokeLinecap="round" />
      <Face2 cx={0} cy={-6} r={R} expr={e} f={f} ink="#1d1d22" fill={CREAM} />
    </svg>
  );
};

/* ---------- room: wall, floor, baseboard, light pool ---------- */
const ROOMS: Record<string, { wall: [string, string]; floor: [string, string]; base: string; line: string }> = {
  night: { wall: ["#101830", "#0b1022"], floor: ["#1a1624", "#0d0b14"], base: "#070913", line: "#1c2745" },
  warm: { wall: ["#3a2a22", "#241915"], floor: ["#30211a", "#160f0c"], base: "#140d0a", line: "#4a3328" },
  cold: { wall: ["#14161c", "#0b0c10"], floor: ["#15151b", "#0a0a0e"], base: "#050507", line: "#22242c" },
};
export const Room: React.FC<P> = ({ o, f }) => {
  const t = ROOMS[o.tone ?? "night"] ?? ROOMS.night, gid = useId(o, "r");
  const fy = o.floorY ?? 800;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: "hidden" }}>
      <defs>
        <linearGradient id={gid + "w"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.wall[0]} /><stop offset="100%" stopColor={t.wall[1]} /></linearGradient>
        <linearGradient id={gid + "f"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.floor[0]} /><stop offset="100%" stopColor={t.floor[1]} /></linearGradient>
        <radialGradient id={gid + "l"}><stop offset="0%" stopColor={o.glow ?? "#ffd88a"} stopOpacity={o.glowA ?? 0.35} /><stop offset="100%" stopColor={o.glow ?? "#ffd88a"} stopOpacity={0} /></radialGradient>
      </defs>
      <rect width={1920} height={fy} fill={`url(#${gid}w)`} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 180 + 20} y={60} width={4} height={fy - 130} fill={t.line} opacity={0.35} />)}
      <rect x={0} y={fy - 34} width={1920} height={34} fill={t.base} />
      <rect x={0} y={fy - 36} width={1920} height={3} fill="#fff" opacity={0.07} />
      <rect x={0} y={fy} width={1920} height={1080 - fy} fill={`url(#${gid}f)`} />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1={960 + (i - 4) * 90} y1={fy} x2={960 + (i - 4) * 360} y2={1080} stroke={t.line} strokeWidth={2} opacity={0.5} />)}
      {[0.3, 0.6].map((k, i) => <line key={i} x1={0} y1={fy + (1080 - fy) * k * k * 1.2} x2={1920} y2={fy + (1080 - fy) * k * k * 1.2} stroke={t.line} strokeWidth={2} opacity={0.45} />)}
      {o.pool !== false && <ellipse cx={o.px ?? 960} cy={fy + 20} rx={o.pr ?? 620} ry={90} fill={`url(#${gid}l)`} />}
      {o.glowWall && <ellipse cx={o.px ?? 960} cy={fy - 260} rx={760} ry={420} fill={`url(#${gid}l)`} opacity={0.6} />}
    </svg>
  );
};

/* ---------- phone screen close-up (fictional run-log app) ---------- */
export const PhoneScreen: React.FC<P> = ({ o, f, ctx }) => {
  const ta = o.totalAt !== undefined ? ctx.T.at(ctx.i, o.totalAt, 1e9) : 1e9;
  const q = interpolate(f - ta, [0, 22], [0, 1], { ...CL, easing: EASE });
  const total = Math.round((o.total ?? 8) * q);
  const days: string[] = o.days ?? [];
  return (
    <svg width={620} height={1040} viewBox="0 0 620 1040" style={{ overflow: "visible" }}>
      <rect x={10} y={10} width={600} height={1020} rx={70} fill="#0d0e14" stroke="#2a2c38" strokeWidth={10} />
      <rect x={40} y={40} width={540} height={960} rx={46} fill="#151722" />
      <rect x={250} y={56} width={120} height={22} rx={11} fill="#0d0e14" />
      <text x={310} y={150} textAnchor="middle" fontFamily={HAND} fontSize={40} fill="#9a958a" letterSpacing={6}>{o.labels?.title ?? "RUN LOG"}</text>
      <g transform="translate(310 300)">
        <path d="M0 -84 C 56 -24 64 30 0 68 C -64 30 -50 -24 0 -84 Z" fill="#3a3a44" />
        <text y={42} textAnchor="middle" fontSize={120} fill="#7a7a86" style={{ fontFamily: MARKER }}>0</text>
      </g>
      <text x={310} y={420} textAnchor="middle" fontFamily={HAND} fontSize={38} fill="#7a7a86" letterSpacing={4}>{o.labels?.streak ?? "STREAK"}</text>
      <rect x={80} y={470} width={460} height={4} fill="#2a2c38" />
      <g opacity={q}>
        <text x={310} y={560} textAnchor="middle" fontFamily={HAND} fontSize={38} fill="#9a958a" letterSpacing={4}>{o.labels?.total ?? "TOTAL DAYS RUN"}</text>
        <text x={310} y={700} textAnchor="middle" fontSize={150} fill="#bff0bf" style={{ fontFamily: MARKER, filter: "drop-shadow(0 0 18px #3fae4a)" }}>{total}</text>
      </g>
      {days.map((d, k) => {
        const x = 104 + (k % 7) * 69, y = 790 + Math.floor(k / 7) * 64;
        const c = d === "ok" ? "#3fae4a" : d === "x" ? "#e8553d" : "#2a2c38";
        return <circle key={k} cx={x} cy={y} r={22} fill={c} opacity={d === "-" ? 0.8 : 1} />;
      })}
    </svg>
  );
};

/* ---------- clutter on the floor (time passing) ---------- */
export const Clutter: React.FC<P> = ({ o }) => (
  <svg width={900} height={160} viewBox="0 0 900 160" style={{ overflow: "visible" }}>
    <rect x={20} y={96} width={190} height={40} rx={6} fill="#a8742e" stroke="#0b0b0e" strokeWidth={5} transform="rotate(-4 115 116)" />
    <rect x={40} y={70} width={170} height={34} rx={6} fill="#c08a3e" stroke="#0b0b0e" strokeWidth={5} transform="rotate(3 125 87)" />
    <path d="M300 136 Q350 70 420 120 Q470 80 520 136 Z" fill="#4a4a66" stroke="#0b0b0e" strokeWidth={5} />
    <rect x={600} y={70} width={44} height={66} rx={8} fill="#d6d0c0" stroke="#0b0b0e" strokeWidth={5} />
    <rect x={680} y={110} width={80} height={26} rx={5} fill="#2f6f8f" stroke="#0b0b0e" strokeWidth={5} transform="rotate(70 720 123)" />
    <circle cx={820} cy={124} r={14} fill="#e8553d" stroke="#0b0b0e" strokeWidth={4} />
  </svg>
);
