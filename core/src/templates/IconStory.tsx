// TEMPLATE "IconStory": minimal motion-graphics story. One hero ball, thin lines, small serif captions typed in with a voice,
// one animated icon per phrase. Typical reference: a 9-15 s vertical Short on a plain (usually black) background.
// Everything (texts, times, icons, colours, audio) comes from `IconStoryConfig`; copy a config, change the content.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadSans } from "@remotion/google-fonts/InterTight";
import { AudioCfg, AudioLayer, CL, EASE, Theme, lerp, useTime } from "./kit";

const { fontFamily: SERIF } = loadSerif("normal", { weights: ["500", "600"], subsets: ["latin", "latin-ext"] });
const { fontFamily: SANS } = loadSans("normal", { weights: ["500", "800"], subsets: ["latin", "latin-ext"] });

export type Phrase = { words: [text: string, start: number, end: number][]; end: number }; // seconds, relative to the voice start
export type IconScene =
  | { type: "ballCoins"; from: number; coinsAt: number; hopAt: number; to: number }           // ball drops, coins stack up, ball hops onto the stack
  | { type: "pendulum"; from: number; sync: number; to: number; count?: number }               // pendulum wave that locks into line at `sync`
  | { type: "sphere"; from: number; to?: number };                                             // dotted rotating sphere with an orbiting dot

export type IconStoryConfig = {
  width: number; height: number; fps: number; durationSec: number;
  theme: Theme;
  captionY: number;           // fraction of height where the caption line sits (0.55-0.72 typical)
  iconY: number;              // fraction of height of the icon centre (0.3-0.45 typical)
  tag?: { title: string; sub?: string };               // tiny top-left label (a studio/channel tag), optional
  leadIn: number;             // seconds before the voice starts (all phrase times are shifted by it)
  phrases: Phrase[];
  icons: IconScene[];
  lockup?: { text: string; sub?: string; at: number }; // brand/title lock-up near the end, optional
  audio?: AudioCfg;
};

const Ball: React.FC<{ x: number; y: number; r: number; color: string; op?: number; sx?: number; sy?: number }> = ({ x, y, r, color, op = 1, sx = 1, sy = 1 }) => (
  <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", opacity: op, transform: `scale(${sx},${sy})`,
    background: `radial-gradient(circle at 36% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 62% 74%, rgba(0,0,0,0.38), rgba(0,0,0,0) 62%), ${color}`,
    boxShadow: `0 0 ${r * 1.3}px ${color}55` }} />
);

