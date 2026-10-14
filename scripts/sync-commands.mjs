// Keeps the project-level slash commands (.claude/commands/vidbucks-*.md, used when you clone and open the repo)
// in sync with the plugin commands (commands/*.md, used as /vidbucks:<name> when installed as a plugin).   node scripts/sync-commands.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dst = path.join(repo, ".claude", "commands"); mkdirSync(dst, { recursive: true });
for (const f of readdirSync(path.join(repo, "commands")).filter((f) => f.endsWith(".md"))) {
  writeFileSync(path.join(dst, `vidbucks-${f}`), readFileSync(path.join(repo, "commands", f), "utf8").replace(/\/vidbucks:/g, "/vidbucks-"));
  console.log("synced", `vidbucks-${f}`);
}
