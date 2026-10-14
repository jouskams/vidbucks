# -*- coding: utf-8 -*-
"""Lists every audio-library entry a video actually uses (music beds + rotated SFX variants) and prints the credit lines
that must go into the description (CC BY / CC BY-SA).   python tools/credits.py <video>
Replicates the rotation in src/engine/Video.tsx collectSfx (wipe -> objects -> scene sfx, per-category counter)."""
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = os.path.join(root, "videos", sys.argv[1])
cfg = json.load(open(os.path.join(v, "video.json"), encoding="utf-8"))
scenes = json.load(open(os.path.join(v, "scenes.json"), encoding="utf-8"))
lib = json.load(open(os.path.join(root, "src", "audio-lib.json"), encoding="utf-8"))
byid = {e["id"]: e for e in lib}
def bycat(c): return [e for e in lib if e["category"] == c and e["kind"] == "sfx" and e["origin"] != "remotion"]
counter, used = {}, {}
def use(c):
    if "-" in c: e = byid.get(c)
    else:
        counter[c] = counter.get(c, -1) + 1
        l = bycat(c); e = l[counter[c] % len(l)] if l else None
    if e: used[e["id"]] = e
defaults = cfg.get("sfxDefaults", {}); every = cfg.get("wipeEvery", 4)
for i, s in enumerate(scenes):
    if i > 0 and every > 0 and i % every == 0 and cfg.get("wipeSfx"): use(cfg["wipeSfx"][0])
    for o in s["objs"]:
        sp = o.get("sfx")
        if sp is False: continue
        if sp is None and o["k"] in defaults: sp = defaults[o["k"]]
        if sp is None and o["k"] == "icon" and f"icon:{o.get('n')}" in defaults: sp = defaults[f"icon:{o['n']}"]
        if sp: use(sp[0] if isinstance(sp, list) else sp)
    for e in s.get("sfx", []): use(e["c"])
for m in cfg.get("music", []):
    if m["id"] in byid: used[m["id"]] = byid[m["id"]]
print(f"{len(used)} library entries used; origins: " + ", ".join(f"{k}={sum(1 for e in used.values() if e['origin'] == k)}" for k in sorted({e['origin'] for e in used.values()})))
need = [e for e in used.values() if e.get("attribution")]
print(f"{len(need)} need a credit line:" if need else "no credit lines needed for audio")
for e in need: print(f'Music/SFX: "{e["title"]}" by {e["creator"]} ({e["license"]}) {e.get("pageUrl", "")}')
unver = [e for e in used.values() if e["origin"] == "remotion"]
if unver: print(f"NOTE: {len(unver)} entries come from remotion.media whose licence is unverified: " + ", ".join(e["id"] for e in unver))
