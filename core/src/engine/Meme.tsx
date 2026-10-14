import React from "react";
import { Img, interpolate, random, staticFile } from "remotion";
import { CL, EASE, HAND } from "./theme";
import type { Ctx } from "./Objs";

/* "Meme-sketch" kit: black line-art characters with stipple stubble on top of real photos, phone chats, calls, polaroids.
   Original characters drawn here (no copied meme art). Ages: 0 = early 20s, 1 = 30s, 2 = 40s. */
type P = { o: Record<string, any>; f: number; a: number; ctx: Ctx };
const INK = "#141414";
const SKIN = "#f4f1ea";
const SW = 6;

/* ---------- full-frame photo background ---------- */
export const Photo: React.FC<P> = ({ o, f, ctx }) => {
  const dur = Math.max(1, ctx.dur);
  const z = o.zoom ? interpolate(f, [0, dur], o.zoom, { ...CL, easing: EASE }) : 1.04;
  const flt = `blur(${o.blur ?? 1.5}px) brightness(${o.bright ?? 0.85}) saturate(${o.sat ?? 0.8}) contrast(${o.contrast ?? 1}) sepia(${o.sepia ?? 0})`;
  return (
    <div style={{ width: 1920, height: 1080, overflow: "hidden" }}>
      <Img src={staticFile(o.src)} style={{ width: 1920, height: 1080, objectFit: "cover", objectPosition: o.pos ?? "50% 50%", transform: `scale(${z})`, filter: flt }} />
      {o.tint && <div style={{ position: "absolute", inset: 0, background: o.tint }} />}
    </div>
  );
};

