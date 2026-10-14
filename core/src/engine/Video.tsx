import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Sfx } from "../Sfx";
import { CL, EASE, HAND, InkContext, PAL, col, markerVar, prog } from "./theme";
import { createTiming, type Timing, type TimingApi } from "./timing";
import { Boil, Obj, dust, type Ctx, type Spec } from "./Objs";

export type VideoCfg = {
  id: string; title: string; narration: string; width?: number; height?: number;
  music?: { id: string; from: number; to: number; vol?: number }[];
  sfxDefaults?: Record<string, [string, number]>; wipeEvery?: number; wipeSfx?: [string, number];
  boil?: boolean; captions?: boolean; film?: boolean; capOff?: number[]; marker?: string; lang?: string;
};
export type SceneSpec = { bg?: string; cam?: "push" | "pull" | "none"; zoom?: [number, number]; focus?: [number, number]; shake?: number; fadeIn?: boolean; pan?: [[number, number], [number, number]]; enter?: "whip" | "whipL" | "flash" | "iris" | "fade"; objs: Spec[]; sfx?: Spec[]; note?: string };

const BG: Record<string, { c: string; grid?: boolean; dark?: boolean; img?: string }> = {
  void: { c: "#0b0b0e", dark: true }, night: { c: "#141b2e", dark: true },
  dusk: { c: "#2a1a1a", dark: true, img: "linear-gradient(180deg, #1b1424 0%, #5a2d2a 55%, #c2703a 100%)" },
  paper: { c: PAL.paper }, grid: { c: PAL.paper, grid: true }, dark: { c: "#161d33", dark: true },
  blue: { c: "#e3edff" }, yellow: { c: "#fff4cc" }, green: { c: "#e2f5e6" }, pink: { c: "#ffe4ec" }, ink: { c: "#1d1d22", dark: true },
};
const WIPES = [PAL.orange, PAL.blue, PAL.green, PAL.purple, PAL.yellow];

const FilmCaptions: React.FC<{ timing: Timing; off?: number[] }> = ({ timing, off = [] }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const p = timing.paras.find((x) => t >= x.start - 0.05 && t < x.end + 0.3);
  if (!p || p.voice === "whisper" || !p.text || off.includes(timing.paras.indexOf(p))) return null;
  const o = interpolate(t, [p.start - 0.05, p.start + 0.15, p.end + 0.1, p.end + 0.3], [0, 1, 1, 0], CL);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 62, textAlign: "center", fontFamily: HAND, fontSize: 56, color: "#f2eee3", opacity: o * 0.95, textShadow: "0 3px 14px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)", padding: "0 160px", lineHeight: 1.1 }}>
      {p.text}
    </div>
  );
};

const Captions: React.FC<{ words: Timing["words"]; dark: boolean }> = ({ words }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  let idx = words.findIndex((x) => t >= x.s && t < x.e + 0.25);
  if (idx < 0) {
    const next = words.findIndex((x) => x.s > t);
    if (next < 0 || words[next].s - t > 0.5) return null;
    idx = next;
  }
  const g0 = Math.floor(idx / 6) * 6;
  const group = words.slice(g0, g0 + 6);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 46, marginInline: "auto", width: "fit-content", maxWidth: 1500, padding: "2px 34px 8px", background: "rgba(255,255,255,0.94)", border: `5px solid ${PAL.ink}`, borderRadius: 22, display: "flex", gap: 20, fontFamily: HAND, fontSize: 62, boxShadow: "5px 7px 0 rgba(0,0,0,0.15)" }}>
      {group.map((x, k) => (
        <span key={g0 + k} style={{ color: g0 + k === idx ? PAL.orange : PAL.ink, display: "inline-block" }}>{x.w}</span>
      ))}
    </div>
  );
};

