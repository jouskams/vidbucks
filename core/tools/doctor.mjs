// Vidbucks doctor: what is installed, what is missing, what to install first.   node core/tools/doctor.mjs [--json] [--set KEY=value]
// Exit code 0 = ready, 1 = something REQUIRED is missing, 2 = only recommended/optional things are missing.
// --json prints { ready, phase, hardware, python, checks[], plan[] } - the setup skill and the SessionStart hook read this.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");           // core/
const repo = path.resolve(root, "..");
const envFile = path.join(root, ".env");
const json = process.argv.includes("--json");
const win = process.platform === "win32";

// --set KEY=value -> core/.env (a free API key the user gave in chat; never echo it back)
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--set" && process.argv[i + 1]?.includes("=")) {
    const [k, ...v] = process.argv[i + 1].split("=");
    let txt = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
    txt = txt.split("\n").filter((l) => l && !l.startsWith(k + "=")).concat(`${k}=${v.join("=")}`).join("\n") + "\n";
    fs.writeFileSync(envFile, txt); console.log(`saved ${k} to core/.env`);
  }
}
const env = { ...process.env };
if (fs.existsSync(envFile)) for (const l of fs.readFileSync(envFile, "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; }

const run = (cmd, args, opt = {}) => { try { return spawnSync(cmd, args, { encoding: "utf8", timeout: opt.timeout ?? 30000 }); } catch { return { status: 1, stdout: "", stderr: "" }; } };
const home = os.homedir();
const checks = [];
const add = (id, level, ok, detail, fix = "") => checks.push({ id, level, ok, detail, fix });

/* ---- hardware ---- */
const arch = os.arch(), plat = process.platform;
const nvidia = run("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader"]);
const hasNvidia = nvidia.status === 0 && nvidia.stdout.trim().length > 0;
const appleSilicon = plat === "darwin" && arch === "arm64";
const hardware = { platform: plat, arch, cpuCores: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30), nvidia: hasNvidia ? nvidia.stdout.trim().split("\n")[0] : null, appleSilicon, accelerator: hasNvidia ? "cuda" : appleSilicon ? "mps" : "cpu" };

/* ---- python (the command may be python or python3; VIDBUCKS_PYTHON overrides) ---- */
const pyCands = [env.VIDBUCKS_PYTHON, "python", "python3"].filter(Boolean);
let py = null, pyVer = "";
for (const c of pyCands) { const r = run(c, ["--version"]); const out = (r.stdout || r.stderr || "").trim(); if (r.status === 0 && /Python 3\.\d+/.test(out)) { py = c; pyVer = out.replace("Python ", ""); break; } }
const pyMinor = py ? +pyVer.split(".")[1] : 0;
const mod = (m) => !!py && run(py, ["-c", `import ${m}`]).status === 0;

/* ---- required core ---- */
const nodeMajor = +process.versions.node.split(".")[0];
add("node", "required", nodeMajor >= 20, `node ${process.versions.node}`, win ? "winget install OpenJS.NodeJS.LTS" : "macOS: brew install node   Linux: https://nodejs.org (or nvm install --lts)");
const ff = run("ffmpeg", ["-version"]);
add("ffmpeg", "required", ff.status === 0, ff.status === 0 ? ff.stdout.split("\n")[0].slice(0, 60) : "not found", win ? "winget install Gyan.FFmpeg" : "macOS: brew install ffmpeg   Linux: sudo apt install ffmpeg");
add("python", "required", !!py && pyMinor >= 10, py ? `${py} ${pyVer}` : "not found", win ? "winget install Python.Python.3.12 (tick Add to PATH)" : "macOS: brew install python@3.12   Linux: sudo apt install python3 python3-venv");
// renderers: chosen in <repo>/.vidbucks/config.json  { "renderers": ["remotion", "hyperframes", "custom:<id>"] }  (default: remotion)
let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(path.join(repo, ".vidbucks", "config.json"), "utf8")); } catch { /* defaults */ }
const selected = Array.isArray(cfg.renderers) && cfg.renderers.length ? cfg.renderers : ["remotion"];
const loadRenderer = (id) => {
  const f = id.startsWith("custom:") ? path.join(repo, ".vidbucks", "renderers", id.slice(7) + ".json") : path.join(root, "renderers", id + ".json");
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
};
for (const id of selected) {
  if (id === "remotion") { add("renderer:remotion", "required", fs.existsSync(path.join(root, "node_modules", "remotion")), "Remotion + project dependencies", "cd core && npm ci"); continue; }
  const reg = loadRenderer(id);
  if (!reg) { add(`renderer:${id}`, "required", false, "selected but no registry file found", id.startsWith("custom:") ? `create .vidbucks/renderers/${id.slice(7)}.json from core/renderers/custom.template.json` : `core/renderers/${id}.json is missing`); continue; }
  const [cmd, ...args] = reg.detect; const r = run(cmd, args, { timeout: 120000 });
  add(`renderer:${id}`, "required", r.status === 0, r.status === 0 ? `${reg.name} - ${(r.stdout || "").trim().split("\n")[0].slice(0, 40)}` : `${reg.name} not available`, reg.install);
}
add("py:numpy+soundfile+PIL", "required", mod("numpy") && mod("soundfile") && mod("PIL"), "numpy, soundfile, pillow (analysis, audio, cut-outs)", "pip install numpy soundfile pillow scipy");
add("py:faster_whisper", "required", mod("faster_whisper"), "Whisper word timestamps (captions, voice-over timing)", 'pip install faster-whisper "av<16"');

