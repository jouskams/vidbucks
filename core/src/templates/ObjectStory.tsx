// TEMPLATE "ObjectStory": editorial object-metaphor film. Paper-grain scenes (a framed portrait splits open to reveal an object, a second
// object pushes in) then a dark stage with a lit circle and a rotating light cone over a wireframe "field". Small light words + one bold
// keyword per caption, timed to a voice-over. Typical reference: a 10-20 s monochrome vertical Short with 3D-looking photographed objects.
// All images are transparent PNG cut-outs (tools/cutout.py) or plain photos; texts, times and audio come from `ObjectStoryConfig`.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/InterTight";
import { AudioCfg, AudioLayer, CL, EASE, GrainVignette, useTime } from "./kit";

const { fontFamily: SANS } = loadSans("normal", { weights: ["400", "500", "800"], subsets: ["latin", "latin-ext"] });

export type ObjImg = { src: string; w: number; h: number };      // src under public/, w/h = display box at 1080 px width
export type Caption = { small: [text: string, at: number][]; big: string; bigAt: number; end: number; on: "paper" | "stage"; x?: number; y: number }; // x in px (paper, left aligned), y = fraction of height
export type ObjectStoryConfig = {
  width: number; height: number; fps: number; durationSec: number;
  paper: { center: string; mid: string; edge: string; ink: string; small: string };   // paper scene colours
  stage: { bg: string; glow: string; fg: string };                                       // dark stage colours
  images: { portrait: string; objectA: ObjImg; objectB: ObjImg; stageObject: ObjImg };  // portrait fills an octagonal frame (cover)
  t: { frameIn: number; split: number; eyeIn: number; cut: number; lockupAt: number };    // key moments in seconds
  captions: Caption[];
  stageGrid?: boolean;        // faint wireframe "field" behind the zoom-out
  lockup?: { text: string; sub?: string; accent: string };
  audio?: AudioCfg;
};

const OCT = "polygon(9% 0,91% 0,100% 6%,100% 94%,91% 100%,9% 100%,0 94%,0 6%)";

