#!/usr/bin/env node
// SessionStart hook: tells the assistant the Vidbucks status so it can (1) guide the setup if tools are missing or
// (2) announce "ready - send your reference video" once setup is finished. Silent outside a Vidbucks home.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.VIDBUCKS_HOME, process.cwd(), here, (() => { try { return readFileSync(path.join(homedir(), ".vidbucks", "home"), "utf8").trim(); } catch { return null; } })()].filter(Boolean);
const home = candidates.find((c) => existsSync(path.join(c, "scripts", "status.mjs")));
if (!home) process.exit(0);
const r = spawnSync(process.execPath, [path.join(home, "scripts", "status.mjs"), "--hook"], { encoding: "utf8", timeout: 15000 });
if (r.stdout) process.stdout.write(r.stdout);
process.exit(0);
