# -*- coding: utf-8 -*-
"""python tools/blank_start.py <video> [--fix]  -> scenes whose first visible object appears later than 0.6 s after the scene start.
--fix sets the first non-line object of such scenes to at:"start" (edits scenes.json in place)."""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = os.path.join(root, "videos", sys.argv[1])
sc = json.load(open(os.path.join(v, "scenes.json"), encoding="utf-8")); t = json.load(open(os.path.join(v, "timing.json"), encoding="utf-8"))
NUM = dict(one="1", two="2", three="3", four="4", five="5", six="6", seven="7", eight="8", nine="9", ten="10", twenty="20")
def norm(s):
    n = re.sub(r"[^a-z0-9]", "", s.lower()); return NUM.get(n, n)
def same(a, b): return a == b or (len(a) >= 3 and len(b) >= 3 and (a.startswith(b) or b.startswith(a)))
def appear(i, spec):
    if spec in (None, "start"): return 0.0
    if isinstance(spec, (int, float)): return float(spec)
    if spec == "end": return 99
    m = re.match(r"^(.+?)(?:#(\d+))?([+-]\d*\.?\d+)?$", spec); w = norm(m.group(1)); nth = int(m.group(2) or 0); off = float(m.group(3) or 0)
    a = t["paras"][i]["start"] - 0.05; b = t["paras"][i + 1]["start"] if i + 1 < len(t["paras"]) else 1e9
    ws = [x for x in t["words"] if a <= x["s"] < b]
    hits = [x for x in ws if norm(x["w"]) == w] or [x for x in ws if same(norm(x["w"]), w)]
    if not hits: return 0.0
    return hits[min(nth, len(hits) - 1)]["s"] - t["paras"][i]["start"] + off
bad = []
for i, s in enumerate(sc):
    vis = [o for o in s["objs"] if o["k"] != "line"]
    if not vis: continue
    first = min(appear(i, o.get("at")) + o.get("delay", 0) for o in vis)
    if first > 0.6:
        bad.append((i, first))
        if "--fix" in sys.argv:
            o = vis[0]; o["at"] = "start"; o.pop("delay", None)
for i, f in bad: print(f"scene {i}: first object at {f:.1f}s")
print(f"{len(bad)} scene(s) start blank" + (" - fixed" if "--fix" in sys.argv and bad else ""))
if "--fix" in sys.argv and bad: json.dump(sc, open(os.path.join(v, "scenes.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
