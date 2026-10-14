// Vidbucks release helper.   node scripts/release.mjs [--scan-only]
// 1) scans every text file for private material: e-mail addresses, absolute user paths, API-key shapes and anything listed in an
//    optional private deny file OUTSIDE the repository: $VIDBUCKS_RELEASE_DENY or ~/.vidbucks/release-deny (one case-insensitive regex per line)
// 2) (without --scan-only) writes dist/vidbucks-<version>.zip with a top-level vidbucks/ folder (no node_modules, no generated media)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")).version;
const scanOnly = process.argv.includes("--scan-only");
const SKIP_DIR = /(^|\/)(node_modules|\.git|dist|out|__pycache__|\.vidbucks|models|data)(\/|$)|^core\/public\/(audio-lib|videos|stock|_voice-test)(\/|$)|^knowledge\/references(\/|$)/;
const BIN = /\.(png|jpe?g|gif|webp|mp3|mp4|wav|ogg|woff2?|ttf|otf|zip|pt|ico|pdf)$/i;
const builtin = [/\/Users\/[A-Za-z0-9._-]+/, /C:\\Users\\[A-Za-z0-9._-]+/, /[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|icloud|yahoo|proton)\.[a-z]+/i, /\bsk-[A-Za-z0-9]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bghp_[A-Za-z0-9]{20,}/, /(PEXELS|PIXABAY)_API_KEY=[^\s<]+/];
const denyFile = process.env.VIDBUCKS_RELEASE_DENY || path.join(os.homedir(), ".vidbucks", "release-deny");
const local = existsSync(denyFile)
  ? readFileSync(denyFile, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => new RegExp(l, "i")) : [];
const rules = [...builtin, ...local];
const hits = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f), rel = path.relative(repo, p).split(path.sep).join("/");
    if (SKIP_DIR.test(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (!BIN.test(f) && st.size < 3e6 && !/(^|\/)(\.release-deny|\.gitignore|release\.mjs)$/.test(rel)) {
      const txt = readFileSync(p, "utf8");
      for (const rx of rules) { const m = (rel + "\n" + txt).match(rx); if (m) { hits.push(`${rel}: /${rx.source.slice(0, 40)}/ -> "${m[0].slice(0, 50)}"`); break; } }
    }
  }
};
walk(repo);
if (hits.length) { console.error(`SCAN FAILED: ${hits.length} file(s) contain private-looking material:\n` + hits.slice(0, 50).join("\n")); process.exit(1); }
console.log(`scan clean (${rules.length} rules${local.length ? ", including your private deny file" : ""}).`);
if (scanOnly) process.exit(0);

const dist = path.join(repo, "dist"), stage = path.join(dist, "_stage", "vidbucks");
rmSync(dist, { recursive: true, force: true }); mkdirSync(stage, { recursive: true });
cpSync(repo, stage, { recursive: true, filter: (s) => { const rel = path.relative(repo, s).split(path.sep).join("/"); return !SKIP_DIR.test(rel) && !/(^|\/)(\.release-deny|\.DS_Store)$/.test(rel) && !/^core\/\.env$/.test(rel); } });
const out = path.join(dist, `vidbucks-${version}.zip`);
let r = spawnSync("python3", ["-m", "zipfile", "-c", out, "vidbucks"], { cwd: path.join(dist, "_stage"), encoding: "utf8" });
if (r.status !== 0) r = spawnSync("zip", ["-qr", out, "vidbucks"], { cwd: path.join(dist, "_stage"), encoding: "utf8" });
if (r.status !== 0) { console.error("could not create the zip:", r.stderr); process.exit(1); }
rmSync(path.join(dist, "_stage"), { recursive: true, force: true });
console.log(`wrote ${out} (${(statSync(out).size / 1048576).toFixed(1)} MB)`);