export const ObjectStory: React.FC<{ cfg: ObjectStoryConfig }> = ({ cfg }) => {
  const f = useCurrentFrame(); const { width: W, height: H, fps } = cfg; const { sec, R } = useTime(fps); const t = f / fps;
  const u = Math.min(W, H) / 1080; const { t: T, paper, stage } = cfg; const cx = W / 2;
  const paperOn = t < T.cut;

  const Obj: React.FC<{ img: ObjImg; x: number; y: number; s: number; r?: number; blur?: number; op?: number; shadow?: number }> = ({ img, x, y, s, r = 0, blur = 0, op = 1, shadow = 1 }) => (
    <div style={{ position: "absolute", left: x - (img.w * u) / 2, top: y - (img.h * u) / 2, width: img.w * u, height: img.h * u, transform: `scale(${s}) rotate(${r}deg)`, opacity: op,
      filter: `blur(${blur}px) drop-shadow(${24 * shadow}px ${42 * shadow}px ${34 * shadow}px rgba(0,0,0,0.38))` }}>
      <Img src={staticFile(img.src)} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
  const line = (x1: number, y1: number, x2: number, y2: number, op: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(70,70,70,0.7)" strokeWidth={2} opacity={op} />;

  /* ---- paper scenes ---- */
  const by = H * 0.51;
  const fin = R(f, T.frameIn, T.frameIn + 0.7, 0, 1, EASE.out);
  const split = R(f, T.split, T.split + 0.75, 0, 1, EASE.io), out = R(f, T.split + 0.75, T.split + 2.25, 0, 1, EASE.sine);
  const push = 1 + R(f, 0, T.split + 0.15, 0, 0.08);
  const halfW = 312 * u, fh = 768 * u;
  const half = (side: 1 | -1) => (
    <div key={side} style={{ position: "absolute", left: cx - halfW, top: by - fh / 2, width: halfW * 2, height: fh, clipPath: side === -1 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
      transform: `translateX(${side * (split * 120 * u + out * 760 * u)}px) rotate(${side * split * 2.2}deg) scale(${(0.94 + 0.06 * fin) * push})`, opacity: fin * (1 - out * 0.1), filter: `blur(${(1 - fin) * 10}px) drop-shadow(0 30px 34px rgba(0,0,0,0.35))` }}>
      <div style={{ width: halfW * 2, height: fh, clipPath: OCT, background: "#d2d1cd", position: "relative" }}>
        <Img src={staticFile(cfg.images.portrait)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", filter: "grayscale(1) contrast(1.05)" }} />
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 3px rgba(235,235,232,0.9)", clipPath: OCT }} />
      </div>
    </div>
  );
  const bp = R(f, T.split + 0.1, T.split + 0.7, 0, 1, EASE.out), bexit = R(f, T.eyeIn - 0.1, T.eyeIn + 0.7, 0, 1, EASE.sine);
  const lineOp = R(f, T.split + 0.35, T.split + 0.75, 0, 0.9, EASE.out) * (1 - bexit);
  const ep = R(f, T.eyeIn + 0.2, T.eyeIn + 1.5, 0, 1, EASE.out), egrow = R(f, T.eyeIn + 1.5, T.cut, 0, 1, EASE.sine);
  const ey = H * 0.37 + H * 0.17 * ep, es = (0.62 + 0.38 * ep) * (1 + egrow * 0.2);
  const elo = R(f, T.eyeIn + 0.2, T.eyeIn + 0.9, 0, 0.9, EASE.out) * (1 - R(f, T.cut - 0.25, T.cut, 0, 1));

  const paperScene = paperOn && (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 62% at 50% 50%, ${paper.center} 0%, ${paper.mid} 60%, ${paper.edge} 100%)` }} />
      <svg width={W} height={H} style={{ position: "absolute", opacity: 0.22, mixBlendMode: "multiply" }}><filter id="os-paper"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={3} /><feColorMatrix type="saturate" values="0" /></filter><rect width={W} height={H} filter="url(#os-paper)" /></svg>
      <svg width={W} height={H} style={{ position: "absolute" }}>{line(0, by - 520 * u, cx + 120 * u, by + 20 * u, lineOp)}{line(W, by - 520 * u, cx - 120 * u, by + 20 * u, lineOp)}{line(0, by + 480 * u, cx + 80 * u, by + 40 * u, lineOp)}{line(W, by + 480 * u, cx - 80 * u, by + 40 * u, lineOp)}</svg>
      {t < T.eyeIn + 0.4 && <Obj img={cfg.images.objectA} x={cx} y={by + 20 * u} s={(0.55 + 0.45 * bp) * (1 + R(f, T.split + 0.55, T.eyeIn, 0, 0.1)) * (1 + bexit * 0.5)} r={-4 + R(f, T.split + 0.15, T.eyeIn + 0.2, 0, 5)} blur={(1 - bp) * 14 + bexit * 14} op={bp * (1 - bexit)} />}
      {t < T.eyeIn + 0.2 && <>{half(-1)}{half(1)}</>}
      {t >= T.eyeIn && t < T.cut && (<>
        <svg width={W} height={H} style={{ position: "absolute" }}>{line(0, ey - 70 * u - egrow * 40 * u, cx - 150 * u * es, ey + 20 * u, elo)}{line(W, ey + 120 * u, cx + 150 * u * es, ey + 20 * u, elo)}{line(cx - 260 * u, H, cx - 60 * u, ey + 130 * u * es, elo)}{line(cx + 230 * u, 0, cx + 40 * u, ey - 140 * u * es, elo)}</svg>
        <Obj img={cfg.images.objectB} x={cx} y={ey} s={es} r={-12 + 18 * R(f, T.eyeIn, T.cut, 0, 1)} blur={(1 - ep) * 4} op={Math.min(1, ep * 2.4)} shadow={1.1} />
      </>)}
    </AbsoluteFill>
  );

  /* ---- dark stage: lit circle + rotating light cone (all moments relative to the cut) ---- */
  const c0 = T.cut;
  const beam = () => {
    let a = -30;
    if (t < c0 + 1.15) a = interpolate(t, [c0 + 0.05, c0 + 1.15], [-30, -90], { ...CL, easing: EASE.sine });
    else if (t < c0 + 1.75) a = -90;
    else if (t < c0 + 2.85) a = interpolate(t, [c0 + 1.75, c0 + 2.85], [-90, -190], { ...CL, easing: EASE.sine });
    else a = interpolate(t, [c0 + 2.85, c0 + 4.05], [-190, -90], { ...CL, easing: EASE.sine });
    const half = interpolate(t, [c0 + 0.05, c0 + 1.15, c0 + 3.35, c0 + 4.55], [9, 15, 12, 0.45], { ...CL, easing: EASE.sine });
    return { a, half };
  };
  const stageScene = !paperOn && (() => {
    const zoom = R(f, c0 + 1.65, c0 + 4.35, 1, 0.38, EASE.sine) * (1 + R(f, c0, c0 + 1.75, 0.1, 0, EASE.out));
    const sx = cx, sy = H * 0.52, rad = 250 * u * zoom; const { a, half } = beam(); const L = 2600 * u, ar = (a * Math.PI) / 180, hr = (half * Math.PI) / 180;
    const pts = [[sx, sy], [sx + Math.cos(ar - hr) * L, sy + Math.sin(ar - hr) * L], [sx + Math.cos(ar + hr) * L, sy + Math.sin(ar + hr) * L]].map((p) => p.join(",")).join(" ");
    const grid = [[-1300, -1700, 2600, 220], [-1300, -1450, 620, 460], [-640, -1450, 620, 460], [20, -1450, 620, 460], [680, -1450, 620, 460], [-1300, -950, 1700, 1100], [440, -950, 860, 520], [440, -400, 860, 520], [-1300, 200, 2600, 260], [-1300, 520, 1250, 900], [-20, 520, 1320, 900]];
    const wf = R(f, c0 + 1.55, c0 + 3.75, 0, 1);
    return (
      <AbsoluteFill style={{ background: stage.bg }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 55% at 50% 52%, ${stage.glow}, ${stage.bg})` }} />
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {cfg.stageGrid !== false && <g transform={`translate(${sx},${sy}) scale(${zoom * u})`} opacity={wf}>{grid.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx={26} fill="none" stroke="#2c2c2b" strokeWidth={2.5 / (zoom * u)} />)}</g>}
          <defs><linearGradient id="os-beam" gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={sx + Math.cos(ar) * 1500 * u} y2={sy + Math.sin(ar) * 1500 * u}><stop offset="0" stopColor="#e6e5e1" stopOpacity="0.95" /><stop offset="0.55" stopColor="#bdbcb8" stopOpacity="0.55" /><stop offset="1" stopColor="#8d8c88" stopOpacity="0.18" /></linearGradient></defs>
          <polygon points={pts} fill="url(#os-beam)" opacity={R(f, c0 + 0.05, c0 + 0.35, 0, 1)} />
        </svg>
        <div style={{ position: "absolute", left: sx - rad, top: sy - rad, width: rad * 2, height: rad * 2, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #deddd9, #c3c2be 75%, #aeada9)", boxShadow: "0 0 80px rgba(220,220,215,0.18)", transform: `scale(${R(f, c0, c0 + 0.35, 0.7, 1, EASE.out)})` }} />
        <Obj img={cfg.images.stageObject} x={sx} y={sy + 6 * zoom} s={0.38 * zoom * R(f, c0, c0 + 0.4, 0.7, 1, EASE.out)} r={-4} shadow={0.35} />
      </AbsoluteFill>
    );
  })();

  /* ---- captions: small light words + one bold keyword ---- */
  const capView = cfg.captions.map((c, k) => {
    if (c.on === "paper" ? !paperOn : paperOn) return null;
    if (t < c.small[0][1] || t > c.end + 0.3) return null;
    const ex = interpolate(t, [c.end, c.end + 0.25], [0, 1], { ...CL, easing: EASE.in }); const center = c.on === "stage"; const stageText = c.on === "stage";
    return (
      <div key={k} style={{ position: "absolute", left: center ? 0 : (c.x ?? 100) * u, right: center ? 0 : undefined, top: H * c.y, display: "flex", alignItems: "baseline", justifyContent: center ? "center" : "flex-start", gap: 14 * u, opacity: 1 - ex, transform: `translateY(${-ex * 30}px)`, fontFamily: SANS, whiteSpace: "nowrap", mixBlendMode: stageText ? "difference" : "normal" }}>
        {c.small.map(([w, at], i) => { const p = interpolate(t, [at, at + 0.14], [0, 1], { ...CL, easing: EASE.out }); return <span key={i} style={{ fontSize: 34 * u, fontWeight: 400, letterSpacing: -0.5, color: stageText ? "#8a8a8a" : paper.small, opacity: p, transform: `translateY(${(1 - p) * 14}px)`, display: "inline-block" }}>{w}</span>; })}
        {t >= c.bigAt && (() => { const p = interpolate(t, [c.bigAt, c.bigAt + 0.22], [0, 1], { ...CL, easing: EASE.out }); return <span style={{ fontSize: 118 * u, fontWeight: 800, letterSpacing: -4 * u, lineHeight: 0.9, color: stageText ? "#ffffff" : paper.ink, transform: `scale(${1.22 - 0.22 * p})`, transformOrigin: "left bottom", opacity: p, display: "inline-block", filter: `blur(${(1 - p) * 8}px)` }}>{c.big}</span>; })()}
      </div>
    );
  });
  const lk = cfg.lockup; const lp = lk ? R(f, T.lockupAt, T.lockupAt + 0.7, 0, 1, EASE.out) : 0;
  const shake = (t > T.split && t < T.split + 0.15) || (t > T.cut && t < T.cut + 0.13) ? (random(`os${f}`) - 0.5) * 12 : 0;
  return (
    <AbsoluteFill style={{ background: paper.edge }}>
      <AudioLayer cfg={cfg.audio} fps={fps} duration={sec(cfg.durationSec)} />
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
        {paperScene}{stageScene}{capView}
        {lk && t >= T.lockupAt && (
          <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.76, textAlign: "center", opacity: lp, transform: `translateY(${(1 - lp) * 24}px)`, fontFamily: SANS }}>
            <span style={{ fontSize: 150 * u, fontWeight: 800, letterSpacing: -7 * u, color: stage.fg }}>{lk.text}</span><span style={{ display: "inline-block", width: 20 * u, height: 20 * u, borderRadius: 10 * u, background: lk.accent, marginLeft: 8 * u }} />
            {lk.sub && <div style={{ fontSize: 28 * u, fontWeight: 500, letterSpacing: 18 * u, color: "#8a8a88", marginTop: 6 * u, marginRight: -18 * u }}>{lk.sub}</div>}
          </div>
        )}
      </AbsoluteFill>
      <GrainVignette frame={f} w={W} h={H} grain={0.13} vignette={0.38} />
    </AbsoluteFill>
  );
};