/* ---------- the character (bust) ---------- */
const HEAD = "M300 70 C 422 70 472 160 466 262 C 462 342 422 410 362 446 C 332 463 268 463 238 446 C 178 410 138 342 134 262 C 128 160 178 70 300 70 Z";
const BROWS: Record<string, [number, number]> = { neutral: [0, 0], smile: [-4, 2], laugh: [-8, 4], sad: [-16, 10], cry: [-20, 12], tired: [4, 6], surprised: [-22, -14], worried: [-18, 8], smirk: [2, -6], angry: [16, -8] };
const MOUTH = (e: string, f: number): React.ReactNode => {
  const y = 372;
  switch (e) {
    case "smile": return <path d={`M248 ${y} Q300 ${y + 34} 352 ${y}`} stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />;
    case "laugh": return (
      <g>
        <path d={`M226 ${y - 12} Q300 ${y + 92} 374 ${y - 12} Z`} fill="#3a1d1d" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d={`M236 ${y - 8} L364 ${y - 8} L356 ${y + 10} L244 ${y + 10} Z`} fill="#fff" />
        <path d={`M266 ${y + 52} Q300 ${y + 30} 334 ${y + 52}`} fill="#d36a6a" />
      </g>
    );
    case "sad": return <path d={`M258 ${y + 16} Q300 ${y - 10} 342 ${y + 16}`} stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />;
    case "cry": return <path d={`M246 ${y + 10} q 13 -14 26 0 t 26 0 t 26 0 t 26 0`} stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />;
    case "surprised": return <ellipse cx={300} cy={y + 8} rx={16} ry={22} fill="#3a1d1d" stroke={INK} strokeWidth={5} />;
    case "smirk": return <path d={`M262 ${y + 6} Q310 ${y + 16} 348 ${y - 8}`} stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />;
    case "tired": return <path d={`M272 ${y + 6} Q300 ${y} 328 ${y + 8}`} stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />;
    case "worried": return <path d={`M262 ${y + 8} q 10 -10 19 0 t 19 0 t 19 0 t 19 0`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
    case "angry": return <path d={`M258 ${y + 10} L342 ${y + 10}`} stroke={INK} strokeWidth={SW + 1} strokeLinecap="round" />;
    default: return <path d={`M266 ${y + 4} L334 ${y + 4}`} stroke={INK} strokeWidth={SW} strokeLinecap="round" />;
  }
};
const HAIR = (kind: string, age: number, color: string): React.ReactNode => {
  const c = color;
  switch (kind) {
    case "short":
      return age >= 2
        ? <path d="M136 236 C 132 150 190 82 300 80 C 410 80 470 150 464 236 C 452 196 430 168 412 160 C 400 196 372 176 350 150 C 330 168 300 140 280 156 C 250 140 220 170 190 160 C 168 170 148 196 136 236 Z" fill={c} stroke={INK} strokeWidth={5} />
        : <path d="M134 238 C 126 132 196 60 300 62 C 412 60 476 132 466 238 C 452 186 418 150 396 146 C 376 172 340 150 318 136 C 292 158 262 140 236 150 C 208 146 160 176 134 238 Z" fill={c} stroke={INK} strokeWidth={5} />;
    case "curly":
      return <g fill={c} stroke={INK} strokeWidth={4}>{Array.from({ length: 15 }, (_, i) => { const t = i / 14; const x = 150 + t * 300, y = 150 - Math.sin(t * Math.PI) * 80 + (i % 2) * 18; return <circle key={i} cx={x} cy={y} r={36 - age * 4} />; })}</g>;
    case "cap":
      return (
        <g stroke={INK} strokeWidth={5}>
          <path d="M140 210 C 140 110 210 66 300 66 C 390 66 460 110 460 210 Z" fill={c} />
          <path d="M140 206 C 240 196 380 196 560 220 C 520 238 420 232 330 226 C 260 222 190 222 140 230 Z" fill={c} />
          <circle cx={300} cy={70} r={10} fill={c} />
        </g>
      );
    case "beanie":
      return (
        <g stroke={INK} strokeWidth={5}>
          <path d="M140 206 C 136 100 210 50 300 50 C 390 50 464 100 460 206 Z" fill={c} />
          <path d="M132 200 L468 200 L468 248 L132 248 Z" fill={c} />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${150 + i * 27} 204 v 40`} stroke={INK} strokeWidth={2} opacity={0.5} />)}
        </g>
      );
    default: return null;
  }
};

export const Meme: React.FC<P> = ({ o, f, a, ctx }) => {
  const exs: { at: any; to: string }[] = o.exprs ?? [];
  let e = o.expr ?? "neutral";
  for (const q of exs) if (f >= ctx.T.at(ctx.i, q.at, 0)) e = q.to;
  const age = o.age ?? 0;
  const look: [number, number] = o.look ?? [0, 0];
  const br = BROWS[e] ?? [0, 0];
  const blink = e !== "laugh" && (f + (o.seed ?? 0) * 17) % 118 > 113;
  const breathe = 1 + Math.sin((f + (o.seed ?? 0) * 9) * 0.07) * 0.008;
  const bob = e === "laugh" ? Math.abs(Math.sin(f * 0.55)) * -8 : 0;
  const seed = `m${o.seed ?? 0}`;
  // stubble: dots inside the lower face
  const dots = age === 0 ? (o.stubble ?? 30) : age === 1 ? 110 : 190;
  const stub: React.ReactNode[] = [];
  for (let k = 0; k < dots; k++) {
    const t = random(`${seed}t${k}`) * Math.PI, rr = 0.55 + random(`${seed}r${k}`) * 0.42;
    const x = 300 + Math.cos(t) * 150 * rr, y = 352 + Math.sin(t) * 98 * rr;
    if (Math.abs(x - 300) < 58 && y < 400 && y > 352) continue; // keep the mouth clear
    stub.push(<circle key={k} cx={x} cy={y} r={1.6 + random(`${seed}s${k}`) * 1.3} fill={age >= 2 ? "#7d7d7d" : "#3a3a3a"} />);
  }
  const eye = (cx: number) => (
    <g key={cx}>
      {e === "laugh" ? <path d={`M${cx - 30} 262 Q${cx} 236 ${cx + 30} 262`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" /> : blink ? <path d={`M${cx - 30} 256 Q${cx} 266 ${cx + 30} 256`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" /> : (
        <>
          <ellipse cx={cx} cy={256} rx={30} ry={e === "surprised" ? 22 : e === "tired" || age >= 1 ? 13 : 16} fill="#fff" stroke={INK} strokeWidth={4} />
          <circle cx={cx + look[0] * 10} cy={256 + look[1] * 5} r={e === "surprised" ? 6 : 8} fill={INK} />
          {(e === "tired" || e === "sad" || e === "neutral" || e === "cry" || age >= 1) && <path d={`M${cx - 32} 252 Q${cx} 236 ${cx + 32} 252 L ${cx + 30} 246 Q${cx} 228 ${cx - 30} 246 Z`} fill={SKIN} stroke={INK} strokeWidth={5} strokeLinejoin="round" />}
        </>
      )}
      {(age >= 1 || e === "tired" || e === "cry" || o.bags) && <path d={`M${cx - 30} 268 Q${cx} 300 ${cx + 30} 268 Q${cx} 282 ${cx - 30} 268 Z`} fill="#8f8aa6" opacity={0.45} />}
      {(age >= 1 || e === "tired" || e === "cry" || o.bags) && <path d={`M${cx - 26} 282 Q${cx} 296 ${cx + 26} 282`} stroke={INK} strokeWidth={3} fill="none" opacity={0.7} />}
      {age >= 1 && <path d={`M${cx - 20} 290 Q${cx} 300 ${cx + 20} 290`} stroke={INK} strokeWidth={2.5} fill="none" opacity={0.5} />}
      {(e === "cry" || o.tears) && (
        <path d={`M${cx - 8} 272 C ${cx - 14} 320 ${cx - 2} 360 ${cx - 12} ${400 + Math.sin(f * 0.2) * 6}`} stroke="#5aa8e8" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.85} />
      )}
    </g>
  );
  return (
    <svg width={600} height={720} viewBox="0 0 600 720" style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${bob}) translate(300 700) scale(1 ${breathe}) translate(-300 -700)`}>
        {/* body */}
        {o.hood && <path d="M170 560 C 180 470 230 440 300 440 C 370 440 420 470 430 560 Z" fill={o.shirt ?? "#3b4a63"} stroke={INK} strokeWidth={SW} />}
        <path d="M-10 1300 L14 720 C 30 616 110 556 236 530 L 364 530 C 490 556 570 616 586 720 L610 1300 Z" fill={o.shirt ?? "#3b4a63"} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M-10 1300 L14 720 C 30 616 110 556 236 530 L 250 540 C 150 570 80 630 70 720 L60 1300 Z" fill="rgba(0,0,0,0.18)" />
        {o.hood && <g stroke={INK} strokeWidth={4}><path d="M272 548 L262 640" /><path d="M328 548 L338 640" /><circle cx={262} cy={646} r={6} fill="#ddd" /><circle cx={338} cy={646} r={6} fill="#ddd" /></g>}
        <path d="M258 452 L 258 532 L 342 532 L 342 452" fill={SKIN} stroke={INK} strokeWidth={SW} />
        {o.collar !== false && <path d="M236 532 L 300 590 L 364 532" fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" opacity={0.8} />}
        {/* ears */}
        <path d="M140 250 C 110 240 104 300 140 312" fill={SKIN} stroke={INK} strokeWidth={5} />
        <path d="M460 250 C 490 240 496 300 460 312" fill={SKIN} stroke={INK} strokeWidth={5} />
        {/* head */}
        <path d={HEAD} fill={SKIN} stroke={INK} strokeWidth={SW + 1} strokeLinejoin="round" />
        <path d="M466 262 C 462 342 422 410 362 446 C 400 400 430 340 432 262 C 434 190 410 120 360 84 C 430 104 470 180 466 262 Z" fill="rgba(60,55,70,0.10)" />
        <path d="M250 430 Q300 452 350 430" stroke={INK} strokeWidth={3} fill="none" opacity={0.45} />
        <g>{stub}</g>
        {age >= 2 && [0, 1, 2].map((k) => <path key={k} d={`M${226 + k * 6} ${150 + k * 16} Q300 ${140 + k * 16} ${374 - k * 6} ${150 + k * 16}`} stroke={INK} strokeWidth={3} fill="none" opacity={0.55} />)}
        {age >= 1 && <><path d="M262 318 Q240 350 252 384" stroke={INK} strokeWidth={3} fill="none" opacity={0.55} /><path d="M338 318 Q360 350 348 384" stroke={INK} strokeWidth={3} fill="none" opacity={0.55} /></>}
        {/* brows */}
        <path d={`M206 ${214 + br[1]} L266 ${208 + br[0]}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d={`M334 ${208 + br[0]} L394 ${214 + br[1]}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />
        {eye(240)}{eye(360)}
        {/* nose */}
        <path d="M302 268 C 296 296 282 316 290 326 C 298 334 314 330 318 324" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        {MOUTH(e, f)}
        {o.glasses && (
          <g stroke={INK} strokeWidth={7} fill="rgba(255,255,255,0.12)">
            <rect x={196} y={226} width={92} height={62} rx={18} /><rect x={312} y={226} width={92} height={62} rx={18} /><path d="M288 250 Q300 242 312 250" fill="none" />
          </g>
        )}
        {HAIR(o.hair ?? "none", age, o.hairColor ?? "#2b2420")}
      </g>
    </svg>
  );
};

/* ---------- phone chat ---------- */
type Msg = { from: string; text?: string; at: any; img?: Record<string, any>; sep?: boolean };
const NAMECOL: Record<string, string> = { Mike: "#e8913d", Dan: "#5fb36a", Leo: "#b07be0" };
export const Chat: React.FC<P> = ({ o, f, ctx }) => {
  const W = 760, H = 1040;
  const msgs: Msg[] = o.msgs ?? [];
  const shown = msgs.filter((m) => f >= ctx.T.at(ctx.i, m.at, 0));
  const d = o.draft as { text: string; at: any; typeDur?: number; delAt?: any; delDur?: number; sendAt?: any } | undefined;
  let draft = "";
  if (d) {
    const ta = ctx.T.at(ctx.i, d.at, 1e9), td = (d.typeDur ?? 1.6) * 30;
    const n = Math.floor(interpolate(f - ta, [0, td], [0, d.text.length], CL));
    draft = d.text.slice(0, Math.max(0, n));
    if (d.delAt !== undefined) {
      const da = ctx.T.at(ctx.i, d.delAt, 1e9), dd = (d.delDur ?? 0.9) * 30;
      if (f >= da) draft = d.text.slice(0, Math.max(0, Math.floor(interpolate(f - da, [0, dd], [n, 0], CL))));
    }
    if (d.sendAt !== undefined && f >= ctx.T.at(ctx.i, d.sendAt, 1e9)) draft = "";
  }
  const sent: Msg[] = d?.sendAt !== undefined && f >= ctx.T.at(ctx.i, d.sendAt, 1e9) ? [{ from: "me", text: d.text, at: d.sendAt }] : [];
  const typing = (o.typing ?? []).find((t: any) => f >= ctx.T.at(ctx.i, t.at, 1e9) && f < ctx.T.at(ctx.i, t.until, 1e9));
  const list = [...shown, ...sent];
  // layout from the bottom up
  const items: React.ReactNode[] = [];
  let y = H - 150 - (typing ? 70 : 0);
  for (let k = list.length - 1; k >= 0 && y > 150; k--) {
    const m = list[k];
    const age = f - ctx.T.at(ctx.i, m.at, 0);
    const pop = interpolate(age, [0, 7], [0.6, 1], { ...CL, easing: EASE });
    if (m.sep) {
      y -= 64;
      items.push(<div key={k} style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: HAND, fontSize: 30, color: "#8d93a3" }}>{m.text}</div>);
      continue;
    }
    const me = m.from === "me";
    const lines = Math.max(1, Math.ceil((m.text?.length ?? 0) / 22));
    const h = m.img ? 360 : 40 + lines * 44 + (me ? 0 : 30);
    if (y - h - 18 < 150) break;
    y -= h + 18;
    items.push(
      <div key={k} style={{ position: "absolute", top: y, [me ? "right" : "left"]: 36, maxWidth: 520, transform: `scale(${pop})`, transformOrigin: me ? "100% 100%" : "0% 100%" }}>
        {!me && <div style={{ fontFamily: HAND, fontSize: 28, color: NAMECOL[m.from] ?? "#9aa", marginLeft: 18, marginBottom: 2 }}>{m.from}</div>}
        {m.img ? (
          <div style={{ borderRadius: 26, overflow: "hidden", border: "4px solid #2a2d38" }}><Snapshot o={{ ...m.img, w: 480, h: 320, frame: false }} f={f} a={0} ctx={ctx} /></div>
        ) : (
          <div style={{ background: me ? "#2f7cf6" : "#2a2d38", color: "#fff", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 38, lineHeight: 1.18, padding: "16px 26px", borderRadius: 30, borderBottomRightRadius: me ? 8 : 30, borderBottomLeftRadius: me ? 30 : 8 }}>{m.text}</div>
        )}
      </div>,
    );
  }
  return (
    <div style={{ width: W, height: H, borderRadius: 70, background: "#0c0d12", border: "14px solid #1c1e26", boxShadow: "0 40px 80px rgba(0,0,0,0.55)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 140, background: "#16171f", borderBottom: "2px solid #23252f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {["M", "D", "L"].map((c, k) => <div key={c} style={{ width: 44, height: 44, borderRadius: 22, background: Object.values(NAMECOL)[k], color: "#fff", fontFamily: HAND, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #16171f", marginLeft: k ? -14 : 0 }}>{c}</div>)}
        </div>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 32, color: "#e8e9ee", marginTop: 6 }}>{o.title ?? "the boys"}</div>
      </div>
      {items}
      {typing && (
        <div style={{ position: "absolute", left: 36, bottom: 160, background: "#2a2d38", borderRadius: 30, padding: "18px 26px", display: "flex", gap: 10 }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ width: 16, height: 16, borderRadius: 8, background: "#9aa0b0", opacity: 0.4 + 0.6 * Math.max(0, Math.sin(f * 0.3 - k)) }} />)}
        </div>
      )}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 34, height: 86, borderRadius: 43, background: "#1c1e26", border: "2px solid #2c2f3a", display: "flex", alignItems: "center", padding: "0 30px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 36, color: draft ? "#fff" : "#5d6272" }}>
        {draft || "Message"}{draft && f % 30 < 16 ? "|" : ""}
        <div style={{ marginLeft: "auto", width: 58, height: 58, borderRadius: 29, background: draft ? "#2f7cf6" : "#2c2f3a" }} />
      </div>
    </div>
  );
};

