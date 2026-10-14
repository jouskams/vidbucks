#!/usr/bin/env node
// Vidbucks status: one call that tells the assistant (and the user) what to do next.
//   node scripts/status.mjs            human readable
//   node scripts/status.mjs --json     machine readable (used by the setup skill)
//   node scripts/status.mjs --hook     JSON for the Claude Code SessionStart hook (additionalContext)
//   node scripts/status.mjs --mark-ready   record that setup is complete (called by the setup skill after the smoke test passes)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(repo, ".vidbucks"), stateFile = path.join(stateDir, "state.json");
const arg = (a) => process.argv.includes(a);
const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; } };

if (arg("--mark-ready")) {
  fs.mkdirSync(stateDir, { recursive: true });
  const s = { ...readState(), setupCompleted: true, completedAt: new Date().toISOString(), announcedReady: false };
  fs.writeFileSync(stateFile, JSON.stringify(s, null, 1));
  try { fs.mkdirSync(path.join(os.homedir(), ".vidbucks"), { recursive: true }); fs.writeFileSync(path.join(os.homedir(), ".vidbucks", "home"), repo); } catch { /* ignore */ }
  console.log("Vidbucks setup recorded. Home:", repo); process.exit(0);
}
if (arg("--mark-announced")) { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify({ ...readState(), announcedReady: true }, null, 1)); process.exit(0); }

const r = spawnSync(process.execPath, [path.join(repo, "core", "tools", "doctor.mjs"), "--json"], { encoding: "utf8", maxBuffer: 1 << 24 });
let d; try { d = JSON.parse(r.stdout); } catch { d = { ready: false, phase: "needs_setup", checks: [], plan: [{ id: "doctor", level: "required", command: "node core/tools/doctor.mjs (it failed to run: " + (r.stderr || "").slice(0, 200) + ")" }], hardware: {} }; }
const st = readState();
const ready = d.ready && st.setupCompleted;
const phase = !d.ready ? "needs_setup" : !st.setupCompleted ? "needs_smoke_test" : "ready";
const out = { phase, repo, hardware: d.hardware, python: d.python, recommendedTts: d.recommendedTts, missing: (d.plan || []), announcedReady: !!st.announcedReady };

const missingList = (d.plan || []).map((p) => `- ${p.id}: ${p.command}${p.note ? " (" + p.note + ")" : ""}`).join("\n");
const messages = {
  needs_setup: `Vidbucks is not ready yet: ${(d.plan || []).length} item(s) are missing.\nStart the setup skill (vidbucks-setup) and install them step by step:\n${missingList}`,
  needs_smoke_test: "Vidbucks tools are installed. One last check: run node core/tools/smoke.mjs, then node scripts/status.mjs --mark-ready.",
  ready: "Vidbucks is READY. Next: ask the user for a REFERENCE VIDEO (a YouTube link or a video/screen-recording file, or an image set or a short brief) and what they want to say; then follow the vidbucks-reference-to-video skill.",
};
out.message = messages[phase];

if (arg("--json")) console.log(JSON.stringify(out, null, 1));
else if (arg("--hook")) {
  const ctx = phase === "ready"
    ? (st.announcedReady ? "Vidbucks is ready. If the user asks for a video, follow the vidbucks-reference-to-video skill." : `${messages.ready}\nTell the user NOW, in their language, that setup is finished and that they can send the reference video (link or file) - then run: node scripts/status.mjs --mark-announced`)
    : `${messages[phase]}\nTell the user (in their language) what is missing and offer to run the vidbucks-setup skill now.`;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: `VIDBUCKS STATUS (${phase}): ${ctx}` } }));
} else {
  console.log(`Vidbucks status: ${phase.toUpperCase()}\n${out.message}`);
  if (phase === "needs_setup") console.log(`\nRecommended voice engine(s) for this machine: ${d.recommendedTts}`);
}
process.exit(phase === "ready" ? 0 : 1);
