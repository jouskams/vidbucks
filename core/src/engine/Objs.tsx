import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { CL, EASE, HAND, InkContext, MARKER, PAL, POP, col, prog } from "./theme";
import { Figure, getPose, lerpPose } from "./Figure";
import { IconSvg } from "./Icons";
import * as SC from "./Scenery";
import * as MM from "./Meme";
import { Doomer } from "./Doomer";
import * as GM from "./GeoMap";
import type { TimingApi } from "./timing";

export type Spec = Record<string, any>;
export type Ctx = { T: TimingApi; i: number; dark: boolean; still: boolean; dur: number };

const BOUNCE = Easing.bounce;

/** Text with *highlighted* words (marker highlight). */
const Rich: React.FC<{ t: string; color: string; hl: string; chars?: number }> = ({ t, color, hl, chars }) => {
  let shown = 0;
  const parts = t.split("*");
  return (
    <>
      {parts.map((p, k) => {
        let txt = p;
        if (chars !== undefined) {
          const left = Math.max(0, chars - shown);
          txt = p.slice(0, left);
          shown += p.length;
        }
        if (!txt) return null;
        const marked = k % 2 === 1;
        return (
          <span key={k} style={marked ? { background: `linear-gradient(transparent 52%, ${hl} 52%, ${hl} 92%, transparent 92%)`, padding: "0 6px" } : { color }}>
            {txt}
          </span>
        );
      })}
    </>
  );
};

const curveY = (kind: string, u: number, reviews: number[]): number => {
  // returns memory 0..1 at normalised time u
  if (kind === "forget") return Math.exp(-u / 0.16) * 0.92 + 0.08 * Math.exp(-u / 1.2);
  let tau = 0.13, t0 = 0;
  for (const r of reviews) if (u >= r) { t0 = r; tau *= 2.3; }
  return Math.exp(-(u - t0) / tau) * 0.96 + 0.04;
};

const Curve: React.FC<{ o: Spec; p: number; f: number; a: number; ctx: Ctx }> = ({ o, p, f, a, ctx }) => {
  const w = o.w ?? 900, h = o.h ?? 500;
  const reviews: number[] = o.reviews ?? [];
  const kind = o.kind ?? "forget";
  const N = 180;
  const pts: string[] = [];
  const drawN = Math.floor(N * p);
  for (let k = 0; k <= drawN; k++) {
    const u = k / N;
    const y = curveY(kind, u, reviews);
    pts.push(`${k === 0 ? "M" : "L"}${u * w} ${(1 - y) * h}`);
  }
  const ghost: string[] = [];
  if (kind === "reviews") for (let k = 0; k <= N; k++) ghost.push(`${k === 0 ? "M" : "L"}${(k / N) * w} ${(1 - curveY("forget", k / N, [])) * h}`);
  return (
    <svg width={w + 140} height={h + 120} viewBox={`-90 -30 ${w + 140} ${h + 120}`} style={{ overflow: "visible" }}>
      <path d={`M0 0 V${h} H${w}`} stroke={col(ctx.dark ? "paper" : "ink")} strokeWidth={7} fill="none" strokeLinecap="round" />
      <text x={-12} y={-8} fontFamily={HAND} fontSize={40} fill={col(ctx.dark ? "paper" : "ink")} textAnchor="start">{o.yl ?? "memory"}</text>
      <text x={w} y={h + 56} fontFamily={HAND} fontSize={40} fill={col(ctx.dark ? "paper" : "ink")} textAnchor="end">{o.xl ?? "time"}</text>
      {ghost.length > 0 && <path d={ghost.join(" ")} stroke={PAL.grey} strokeWidth={5} strokeDasharray="4 12" fill="none" strokeLinecap="round" />}
      <path d={pts.join(" ")} stroke={col(o.color ?? "red")} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {kind === "reviews" &&
        reviews.map((r, k) => {
          const shown = p * 1 >= r;
          const s = shown ? interpolate(f - a - r * (o.dur ?? 3) * 30, [0, 10], [0, 1], { ...CL, easing: POP }) : 0;
          return (
            <g key={k} opacity={s} transform={`translate(${r * w} ${(1 - curveY(kind, r, reviews)) * h})`}>
              <circle r={16} fill={PAL.green} stroke={PAL.ink} strokeWidth={4} />
              <path d="M-7 0 l5 6 l10 -12" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          );
        })}
    </svg>
  );
};

