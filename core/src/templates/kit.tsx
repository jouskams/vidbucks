// Shared, brand-free building blocks for the reference-to-video templates.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile } from "remotion";

export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** curves used by every template: out = snappy entrance, in = fast exit, sine = gentle move, io = strong in-out */
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  sine: Easing.bezier(0.45, 0, 0.55, 1),
  io: Easing.bezier(0.65, 0, 0.35, 1),
};

export type Theme = {
  bg: string;       // background
  fg: string;       // main foreground (text, hero shapes)
  dim: string;      // secondary text / lines
  accent: string;   // the ONE accent colour (dot, highlight)
  serif?: string;   // optional font family overrides (css font-family strings)
  sans?: string;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** seconds -> frames, and a clamped, eased interpolation between two moments (seconds) */
export const useTime = (fps: number) => {
  const sec = (t: number) => Math.round(t * fps);
  const R = (f: number, a: number, b: number, v0 = 0, v1 = 1, e: (t: number) => number = EASE.sine) =>
    interpolate(f, [sec(a), sec(b)], [v0, v1], { ...CL, easing: e });
  return { sec, R };
};

/** film grain + soft vignette on top of a scene (cheap, deterministic per frame) */
export const GrainVignette: React.FC<{ frame: number; w: number; h: number; grain?: number; vignette?: number }> = ({ frame, w, h, grain = 0.1, vignette = 0.3 }) => (
  <>
    <svg width={w} height={h} style={{ position: "absolute", opacity: grain, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="kit-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 13} /></filter>
      <rect width={w} height={h} filter="url(#kit-grain)" />
    </svg>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${vignette}) 100%)`, pointerEvents: "none" }} />
  </>
);

export type SfxCue = [at: number, file: string, volume: number];
export type AudioCfg = {
  voice?: string;        // path under public/, e.g. "my-video/vo.wav"
  voiceAt?: number;      // seconds
  music?: string;        // path under public/ (an audio-library track or your own pulse track)
  musicVolume?: number;
  musicStartFrom?: number; // seconds into the track
  sfx?: SfxCue[];        // [seconds, "audio-lib/sfx/<category>/<id>.mp3", volume]
};

/** voice-over + music bed + sound cues, all optional. Nothing plays (and nothing is required) when `cfg` is empty. */
export const AudioLayer: React.FC<{ cfg?: AudioCfg; fps: number; duration: number }> = ({ cfg, fps, duration }) => {
  if (!cfg) return null;
  const sec = (t: number) => Math.round(t * fps);
  return (
    <>
      {cfg.music && (
        <Audio src={staticFile(cfg.music)} startFrom={sec(cfg.musicStartFrom ?? 0)}
          volume={(fr) => interpolate(fr, [0, sec(0.7), duration - sec(1.2), duration], [0, cfg.musicVolume ?? 0.25, cfg.musicVolume ?? 0.25, 0], CL)} />
      )}
      {cfg.voice && <Sequence from={sec(cfg.voiceAt ?? 0)}><Audio src={staticFile(cfg.voice)} volume={1} /></Sequence>}
      {(cfg.sfx ?? []).map(([at, file, v], i) => (
        <Sequence key={i} from={sec(at)} durationInFrames={Math.round(fps * 3)}><Audio src={staticFile(file)} volume={v} /></Sequence>
      ))}
    </>
  );
};