export const IconStory: React.FC<{ cfg: IconStoryConfig }> = ({ cfg }) => {
  const { width: W, height: H, fps, theme } = cfg;
  const f = useCurrentFrame();
  const { sec, R } = useTime(fps);
  const t = f / fps;
  const u = Math.min(W, H) / 1080;                 // size unit: 1 at 1080 px
  const cx = W / 2, iconY = H * cfg.iconY, textY = H * cfg.captionY;
  const fg = theme.fg, serif = theme.serif ?? SERIF, sans = theme.sans ?? SANS;

  /* ---- captions ---- */
  const captions = cfg.phrases.map((p, i) => {
    const t0 = p.words[0][1] + cfg.leadIn, tEnd = p.end + cfg.leadIn;
    if (t < t0 - 0.05 || t > tEnd + 0.3) return null;
    const out = interpolate(t, [tEnd, tEnd + 0.22], [0, 1], { ...CL, easing: EASE.in });
    return (
      <div key={i} style={{ position: "absolute", left: 0, right: 0, top: textY, textAlign: "center", fontFamily: serif, fontWeight: 500, fontSize: 60 * u, letterSpacing: 0.5, color: fg, opacity: 1 - out, transform: `translateY(${-26 * out}px)`, filter: `blur(${out * 10}px)`, whiteSpace: "nowrap" }}>
        {p.words.map(([w, a, b], k) => {
          const chars = [...w]; const start = a + cfg.leadIn, dur = Math.max(0.16, (b - a) * 0.9);
          return (
            <span key={k} style={{ display: "inline-block", marginRight: k < p.words.length - 1 ? 16 * u : 0 }}>
              {chars.map((ch, c) => { const ct = start + (c / chars.length) * dur * 0.9; const o = interpolate(t, [ct, ct + 0.08], [0, 1], CL); return <span key={c} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 8}px)`, filter: `blur(${(1 - o) * 4}px)` }}>{ch}</span>; })}
            </span>
          );
        })}
      </div>
    );
  });

  /* ---- icons ---- */
  const icons = cfg.icons.map((ic, i) => {
    if (ic.type === "ballCoins") {
      const { from, coinsAt, hopAt, to } = ic;
      if (t < from || t > to + 0.1) return null;
      const base = iconY + 130 * u;
      const drop = spring({ frame: f - sec(from), fps, config: { damping: 11, stiffness: 140, mass: 0.7 } });
      const rest = iconY - 190 * u;
      let by = lerp(-80 * u, rest, Math.min(1.3, drop));
      if (t >= hopAt) by = lerp(rest, rest + 60 * u, 0) - (t < hopAt + 0.27 ? Math.sin(R(f, hopAt, hopAt + 0.27, 0, 1) * Math.PI) * 120 * u : 0);
      if (t >= hopAt + 0.2) by = lerp(rest, base - 3 * 24 * u - 30 * u, R(f, hopAt + 0.2, hopAt + 0.35, 0, 1, EASE.in));
      const fade = R(f, hopAt + 0.37, hopAt + 0.55, 1, 0);
      const sq = t > hopAt + 0.33 && t < hopAt + 0.5 ? 1 + 0.25 * Math.sin(((t - hopAt - 0.33) / 0.17) * Math.PI) : 1;
      const nCoins = t < hopAt + 0.6 ? 3 : 5;
      const squash = t > hopAt + 0.33 && t < hopAt + 0.55 ? Math.sin(((t - hopAt - 0.33) / 0.22) * Math.PI) : 0;
      const vis = R(f, to - 0.35, to, 1, 0, EASE.in);
      return (
        <div key={i} style={{ position: "absolute", inset: 0, opacity: vis }}>
          <svg width={W} height={H} style={{ position: "absolute" }}>
            <defs><linearGradient id={`cg${i}`} x1="0" x2="1"><stop offset="0" stopColor={fg} stopOpacity="0.55" /><stop offset="0.45" stopColor={fg} /><stop offset="1" stopColor={fg} stopOpacity="0.5" /></linearGradient></defs>
            <g transform={`translate(0 ${squash * 10})`}>
              {Array.from({ length: nCoins }, (_, k) => {
                const at = k < 3 ? coinsAt + k * 0.28 : hopAt + 0.6 + (k - 3) * 0.22; const p = interpolate(t, [at, at + 0.4], [0, 1], { ...CL, easing: EASE.out }); const y = base - k * 24 * u - (1 - p) * 220 * u;
                return (
                  <g key={k} opacity={p}>
                    <path d={`M${cx - 96 * u} ${y} v${22 * u} a${96 * u} ${30 * u} 0 0 0 ${192 * u} 0 v${-22 * u}`} fill={`url(#cg${i})`} stroke={fg} strokeWidth={1.6} />
                    <ellipse cx={cx} cy={y} rx={96 * u} ry={30 * u} fill={fg} stroke={fg} strokeWidth={1.6} />
                    <ellipse cx={cx} cy={y} rx={66 * u} ry={19 * u} fill="none" stroke={theme.bg} strokeOpacity={0.35} strokeWidth={1.4} />
                  </g>
                );
              })}
            </g>
          </svg>
          <Ball x={cx} y={by} r={34 * u} color={fg} op={fade} sx={sq} sy={1 / sq} />
        </div>
      );
    }
    if (ic.type === "pendulum") {
      const { from, sync, to } = ic; const N = ic.count ?? 7;
      if (t < from || t > to + 0.1) return null;
      const vis = R(f, from, from + 0.3, 0, 1) * R(f, to - 0.4, to, 1, 0, EASE.in);
      const damp = 1 - R(f, sync - 0.05, sync + 0.9, 0, 1);
      const A = 0.62 * (0.25 + 0.75 * R(f, from, from + 0.35, 0, 1)) * damp;
      const L = 520 * u, top = iconY - 330 * u; const lines: React.ReactNode[] = [], balls: React.ReactNode[] = [];
      for (let k = 0; k < N; k++) {
        const px = cx + (k - (N - 1) / 2) * 98 * u; const fi = (9 + k) / 3.6; const th = A * Math.sin(2 * Math.PI * fi * (t - sync));
        const bx = px + L * Math.sin(th), by = top + L * Math.cos(th);
        lines.push(<line key={`l${k}`} x1={px} y1={0} x2={bx} y2={by} stroke={theme.dim} strokeWidth={1.8} />);
        balls.push(<Ball key={`b${k}`} x={bx} y={by + 26 * u} r={26 * u} color={fg} />);
      }
      return (
        <div key={i} style={{ position: "absolute", inset: 0, opacity: vis }}>
          <svg width={W} height={H} style={{ position: "absolute" }}>{lines}<line x1={cx - 330 * u} y1={4} x2={cx + 330 * u} y2={4} stroke={theme.dim} strokeWidth={2.4} opacity={R(f, sync, sync + 0.3)} /></svg>
          {balls}
        </div>
      );
    }
    // dotted sphere
    const { from } = ic; const end = ic.to ?? cfg.durationSec;
    if (t < from || t > end) return null;
    const grow = R(f, from, from + 1.0, 0, 1, EASE.out); const spin = (t - from) * 0.9; const Rr = 175 * u * (0.6 + 0.4 * grow);
    const pts: [number, number, number][] = []; for (let k = 0; k < 360; k++) { const y = 1 - (k / 359) * 2, r = Math.sqrt(1 - y * y), th = k * 2.399963; pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
    const dots = pts.map(([x, y, z], k) => { const c = Math.cos(spin), s = Math.sin(spin); const xr = x * c + z * s, zr = -x * s + z * c; const stag = Math.min(1, Math.max(0, grow * 1.4 - (k / 360) * 0.4));
      return <circle key={k} cx={cx + xr * Rr} cy={iconY + y * Rr} r={(1.1 + (zr + 1) * 0.9) * stag * u} fill={fg} opacity={(0.25 + 0.75 * (zr + 1) / 2) * stag} />; });
    const oa = spin * 1.4, ox = cx + Math.cos(oa) * Rr * 1.55, oy = iconY + Math.sin(oa) * Rr * 0.5, behind = Math.sin(oa) < 0;
    return (
      <svg key={i} width={W} height={H} style={{ position: "absolute", opacity: grow }}>
        <ellipse cx={cx} cy={iconY} rx={Rr * 1.55} ry={Rr * 0.5} fill="none" stroke={theme.dim} strokeWidth={1.6} />
        {behind && <circle cx={ox} cy={oy} r={14 * u} fill={fg} opacity={0.5} />}
        {dots}
        {!behind && <circle cx={ox} cy={oy} r={14 * u} fill={fg} />}
      </svg>
    );
  });

  /* ---- tag + lockup ---- */
  const lk = cfg.lockup; const lp = lk ? R(f, lk.at, lk.at + 0.7, 0, 1, EASE.out) : 0;
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <AudioLayer cfg={cfg.audio} fps={fps} duration={sec(cfg.durationSec)} />
      {cfg.tag && (
        <div style={{ position: "absolute", left: 44 * u, top: 70 * u, fontFamily: sans, fontWeight: 500, fontSize: 20 * u, letterSpacing: 5 * u, color: theme.dim }}>
          {cfg.tag.title}<div style={{ width: 150 * u, height: 1.5, background: theme.dim, margin: `${6 * u}px 0 ${5 * u}px` }} />
          {cfg.tag.sub && <span style={{ fontSize: 14 * u, letterSpacing: 3 * u, opacity: 0.8 }}>{cfg.tag.sub}</span>}
        </div>
      )}
      {icons}
      {captions}
      {lk && t >= lk.at && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H * (cfg.captionY + 0.07), textAlign: "center", opacity: lp, transform: `translateY(${(1 - lp) * 18}px)`, filter: `blur(${(1 - lp) * 6}px)` }}>
          <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 112 * u, letterSpacing: -5 * u, color: fg }}>{lk.text}</span><span style={{ display: "inline-block", width: 17 * u, height: 17 * u, borderRadius: 9 * u, background: theme.accent, marginLeft: 6 * u }} />
          {lk.sub && <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 24 * u, letterSpacing: 16 * u, color: theme.dim, marginTop: 4 * u, marginRight: -16 * u }}>{lk.sub}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};
