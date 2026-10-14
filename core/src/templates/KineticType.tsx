// TEMPLATE "KineticType": one word per beat, hard colour inversions, smears and whips, a glitch burst, a light-orb reveal into a logo card,
// optional "picture cards" (headline word + image panel). Cuts sit on a BPM grid. Works at any size (9:16 and 16:9 from the same config).
// Typical reference: a trailer-style Short/Reel made of big type on solid colours with motion blur. All content comes from `KineticConfig`.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadWide } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadSans } from "@remotion/google-fonts/InterTight";
import { AudioCfg, AudioLayer, CL, EASE, GrainVignette } from "./kit";

const { fontFamily: WIDE } = loadWide("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: SANS } = loadSans("normal", { weights: ["500", "800"], subsets: ["latin", "latin-ext"] });

export type Fx = "slam" | "whip" | "stretch" | "zoom" | "type";
export type KEvent =
  | { at: number; kind: "word"; text: string; bg: "dark" | "light" | "accent"; fx: Fx }
  | { at: number; kind: "glitch" }
  | { at: number; kind: "orb" }
  | { at: number; kind: "logo"; text: string; sub?: string; tagline?: string }
  | { at: number; kind: "card"; title: string; sub: string; image?: string };       // `at` in beats; image under public/
export type KineticConfig = {
  width: number; height: number; fps: number; bpm: number; endBeat: number;
  palette: { dark: string; light: string; accent: string };
  hud?: string;                // small label top-left + timecode + progress bar; omit to hide
  events: KEvent[];            // sorted by `at`
  audio?: AudioCfg;
};

export const KineticType: React.FC<{ cfg: KineticConfig }> = ({ cfg }) => {
  const f = useCurrentFrame(); const { width, height, fps, palette: P } = cfg; const vert = height > width;
  const b = (n: number) => Math.round(n * (60 / cfg.bpm) * fps); const dur = b(cfg.endBeat);
  let i = 0; for (let k = 0; k < cfg.events.length; k++) if (f >= b(cfg.events[k].at)) i = k;
  const ev = cfg.events[i]; const start = b(ev.at); const evDur = (i + 1 < cfg.events.length ? b(cfg.events[i + 1].at) : dur) - start; const l = f - start;
  const ein = (a: number, d = 6) => interpolate(l, [a, a + d], [0, 1], { ...CL, easing: EASE.out });
  const avail = vert ? width * 0.9 : width * 0.92, max = vert ? 260 : 300;
  const fit = (t: string, av: number, mx: number) => Math.min(mx, av / (t.length * 1.0));
  const colors = { dark: [P.dark, P.light], light: [P.light, P.dark], accent: [P.accent, P.dark] } as const;

  let scene: React.ReactNode = null;
  if (ev.kind === "word") {
    const [bg, fg] = colors[ev.bg]; const size = fit(ev.text, avail, max); const p = interpolate(l, [0, ev.fx === "stretch" ? 9 : 5], [0, 1], { ...CL, easing: EASE.out });
    const exit = interpolate(l, [evDur - 3, evDur], [0, 1], { ...CL, easing: EASE.in });
    let tr = "", blur = 0, ls = -0.02, ghosts = 0;
    if (ev.fx === "slam") { tr = `scale(${1.5 - 0.5 * p})`; blur = (1 - p) * 14; }
    if (ev.fx === "whip") { tr = `translateX(${(1 - p) * 70}%) skewX(${(1 - p) * -25}deg)`; blur = (1 - p) * 30; ghosts = 1 - p; }
    if (ev.fx === "stretch") { tr = `scaleY(${interpolate(p, [0, 0.6, 1], [0.08, 1.35, 1])}) scaleX(${interpolate(p, [0, 1], [1.25, 1])})`; ls = interpolate(p, [0, 1], [0.25, -0.02]); }
    if (ev.fx === "zoom") { tr = `scale(${interpolate(l, [0, evDur], [0.9, 1.12], CL)})`; blur = (1 - p) * 10; }
    const shown = ev.fx === "type" ? ev.text.slice(0, Math.max(1, Math.ceil(l / 2))) : ev.text;
    const style: React.CSSProperties = { fontFamily: WIDE, fontWeight: 900, fontSize: size, lineHeight: 0.95, letterSpacing: `${ls}em`, color: fg, whiteSpace: "nowrap", textAlign: "center" };
    scene = (
      <AbsoluteFill style={{ background: bg }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${1 + exit * 1.6})`, filter: `blur(${blur + exit * 12}px)`, opacity: 1 - exit * 0.6 }}>
          {ghosts > 0.05 && [1, 2, 3].map((g) => <div key={g} style={{ ...style, position: "absolute", transform: `translateX(${g * 9 * ghosts}%)`, opacity: 0.25 * ghosts, color: ev.bg === "accent" ? P.dark : P.accent }}>{shown}</div>)}
          <div style={{ ...style, transform: tr }}>{shown}{ev.fx === "type" && l % 8 < 4 && <span style={{ color: P.accent }}>_</span>}</div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  } else if (ev.kind === "glitch") {
    const words = ["12 TABS", "CHAOS", "6 APPS", "NO SLEEP", "DMs", "SHEETS"];
    scene = (
      <AbsoluteFill style={{ background: P.dark, overflow: "hidden" }}>
        {Array.from({ length: 14 }, (_, k) => { const r = (s: string) => random(`${s}${k}${Math.floor(l / 2)}`); const w = words[k % words.length];
          return <div key={k} style={{ position: "absolute", left: `${r("x") * 80 - 10}%`, top: `${r("y") * 100}%`, fontFamily: WIDE, fontWeight: 900, fontSize: fit(w, avail, 260) * (0.5 + r("s")), color: [P.light, P.accent, "#FF2D55"][k % 3], opacity: 0.85, transform: `scaleX(${1 + r("k") * 2})`, filter: `blur(${r("b") * 6}px)`, mixBlendMode: "screen", whiteSpace: "nowrap" }}>{w}</div>; })}
        {Array.from({ length: 6 }, (_, k) => <div key={`bar${k}`} style={{ position: "absolute", left: 0, right: 0, top: `${random(`bar${k}${l}`) * 100}%`, height: 6 + random(`bh${k}${l}`) * 40, background: k % 2 ? P.accent : P.light, opacity: 0.6 }} />)}
      </AbsoluteFill>
    );
  } else if (ev.kind === "orb") {
    const g = interpolate(l, [0, evDur], [0.15, 1], { ...CL, easing: EASE.in }); const flash = interpolate(l, [evDur - 3, evDur], [0, 1], CL); const m = Math.max(width, height);
    scene = (
      <AbsoluteFill style={{ background: P.dark }}>
        <div style={{ position: "absolute", left: width / 2 - m * 0.6 * g, top: height / 2 - m * 0.6 * g, width: m * 1.2 * g, height: m * 1.2 * g, borderRadius: "50%", background: `radial-gradient(circle, ${P.accent} 0%, ${P.accent}59 12%, ${P.accent}00 55%)` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: height / 2 - 3, height: 6, background: `linear-gradient(90deg, transparent, ${P.accent}, #fff, ${P.accent}, transparent)`, transform: `scaleX(${g * 1.4})` }} />
        <div style={{ position: "absolute", left: width / 2 - 16, top: height / 2 - 16, width: 32, height: 32, borderRadius: "50%", background: "#fff", boxShadow: `0 0 60px 20px ${P.accent}` }} />
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      </AbsoluteFill>
    );
  } else if (ev.kind === "logo") {
    const size = vert ? 330 : 300; const streak = interpolate(l, [0, 14], [0, 1], { ...CL, easing: EASE.out });
    scene = (
      <AbsoluteFill style={{ background: P.dark, alignItems: "center", justifyContent: "center" }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at 50% 48%, ${P.accent}${Math.round(0.35 * streak * 255).toString(16).padStart(2, "0")} 0%, ${P.accent}00 70%)` }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1 + Math.sin(l / 9) * 0.015})` }}>
          <div style={{ display: "flex" }}>
            {[...ev.text].map((ch, k) => { const p = ein(k * 2, 8); return <div key={k} style={{ fontFamily: SANS, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.05, lineHeight: 1, color: P.accent, textShadow: `0 0 ${40 * p}px ${P.accent}b3`, transform: `translateY(${(1 - p) * 80}px) scale(${1.3 - 0.3 * p})`, filter: `blur(${(1 - p) * 16}px)`, opacity: p }}>{ch}</div>; })}
          </div>
          {ev.sub && <div style={{ fontFamily: WIDE, fontWeight: 700, fontSize: size * 0.17, color: P.light, letterSpacing: "0.55em", marginTop: size * 0.02, marginRight: -size * 0.09, opacity: ein(8, 10) }}>{ev.sub}</div>}
          {ev.tagline && <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: vert ? 74 : 64, color: P.light, letterSpacing: -1.5, marginTop: vert ? 120 : 70, textAlign: "center", opacity: ein(18, 10) }}>{ev.tagline}</div>}
        </div>
      </AbsoluteFill>
    );
  } else {
    const p = ein(2, 8); const exit = interpolate(l, [evDur - 3, evDur], [0, 1], { ...CL, easing: EASE.in });
    const word = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: vert ? "center" : "flex-start" }}>
        <div style={{ fontFamily: WIDE, fontWeight: 900, fontSize: fit(ev.title, vert ? width * 0.87 : width * 0.34, 170), lineHeight: 0.95, letterSpacing: "-0.02em", color: P.accent, transform: `scale(${1.4 - 0.4 * ein(0, 5)})`, filter: `blur(${(1 - ein(0, 5)) * 12}px)` }}>{ev.title}</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: vert ? 84 : 78, letterSpacing: -2, color: P.light, marginTop: 10, opacity: ein(3, 6) }}>{ev.sub}</div>
      </div>
    );
    const cw = vert ? width * 0.9 : width * 0.44, ch = vert ? height * 0.34 : height * 0.6;
    const card = (
      <div style={{ width: cw, height: ch, borderRadius: 36, background: P.light, overflow: "hidden", transform: `translateY(${(1 - p) * 500}px) rotateZ(${(1 - p) * -6}deg)`, filter: `blur(${(1 - p) * 18}px)`, boxShadow: `0 0 140px ${P.accent}40` }}>
        {ev.image ? <Img src={staticFile(ev.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ padding: 40 }}>{[0.9, 0.62, 0.8, 0.48].map((w, k) => <div key={k} style={{ height: 26, width: `${w * 100}%`, background: `${P.dark}${k % 2 ? "22" : "55"}`, borderRadius: 13, marginBottom: 26 }} />)}</div>}
      </div>
    );
    scene = (
      <AbsoluteFill style={{ background: P.dark, transform: `scale(${1 + exit * 0.5})`, filter: `blur(${exit * 14}px)` }}>
        {vert ? <AbsoluteFill style={{ alignItems: "center", paddingTop: 210, gap: 70 }}>{word}{card}</AbsoluteFill>
              : <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "0 100px", gap: 60 }}>{word}{card}</AbsoluteFill>}
      </AbsoluteFill>
    );
  }
  const shake = l < 4 && ev.kind !== "card" ? (random(`k${f}`) - 0.5) * 18 * (1 - l / 4) : 0;
  const onLight = ev.kind === "word" && ev.bg !== "dark"; const ink = onLight ? "rgba(10,10,10,0.6)" : "rgba(242,242,238,0.55)"; const pad = vert ? 70 : 56;
  const mono: React.CSSProperties = { position: "absolute", fontFamily: WIDE, fontWeight: 700, fontSize: vert ? 24 : 20, letterSpacing: "0.2em", color: ink };
  return (
    <AbsoluteFill style={{ background: P.dark, overflow: "hidden" }}>
      <AudioLayer cfg={cfg.audio} fps={fps} duration={dur} />
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>{scene}</AbsoluteFill>
      {cfg.hud && (<>
        <div style={{ ...mono, left: pad, top: pad }}>{cfg.hud}</div>
        <div style={{ ...mono, right: pad, top: pad }}>{`00:${String(Math.floor(f / fps)).padStart(2, "0")}:${String(f % fps).padStart(2, "0")}`}</div>
        <div style={{ position: "absolute", left: pad, right: pad, bottom: pad, height: 4, background: ink, opacity: 0.35 }} />
        <div style={{ position: "absolute", left: pad, bottom: pad, height: 4, width: (width - 2 * pad) * (f / dur), background: ev.kind === "word" && ev.bg === "accent" ? P.dark : P.accent }} />
      </>)}
      <GrainVignette frame={f} w={width} h={height} grain={0.1} vignette={0.35} />
    </AbsoluteFill>
  );
};
export const kineticDuration = (cfg: KineticConfig) => Math.round(cfg.endBeat * (60 / cfg.bpm) * cfg.fps);
