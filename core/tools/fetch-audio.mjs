#!/usr/bin/env node
// Build the openly-licensed part of the audio library from Openverse (no API key).
//   node tools/fetch-audio.mjs [--only whoosh,impact] [--max 4]
// Every file is trimmed (leading silence), peak-normalised to -3 dBFS, encoded to mp3 and indexed in
// public/audio-lib/library.json with licence + creator + source. NC (non-commercial) and ND (no-derivatives)
// licences are skipped; CC0 / public-domain is preferred over CC BY / BY-SA (which need credit).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const only = args.only ? String(args.only).split(",") : null;
const MAX = Number(args.max ?? 4);
const LIB = path.resolve("public/audio-lib");
const UA = "vidbucks/2.0 (open-licence audio fetch)";

// category -> { kind, queries, dur: [minSec, maxSec], tags }
const PLAN = {
  whoosh: { kind: "sfx", q: ["whoosh", "swoosh", "air swish", "fast swipe whoosh"], dur: [0.2, 4] },
  impact: { kind: "sfx", q: ["cinematic impact", "boom hit", "bass drop hit", "punch impact"], dur: [0.3, 7] },
  riser: { kind: "sfx", q: ["riser", "tension riser", "build up swell", "sweep up"], dur: [1.5, 10] },
  transition: { kind: "sfx", q: ["transition sweep", "reverse cymbal", "swipe transition"], dur: [0.4, 5] },
  ui: { kind: "sfx", q: ["ui click", "button click", "pop sound", "notification blip"], dur: [0.05, 2] },
  success: { kind: "sfx", q: ["success chime", "level up", "achievement unlocked", "positive ding"], dur: [0.3, 4] },
  fail: { kind: "sfx", q: ["error buzzer", "fail sound", "wrong answer buzzer", "sad trombone"], dur: [0.3, 5] },
  whistle_horn: { kind: "sfx", q: ["referee whistle", "air horn", "stadium horn", "buzzer horn"], dur: [0.3, 6] },
  crowd: { kind: "sfx", q: ["crowd cheer", "stadium crowd roar", "applause", "audience gasp"], dur: [1, 12] },
  sports: { kind: "sfx", q: ["football catch", "ball bounce", "sneakers squeak", "ball kick"], dur: [0.1, 4] },
  camera: { kind: "sfx", q: ["camera shutter", "photo flash click", "film projector"], dur: [0.1, 6] },
  paper_pen: { kind: "sfx", q: ["pencil writing", "marker pen draw", "paper rustle", "page turn", "chalk writing"], dur: [0.3, 8] },
  keyboard: { kind: "sfx", q: ["typing keyboard", "mechanical keyboard", "mouse click"], dur: [0.2, 8] },
  glitch: { kind: "sfx", q: ["glitch", "digital error", "tv static burst", "data corruption"], dur: [0.2, 5] },
  scifi: { kind: "sfx", q: ["laser zap", "power up", "power down", "sci-fi ui beep"], dur: [0.2, 5] },
  money: { kind: "sfx", q: ["coin", "cash register", "money count"], dur: [0.2, 5] },
  cartoon: { kind: "sfx", q: ["boing", "slide whistle", "cartoon pop", "cartoon fall"], dur: [0.2, 4] },
  human: { kind: "sfx", q: ["heartbeat", "clock ticking", "footsteps", "gasp", "sigh"], dur: [0.3, 10] },
  magic: { kind: "sfx", q: ["sparkle", "magic chime", "fairy dust"], dur: [0.3, 6] },
  glass_break: { kind: "sfx", q: ["glass break", "glass shatter", "crack"], dur: [0.3, 6] },
  explosion: { kind: "sfx", q: ["explosion", "bomb blast", "thunder"], dur: [0.5, 10] },
  ambience: { kind: "sfx", q: ["room tone", "wind ambience", "rain ambience", "night crickets", "city ambience"], dur: [8, 40] },
  music_calm: { kind: "music", q: ["calm ambient music", "relaxing piano"], dur: [40, 200] },
  music_lofi: { kind: "music", q: ["lofi hip hop", "chill beat"], dur: [40, 200] },
  music_upbeat: { kind: "music", q: ["upbeat corporate", "happy background music"], dur: [40, 200] },
  music_tension: { kind: "music", q: ["cinematic tension", "dark suspense"], dur: [40, 200] },
  music_epic: { kind: "music", q: ["epic orchestral", "cinematic trailer music"], dur: [40, 200] },
  music_acoustic: { kind: "music", q: ["acoustic guitar", "folk instrumental"], dur: [40, 200] },
  music_electronic: { kind: "music", q: ["electronic beat", "synthwave"], dur: [40, 200] },
  music_sports: { kind: "music", q: ["sports rock energy", "stadium rock instrumental"], dur: [40, 200] },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
const lib = existsSync(path.join(LIB, "library.json")) ? JSON.parse(await readFile(path.join(LIB, "library.json"), "utf8")) : [];
const have = new Set(lib.map((x) => x.sourceId).filter(Boolean));
const run = (cmd, a) => spawnSync(cmd, a, { encoding: "utf8" });

const search = async (q) => {
  const r = await fetch(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license_type=commercial&page_size=20`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()).results ?? [];
};
const licRank = (l) => (/^cc0|pdm/i.test(l) ? 0 : 1);

for (const [cat, cfg] of Object.entries(PLAN)) {
  if (only && !only.includes(cat)) continue;
  const dir = path.join(LIB, cfg.kind, cat);
  await mkdir(dir, { recursive: true });
  let got = lib.filter((x) => x.category === cat && x.origin === "openverse").length;
  for (const q of cfg.q) {
    if (got >= MAX) break;
    let results = [];
    try { results = await search(q); } catch (e) { console.warn(`[${cat}/${q}] ${e.message}`); continue; }
    results = results
      .filter((r) => !/nd/i.test(r.license) && r.duration && r.duration / 1000 >= cfg.dur[0] && r.duration / 1000 <= cfg.dur[1] && (r.filesize ?? 0) < 14e6 && !have.has(r.id))
      .sort((a, b) => licRank(a.license) - licRank(b.license));
    for (const r of results) {
      if (got >= MAX) break;
      try {
        const res = await fetch(r.url, { headers: { "User-Agent": UA } });
        if (!res.ok) continue;
        const raw = path.join(dir, `_raw.${r.filetype || "mp3"}`);
        await writeFile(raw, Buffer.from(await res.arrayBuffer()));
        // measure peak, then trim leading silence + normalise to -3 dBFS + short fade out, encode mp3
        const meas = run("ffmpeg", ["-hide_banner", "-i", raw, "-af", "volumedetect", "-f", "null", "-"]);
        const m = /max_volume:\s*(-?[\d.]+) dB/.exec(meas.stderr);
        if (!m) continue;
        const gain = Math.min(24, -3 - parseFloat(m[1]));
        const maxLen = cfg.kind === "sfx" ? 12 : 150;
        const id = `${cat}-${String(got + 1).padStart(2, "0")}-${slug(r.title)}`;
        const out = path.join(dir, `${id}.mp3`);
        const enc = run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-t", String(maxLen), "-af",
          `silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,volume=${gain.toFixed(2)}dB,afade=t=out:st=${Math.max(0.05, Math.min(maxLen, r.duration / 1000) - 0.08).toFixed(2)}:d=0.08`,
          "-ar", "44100", "-ac", "2", "-b:a", cfg.kind === "music" ? "160k" : "192k", out]);
        if (enc.status !== 0) continue;
        const dur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).stdout);
        lib.push({
          id, kind: cfg.kind, category: cat, origin: "openverse", file: `audio-lib/${cfg.kind}/${cat}/${id}.mp3`, duration: Math.round(dur * 100) / 100,
          title: r.title, creator: r.creator ?? "unknown", license: `CC ${r.license.toUpperCase()} ${r.license_version ?? ""}`.trim(),
          attribution: !/^cc0|pdm/i.test(r.license), source: r.source, pageUrl: r.foreign_landing_url, sourceId: r.id, query: q,
        });
        have.add(r.id); got++;
        console.log(`  + ${id} (${dur.toFixed(1)}s, ${r.license})`);
      } catch (e) { console.warn(`  skip: ${e.message}`); }
    }
  }
  try { (await import("node:fs")).rmSync(path.join(dir, "_raw.mp3"), { force: true }); } catch {}
  console.log(`[${cat}] ${got}`);
  await writeFile(path.join(LIB, "library.json"), JSON.stringify(lib, null, 1));
}
// cleanup stray raw files
for (const cat of Object.keys(PLAN)) for (const ext of ["mp3", "wav", "ogg", "flac"]) { try { (await import("node:fs")).rmSync(path.join(LIB, PLAN[cat].kind, cat, `_raw.${ext}`), { force: true }); } catch {} }
console.log(`library.json: ${lib.length} entries`);
