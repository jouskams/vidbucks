#!/usr/bin/env node
// Merge every audio source into one searchable index: src/audio-lib.json (+ public/audio-lib/CREDITS.txt).
//   node tools/build-library-index.mjs
// Sources: Openverse downloads (library.json), synthesised (library-synth*.json), Hyperframes SFX (sfx/hf/manifest.json,
// Pixabay licence), Remotion's own sounds (public/sfx/*.wav — licence not verified, flagged).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const LIB = path.resolve("public/audio-lib");
const out = [];
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));

if (existsSync(path.join(LIB, "library.json"))) out.push(...(await readJson(path.join(LIB, "library.json"))));
for (const f of (await readdir(LIB)).filter((f) => /^library-synth.*\.json$/.test(f))) out.push(...(await readJson(path.join(LIB, f))));

const hfDir = path.resolve("public/sfx/hf");
if (existsSync(path.join(hfDir, "manifest.json"))) {
  const m = await readJson(path.join(hfDir, "manifest.json"));
  for (const [id, v] of Object.entries(m)) {
    const cat = /whoosh/.test(id) ? "whoosh" : /impact/.test(id) ? "impact" : /glitch/.test(id) ? "glitch" : /click|key|typing|pop|notification|ping/.test(id) ? "ui" : /chime|sparkle/.test(id) ? "success" : /error/.test(id) ? "fail" : /riser/.test(id) ? "riser" : "ui";
    out.push({ id: `hf-${id}`, kind: "sfx", category: cat, origin: "hyperframes", file: `sfx/hf/${v.file}`, duration: v.duration, title: id, creator: "Pixabay", license: "Pixabay Content License", attribution: false, tags: [id, "hyperframes"], note: v.description });
  }
}
const rmWav = { ding: ["success", "bell"], "mouse-click": ["ui", "click"], "record-scratch": ["fail", "scratch"], "shutter-modern": ["camera", "shutter"], switch: ["ui", "switch"], whoosh: ["whoosh", "swish"] };
for (const [id, [cat, tag]] of Object.entries(rmWav)) {
  if (existsSync(path.resolve(`public/sfx/${id}.wav`))) out.push({ id: `rm-${id}`, kind: "sfx", category: cat, origin: "remotion", file: `sfx/${id}.wav`, duration: null, title: id, creator: "remotion.media", license: "UNVERIFIED (generic sound from remotion.media)", attribution: false, tags: [tag, "remotion"] });
}

const ALIAS = { music_warm: "music_acoustic", music_minimal: "music_electronic", music_stomp: "music_sports" };
for (const e of out) if (ALIAS[e.category]) e.category = ALIAS[e.category];
const peaksPath = path.join(LIB, "peaks.json");
if (existsSync(peaksPath)) { const pk = await readJson(peaksPath); for (const e of out) if (pk[e.id] !== undefined) e.peakDb = pk[e.id]; }
const ids = new Set();
for (const e of out) { while (ids.has(e.id)) e.id += "_"; ids.add(e.id); }
await writeFile(path.resolve("src/audio-lib.json"), JSON.stringify(out));
const by = {};
for (const e of out) { const k = `${e.kind}/${e.category}`; by[k] = (by[k] ?? 0) + 1; }
const credits = out.filter((e) => e.attribution);
await writeFile(path.join(LIB, "CREDITS.txt"), `Audio that needs credit in the video description (CC BY / CC BY-SA):\n` + credits.map((e) => `- "${e.title}" by ${e.creator} (${e.license}) ${e.pageUrl ?? ""}`).join("\n") + "\n");
console.log(`index: ${out.length} entries  (sfx ${out.filter((e) => e.kind === "sfx").length}, music ${out.filter((e) => e.kind === "music").length}); credit-required: ${credits.length}`);
console.log(Object.entries(by).sort().map(([k, v]) => `${k}:${v}`).join("  "));
