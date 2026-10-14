import React from "react";
import { Easing, Img, interpolate, random, staticFile } from "remotion";
import { CL, EASE, HAND } from "./theme";
import type { Ctx } from "./Objs";
import { EUROPE } from "../geo/europe";

/* Map-documentary kit (sepia relief + camera-flight grammar, original art): sepia shaded relief + vector borders,
   a geographic camera that flies between views, highlighted countries, a flood fill, rivers that draw themselves,
   icons/labels/routes/rings pinned to lon/lat; plus screen-space year cards, tags and a scorecard panel. */
type P = { o: Record<string, any>; f: number; a: number; ctx: Ctx };
type View = { lon: number; lat: number; span: number };
const COS = Math.cos((50 * Math.PI) / 180);
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const project = (v: View) => {
  const k = 1080 / v.span;
  return (lon: number, lat: number): [number, number] => [960 + (lon - v.lon) * k * COS, 540 - (lat - v.lat) * k];
};
const ringPath = (pr: (a: number, b: number) => [number, number], ring: number[][]) =>
  ring.map((p, i) => { const [x, y] = pr(p[0], p[1]); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ") + " Z";
const linePath = (pr: (a: number, b: number) => [number, number], pts: number[][]) =>
  pts.map((p, i) => { const [x, y] = pr(p[0], p[1]); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");

/* ---------- small illustrated icons (centered on 0,0, ~100px) ---------- */
export const MapIcon: React.FC<{ n: string; f?: number }> = ({ n, f = 0 }) => {
  const S = { stroke: "#2a2118", strokeWidth: 4, strokeLinejoin: "round" as const };
  switch (n) {
    case "ship": return (
      <g>
        <path d="M-50 10 L50 10 L36 34 L-36 34 Z" fill="#7a4a2a" {...S} />
        <path d="M-4 10 L-4 -52" {...S} /><path d="M-4 -48 Q26 -30 -4 -6 Z" fill="#f2ead6" {...S} /><path d="M-6 -44 Q-36 -26 -6 -4 Z" fill="#e8dcc0" {...S} />
        <path d="M-4 -56 l14 5 l-14 5 Z" fill="#c8102e" {...S} strokeWidth={2} />
      </g>
    );
    case "crane": return (
      <g>
        <path d="M-30 40 L-18 -30 L-6 40" fill="none" {...S} /><path d="M-24 0 L-12 0 M-21 -14 L-15 -14 M-27 20 L-9 20" {...S} strokeWidth={3} />
        <path d="M-18 -30 L50 -30 M-18 -30 L-40 -30" {...S} /><path d="M40 -30 L40 6" {...S} strokeWidth={2} /><rect x={30} y={6} width={20} height={16} fill="#2f6f9f" {...S} strokeWidth={3} />
        <rect x={-46} y={-38} width={12} height={16} fill="#e8913d" {...S} strokeWidth={3} />
      </g>
    );
    case "coins": return (
      <g>{[0, 1, 2, 3, 4].map((k) => <ellipse key={k} cx={0} cy={30 - k * 14} rx={34} ry={11} fill={k % 2 ? "#e6b84a" : "#f2cb5b"} {...S} strokeWidth={3} />)}</g>
    );
    case "scroll": return (
      <g>
        <rect x={-36} y={-44} width={72} height={86} rx={6} fill="#f2ead6" {...S} />
        {[-24, -12, 0, 12].map((y) => <path key={y} d={`M-24 ${y} L24 ${y}`} stroke="#8a7a60" strokeWidth={3} />)}
        <circle cx={20} cy={30} r={13} fill="#b3261e" {...S} strokeWidth={3} />
      </g>
    );
    case "wave": return (
      <g>
        <path d="M-50 20 Q-30 -30 0 -10 Q20 4 10 -22 Q40 -34 50 20 Z" fill="#4a86b8" {...S} />
        <path d="M-40 4 Q-22 -16 0 -4" stroke="#dcecf7" strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
    );
    case "wheat": return (
      <g>
        <path d="M0 44 L0 -30" {...S} />
        {[-24, -10, 4].map((y) => <g key={y}><ellipse cx={-10} cy={y} rx={9} ry={14} transform={`rotate(-30 -10 ${y})`} fill="#e6b84a" {...S} strokeWidth={3} /><ellipse cx={10} cy={y} rx={9} ry={14} transform={`rotate(30 10 ${y})`} fill="#e6b84a" {...S} strokeWidth={3} /></g>)}
        <ellipse cx={0} cy={-38} rx={8} ry={13} fill="#e6b84a" {...S} strokeWidth={3} />
      </g>
    );
    case "windmill": return (
      <g>
        <path d="M-18 44 L-10 -14 L10 -14 L18 44 Z" fill="#9b6b43" {...S} />
        <g transform={`rotate(${f * 3} 0 -14)`}>{[0, 90, 180, 270].map((r) => <rect key={r} x={-5} y={-62} width={10} height={48} fill="#f2ead6" {...S} strokeWidth={3} transform={`rotate(${r} 0 -14)`} />)}</g>
        <circle cx={0} cy={-14} r={6} fill="#2a2118" />
      </g>
    );
    case "dike": return (
      <g>
        <path d="M-56 30 L-20 -12 L20 -12 L56 30 Z" fill="#7d9a4a" {...S} />
        <path d="M-56 30 Q-40 20 -24 30 Q-8 40 8 30" stroke="#4a86b8" strokeWidth={6} fill="none" />
      </g>
    );
    case "city": return (
      <g>
        <path d="M-58 30 L0 58 L58 30 L0 2 Z" fill="#c9b48a" {...S} strokeWidth={3} />
        {[[-30, 18, 26, "#d9785a"], [0, 30, 34, "#e8d9b5"], [26, 16, 22, "#c96b4a"], [-6, 6, 44, "#f0e3c4"], [-34, 2, 18, "#e8d9b5"], [30, 0, 30, "#d9a35a"]].map(([x, y, h, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M-12 0 L0 6 L12 0 L12 ${-(h as number)} L0 ${-(h as number) - 6} L-12 ${-(h as number)} Z`} fill={c as string} {...S} strokeWidth={2.5} />
            <path d={`M-12 ${-(h as number)} L0 ${-(h as number) + 6} L12 ${-(h as number)}`} fill="none" {...S} strokeWidth={2} />
            <path d={`M-14 ${-(h as number)} L0 ${-(h as number) - 16} L14 ${-(h as number)}`} fill="#9b3b2a" {...S} strokeWidth={2.5} />
          </g>
        ))}
      </g>
    );
    case "chest": return (
      <g>
        <rect x={-46} y={-6} width={92} height={46} rx={6} fill="#8a5a2b" {...S} />
        <path d="M-46 -6 Q0 -50 46 -6 Z" fill="#a8703a" {...S} />
        {[[-26, -14], [-6, -22], [16, -18], [30, -10], [4, -8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill="#f2cb5b" {...S} strokeWidth={2} />)}
        <rect x={-8} y={4} width={16} height={18} rx={3} fill="#f2cb5b" {...S} strokeWidth={2.5} />
      </g>
    );
    case "crown": return (
      <g>
        <path d="M-44 24 L-50 -26 L-22 2 L0 -36 L22 2 L50 -26 L44 24 Z" fill="#f2cb5b" {...S} />
        <rect x={-46} y={18} width={92} height={18} rx={4} fill="#c8102e" {...S} strokeWidth={3} />
        {[-24, 0, 24].map((x) => <circle key={x} cx={x} cy={27} r={5} fill="#7fd0f0" />)}
      </g>
    );
    case "greenhouse": return (
      <g>
        {[-32, 0, 32].map((x) => <path key={x} d={`M${x - 16} 34 L${x - 16} -2 L${x} -22 L${x + 16} -2 L${x + 16} 34 Z`} fill="#bfe3ea" fillOpacity={0.85} {...S} strokeWidth={3} />)}
        <path d="M-48 34 L48 34" {...S} />
        {[-32, 0, 32].map((x) => <path key={x} d={`M${x} -20 L${x} 34`} stroke="#2a2118" strokeWidth={1.5} />)}
      </g>
    );
    case "gate": return (
      <g>
        <path d="M-60 34 L60 34" stroke="#4a86b8" strokeWidth={10} />
        {[-40, -14, 12, 38].map((x) => <g key={x}><rect x={x - 4} y={-30} width={10} height={64} fill="#9aa0aa" {...S} strokeWidth={3} /><rect x={x + 6} y={-4} width={16} height={34} fill="#5b6b7a" {...S} strokeWidth={2.5} /></g>)}
        <path d="M-50 -30 L56 -30" {...S} strokeWidth={6} />
      </g>
    );
    case "hourglass": return (
      <g>
        <rect x={-34} y={-50} width={68} height={10} rx={3} fill="#8a5a2b" {...S} strokeWidth={3} /><rect x={-34} y={40} width={68} height={10} rx={3} fill="#8a5a2b" {...S} strokeWidth={3} />
        <path d="M-26 -40 Q-26 -8 0 0 Q-26 8 -26 40 L26 40 Q26 8 0 0 Q26 -8 26 -40 Z" fill="#eef4f6" fillOpacity={0.8} {...S} strokeWidth={3} />
        <path d={`M-18 ${-30 + (f % 90) / 9} Q0 -4 18 ${-30 + (f % 90) / 9} Z`} fill="#e6b84a" />
        <path d={`M-20 40 Q0 ${30 - (f % 90) / 8} 20 40 Z`} fill="#e6b84a" />
      </g>
    );
    case "pump": return (
      <g>
        <rect x={-30} y={-20} width={60} height={54} rx={6} fill="#9b6b43" {...S} />
        <path d="M30 0 L56 0 L56 26" fill="none" stroke="#4a86b8" strokeWidth={10} strokeLinecap="round" />
        <circle cx={-6} cy={-34} r={16} fill="#5b6b7a" {...S} strokeWidth={3} />
      </g>
    );
    case "train": return (
      <g>
        <rect x={-58} y={-26} width={44} height={40} rx={4} fill="#3b3f46" {...S} />
        <rect x={-62} y={-34} width={52} height={10} rx={3} fill="#2a2e34" {...S} strokeWidth={3} />
        <rect x={-52} y={-18} width={14} height={12} fill="#f2cb5b" {...S} strokeWidth={2} />
        <path d="M-14 -10 L6 -10 L14 4 L14 14 L-14 14 Z" fill="#4a4f57" {...S} />
        <rect x={-4} y={-42} width={10} height={18} fill="#2a2e34" {...S} strokeWidth={2.5} />
        <circle cx={1} cy={-50 - (f % 20) / 3} r={6 + (f % 20) / 4} fill="#d9d4c7" opacity={0.8 - (f % 20) / 30} />
        <rect x={20} y={-18} width={44} height={32} rx={3} fill="#8a5a2b" {...S} />
        {[-50, -26, -4, 30, 52].map((x) => <circle key={x} cx={x} cy={20} r={8} fill="#1d1d22" {...S} strokeWidth={2.5} />)}
      </g>
    );
    case "tank": return (
      <g>
        <path d="M-56 18 Q-60 34 -44 36 L44 36 Q60 34 56 18 Z" fill="#3d4436" {...S} />
        {[-40, -20, 0, 20, 40].map((x) => <circle key={x} cx={x} cy={27} r={7} fill="#25291f" {...S} strokeWidth={2} />)}
        <path d="M-50 18 L-42 -4 L42 -4 L50 18 Z" fill="#5a6450" {...S} />
        <path d="M-22 -4 L-16 -22 L18 -22 L24 -4 Z" fill="#6b7660" {...S} />
        <rect x={18} y={-18} width={48} height={8} rx={3} fill="#4a5242" {...S} strokeWidth={3} />
      </g>
    );
    case "derrick": return (
      <g>
        <path d="M-30 44 L-6 -52 L6 -52 L30 44" fill="none" {...S} strokeWidth={5} />
        {[-28, -6, 16, 34].map((y, i) => <path key={i} d={`M${-28 + (y + 52) * 0.25} ${y} L${28 - (y + 52) * 0.25} ${y}`} {...S} strokeWidth={3} />)}
        <path d="M-22 10 L18 -26 M22 10 L-18 -26" {...S} strokeWidth={2.5} />
        <rect x={-10} y={-60} width={20} height={10} fill="#c8102e" {...S} strokeWidth={3} />
        <ellipse cx={0} cy={44} rx={40} ry={8} fill="#1d1d22" opacity={0.8} />
      </g>
    );
    case "barrel": return (
      <g>
        <path d="M-28 -40 Q-36 0 -28 40 L28 40 Q36 0 28 -40 Z" fill="#2c3e5a" {...S} />
        <ellipse cx={0} cy={-40} rx={28} ry={8} fill="#3d5476" {...S} strokeWidth={3} />
        {[-14, 14].map((y) => <path key={y} d={`M-32 ${y} Q0 ${y + 6} 32 ${y}`} {...S} strokeWidth={3} fill="none" />)}
        <path d="M-6 -6 Q0 -18 6 -6 Q8 2 0 4 Q-8 2 -6 -6 Z" fill="#f2cb5b" />
      </g>
    );
    case "factory": return (
      <g>
        <path d="M-56 40 L-56 -6 L-30 -22 L-30 -6 L-4 -22 L-4 -6 L22 -22 L22 40 Z" fill="#9b6b43" {...S} />
        <rect x={26} y={-50} width={16} height={90} fill="#6b4a30" {...S} />
        <circle cx={34} cy={-60 - (f % 24) / 3} r={8 + (f % 24) / 4} fill="#cfc8b8" opacity={0.85 - (f % 24) / 30} />
        {[-46, -20, 6].map((x) => <rect key={x} x={x} y={8} width={14} height={14} fill="#f2cb5b" {...S} strokeWidth={2} />)}
      </g>
    );
    case "gear": return (
      <g transform={`rotate(${f * 2})`}>
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-8} y={-46} width={16} height={18} rx={3} fill="#9aa0aa" {...S} strokeWidth={3} transform={`rotate(${i * 45})`} />)}
        <circle r={32} fill="#9aa0aa" {...S} /><circle r={11} fill="#3b3f46" {...S} strokeWidth={3} />
      </g>
    );
    default: return <circle r={24} fill="#c8102e" {...S} />;
  }
};

const pip = (x: number, y: number, ring: number[][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const SCATTER_CACHE: Record<string, number[][]> = {};
const scatterPts = (iso: string, n: number, seed: string) => {
  const key = `${iso}|${n}|${seed}`;
  if (SCATTER_CACHE[key]) return SCATTER_CACHE[key];
  const rings = EUROPE.countries.filter((c) => c.iso === iso).flatMap((c) => c.rings).sort((a, b) => b.length - a.length).slice(0, 3);
  const xs = rings.flatMap((r) => r.map((p) => p[0])), ys = rings.flatMap((r) => r.map((p) => p[1]));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const out: number[][] = [];
  for (let k = 0; k < n * 60 && out.length < n; k++) {
    const x = x0 + random(`${seed}x${k}`) * (x1 - x0), y = y0 + random(`${seed}y${k}`) * (y1 - y0);
    if (rings.some((r) => pip(x, y, r)) && out.every((p) => Math.hypot(p[0] - x, p[1] - y) > (x1 - x0) / (Math.sqrt(n) * 2.2))) out.push([x, y]);
  }
  return (SCATTER_CACHE[key] = out);
};

/* ---------- the map ---------- */
export const GeoMap: React.FC<P> = ({ o, f, ctx }) => {
  // camera: views [{at, dur, lon, lat, span}] - each animates from the previous
  const views: (View & { at?: any; dur?: number })[] = o.views ?? [{ lon: 5, lat: 52, span: 12 }];
  let v: View = views[0];
  for (let i = 1; i < views.length; i++) {
    const t0 = ctx.T.at(ctx.i, views[i].at ?? 0, 0), d = (views[i].dur ?? 2) * 30;
    const q = interpolate(f - t0, [0, d], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) });
    if (q <= 0) break;
    const a = v, b = views[i];
    // fly in log-span so zooms feel even
    v = { lon: a.lon + (b.lon - a.lon) * q, lat: a.lat + (b.lat - a.lat) * q, span: Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * q) };
  }
  const pr = project(v);
  const k = 1080 / v.span;
  const [L0, B0, L1, B1] = EUROPE.bounds;
  const [rx0, ry0] = pr(L0, B1), [rx1, ry1] = pr(L1, B0);
  const tAt = (x: any, d = 0) => ctx.T.at(ctx.i, x ?? 0, d);
  const fade = (at: any, dur = 0.6) => interpolate(f - tAt(at), [0, dur * 30], [0, 1], { ...CL, easing: EASE });
  const style = o.style ?? "sepia";
  const sepiaQ = o.toSepiaAt !== undefined ? fade(o.toSepiaAt, 1.2) : o.toModernAt !== undefined ? 1 - fade(o.toModernAt, 1.2) : style === "sepia" ? 1 : 0;
  const bg = sepiaQ > 0.5 ? "#d8ccae" : "#8fb9d8";
  const hl: { iso: string; fill?: string; at?: any; op?: number; outline?: string; lift?: number; label?: string; until?: any }[] = o.highlight ?? [];
  const scat: { iso: string; icon?: string; dot?: string; n?: number; at?: any; stagger?: number; s?: number; seed?: string }[] = o.scatter ?? [];
  const movers: { pts: number[][]; icon?: string; at?: any; dur?: number; s?: number; trail?: boolean }[] = o.movers ?? [];
  const flood = o.flood as { iso: string; at: any; dur?: number } | undefined;
  const rivers: { name: string; at?: any; dur?: number; color?: string; width?: number }[] = o.rivers ?? [];
  const pins: { lon: number; lat: number; icon?: string; label?: string; at?: any; s?: number; dx?: number; dy?: number }[] = o.pins ?? [];
  const routes: { pts: number[][]; at?: any; dur?: number; color?: string }[] = o.routes ?? [];
  const rings: { lon: number; lat: number; r?: number; at?: any; glow?: boolean }[] = o.rings ?? [];
  const names: { lon: number; lat: number; t: string; at?: any; size?: number }[] = o.names ?? [];
  const W = 1920, H = 1080;
  return (
    <div style={{ width: W, height: H, overflow: "hidden", background: bg, position: "relative" }}>
      {sepiaQ < 1 && <Img src={staticFile("geo/europe_color.jpg")} style={{ position: "absolute", left: rx0, top: ry0, width: rx1 - rx0, height: ry1 - ry0, filter: "saturate(1.15) brightness(1.03)" }} />}
      {sepiaQ > 0 && <Img src={staticFile("geo/europe_relief.jpg")} style={{ position: "absolute", left: rx0, top: ry0, width: rx1 - rx0, height: ry1 - ry0, filter: "sepia(0.85) saturate(0.9) brightness(1.06) contrast(1.05)", opacity: 0.95 * sepiaQ }} />}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse"><path d={`M0 10 Q10 ${4 + Math.sin(f * 0.2) * 3} 20 10 T40 10`} stroke="#dbe9f4" strokeWidth={2} fill="none" opacity={0.7} /></pattern>
        </defs>
        {/* soft land tint + borders */}
        {EUROPE.countries.map((c) => (
          <g key={c.iso + c.name}>{c.rings.map((r, i) => <path key={i} d={ringPath(pr, r)} fill={sepiaQ > 0.5 ? "rgba(236,220,180,0.25)" : "rgba(255,255,255,0.06)"} stroke="#5b4a33" strokeOpacity={0.35} strokeWidth={Math.max(0.8, Math.min(2.2, k / 60))} />)}</g>
        ))}
        {hl.map((h, j) => {
          const c = EUROPE.countries.filter((x) => x.iso === h.iso); const q = fade(h.at) * (h.until !== undefined ? 1 - fade(h.until, 0.4) : 1);
          const rs = c.flatMap((cc) => cc.rings);
          const lift = (h.lift ?? 0) * q;
          return (
            <g key={j}>
              {lift > 0 && [1, 0.66, 0.33].map((t, s) => <g key={s} transform={`translate(0 ${-lift * (1 - t) + lift * 0.25})`}>{rs.map((r, i) => <path key={i} d={ringPath(pr, r)} fill="rgba(60,30,10,0.35)" />)}</g>)}
              {lift > 0 && <g transform={`translate(0 ${-lift * 0.5})`}>{rs.map((r, i) => <path key={i} d={ringPath(pr, r)} fill={h.fill ?? "#e8b23a"} style={{ filter: "brightness(0.7)" }} />)}</g>}
              <g transform={`translate(0 ${-lift})`} opacity={lift > 0 ? 1 : q * (h.op ?? 0.62)}>{rs.map((r, i) => <path key={i} d={ringPath(pr, r)} fill={h.fill ?? "#e8b23a"} stroke={h.outline ?? "#7a5410"} strokeWidth={3} />)}</g>
            </g>
          );
        })}
        {flood && (() => {
          const c = EUROPE.countries.filter((x) => x.iso === flood.iso); const q = interpolate(f - tAt(flood.at), [0, (flood.dur ?? 2) * 30], [0, 1], CL);
          return <g opacity={q * 0.78}>{c.flatMap((cc) => cc.rings).map((r, i) => <g key={i}><path d={ringPath(pr, r)} fill="#3f78ad" /><path d={ringPath(pr, r)} fill="url(#waves)" /></g>)}</g>;
        })()}
        {rivers.map((rv, j) => {
          const q = interpolate(f - tAt(rv.at), [0, (rv.dur ?? 1.5) * 30], [0, 1], CL);
          return <g key={j}>{EUROPE.rivers.filter((x) => x.name === rv.name).map((ln, i) => <path key={i} d={linePath(pr, ln.pts)} stroke={rv.color ?? "#2f78c4"} strokeWidth={rv.width ?? 5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - q} opacity={q > 0 ? 0.95 : 0} />)}</g>;
        })}
        {routes.map((rt, j) => {
          const q = interpolate(f - tAt(rt.at), [0, (rt.dur ?? 1.6) * 30], [0, 1], CL);
          return <path key={j} d={linePath(pr, rt.pts)} stroke={rt.color ?? "#b3261e"} strokeWidth={6} fill="none" strokeDasharray="14 10" strokeLinecap="round" opacity={q > 0 ? 1 : 0} style={{ clipPath: `inset(0 ${100 - q * 100}% 0 0)` }} />;
        })}
        {rings.map((rg, j) => {
          const e = f - tAt(rg.at); if (e < 0) return null; const [x, y] = pr(rg.lon, rg.lat);
          const s = interpolate(e, [0, 12], [2.2, 1], { ...CL, easing: EASE });
          return <circle key={j} cx={x} cy={y} r={(rg.r ?? 120) * s} fill="none" stroke={rg.glow ? "#ffffff" : "#e0402f"} strokeWidth={rg.glow ? 12 : 10} opacity={interpolate(e, [0, 6], [0, 0.9], CL)} style={rg.glow ? { filter: "drop-shadow(0 0 14px #9fd8ff) drop-shadow(0 0 28px #ffffff)" } : undefined} />;
        })}
      </svg>
      {names.map((n, j) => { const q = fade(n.at); const [x, y] = pr(n.lon, n.lat); return (
        <div key={j} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: SERIF, fontSize: n.size ?? 34, letterSpacing: 6, color: "#3b2f1f", opacity: q * 0.85, textTransform: "uppercase", fontWeight: 700, textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}>{n.t}</div>
      ); })}
      {scat.map((sc, j) => {
        const pts = scatterPts(sc.iso, sc.n ?? 12, sc.seed ?? `s${j}`);
        return pts.map((p, i) => {
          const e = f - tAt(sc.at) - i * (sc.stagger ?? 2); if (e < 0) return null; const [x, y] = pr(p[0], p[1]);
          const s = interpolate(e, [0, 8], [0, 1], { ...CL, easing: Easing.out(Easing.back(2.2)) }) * (sc.s ?? 0.45);
          return sc.dot ? <div key={`${j}-${i}`} style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: sc.dot, border: "2px solid #2a2118", transform: `scale(${s / 0.45})` }} />
            : <svg key={`${j}-${i}`} width={140} height={140} viewBox="-70 -70 140 140" style={{ position: "absolute", left: x - 70, top: y - 70, transform: `scale(${s})`, filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.3))" }}><MapIcon n={sc.icon ?? "city"} f={f} /></svg>;
        });
      })}
      {movers.map((m, j) => {
        const pts = m.pts.map((p) => pr(p[0], p[1]));
        const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])); const tot = seg.reduce((a, b) => a + b, 0) || 1;
        const q = interpolate(f - tAt(m.at), [0, (m.dur ?? 3) * 30], [0, 1], { ...CL, easing: Easing.inOut(Easing.quad) });
        if (f < tAt(m.at)) return null;
        let d = q * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const u = seg[i] ? d / seg[i] : 0; const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
        const trail = pts.slice(0, i + 1).map((p) => p.join(" ")).concat([`${x} ${y}`]);
        return (
          <React.Fragment key={j}>
            {m.trail !== false && <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}><path d={"M" + trail.join(" L")} stroke="#fff" strokeWidth={4} strokeDasharray="4 12" strokeLinecap="round" fill="none" opacity={0.9} /></svg>}
            <svg width={140} height={140} viewBox="-70 -70 140 140" style={{ position: "absolute", left: x - 70, top: y - 70 + Math.sin(f * 0.25) * 3, transform: `scale(${(m as any).flip ? -(m.s ?? 0.7) : (m.s ?? 0.7)}, ${m.s ?? 0.7})`, filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.35))" }}><MapIcon n={m.icon ?? "ship"} f={f} /></svg>
          </React.Fragment>
        );
      })}
      {hl.filter((h) => h.label).map((h, j) => {
        const c = EUROPE.countries.find((x) => x.iso === h.iso); if (!c) return null; const q = fade(h.at); const [x, y] = pr(c.lab[0], c.lab[1]);
        return <div key={`lab${j}`} style={{ position: "absolute", left: x, top: y - (h.lift ?? 0) * q, transform: "translate(-50%,-50%)", fontFamily: SANS, fontWeight: 900, fontSize: 40, color: "#fff", letterSpacing: 2, opacity: q, textTransform: "uppercase", textShadow: "0 3px 8px rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>{h.label}</div>;
      })}
      {pins.map((p, j) => {
        const e = f - tAt(p.at); if (e < 0) return null; const [x, y] = pr(p.lon, p.lat);
        const s = interpolate(e, [0, 10], [0.3, 1], { ...CL, easing: Easing.out(Easing.back(2)) }) * (p.s ?? 1);
        return (
          <div key={j} style={{ position: "absolute", left: x + (p.dx ?? 0), top: y + (p.dy ?? 0), transform: `translate(-50%,-50%) scale(${s})` }}>
            {p.icon && <svg width={140} height={140} viewBox="-70 -70 140 140" style={{ display: "block", filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.35))" }}><MapIcon n={p.icon} f={f} /></svg>}
            {p.label && <div style={{ marginTop: p.icon ? -14 : 0, background: "#1e1a16", color: "#f4ecd8", fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: 2, padding: "6px 16px", borderRadius: 10, textTransform: "uppercase", whiteSpace: "nowrap", textAlign: "center", border: "2px solid #6b5a3f" }}>{p.label}</div>}
          </div>
        );
      })}
      {o.weather && f >= tAt(o.weather.at ?? 0) && (() => {
        const kind = o.weather.kind ?? "storm", n = o.weather.n ?? (kind === "snow" ? 90 : 120);
        return (
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
            {kind === "storm" && <rect width={W} height={H} fill="#1a2433" opacity={0.28} />}
            {Array.from({ length: n }, (_, i) => {
              if (kind === "snow") { const x = (random(`sn${i}`) * W + Math.sin(f * 0.03 + i) * 30) % W, y = (random(`sy${i}`) * H + f * (1.2 + random(`sv${i}`) * 1.4)) % H; return <circle key={i} cx={x} cy={y} r={2 + random(`sr${i}`) * 3} fill="#fff" opacity={0.85} />; }
              const x = ((random(`rx${i}`) * (W + 400) - f * 14) % (W + 400) + W + 400) % (W + 400) - 200, y = (random(`ry${i}`) * H + f * 38) % (H + 80) - 40;
              return <line key={i} x1={x} y1={y} x2={x - 18} y2={y + 46} stroke="#cfe2f5" strokeWidth={2.2} opacity={0.55} />;
            })}
            {kind === "storm" && [0, 1, 2, 3].map((i) => { const x = ((f * 26 + i * 520) % (W + 600)) - 300, y = 220 + i * 170; return <path key={`w${i}`} d={`M${x} ${y} q 60 -30 120 0 t 120 0`} stroke="#ffffff" strokeWidth={4} fill="none" opacity={0.55} strokeLinecap="round" />; })}
            {kind === "storm" && (f % 97 < 3) && <rect width={W} height={H} fill="#ffffff" opacity={0.35} />}
          </svg>
        );
      })()}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(40,25,10,0.45) 100%)" }} />
      {Array.from({ length: o.clouds ?? 3 }, (_, i) => {
        const x = ((random(`cl${i}`) * 2400 + f * (0.6 + random(`cv${i}`))) % 2600) - 300, y = 120 + random(`cy${i}`) * 800;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 220, height: 80, borderRadius: 60, background: "radial-gradient(ellipse, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)", filter: "blur(4px)" }} />;
      })}
    </div>
  );
};

/* ---------- year card: a paper document with a red wax seal ---------- */
export const DocCard: React.FC<P> = ({ o, f, a }) => {
  const e = f - a;
  const s = interpolate(e, [0, 12], [0.6, 1], { ...CL, easing: Easing.out(Easing.back(1.6)) });
  return (
    <div style={{ width: o.w ?? 380, padding: "26px 30px 30px", background: "linear-gradient(#f6efdc,#ece0c2)", border: "3px solid #8a7550", borderRadius: 8, boxShadow: "0 18px 30px rgba(0,0,0,0.35)", transform: `rotate(${o.rot ?? -3}deg) scale(${s})`, position: "relative", fontFamily: SERIF, color: "#2a2118" }}>
      {o.title && <div style={{ fontSize: 30, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{o.title}</div>}
      <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
        <div style={{ fontFamily: HAND, fontSize: o.size ?? 96, lineHeight: 1, clipPath: `inset(0 ${100 - interpolate(e, [4, 22], [0, 100], CL)}% 0 0)` }}>{o.t}</div>
        {o.t2 && <><div style={{ width: 4, alignSelf: "stretch", background: "#8a7550" }} /><div style={{ fontFamily: HAND, fontSize: o.size ?? 96, lineHeight: 1, color: "#b3261e", clipPath: `inset(0 ${100 - interpolate(e, [26, 44], [0, 100], CL)}% 0 0)` }}>{o.t2}</div></>}
      </div>
      {o.seal !== false && <div style={{ position: "absolute", right: -18, bottom: -18, width: 70, height: 70, borderRadius: 35, background: "radial-gradient(circle at 35% 35%, #d9473b, #8e1b14)", boxShadow: "0 4px 8px rgba(0,0,0,0.4)" }} />}
    </div>
  );
};

/* ---------- dark pill tag ("2 IN 100") ---------- */
export const Tag: React.FC<P> = ({ o, f, a }) => {
  const s = interpolate(f - a, [0, 9], [0.5, 1], { ...CL, easing: Easing.out(Easing.back(2)) });
  return <div style={{ transform: `scale(${s})`, background: "#1e1a16", color: o.color ?? "#f4ecd8", fontFamily: SANS, fontWeight: 900, fontSize: o.size ?? 54, letterSpacing: 3, padding: "10px 28px", borderRadius: 14, border: "3px solid #6b5a3f", whiteSpace: "nowrap", boxShadow: "0 10px 20px rgba(0,0,0,0.35)" }}>{o.t}</div>;
};

/* ---------- scorecard panel ---------- */
export const ScoreCard: React.FC<P> = ({ o, f, ctx }) => {
  const rows: { icon: string; title: string; text: string; at: any }[] = o.rows ?? [];
  return (
    <div style={{ width: o.w ?? 760, fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        {o.flag !== false && <div style={{ width: 70, height: 46, borderRadius: 6, overflow: "hidden", border: "3px solid #1e1a16", display: "flex", flexDirection: "column" }}>
          {((o.flag as string[]) ?? ["#ae1c28", "#ffffff", "#21468b"]).map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
        </div>}
        <div style={{ fontSize: 44, fontWeight: 900, color: "#1e1a16", letterSpacing: 3, background: "#f2cb5b", padding: "4px 20px", borderRadius: 10, border: "3px solid #1e1a16" }}>{o.title ?? "SCORECARD"}</div>
      </div>
      {rows.map((r, i) => {
        const e = f - ctx.T.at(ctx.i, r.at, 1e9); const on = e >= 0;
        const s = interpolate(e, [0, 10], [0, 1], { ...CL, easing: EASE });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14, background: on ? "linear-gradient(#fbf3dc,#efdfb6)" : "#25364d", border: `4px solid ${on ? "#e2a93b" : "#3b5270"}`, borderRadius: 16, padding: "12px 18px", minHeight: 96, transform: on ? `translateX(${(1 - s) * -60}px)` : "none", opacity: on ? 0.4 + 0.6 * s : 0.9 }}>
            <svg width={80} height={80} viewBox="-60 -60 120 120" style={{ flexShrink: 0 }}>{on ? <MapIcon n={r.icon} f={f} /> : <text x={0} y={22} textAnchor="middle" fontSize={70} fontWeight={900} fill="#f2cb5b">?</text>}</svg>
            {on && <div style={{ flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, color: "#1e1a16", textTransform: "uppercase" }}>{r.title}</div>
              <div style={{ fontFamily: HAND, fontSize: 36, color: "#4a3a24", marginTop: 2 }}>{r.text}</div>
            </div>}
            {on && <div style={{ width: 52, height: 52, borderRadius: 26, background: "#f2cb5b", border: "3px solid #1e1a16", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, transform: `scale(${s})` }}>✓</div>}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- flag mascot (flag with a face; optional boxing gloves) ---------- */
export const FlagMascot: React.FC<P> = ({ o, f, a }) => {
  const e = f - a; const s = interpolate(e, [0, 10], [0.3, 1], { ...CL, easing: Easing.out(Easing.back(2)) });
  const stripes: string[] = o.stripes ?? ["#ae1c28", "#ffffff", "#21468b"]; const vert = o.vertical;
  const wave = (k: number) => Math.sin(f * 0.18 + k) * 6;
  const mood = o.mood ?? "happy";
  return (
    <svg width={260} height={220} viewBox="-130 -110 260 220" style={{ overflow: "visible", transform: `scale(${s})` }}>
      <path d="M-104 -70 L-104 96" stroke="#5a4630" strokeWidth={8} strokeLinecap="round" />
      <g>
        {stripes.map((c, i) => {
          const n = stripes.length;
          if (vert) { const x0 = -100 + (200 / n) * i, x1 = x0 + 200 / n; return <path key={i} d={`M${x0} ${-70 + wave(x0 / 40)} L${x1} ${-70 + wave(x1 / 40)} L${x1} ${60 + wave(x1 / 40)} L${x0} ${60 + wave(x0 / 40)} Z`} fill={c} />; }
          const y0 = -70 + (130 / n) * i, y1 = y0 + 130 / n;
          return <path key={i} d={`M-100 ${y0 + wave(0)} Q0 ${y0 + wave(2) * 2} 100 ${y0 + wave(4)} L100 ${y1 + wave(4)} Q0 ${y1 + wave(2) * 2} -100 ${y1 + wave(0)} Z`} fill={c} />;
        })}
        <path d={`M-100 ${-70 + wave(0)} Q0 ${-70 + wave(2) * 2} 100 ${-70 + wave(4)} L100 ${60 + wave(4)} Q0 ${60 + wave(2) * 2} -100 ${60 + wave(0)} Z`} fill="none" stroke="#2a2118" strokeWidth={6} />
      </g>
      <g transform={`translate(0 ${wave(2)})`}>
        {[-26, 26].map((x) => <g key={x}><ellipse cx={x} cy={-12} rx={14} ry={mood === "shock" ? 18 : 15} fill="#fff" stroke="#2a2118" strokeWidth={4} /><circle cx={x + 2} cy={-10} r={6} fill="#2a2118" /></g>)}
        {mood === "angry" && <path d="M-44 -38 L-12 -28 M44 -38 L12 -28" stroke="#2a2118" strokeWidth={6} strokeLinecap="round" />}
        {mood === "happy" && <path d="M-22 14 Q0 34 22 14" stroke="#2a2118" strokeWidth={5} fill="#7a2a1a" />}
        {mood === "angry" && <path d="M-20 22 Q0 10 20 22" stroke="#2a2118" strokeWidth={5} fill="none" />}
        {mood === "shock" && <ellipse cx={0} cy={22} rx={10} ry={13} fill="#7a2a1a" stroke="#2a2118" strokeWidth={4} />}
      </g>
      {o.gloves && [-1, 1].map((sd) => <g key={sd} transform={`translate(${sd * 128} ${30 + Math.sin(f * 0.4 + sd) * 8})`}><ellipse rx={30} ry={26} fill="#d32f2f" stroke="#2a2118" strokeWidth={5} /><rect x={-14} y={18} width={28} height={16} rx={4} fill="#f2ead6" stroke="#2a2118" strokeWidth={4} /></g>)}
    </svg>
  );
};

/* ---------- pie chart with a label ---------- */
export const Pie: React.FC<P> = ({ o, f, a }) => {
  const e = f - a; const q = interpolate(e, [4, 30], [0, o.value ?? 0.25], { ...CL, easing: EASE }); const r = 90;
  const ang = q * Math.PI * 2; const x = Math.sin(ang) * r, y = -Math.cos(ang) * r;
  const s = interpolate(e, [0, 10], [0.4, 1], { ...CL, easing: Easing.out(Easing.back(2)) });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${s})` }}>
      <svg width={220} height={220} viewBox="-110 -110 220 220">
        <circle r={r} fill="#eef0f2" stroke="#2a2118" strokeWidth={6} />
        {q > 0.001 && <path d={`M0 0 L0 ${-r} A${r} ${r} 0 ${q > 0.5 ? 1 : 0} 1 ${x} ${y} Z`} fill={o.color ?? "#2c3e5a"} />}
        <circle r={r} fill="none" stroke="#2a2118" strokeWidth={6} />
      </svg>
      <div style={{ marginTop: -6, background: "#1e1a16", color: "#f4ecd8", fontFamily: SANS, fontWeight: 900, fontSize: 30, letterSpacing: 2, padding: "6px 18px", borderRadius: 10, border: "2px solid #6b5a3f", textTransform: "uppercase", whiteSpace: "nowrap" }}>{o.label}</div>
    </div>
  );
};

/* ---------- big number lower-centre ("9 IN 10") ---------- */
export const BigNum: React.FC<P> = ({ o, f, a }) => {
  const e = f - a; const s = interpolate(e, [0, 9], [1.6, 1], { ...CL, easing: EASE }); const op = interpolate(e, [0, 5], [0, 1], CL);
  return (
    <div style={{ textAlign: "center", opacity: op, transform: `scale(${s})`, fontFamily: SANS, color: "#fff", textShadow: "0 6px 18px rgba(0,0,0,0.6)", background: "rgba(22,18,12,0.62)", borderRadius: 28, padding: "14px 44px 18px", border: "3px solid rgba(242,203,91,0.6)" }}>
      {o.pre && <div style={{ fontSize: 42, fontWeight: 900, color: "#f2cb5b", letterSpacing: 4 }}>{o.pre}</div>}
      <div style={{ fontSize: o.size ?? 130, fontWeight: 900, letterSpacing: 4, lineHeight: 1, whiteSpace: "nowrap" }}>{o.t}</div>
      {o.sub && <div style={{ fontSize: 36, fontWeight: 800, color: "#f4ecd8", letterSpacing: 3, marginTop: 6 }}>{o.sub}</div>}
    </div>
  );
};

/* ---------- corner time badge (hourglass) ---------- */
export const TimeBadge: React.FC<P> = ({ o, f, a }) => {
  const s = interpolate(f - a, [0, 10], [0.3, 1], { ...CL, easing: Easing.out(Easing.back(2)) });
  return <div style={{ transform: `scale(${s})`, width: 110, height: 110, borderRadius: 18, background: "#f6efdc", border: "4px solid #8a7550", boxShadow: "0 10px 20px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width={90} height={90} viewBox="-60 -60 120 120"><MapIcon n="hourglass" f={f} /></svg></div>;
};

/* ---------- italic scene title ("WINTER 1609") ---------- */
export const Title: React.FC<P> = ({ o, f, a }) => {
  const e = f - a; const op = interpolate(e, [0, 8], [0, 1], CL);
  return <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: o.size ?? 86, color: "#f7fbff", letterSpacing: 3, opacity: op, transform: `translateX(${(1 - op) * -40}px)`, textShadow: "0 4px 12px rgba(20,40,70,0.6)", whiteSpace: "nowrap" }}>{o.t}</div>;
};