const Body: React.FC<{ o: Spec; f: number; a: number; ctx: Ctx; p: number }> = ({ o, f, a, ctx, p }) => {
  const dark = ctx.dark;
  switch (o.k) {
    case "text": {
      const size = o.size ?? 90;
      const color = col(o.color ?? (dark ? "paper" : "ink"));
      const chars = o.fx === "type" && !ctx.still ? Math.floor(((f - a) / Math.max(1, o.typeDur ?? 30)) * String(o.t).replace(/\*/g, "").length) : undefined;
      return (
        <div style={{ width: o.w ?? 1500, textAlign: o.align ?? "center", fontFamily: o.font === "hand" ? HAND : MARKER, fontSize: size, lineHeight: 1.12, color, fontWeight: 400 }}>
          <Rich t={o.t} color={color} hl={col(o.hl ?? "yellow")} chars={chars} />
        </div>
      );
    }
    case "city": return <SC.City o={o} f={f} a={a} ctx={ctx} />;
    case "orb": return <SC.Orb o={o} f={f} a={a} ctx={ctx} />;
    case "speedlines": return <SC.SpeedLines o={o} f={f} a={a} ctx={ctx} />;
    case "alarm": return <SC.Alarm o={o} f={f} a={a} ctx={ctx} />;
    case "bed": return <SC.Bed o={o} f={f} a={a} ctx={ctx} />;
    case "sofa": return <SC.Sofa o={o} f={f} a={a} ctx={ctx} />;
    case "calendar": return <SC.Calendar o={o} f={f} a={a} ctx={ctx} />;
    case "shoes": return <SC.Shoes o={o} f={f} a={a} ctx={ctx} />;
    case "door": return <SC.Door o={o} f={f} a={a} ctx={ctx} />;
    case "window": return <SC.Window o={o} f={f} a={a} ctx={ctx} />;
    case "spot": return <SC.Spot o={o} f={f} a={a} ctx={ctx} />;
    case "counter": return <SC.Counter o={o} f={f} a={a} ctx={ctx} />;
    case "streak": return <SC.Streak o={o} f={f} a={a} ctx={ctx} />;
    case "embers": return <SC.Embers o={o} f={f} a={a} ctx={ctx} />;
    case "ring": return <SC.Ring o={o} f={f} a={a} ctx={ctx} />;
    case "facebadge": return <SC.FaceBadge o={o} f={f} a={a} ctx={ctx} />;
    case "room": return <SC.Room o={o} f={f} a={a} ctx={ctx} />;
    case "phonescreen": return <SC.PhoneScreen o={o} f={f} a={a} ctx={ctx} />;
    case "clutter": return <SC.Clutter o={o} f={f} a={a} ctx={ctx} />;
    case "geomap": return <GM.GeoMap o={o} f={f} a={a} ctx={ctx} />;
    case "doccard": return <GM.DocCard o={o} f={f} a={a} ctx={ctx} />;
    case "tag": return <GM.Tag o={o} f={f} a={a} ctx={ctx} />;
    case "scorecard": return <GM.ScoreCard o={o} f={f} a={a} ctx={ctx} />;
    case "flag": return <GM.FlagMascot o={o} f={f} a={a} ctx={ctx} />;
    case "pie": return <GM.Pie o={o} f={f} a={a} ctx={ctx} />;
    case "bignum": return <GM.BigNum o={o} f={f} a={a} ctx={ctx} />;
    case "timebadge": return <GM.TimeBadge o={o} f={f} a={a} ctx={ctx} />;
    case "maptitle": return <GM.Title o={o} f={f} a={a} ctx={ctx} />;
    case "doomer": return <Doomer o={o} f={f} a={a} ctx={ctx} />;
    case "photo": return <MM.Photo o={o} f={f} a={a} ctx={ctx} />;
    case "meme": return <MM.Meme o={o} f={f} a={a} ctx={ctx} />;
    case "chat": return <MM.Chat o={o} f={f} a={a} ctx={ctx} />;
    case "call": return <MM.Call o={o} f={f} a={a} ctx={ctx} />;
    case "snapshot": return <MM.Snapshot o={o} f={f} a={a} ctx={ctx} />;
    case "yearcard": return <MM.YearCard o={o} f={f} a={a} ctx={ctx} />;
    case "hills": return <SC.Hills o={o} f={f} a={a} ctx={ctx} />;
    case "rain": {
      const n = o.n ?? 70, w = o.w ?? 1920, h = o.h ?? 1080, sp = o.speed ?? 34;
      return (
        <svg width={w} height={h} style={{ overflow: "hidden" }}>
          {Array.from({ length: n }, (_, k) => {
            const x0 = random(`rx${k}`) * (w + 200) - 100, y0 = random(`ry${k}`) * h, len = 40 + random(`rl${k}`) * 60;
            const y = (y0 + f * (sp + random(`rs${k}`) * 14)) % (h + 100) - 50, x = x0 - (y - y0) * 0.0;
            return <line key={k} x1={x} y1={y} x2={x - len * 0.18} y2={y + len} stroke="#9fb4e6" strokeWidth={2.2} opacity={0.35 + random(`ro${k}`) * 0.3} strokeLinecap="round" />;
          })}
        </svg>
      );
    }
    case "icon":
      return <IconSvg n={o.n} size={o.size ?? 200} color={o.color} />;
    case "stick": {
      const poses: { at?: string | number; to: string }[] = o.poses ?? [];
      const faces: { at?: string | number; to: string }[] = o.faces ?? [];
      let cur = o.pose ?? "idle";
      let prev = cur, tChange = -999;
      for (const q of poses) {
        const fr = ctx.T.at(ctx.i, q.at, 0);
        if (f >= fr) { prev = cur; cur = q.to; tChange = fr; }
      }
      let face = o.face ?? "smile";
      for (const q of faces) if (f >= ctx.T.at(ctx.i, q.at, 0)) face = q.to;
      const blend = interpolate(f - tChange, [0, 8], [0, 1], { ...CL, easing: EASE });
      const pa = getPose(prev, f, o.anim), pb = getPose(cur, f, o.anim);
      const pose = blend >= 1 ? pb : lerpPose(pa, pb, blend);
      const exs: { at?: string | number; to: string }[] = o.exprs ?? [];
      let exCur = o.expr ?? face, exPrev: string | undefined, exT = -999;
      for (const q of exs) { const fr = ctx.T.at(ctx.i, q.at, 0); if (f >= fr) { exPrev = exCur; exCur = q.to; exT = fr; } }
      const exBlend = interpolate(f - exT, [0, 7], [0, 1], { ...CL, easing: EASE });
      const wind = cur === "run" ? 1 : cur === "jog" ? 0.75 : cur === "walk" ? 0.45 : 0.12;
      const bobY = cur === "run" ? -Math.abs(Math.sin(f * 0.46)) * 16 : cur === "jog" ? -Math.abs(Math.sin(f * 0.36)) * 11 : cur === "walk" ? -Math.abs(Math.sin(f * 0.34)) * 5 : 0;
      const figProps = { big: o.big, expr: o.big || o.expr || exs.length ? exCur : undefined, exprPrev: exBlend < 1 ? exPrev : undefined, exprBlend: exBlend, look: o.look, tilt: o.tilt, alive: o.alive, pose, face, shirt: o.shirt ?? "blue", prop: o.prop, f, glasses: o.glasses, label: o.label, sweat: o.sweat, wind };
      const fig = <Figure {...figProps} headFill={o.headFill} headband={o.headband} eyeColor={o.eyeColor} grin={o.grin} />;
      // cast shadow: a dark copy of the same pose, scaled/skewed from the feet; it can open red eyes (the "voice")
      let shadow: React.ReactNode = null;
      if (o.cast) {
        const c = o.cast;
        const ca = c.at !== undefined ? ctx.T.at(ctx.i, c.at, 0) : 0;
        const q = interpolate(f - ca, [0, (c.dur ?? 1) * 30], [0, 1], { ...CL, easing: EASE });
        const lerp2 = (v: any, d: number) => Array.isArray(v) ? v[0] + (v[1] - v[0]) * q : (v ?? d);
        const sx = lerp2(c.sx, 1), sy = lerp2(c.sy, 1), sk = lerp2(c.skew, 0), dx = lerp2(c.dx, 0), op = lerp2(c.op, 0.85);
        const eyesOn = c.eyes !== undefined && f >= ctx.T.at(ctx.i, c.eyes, 1e9);
        const eyesOff = c.eyesOff !== undefined && f >= ctx.T.at(ctx.i, c.eyesOff, 1e9);
        const showEyes = eyesOn && !eyesOff;
        const glow = c.glow && showEyes ? `drop-shadow(0 0 10px ${col(c.glow)}) drop-shadow(0 0 24px ${col(c.glow)})` : undefined;
        shadow = (
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "50% 92.6%", transform: `translateX(${dx}px) skewX(${sk}deg) scale(${sx}, ${sy})`, opacity: op, filter: glow }}>
            <InkContext.Provider value={c.color ?? "#05060a"}>
              <Figure {...figProps} big={o.big} expr={undefined} headFill={c.color ?? "#05060a"} shirt={c.color ?? "#05060a"} headband={undefined} eyeColor={showEyes ? "#ff4a2e" : undefined} grin={showEyes && c.grin !== false} prop={undefined} />
            </InkContext.Provider>
          </div>
        );
      }
      const body = <div style={{ transform: `translateY(${bobY}px)`, filter: o.rim ? `drop-shadow(0 0 ${o.rimR ?? 14}px ${col(o.rim)})` : undefined }}>{fig}</div>;
      if (!o.glow) return shadow ? <div style={{ position: "relative" }}>{shadow}{body}</div> : body;
      const g = col(o.glow);
      return (
        <InkContext.Provider value={o.ink ?? "#0b0b0e"}>
          <div style={{ filter: `drop-shadow(0 0 10px ${g}) drop-shadow(0 0 26px ${g})`, transform: `translateY(${bobY}px)` }}>{fig}</div>
        </InkContext.Provider>
      );
    }
    case "bubble": {
      const size = o.size ?? 54, w = o.w ?? 520;
      const [tx, ty] = o.tail ?? [-60, 120];
      const think = o.think;
      return (
        <div style={{ position: "relative", width: w }}>
          <div style={{ background: "#fff", border: `6px solid ${PAL.ink}`, borderRadius: think ? 60 : 36, padding: "16px 28px 20px", fontFamily: HAND, fontSize: size, lineHeight: 1.12, color: PAL.ink, textAlign: "center", boxShadow: "6px 8px 0 rgba(0,0,0,0.12)" }}>
            <Rich t={o.t} color={PAL.ink} hl={col(o.hl ?? "yellow")} />
          </div>
          {think ? (
            <svg style={{ position: "absolute", left: "50%", top: "100%", overflow: "visible" }} width={10} height={10}>
              {[0.25, 0.55, 0.85].map((q, k) => <circle key={k} cx={tx * q} cy={ty * q - 10} r={16 - k * 4} fill="#fff" stroke={PAL.ink} strokeWidth={5} />)}
            </svg>
          ) : (
            <svg style={{ position: "absolute", left: "50%", top: "100%", overflow: "visible" }} width={10} height={10}>
              <path d={`M-40 -6 L${tx} ${ty} L40 -6 Z`} fill="#fff" stroke={PAL.ink} strokeWidth={6} strokeLinejoin="round" />
              <path d="M-34 -9 L34 -9" stroke="#fff" strokeWidth={10} />
            </svg>
          )}
        </div>
      );
    }
    case "curve":
      return <Curve o={o} p={prog(f, a, o.dur ? o.dur * 30 : 90, Easing.inOut(Easing.quad))} f={f} a={a} ctx={ctx} />;
    case "arrow": {
      const dx = (o.x2 ?? 300) - 0, dy = (o.y2 ?? 0);
      const len = Math.hypot(dx, dy), ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const q = prog(f, a, 14);
      return (
        <svg width={len + 80} height={80} style={{ overflow: "visible", rotate: `${ang}deg`, transformOrigin: "0 40px" }}>
          <path d={`M0 40 L${len * q} 40`} stroke={col(o.color ?? "orange")} strokeWidth={o.w ?? 12} strokeLinecap="round" fill="none" />
          <path d={`M${len * q - 30} 14 L${len * q} 40 L${len * q - 30} 66`} stroke={col(o.color ?? "orange")} strokeWidth={o.w ?? 12} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={q > 0.9 ? 1 : 0} />
        </svg>
      );
    }
    case "box": {
      const w = o.w ?? 400, h = o.h ?? 240;
      return (
        <div style={{ width: w, height: h, background: col(o.fill ?? "#fff"), border: `7px solid ${col(o.color ?? "ink")}`, borderRadius: o.round ?? 26, boxShadow: "7px 9px 0 rgba(0,0,0,0.13)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: o.font === "marker" ? MARKER : HAND, fontSize: o.size ?? 56, color: col(o.tcolor ?? "ink"), textAlign: "center", lineHeight: 1.1, padding: 18 }}>
          <Rich t={o.t ?? ""} color={col(o.tcolor ?? "ink")} hl={col("yellow")} />
        </div>
      );
    }
    case "badge": {
      const d = o.size ?? 170;
      return (
        <div style={{ width: d, height: d, borderRadius: d, background: col(o.color ?? "orange"), border: `8px solid ${PAL.ink}`, boxShadow: "7px 9px 0 rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Impact, Arial Black, sans-serif", fontSize: d * 0.6, color: "#fff", paddingTop: d * 0.02 }}>
          {o.t}
        </div>
      );
    }
    case "under": {
      const w = o.w ?? 600;
      const q = ctx.still ? 1 : prog(f, a, 16);
      return (
        <svg width={w} height={40} style={{ overflow: "visible" }}>
          <path d={`M0 20 Q ${w * 0.25} 2 ${w * 0.5} 20 T ${w} 18`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - q} stroke={col(o.color ?? "orange")} strokeWidth={10} strokeLinecap="round" fill="none" />
        </svg>
      );
    }
    case "tline": {
      const w = o.w ?? 1300;
      const labels: string[] = o.labels ?? [];
      const ats: (string | number)[] = o.ats ?? [];
      const q = prog(f, a, 24);
      return (
        <svg width={w + 200} height={260} viewBox={`-100 -110 ${w + 200} 260`} style={{ overflow: "visible" }}>
          <path d={`M0 0 L${w * q} 0`} stroke={PAL.ink} strokeWidth={9} strokeLinecap="round" />
          {labels.map((l, k) => {
            const fa = ctx.T.at(ctx.i, ats[k], a + 10 + k * 10);
            const s = interpolate(f - fa, [0, 10], [0, 1], { ...CL, easing: POP });
            const x = (k / Math.max(1, labels.length - 1)) * w;
            return (
              <g key={k} transform={`translate(${x} 0) scale(${s})`}>
                <circle r={26} fill={PAL.green} stroke={PAL.ink} strokeWidth={7} />
                <text y={-56} textAnchor="middle" fontFamily={HAND} fontSize={58} fill={col(dark ? "paper" : "ink")}>{l}</text>
              </g>
            );
          })}
        </svg>
      );
    }
    case "list": {
      const items: Spec[] = o.items ?? [];
      const size = o.size ?? 64;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: o.gap ?? 26, width: o.w ?? 1100 }}>
          {items.map((it, k) => {
            const fa = ctx.T.at(ctx.i, it.at, a + 8 + k * 14);
            const s = interpolate(f - fa, [0, 12], [0, 1], { ...CL, easing: POP });
            const mk = it.mark ?? o.mark ?? "dot";
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 28, opacity: s, transform: `translateX(${(1 - s) * -80}px)`, fontFamily: it.font === "marker" ? MARKER : HAND, fontSize: size, color: col(dark ? "paper" : "ink") }}>
                <div style={{ width: size * 1.1, height: size * 1.1, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mk === "check" || mk === "cross" ? <IconSvg n={mk} size={size * 1.1} /> : mk === "num" ? <div style={{ fontFamily: MARKER, fontSize: size, color: col("orange") }}>{k + 1}</div> : <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: 99, background: col(it.color ?? "orange"), border: `5px solid ${PAL.ink}` }} />}
                </div>
                <div style={{ lineHeight: 1.1 }}><Rich t={it.t} color={col(dark ? "paper" : "ink")} hl={col("yellow")} /></div>
              </div>
            );
          })}
        </div>
      );
    }
    case "line":
      return <div style={{ width: o.w ?? 1200, height: o.h ?? 8, borderRadius: 8, background: col(o.color === undefined || o.color === "ink" ? (dark ? "paper" : "ink") : o.color), opacity: 0.85 }} />;
    case "dots": {
      // a row of little marks (sessions, days...) that fill one by one
      const n = o.n ?? 5, size = o.size ?? 70;
      return (
        <div style={{ display: "flex", gap: o.gap ?? 28 }}>
          {Array.from({ length: n }, (_, k) => {
            const fa = ctx.T.at(ctx.i, o.ats?.[k], a + k * 12);
            const s = interpolate(f - fa, [0, 10], [0, 1], { ...CL, easing: POP });
            return <div key={k} style={{ width: size, height: size, borderRadius: size, background: col(o.color ?? "blue"), border: `6px solid ${PAL.ink}`, scale: String(s) }} />;
          })}
        </div>
      );
    }
    default:
      throw new Error(`unknown object kind ${o.k}`);
  }
};