/* ---- recommended ---- */
const ytdlp = run("yt-dlp", ["--version"]);
add("yt-dlp", "recommended", ytdlp.status === 0, ytdlp.status === 0 ? `yt-dlp ${ytdlp.stdout.trim()}` : "not found - needed to analyse YouTube links (metadata/captions only)", "pip install yt-dlp   (or brew install yt-dlp / winget install yt-dlp)");
const skillsDir = path.join(home, ".claude", "skills");
const remotionSkills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter((d) => d.startsWith("remotion")) : [];
add("remotion-skills", "recommended", remotionSkills.length > 0, remotionSkills.length ? `${remotionSkills.length} Remotion skills installed (${remotionSkills.slice(0, 3).join(", ")}...)` : "Remotion agent skills not found", "npx skills add remotion-dev/skills   (official Remotion skills; Vidbucks uses /remotion-best-practices)");
const vbSkills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter((d) => d === "vidbucks" || d.startsWith("vidbucks-")) : [];
add("vidbucks-skills", "recommended", vbSkills.includes("vidbucks-reference-to-video"), vbSkills.length ? `${vbSkills.length} Vidbucks skills in ~/.claude/skills` : "Vidbucks skills not installed globally", "node scripts/setup.mjs --skills-only   (or work inside the repo folder)");

/* ---- voice engines (open source). at least one is required for voice-over ---- */
const hasKokoro = mod("kokoro"), hasPiper = mod("piper"), hasChatter = mod("chatterbox"), hasOmni = mod("omnivoice");
const cudaTorch = !!py && run(py, ["-c", "import torch;print(torch.cuda.is_available())"]).stdout.includes("True");
const espeak = run("espeak-ng", ["--version"]).status === 0;
add("tts:kokoro", "tts", hasKokoro, "Kokoro (Apache-2.0): fast, CPU ok, ~165 wpm, English voices", `pip install kokoro soundfile   ${pyMinor > 12 ? "(needs Python 3.10-3.12; you have " + pyVer + " -> create a venv with python3.12)" : ""}`);
add("tts:piper", "tts", hasPiper, "Piper (MIT code; voices have their own licences): offline CPU, many languages", "pip install piper-tts   + a voice from https://huggingface.co/rhasspy/piper-voices (check each voice's licence)");
add("tts:chatterbox", "tts", hasChatter, "Chatterbox (MIT): expressive, multilingual, voice cloning, needs GPU or Apple Silicon", 'pip install chatterbox-tts "setuptools<81"');
add("tts:omnivoice", "tts", hasOmni && cudaTorch, hasOmni ? (cudaTorch ? "OmniVoice + CUDA" : "installed but no CUDA GPU") : "not installed (NVIDIA GPU >= 6 GB only)", "see docs/voice-engines.md");
const ttsCount = [hasKokoro, hasPiper, hasChatter, hasOmni && cudaTorch].filter(Boolean).length;
add("tts:any", "required", ttsCount > 0, ttsCount ? `${ttsCount} voice engine(s) ready` : "no voice engine installed", "install at least one voice engine (Kokoro is the simplest)");
add("espeak-ng", "optional", espeak, espeak ? "espeak-ng found" : "not found - Kokoro non-English voices need it", win ? "winget install eSpeak-NG.eSpeak-NG" : "macOS: brew install espeak-ng   Linux: sudo apt install espeak-ng");

