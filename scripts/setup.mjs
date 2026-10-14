// Vidbucks one-time setup.   node scripts/setup.mjs [--no-npm] [--skills-only]
// 1) installs the Vidbucks skills into ~/.claude/skills (never touches symbolic links you created)
// 2) records where Vidbucks lives (~/.vidbucks/home) so any Claude Code session can find it
// 3) npm ci in core/ (Remotion + dependencies)
// 4) runs the status check: it lists exactly what is still missing; the vidbucks-setup skill installs the rest step by step.
// Nothing is downloaded except npm packages; no accounts are created; keys are never requested here.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const has = (f) => process.argv.includes(f);
const log = (...a) => console.log(...a);
const win = process.platform === "win32";

const skillsHome = path.join(homedir(), ".claude", "skills");
mkdirSync(skillsHome, { recursive: true });
let n = 0;
const src = path.join(repo, "skills");
for (const d of readdirSync(src)) {
  const s = path.join(src, d);
  if (!statSync(s).isDirectory() || !existsSync(path.join(s, "SKILL.md"))) continue;
  const dest = path.join(skillsHome, d);
  try {
    if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) { log(`skipped ${d}: ${dest} is a symbolic link (left untouched)`); continue; }
    cpSync(s, dest, { recursive: true, force: true }); n++;
  } catch (e) { log(`could not install ${d}: ${e.code || e.message}`); }
}
log(`Vidbucks skills installed into ${skillsHome}: ${n}`);

mkdirSync(path.join(homedir(), ".vidbucks"), { recursive: true });
writeFileSync(path.join(homedir(), ".vidbucks", "home"), repo + "\n");
try { writeFileSync(path.join(skillsHome, "vidbucks", "PACKAGE_PATH.txt"), repo + "\n"); } catch { /* entry skill not installed */ }

if (!has("--skills-only")) {
  if (!has("--no-npm")) {
    log("npm ci in core/ (a few minutes the first time)...");
    const hasLock = existsSync(path.join(repo, "core", "package-lock.json"));
    const r = spawnSync("npm", [hasLock ? "ci" : "install", "--no-audit", "--no-fund"], { cwd: path.join(repo, "core"), stdio: "inherit", shell: win });
    if (r.status !== 0) log("npm failed - fix the error above and re-run: node scripts/setup.mjs");
  }
  log("\n--- status ---");
  spawnSync(process.execPath, [path.join(repo, "scripts", "status.mjs")], { stdio: "inherit" });
}
log(`\nNext: open Claude Code in ${repo} and say "set up Vidbucks" - the vidbucks-setup skill finishes the installation and then asks for your first reference video.`);
