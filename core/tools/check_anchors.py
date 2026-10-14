# -*- coding: utf-8 -*-
"""python tools/check_anchors.py <video>  -> lists anchor words that are NOT spoken inside their scene (they would fall back to the scene start)."""
import json, re, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = os.path.join(root, "videos", sys.argv[1])
sc = json.load(open(os.path.join(v, "scenes.json"), encoding="utf-8"))
t = json.load(open(os.path.join(v, "timing.json"), encoding="utf-8"))
NUM = dict(one="1", two="2", three="3", four="4", five="5", six="6", seven="7", eight="8", nine="9", ten="10", twenty="20")
def norm(s):
    n = re.sub(r"[^a-z0-9]", "", s.lower()); return NUM.get(n, n)
def same(a, b): return a == b or (len(a) >= 3 and len(b) >= 3 and (a.startswith(b) or b.startswith(a)))
bad = 0
if len(sc) != len(t["paras"]):
    print(f"SCENE COUNT MISMATCH: {len(sc)} scenes vs {len(t['paras'])} paragraphs"); bad += 1
def specs(o):
    if isinstance(o, dict):
        for k, val in o.items():
            if k in ("at", "until") and isinstance(val, str): yield val
            elif k == "ats":
                for x in val:
                    if isinstance(x, str): yield x
            else: yield from specs(val)
    elif isinstance(o, list):
        for x in o: yield from specs(x)
for i, s in enumerate(sc[:len(t["paras"])]):
    a = t["paras"][i]["start"] - 0.05; b = t["paras"][i + 1]["start"] if i + 1 < len(t["paras"]) else 1e9
    words = {norm(w["w"]) for w in t["words"] if a <= w["s"] < b}
    for sp in specs(s):
        if sp in ("start", "end"): continue
        m = re.match(r"^(.+?)(?:#(\d+))?([+-]\d*\.?\d+)?$", sp)
        w = norm(m.group(1)) if m else norm(sp)
        if not any(same(x, w) for x in words):
            print(f"scene {i}: anchor '{sp}' not spoken in this scene"); bad += 1
print("anchors OK" if not bad else f"{bad} problems")
