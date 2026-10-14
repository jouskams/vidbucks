// End-to-end smoke test of the render pipeline WITHOUT any TTS engine.   node tools/smoke.mjs [--keep]
// Creates a tiny throw-away video (silent narration, 2 scenes), registers it, runs tsc + check_anchors, renders a still and a 3-second mp4,
// then removes everything again. If this passes, Remotion + Chrome + ffmpeg + the engine work on this PC.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PY } from "./pycmd.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = "_smoke";
const vdir = path.join(root, "videos", name);
const pub = path.join(root, "public", "videos", name);
const keep = process.argv.includes("--keep");
let cfgSel = ["remotion"]; try { const c = JSON.parse(fs.readFileSync(path.join(root, "..", ".vidbucks", "config.json"), "utf8")); if (Array.isArray(c.renderers) && c.renderers.length) cfgSel = c.renderers; } catch { /* default */ }
const useHF = process.argv.includes("--hyperframes") || cfgSel.includes("hyperframes");
const useRemotion = process.argv.includes("--remotion") || cfgSel.includes("remotion") || !useHF;
const win = process.platform === "win32";
const run = (cmd, args, label) => {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: win && cmd === "npx", maxBuffer: 1 << 26 });
  const ok = r.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (!ok) console.log((r.stdout || "").split("\n").slice(-15).join("\n") + (r.stderr || "").split("\n").slice(-15).join("\n"));
  return ok;
};
const cleanup = () => {
  if (keep) return;
  fs.rmSync(vdir, { recursive: true, force: true });
  fs.rmSync(pub, { recursive: true, force: true });
  spawnSync("node", ["tools/register.mjs"], { cwd: root });
};

