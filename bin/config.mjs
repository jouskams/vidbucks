// tiny config store: <repo>/.vidbucks/config.json   { "renderers": ["remotion"], "voice": { "engine": "kokoro", "ttsCommand": "..." } }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(repo, ".vidbucks", "config.json");
export const readConfig = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; } };
export const writeConfig = (c) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n"); };
export const setPath = (c, dotted, value) => { const ks = dotted.split("."); let o = c; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks.at(-1)] = value; return c; };