/* ---------- call screen ---------- */
export const Call: React.FC<P> = ({ o, f, ctx }) => {
  const W = 760, H = 1040;
  const ans = o.answerAt !== undefined ? ctx.T.at(ctx.i, o.answerAt, 1e9) : 1e9;
  const on = f >= ans, secs = on ? Math.floor((f - ans) / 30) : 0;
  return (
    <div style={{ width: W, height: H, borderRadius: 70, background: "linear-gradient(180deg,#1b2a3a,#0c0d12)", border: "14px solid #1c1e26", position: "relative", overflow: "hidden", fontFamily: "Helvetica, Arial, sans-serif", color: "#fff", textAlign: "center" }}>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {!on && [0, 1, 2].map((k) => { const q = ((f / 30 + k * 0.5) % 1.5) / 1.5; return <div key={k} style={{ position: "absolute", width: 220 + q * 260, height: 220 + q * 260, marginTop: -q * 130, borderRadius: "50%", border: "4px solid #7fb2ff", opacity: 1 - q }} />; })}
        <div style={{ width: 220, height: 220, borderRadius: 110, background: NAMECOL[o.name] ?? "#e8913d", fontSize: 110, fontFamily: HAND, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>{(o.name ?? "M")[0]}</div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, fontSize: 64, fontWeight: 700 }}>{o.name ?? "Mike"}</div>
      <div style={{ position: "absolute", top: 610, left: 0, right: 0, fontSize: 38, color: on ? "#7be07b" : "#9aa0b0" }}>{on ? `00:0${Math.min(9, secs)}` : `calling${".".repeat(1 + (Math.floor(f / 10) % 3))}`}</div>
      <div style={{ position: "absolute", bottom: 90, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 130, height: 130, borderRadius: 65, background: "#e5383b" }} />
      </div>
    </div>
  );
};