let ok = true;
if (useRemotion) {
fs.mkdirSync(vdir, { recursive: true });
fs.mkdirSync(pub, { recursive: true });
// 6 s of silence, 24 kHz mono 16-bit
const sr = 24000, secs = 6, n = sr * secs, buf = Buffer.alloc(44 + n * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
fs.writeFileSync(path.join(pub, "narration.wav"), buf);
const words = "hello world this is a smoke test for the engine".split(" ").map((w, i) => ({ w, s: +(0.4 + i * 0.5).toFixed(2), e: +(0.4 + i * 0.5 + 0.4).toFixed(2) }));
fs.writeFileSync(path.join(vdir, "timing.json"), JSON.stringify({ duration: secs, paras: [{ start: 0.4, end: 2.9 }, { start: 3.4, end: 5.4 }], sentences: [], words }));
fs.writeFileSync(path.join(vdir, "script.txt"), "hello world this is a smoke\n\ntest for the engine\n");
fs.writeFileSync(path.join(vdir, "video.json"), JSON.stringify({ id: "SmokeTest", title: "smoke", narration: "videos/_smoke/narration.wav", captions: true, boil: true }));
fs.writeFileSync(path.join(vdir, "thumb.json"), JSON.stringify({ bg: "yellow", objs: [{ k: "text", t: "SMOKE", x: 960, y: 500, size: 200 }] }));
fs.writeFileSync(path.join(vdir, "scenes.json"), JSON.stringify([
  { bg: "paper", objs: [{ k: "line", x: 960, y: 804, w: 1700, color: "ink", at: "start" }, { k: "stick", x: 560, y: 512, s: 1.2, pose: "wave", at: "start" }, { k: "text", t: "Hello *world*", x: 1300, y: 400, size: 110, at: "world" }] },
  { bg: "blue", objs: [{ k: "badge", t: "1", x: 560, y: 450, size: 260, at: "start" }, { k: "icon", n: "brain", x: 1300, y: 450, size: 260, at: "engine" }] },
]));

ok = run("node", ["tools/register.mjs"], "register video") && ok;
ok = ok && run("npx", ["tsc", "--noEmit"], "typescript compiles");
ok = ok && run(PY, ["tools/check_anchors.py", name], "anchors match the narration timing");
fs.mkdirSync(path.join(root, "out"), { recursive: true });
ok = ok && run("npx", ["remotion", "still", "src/index.ts", "SmokeTestThumb", "out/_smoke-thumb.png"], "render a still (downloads Chrome on first run)");
ok = ok && run("npx", ["remotion", "render", "src/index.ts", "SmokeTest", "out/_smoke.mp4", "--frames=0-89", "--concurrency=2"], "render 3 s of video");
ok = ok && run("npx", ["remotion", "still", "src/index.ts", "Tpl-IconStory", "out/_smoke-tpl.png", "--frame=60"], "render a reference-to-video template (Tpl-IconStory)");
ok = ok && run(PY, ["tools/analyze_reference.py", "--file", "out/_smoke.mp4", "--no-transcript"], "measure a video with analyze_reference.py (cuts, palette, loudness, tempo)");
if (ok) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "csv=p=0", path.join(root, "out", "_smoke.mp4")], { encoding: "utf8" });
  const good = /video,1920,1080/.test(probe.stdout) && /audio/.test(probe.stdout);
  console.log(`${good ? "PASS" : "FAIL"}  output has 1920x1080 video + audio (ffprobe)`);
  ok = good;
}
}
if (useHF) {
  // HyperFrames round trip: scaffold -> write a tiny GSAP composition -> render -> measure with Vidbucks (renderer-agnostic)
  const hfDir = fs.mkdtempSync(path.join(os.tmpdir(), "vidbucks-hf-"));
  const env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" };
  const hf = (args, label) => { const t0 = Date.now(); const r = spawnSync("npx", ["-y", "hyperframes", ...args], { cwd: hfDir, encoding: "utf8", env, shell: win, maxBuffer: 1 << 26 }); const good = r.status === 0; console.log(`${good ? "PASS" : "FAIL"}  ${label} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); if (!good) console.log(((r.stdout || "") + (r.stderr || "")).split("\n").slice(-12).join("\n")); return good; };
  ok = hf(["init", "proj", "--example", "blank", "--resolution", "portrait", "--non-interactive", "--skip-transcribe"], "HyperFrames: scaffold a project") && ok;
  if (ok) {
    const idx = path.join(hfDir, "proj", "index.html");
    let html = fs.readFileSync(idx, "utf8").replace(/data-duration="10"/g, 'data-duration="2"').replace(">Title<", ">Vidbucks<");
    html = html.replace("// Example:", 'tl.fromTo("#title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.1); // Example:');
    fs.writeFileSync(idx, html);
    const hfp = path.join(hfDir, "proj");
    const r = spawnSync("npx", ["-y", "hyperframes", "render", "-o", "out.mp4", "--quiet"], { cwd: hfp, encoding: "utf8", env, shell: win, maxBuffer: 1 << 26 });
    const good = r.status === 0 && fs.existsSync(path.join(hfp, "out.mp4")); console.log(`${good ? "PASS" : "FAIL"}  HyperFrames: render the composition to MP4`); if (!good) console.log(((r.stdout || "") + (r.stderr || "")).split("\n").slice(-12).join("\n")); ok = good && ok;
    if (good) ok = run(PY, ["tools/analyze_reference.py", "--file", path.join(hfp, "out.mp4"), "--no-transcript"], "measure the HyperFrames render with analyze_reference.py") && ok;
    fs.rmSync(path.join(root, "..", "knowledge", "references", "out-file"), { recursive: true, force: true });
  }
  fs.rmSync(hfDir, { recursive: true, force: true });
}
cleanup();
for (const f of ["_smoke.mp4", "_smoke-thumb.png", "_smoke-tpl.png"]) fs.rmSync(path.join(root, "out", f), { force: true });
fs.rmSync(path.join(root, "..", "knowledge", "references", "smoke-file"), { recursive: true, force: true });
console.log(ok ? "\nSMOKE TEST PASSED - the render pipeline works on this PC." : "\nSMOKE TEST FAILED - fix the first FAIL above (see docs/models-notes/README.md troubleshooting).");
process.exit(ok ? 0 : 1);
