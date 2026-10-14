# -*- coding: utf-8 -*-
"""Slow down / speed up an existing narration WITHOUT re-running the TTS, and rescale timing.json to match.

  python tools/stretch_narration.py <video> --wpm-target 160        # computes the factor from the current pace
  python tools/stretch_narration.py <video> --factor 1.15           # 15 % slower (duration x 1.15, pitch unchanged)

Keeps backups: public/videos/<video>/narration.orig.wav and videos/<video>/timing.orig.json (only the first time).
Scene boundaries follow automatically because every scene is anchored to timing.json. Hard-coded absolute times in custom scenes
(rare) must be scaled by the same factor. Quality is fine for +-20 %; beyond that regenerate the voice (shorter/longer script) instead.
"""
import argparse, json, os, shutil, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--factor", type=float); ap.add_argument("--wpm-target", type=float)
a = ap.parse_args()
vd = os.path.join(root, "videos", a.video); pd = os.path.join(root, "public", "videos", a.video)
tj = os.path.join(vd, "timing.json"); wav = os.path.join(pd, "narration.wav")
t = json.load(open(tj, encoding="utf-8"))
words, dur = len(t["words"]), t["duration"]
if a.wpm_target: f = (words / dur * 60) / a.wpm_target
elif a.factor: f = a.factor
else: sys.exit("give --factor or --wpm-target")
if not 0.7 <= f <= 1.4: sys.exit(f"factor {f:.2f} is outside 0.7-1.4: regenerate the narration instead")
for src, bak in ((wav, os.path.join(pd, "narration.orig.wav")), (tj, os.path.join(vd, "timing.orig.json"))):
    if not os.path.exists(bak): shutil.copy(src, bak)
src = os.path.join(pd, "narration.orig.wav")
r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"atempo={1 / f:.5f}", wav])
if r.returncode: sys.exit("ffmpeg failed")
o = json.load(open(os.path.join(vd, "timing.orig.json"), encoding="utf-8"))
k = lambda x: round(x * f, 3)
o["duration"] = k(o["duration"])
for p in o["paras"]: p["start"], p["end"] = k(p["start"]), k(p["end"])
for s in o.get("sentences", []): s["start"], s["end"] = k(s["start"]), k(s["end"])
for w in o["words"]: w["s"], w["e"] = k(w["s"]), k(w["e"])
json.dump(o, open(tj, "w", encoding="utf-8"), indent=1)
print(f"factor {f:.3f}: duration {dur:.1f}s -> {o['duration']:.1f}s, pace {words / dur * 60:.0f} -> {words / o['duration'] * 60:.0f} wpm (incl. gaps)")
