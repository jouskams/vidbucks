import { staticFile } from "remotion";
import { Audio } from "@remotion/media";
import lib from "./audio-lib.json";

export type AudioEntry = {
  id: string; kind: "sfx" | "music"; category: string; origin: string; file: string; duration: number | null;
  peakDb?: number; title: string; creator: string; license: string; attribution: boolean; tags?: string[]; mood?: string; bpm?: number; note?: string;
};
export const LIB = lib as AudioEntry[];

// Hot files (peak above -3 dB) are turned down automatically so every library sound sits at a similar level.
export const headroom = (e: AudioEntry) => (e.peakDb !== undefined && e.peakDb > -3 ? Math.pow(10, (-3 - e.peakDb) / 20) : 1);

export const byId = (id: string) => LIB.find((e) => e.id === id);
// entries from remotion.media (licence unverified) are never picked by category rotation; ask for them by id if you accept that
export const byCategory = (category: string, kind: "sfx" | "music" = "sfx") => LIB.filter((e) => e.category === category && e.kind === kind && e.origin !== "remotion");
export const search = (...words: string[]) =>
  LIB.filter((e) => words.every((w) => `${e.id} ${e.category} ${(e.tags ?? []).join(" ")} ${e.title}`.toLowerCase().includes(w.toLowerCase())));
// Deterministic rotation: the nth use of a category gets a different variant, so repeats are avoided.
export const pick = (category: string, n: number, kind: "sfx" | "music" = "sfx") => {
  const l = byCategory(category, kind);
  return l[((n % l.length) + l.length) % l.length];
};

/** <Sfx id="synth-impact-03" at={frame} /> or <Sfx category="whoosh" variant={n} at={frame} />.
 *  rate = playback speed (also shifts pitch) — the cheapest way to get a new variant out of one file. */
export const Sfx: React.FC<{
  id?: string; category?: string; variant?: number; at: number; volume?: number; rate?: number; frames?: number; trimStart?: number;
}> = ({ id, category, variant = 0, at, volume = 0.6, rate = 1, frames, trimStart }) => {
  const e = id ? byId(id) : category ? pick(category, variant) : undefined;
  if (!e) throw new Error(`Sfx: no entry for ${id ?? category}`);
  return <Audio src={staticFile(e.file)} from={at} volume={volume * headroom(e)} playbackRate={rate} durationInFrames={frames} trimBefore={trimStart} />;
};

/** Background music bed: <Music id="synth-music-lofi-chill" volume={0.25} /> */
export const Music: React.FC<{ id: string; volume?: number; from?: number; frames?: number }> = ({ id, volume = 0.25, from = 0, frames }) => {
  const e = byId(id);
  if (!e) throw new Error(`Music: unknown id ${id}`);
  return <Audio src={staticFile(e.file)} from={from} volume={volume * headroom(e)} durationInFrames={frames} />;
};