export const Obj: React.FC<{ o: Spec; ctx: Ctx }> = ({ o, ctx }) => {
  const f = useCurrentFrame();
  const a = ctx.still ? 0 : ctx.T.at(ctx.i, o.at, 0) + (o.delay ? Math.round(o.delay * 30) : 0);
  const hideAt = o.until !== undefined && !ctx.still ? ctx.T.at(ctx.i, o.until, 1e9) : 1e9;
  if (f < a || f > hideAt + 8) return null;
  const fx = ctx.still ? "none" : o.fx ?? "pop";
  const e = f - a;
  let op = 1, sc = 1, tx = 0, ty = 0;
  switch (fx) {
    case "pop": sc = interpolate(e, [0, 12], [0.3, 1], { ...CL, easing: POP }); op = prog(f, a, 5); break;
    case "fade": op = prog(f, a, 14); break;
    case "slideL": tx = interpolate(e, [0, 18], [-340, 0], { ...CL, easing: EASE }); op = prog(f, a, 8); break;
    case "slideR": tx = interpolate(e, [0, 18], [340, 0], { ...CL, easing: EASE }); op = prog(f, a, 8); break;
    case "slideU": ty = interpolate(e, [0, 18], [160, 0], { ...CL, easing: EASE }); op = prog(f, a, 8); break;
    case "slideD": ty = interpolate(e, [0, 18], [-200, 0], { ...CL, easing: EASE }); op = prog(f, a, 8); break;
    case "drop": ty = interpolate(e, [0, 26], [-700, 0], { ...CL, easing: BOUNCE }); op = prog(f, a, 3); break;
    case "slam": sc = interpolate(e, [0, 9], [2.6, 1], { ...CL, easing: EASE }); op = prog(f, a, 3); break;
    default: break;
  }
  if (hideAt < 1e9) op *= 1 - prog(f, hideAt, 8);
  let x = o.x ?? 960, y = o.y ?? 480;
  if (o.move) {
    const ma = ctx.T.at(ctx.i, o.move.at, a);
    const q = interpolate(f - ma, [0, (o.move.dur ?? 1) * 30], [0, 1], { ...CL, easing: o.move.linear ? Easing.linear : Easing.inOut(Easing.cubic) });
    x += ((o.move.to?.[0] ?? x) - x) * q; y += ((o.move.to?.[1] ?? y) - y) * q;
  }
  let rot = o.rot ?? 0, pulse = 1;
  const t = f / 30;
  switch (o.loop) {
    case "float": y += Math.sin(t * 2.4 + (o.x ?? 0)) * 10; break;
    case "shake": x += Math.sin(t * 40) * 5; rot += Math.sin(t * 33) * 1.5; break;
    case "pulse": pulse = 1 + Math.sin(t * 6) * 0.05; break;
    case "spin": rot += t * 120; break;
    case "swing": rot += Math.sin(t * 3) * 6; break;
    default: break;
  }
  const flip = o.flip ? -1 : 1;
  return (
    <div style={{ position: "absolute", left: x + tx, top: y + ty, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${(o.s ?? 1) * sc * pulse * flip}, ${(o.s ?? 1) * sc * pulse})`, opacity: op * (o.op ?? 1), transformOrigin: "50% 50%" }}>
      <Body o={o} f={f} a={a} ctx={ctx} p={0} />
    </div>
  );
};

/** Hand-drawn "boil": the filter seed changes a few times a second so lines wobble like a flipbook. */
export const Boil: React.FC<{ id: string; seed: number }> = ({ id, seed }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={4.5} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const dust = (f: number, seed: string, dark: boolean) =>
  Array.from({ length: 14 }, (_, i) => {
    const y = 1200 - ((f * (0.3 + random(`${seed}s${i}`)) * 0.9 + random(`${seed}y${i}`) * 1300) % 1300);
    return (
      <div key={i} style={{ position: "absolute", left: random(`${seed}x${i}`) * 1920, top: y, width: 6 + random(`${seed}z${i}`) * 8, height: 6 + random(`${seed}z${i}`) * 8, borderRadius: 9, background: dark ? "#fff" : PAL.ink, opacity: 0.05 + random(`${seed}o${i}`) * 0.06 }} />
    );
  });
