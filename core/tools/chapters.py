# -*- coding: utf-8 -*-
"""Chapter lines for the YouTube description from scene start times.

  python tools/chapters.py <video> "^In 1885=The forgetting curve" "^Fix number one=Fix 1: stop rereading" ...

Each argument is  <regex matched against the paragraph start>=<chapter title>.  The first chapter is always 0:00 (YouTube needs it).
Chapters must be >= 10 s apart and at least 3.
"""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = os.path.join(root, "videos", sys.argv[1])
paras = [p.strip() for p in open(os.path.join(v, "script.txt"), encoding="utf-8").read().split("\n\n") if p.strip() and not re.fullmatch(r"\[pause\s+[0-9.]+\]", p.strip())]
t = json.load(open(os.path.join(v, "timing.json"), encoding="utf-8"))
rules = [a.split("=", 1) for a in sys.argv[2:]]
out = [(0, rules[0][1] if rules and rules[0][0] in ("^", "") else "Intro")]
for rx, title in rules:
    for i, p in enumerate(paras):
        if re.search(rx, p):
            s = t["paras"][i]["start"]
            if s == 0 or s - out[-1][0] >= 10: out.append((s, title))
            break
seen, final = set(), []
for s, title in sorted(out):
    k = int(s)
    if k in seen: continue
    seen.add(k); final.append((k, title))
for s, title in final: print(f"{s // 60}:{s % 60:02d} {title}")
