// QA: renders 2 stills per scene (about 35% and 85% of each scene) from ONE bundle and builds contact sheets.
//   node tools/stills.mjs <videoName> [--scenes 0-9] [--scale 0.35]
// Output: out/qa/<video>/s###a.png, s###b.png and out/qa/<video>/sheet-N.png (needs python + Pillow)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { PY } from "./pycmd.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (!name) throw new Error("usage: node tools/stills.mjs <videoName> [--scenes a-b] [--scale 0.35]");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const scale = parseFloat(arg("--scale", "0.35"));
const range = arg("--scenes", "");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "videos", name, "video.json"), "utf8"));
const timing = JSON.parse(fs.readFileSync(path.join(root, "videos", name, "timing.json"), "utf8"));
const n = timing.paras.length;
let [a, b] = range ? range.split("-").map(Number) : [0, n - 1];
if (b === undefined || Number.isNaN(b)) b = a;
const outDir = path.join(root, "out", "qa", name);
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), webpackOverride: (c) => c });
const comp = await selectComposition({ serveUrl, id: cfg.id });
const start = (i) => Math.round(timing.paras[i].start * 30);
const end = (i) => (i + 1 < n ? start(i + 1) : comp.durationInFrames);
for (let i = a; i <= Math.min(b, n - 1); i++) {
  const d = end(i) - start(i);
  for (const [tag, p] of [["a", 0.35], ["b", 0.85]]) {
    const frame = Math.min(comp.durationInFrames - 1, start(i) + Math.max(6, Math.round(d * p)));
    await renderStill({ composition: comp, serveUrl, frame, output: path.join(outDir, `s${String(i).padStart(3, "0")}${tag}.png`), scale, imageFormat: "png" });
  }
  process.stdout.write(`scene ${i}\r`);
}
console.log(`\nstills in ${outDir}`);
try {
  execFileSync(PY, [path.join(root, "tools", "contact_sheet.py"), outDir, String(a), String(Math.min(b, n - 1))], { stdio: "inherit" });
} catch (e) {
  console.log("contact sheet skipped:", e.message);
}