/* ---------- polaroid / photo-with-people ---------- */
export const Snapshot: React.FC<P> = ({ o, f, a, ctx }) => {
  const w = o.w ?? 640, h = o.h ?? 420, ppl: Record<string, any>[] = o.people ?? [];
  const inner = (
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden", background: "#222" }}>
      <Img src={staticFile(o.src)} style={{ width: w, height: h, objectFit: "cover", filter: `saturate(${o.sat ?? 0.85}) brightness(${o.bright ?? 0.95}) sepia(${o.sepia ?? 0.15})` }} />
      {ppl.map((p, k) => (
        <div key={k} style={{ position: "absolute", left: (k + 0.5) * (w / ppl.length) - 300 * (o.ps ?? 0.42), top: h - 720 * (o.ps ?? 0.42) + 20, transform: `scale(${o.ps ?? 0.42})`, transformOrigin: "0 0" }}>
          <Meme o={{ ...p, seed: k + 3 }} f={f} a={a} ctx={ctx} />
        </div>
      ))}
    </div>
  );
  if (o.frame === false) return inner;
  return (
    <div style={{ background: o.wood ? "linear-gradient(135deg,#8a6a3e,#5e4524)" : "#f4f1e8", padding: o.wood ? 26 : "22px 22px 70px", boxShadow: "0 24px 50px rgba(0,0,0,0.5)", transform: `rotate(${o.tilt ?? -3}deg)` }}>
      {inner}
      {o.caption && !o.wood && <div style={{ fontFamily: HAND, fontSize: 40, color: "#333", textAlign: "center", marginTop: 8 }}>{o.caption}</div>}
    </div>
  );
};

/* ---------- year title ---------- */
export const YearCard: React.FC<P> = ({ o, f, a }) => {
  const e = f - a;
  const s = interpolate(e, [0, 10], [1.25, 1], { ...CL, easing: EASE });
  const op = interpolate(e, [0, 6], [0, 1], CL);
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 800, fontSize: o.size ?? 220, letterSpacing: 18, color: "#f2eee3", opacity: op, transform: `scale(${s})`, textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
      {o.t}
      {o.sub && <div style={{ fontSize: 46, letterSpacing: 6, fontWeight: 400, color: "#b9b4a8", textAlign: "center", marginTop: 4 }}>{o.sub}</div>}
    </div>
  );
};