/* ---- optional ---- */
const lib = path.join(root, "public", "audio-lib");
add("sound-library", "optional", fs.existsSync(lib) && fs.readdirSync(lib).length > 0, "sound effects + music beds", "python core/tools/make_synth_library.py   (generates a licence-free built-in library on this machine)");
for (const [k, d, how] of [["PEXELS_API_KEY", "Pexels photos+videos (free)", "https://www.pexels.com/api/"], ["PIXABAY_API_KEY", "Pixabay photos/videos (free)", "https://pixabay.com/api/docs/"]])
  add(`key:${k}`, "key", !!env[k], d, `ask the user for a free key (${how}); then: node core/tools/doctor.mjs --set ${k}=<key>`);

/* ---- install plan: what to do first, in order, and which voice engine to recommend ---- */
const plan = [];
const miss = (id) => checks.find((c) => c.id === id && !c.ok);
for (const id of ["node", "ffmpeg", "python", ...selected.map((x) => `renderer:${x}`), "py:numpy+soundfile+PIL", "py:faster_whisper", "yt-dlp", "remotion-skills", "vidbucks-skills"]) { const c = miss(id); if (c) plan.push({ id, level: c.level, command: c.fix }); }
let recommendedTts = hasKokoro ? "kokoro" : hasNvidia || appleSilicon ? "kokoro + chatterbox" : "kokoro";
if (!ttsCount) plan.push({ id: "tts", level: "required", command: checks.find((c) => c.id === "tts:kokoro").fix, note: `recommended engine(s) for this machine: ${recommendedTts}. Ask the user which language(s) the voice-over needs before installing more than Kokoro.` });

const missingReq = checks.filter((c) => c.level === "required" && !c.ok);
const missingRec = checks.filter((c) => c.level === "recommended" && !c.ok);
const stateFile = path.join(repo, ".vidbucks", "state.json");
let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { /* none yet */ }
const phase = missingReq.length ? "needs_setup" : missingRec.length ? "ready_with_gaps" : "ready";
const result = { ready: !missingReq.length, phase, renderers: selected, hardware, python: py ? { command: py, version: pyVer } : null, recommendedTts, setupCompleted: !!state.setupCompleted, checks, plan };

if (json) console.log(JSON.stringify(result, null, 1));
else {
  console.log(`Vidbucks doctor - renderer(s): ${selected.join(", ")} - ${hardware.platform}/${hardware.arch}, ${hardware.cpuCores} cores, ${hardware.ramGb} GB RAM, accelerator: ${hardware.accelerator}${hardware.nvidia ? " (" + hardware.nvidia + ")" : ""}\n`);
  for (const c of checks) console.log(`${c.ok ? "OK  " : c.level === "required" ? "FAIL" : "WARN"}  ${c.id.padEnd(24)} ${c.detail}${c.ok ? "" : "\n      -> " + c.fix}`);
  console.log(missingReq.length ? `\nNOT READY: ${missingReq.length} required item(s) missing. Follow the vidbucks-setup skill (it installs them step by step).` : `\nREADY.${missingRec.length ? ` ${missingRec.length} recommended item(s) missing (WARN).` : ""}${state.setupCompleted ? "" : " Run the smoke test once: node core/tools/smoke.mjs"}`);
  const noKeys = checks.filter((c) => c.level === "key" && !c.ok);
  if (noKeys.length) console.log(`(optional) free stock keys not set: ${noKeys.map((c) => c.id.slice(4)).join(", ")} - without them only Openverse/Wikimedia are used.`);
}
process.exit(missingReq.length ? 1 : missingRec.length ? 2 : 0);
