// Resolves the Python command once: VIDBUCKS_PYTHON, then python, then python3 (many systems only have python3).
import { spawnSync } from "node:child_process";
export const PY = (() => {
  for (const c of [process.env.VIDBUCKS_PYTHON, "python", "python3"].filter(Boolean)) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0 && /Python 3\./.test((r.stdout || "") + (r.stderr || ""))) return c;
  }
  return "python";
})();
