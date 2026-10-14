#!/usr/bin/env node
// Vidbucks CLI:  node bin/vidbucks.mjs <command>      (or: npm link  ->  vidbucks <command>)
//   setup      install skills + dependencies, then show what is missing
//   status     what to do next (setup needed / ready for your first reference)
//   doctor     full tool check (--json for machines)
//   smoke      render a template + a video and run the measuring tool
//   config     config get | config set renderers remotion,hyperframes | config set voice.ttsCommand "cmd {text_file} {out}"
//   analyze    python core/tools/analyze_reference.py <args>   (--link URL | --file VIDEO | --compare A B | --sidebyside REF CAND OUT)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PY } from "../core/tools/pycmd.mjs";
import { readConfig, setPath, writeConfig } from "./config.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);
const run = (c, a, cwd = repo) => process.exit(spawnSync(c, a, { cwd, stdio: "inherit", shell: process.platform === "win32" && c === "npx" }).status ?? 1);
switch (cmd) {
  case "setup": run(process.execPath, [path.join(repo, "scripts", "setup.mjs"), ...rest]); break;
  case "status": run(process.execPath, [path.join(repo, "scripts", "status.mjs"), ...rest]); break;
  case "doctor": run(process.execPath, [path.join(repo, "core", "tools", "doctor.mjs"), ...rest]); break;
  case "smoke": run(process.execPath, [path.join(repo, "core", "tools", "smoke.mjs"), ...rest]); break;
  case "analyze": run(PY, [path.join("tools", "analyze_reference.py"), ...rest], path.join(repo, "core")); break;
  case "config": {
    const [op, key, val] = rest; const c = readConfig();
    if (op === "set" && key) { writeConfig(setPath(c, key, key === "renderers" ? String(val).split(",").map((x) => x.trim()).filter(Boolean) : val)); console.log(JSON.stringify(readConfig(), null, 2)); }
    else console.log(JSON.stringify(c, null, 2));
    break;
  }
  default: console.log("usage: vidbucks <setup|status|doctor|smoke|config|analyze> [args]"); process.exit(cmd ? 1 : 0);
}
