export type Word = { w: string; s: number; e: number };
export type Timing = {
  duration: number;
  paras: { start: number; end: number; voice?: string; level?: number; text?: string }[];
  sentences?: { text: string; start: number; end: number }[];
  words: Word[];
};
const NUM: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", twenty: "20" };
const norm = (s: string) => {
  const n = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return NUM[n] ?? n;
};
// exact match first; then stems (note/notes, shuffle/shuffled) so small Whisper spelling differences still anchor
const same = (a: string, b: string) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** Anchors animation to the spoken word. `at` specs: number = seconds from scene start,
 *  "start", "end", "word", "word#2" (3rd occurrence, 0-based), "word+0.3" (offset seconds). */
export const createTiming = (t: Timing, fps = 30, tailFrames = 90) => {
  const sceneStart = (i: number) => Math.round(t.paras[i].start * fps);
  const END = Math.round(t.duration * fps) + tailFrames;
  const sceneEnd = (i: number) => (i + 1 < t.paras.length ? sceneStart(i + 1) : END);
  const wordFrame = (i: number, word: string, nth = 0): number => {
    const inScene = t.words.filter((x) => x.s >= t.paras[i].start - 0.05 && x.s < (t.paras[i + 1]?.start ?? 1e9));
    const target = norm(word);
    let hits = inScene.filter((x) => norm(x.w) === target);
    if (!hits.length) hits = inScene.filter((x) => same(norm(x.w), target));
    const h = hits[Math.min(nth, hits.length - 1)];
    return Math.round((h ? h.s : t.paras[i].start) * fps) - sceneStart(i);
  };
  /** frames relative to the scene start */
  const at = (i: number, spec: string | number | undefined, dflt = 0): number => {
    if (spec === undefined || spec === null) return dflt;
    if (typeof spec === "number") return Math.round(spec * fps);
    if (spec === "start") return 0;
    if (spec === "end") return sceneEnd(i) - sceneStart(i) - 6;
    const m = spec.match(/^(.+?)(?:#(\d+))?([+-]\d*\.?\d+)?$/);
    if (!m) return dflt;
    return wordFrame(i, m[1], m[2] ? +m[2] : 0) + Math.round((m[3] ? +m[3] : 0) * fps);
  };
  return { fps, totalFrames: END, words: t.words, paras: t.paras, sceneStart, sceneEnd, at, wordFrame };
};
export type TimingApi = ReturnType<typeof createTiming>;