const SceneView: React.FC<{ i: number; spec: SceneSpec; T: TimingApi; cfg: VideoCfg; dur: number }> = ({ i, spec, T, cfg, dur }) => {
  const f = useCurrentFrame();
  const bg = BG[spec.bg ?? "paper"] ?? BG.paper;
  const ctx: Ctx = { T, i, dark: !!bg.dark, still: false, dur };
  const cam = spec.cam ?? (i % 2 ? "pull" : "push");
  const sc = spec.zoom ? interpolate(f, [0, dur], spec.zoom, { ...CL, easing: EASE }) : cam === "none" ? 1 : cam === "push" ? interpolate(f, [0, dur], [1, 1.045], CL) : interpolate(f, [0, dur], [1.045, 1], CL);
  const wipe = prog(f, 0, 9);
  const pq = interpolate(f, [0, dur], [0, 1], { ...CL, easing: EASE });
  const panX = spec.pan ? spec.pan[0][0] + (spec.pan[1][0] - spec.pan[0][0]) * pq : 0;
  const panY = spec.pan ? spec.pan[0][1] + (spec.pan[1][1] - spec.pan[0][1]) * pq : 0;
  const eq = interpolate(f, [0, spec.enter === "iris" ? 16 : 8], [0, 1], { ...CL, easing: EASE });
  const enterStyle: React.CSSProperties = i === 0 || !spec.enter || eq >= 1 ? {} :
    spec.enter === "whip" ? { transform: `translateX(${(1 - eq) * 340}px)`, filter: `blur(${(1 - eq) * 16}px)` } :
    spec.enter === "whipL" ? { transform: `translateX(${-(1 - eq) * 340}px)`, filter: `blur(${(1 - eq) * 16}px)` } :
    spec.enter === "iris" ? { clipPath: `circle(${eq * 1150}px at 50% 50%)` } : {};
  const wc = WIPES[i % WIPES.length];
  return (
    <AbsoluteFill style={{ backgroundColor: bg.c, ...enterStyle }}>
      {bg.img && <AbsoluteFill style={{ background: bg.img }} />}
      {bg.grid && <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(60,80,140,0.13) 2px, transparent 2px), linear-gradient(90deg, rgba(60,80,140,0.13) 2px, transparent 2px)`, backgroundSize: "60px 60px" }} />}
      {!bg.grid && !bg.dark && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.55), rgba(0,0,0,0) 70%)" }} />}
      <AbsoluteFill style={{ overflow: "hidden" }}>{dust(f, `s${i}`, !!bg.dark)}</AbsoluteFill>
      {cfg.boil !== false && <Boil id={`boil${i}`} seed={Math.floor(f / 4) % 5} />}
      <AbsoluteFill style={{ scale: sc, transformOrigin: spec.focus ? `${spec.focus[0]}px ${spec.focus[1]}px` : undefined, translate: `${panX + (spec.shake ? Math.sin(f * 2.9) * spec.shake : 0)}px ${panY + (spec.shake ? Math.cos(f * 3.7) * spec.shake : 0)}px`, filter: cfg.boil !== false ? `url(#boil${i})` : undefined }}>
        <InkContext.Provider value={bg.dark ? PAL.paper : PAL.ink}>
          {spec.objs.map((o, k) => (o.hud ? null : <Obj key={k} o={o} ctx={ctx} />))}
        </InkContext.Provider>
      </AbsoluteFill>
      <AbsoluteFill>
        <InkContext.Provider value={bg.dark ? PAL.paper : PAL.ink}>
          {spec.objs.map((o, k) => (o.hud ? <Obj key={k} o={o} ctx={ctx} /> : null))}
        </InkContext.Provider>
      </AbsoluteFill>
      {cfg.film && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />}
      {spec.enter === "flash" && i > 0 && f < 10 && <AbsoluteFill style={{ background: "#fff6e0", opacity: (1 - f / 10) * 0.85 }} />}
      {cfg.film && (spec.fadeIn || spec.enter === "fade") && i > 0 && wipe < 1 && <AbsoluteFill style={{ background: "#000", opacity: 1 - wipe }} />}
      {wipe < 1 && i > 0 && !cfg.film && (
        <AbsoluteFill style={{ background: wc, transform: `translateX(${wipe * 105}%) skewX(-8deg)`, boxShadow: `-22px 0 0 ${PAL.ink}` }} />
      )}
    </AbsoluteFill>
  );
};

type SfxEvent = { at: number; cat?: string; id?: string; vol: number; rate: number; n: number };

/** Walks all scenes once and lists every sound effect with its absolute frame. Variants rotate per category. */
export const collectSfx = (scenes: SceneSpec[], T: TimingApi, cfg: VideoCfg): SfxEvent[] => {
  const ev: SfxEvent[] = [];
  const counter: Record<string, number> = {};
  const bump = (c: string) => (counter[c] = (counter[c] ?? -1) + 1);
  const defaults = cfg.sfxDefaults ?? {};
  const wipeEvery = cfg.wipeEvery ?? 4;
  scenes.forEach((s, i) => {
    const base = T.sceneStart(i);
    if (i > 0 && wipeEvery > 0 && i % wipeEvery === 0 && cfg.wipeSfx) ev.push({ at: base, cat: cfg.wipeSfx[0], vol: cfg.wipeSfx[1], rate: 1, n: bump(cfg.wipeSfx[0]) });
    s.objs.forEach((o) => {
      let spec: any = o.sfx;
      if (spec === false) return;
      if (spec === undefined && defaults[o.k]) spec = defaults[o.k];
      if (spec === undefined && o.k === "icon" && defaults[`icon:${o.n}`]) spec = defaults[`icon:${o.n}`];
      if (!spec) return;
      const [c, v] = Array.isArray(spec) ? spec : [spec, 0.3];
      ev.push({ at: base + T.at(i, o.at, 0), cat: c.includes("-") ? undefined : c, id: c.includes("-") ? c : undefined, vol: v, rate: o.sfxRate ?? 1, n: bump(c) });
    });
    (s.sfx ?? []).forEach((e) => {
      const c: string = e.c;
      ev.push({ at: base + T.at(i, e.at, 0), cat: c.includes("-") ? undefined : c, id: c.includes("-") ? c : undefined, vol: e.v ?? 0.3, rate: e.rate ?? 1, n: bump(c) });
    });
  });
  return ev;
};

export const StickVideo: React.FC<{ cfg: VideoCfg; scenes: SceneSpec[]; timing: Timing }> = ({ cfg, scenes, timing }) => {
  const T = createTiming(timing);
  const events = collectSfx(scenes, T, cfg);
  return (
    <AbsoluteFill lang={cfg.lang ?? "en"} style={{ backgroundColor: PAL.paper, ...markerVar(cfg.marker) }}>
      {scenes.map((s, i) => {
        const dur = T.sceneEnd(i) - T.sceneStart(i);
        return (
          <Sequence key={i} from={T.sceneStart(i)} durationInFrames={dur} layout="none">
            <Sequence from={0} durationInFrames={dur}>
              <SceneView i={i} spec={s} T={T} cfg={cfg} dur={dur} />
            </Sequence>
          </Sequence>
        );
      })}
      {cfg.captions !== false && (cfg.film ? <FilmCaptions timing={timing} off={cfg.capOff} /> : <Captions words={timing.words} dark={false} />)}
      <Audio src={staticFile(cfg.narration)} volume={1} />
      {(cfg.music ?? []).map((m, k) => {
        const from = Math.round(m.from * 30), len = Math.round((m.to - m.from) * 30);
        const vol = m.vol ?? 0.15;
        return (
          <Sequence key={k} from={from} durationInFrames={len}>
            <MusicBed id={m.id} len={len} vol={vol} />
          </Sequence>
        );
      })}
      {events.map((e, k) => (
        <Sfx key={k} id={e.id} category={e.cat} variant={e.n} at={e.at} volume={e.vol} rate={e.rate} frames={90} />
      ))}
    </AbsoluteFill>
  );
};

import { byId, headroom } from "../Sfx";
const MusicBed: React.FC<{ id: string; len: number; vol: number }> = ({ id, len, vol }) => {
  const e = byId(id);
  if (!e) throw new Error(`music id ${id} not in audio-lib.json`);
  const h = headroom(e);
  return <Audio src={staticFile(e.file)} volume={(fr) => vol * h * interpolate(fr, [0, 60, len - 75, len], [0, 1, 1, 0], CL)} loop />;
};

/** Thumbnail: objects laid out on a 1920x1080 canvas, shown at 1280x720. */
export const ThumbView: React.FC<{ thumb: { bg?: string; objs: Spec[]; marker?: string; lang?: string }; timing: Timing }> = ({ thumb, timing }) => {
  const T = createTiming(timing);
  const bg = BG[thumb.bg ?? "paper"] ?? BG.paper;
  const ctx: Ctx = { T, i: 0, dark: !!bg.dark, still: true, dur: 1 };
  return (
    <AbsoluteFill lang={thumb.lang ?? "en"} style={{ backgroundColor: bg.c, overflow: "hidden", ...markerVar(thumb.marker) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "0 0" }}>
        <InkContext.Provider value={bg.dark ? PAL.paper : PAL.ink}>{thumb.objs.map((o, k) => <Obj key={k} o={o} ctx={ctx} />)}</InkContext.Provider>
      </div>
    </AbsoluteFill>
  );
};
export { col };
