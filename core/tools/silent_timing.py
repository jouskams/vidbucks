# -*- coding: utf-8 -*-
"""Timing for a video WITHOUT narration (music-driven short films, e.g. wordless slice-of-life short films).

  python tools/silent_timing.py <video> 4.2 3.8 2.2 ...      one duration (seconds) per scene

Writes videos/<video>/timing.json (paras = scenes, no words) and a silent public/videos/<video>/narration.wav,
so the normal engine, register.mjs and the renderer work unchanged. Use numeric anchors (seconds from scene start).
Optional: videos/<video>/beats.txt with one line per scene is copied into paras[i].text (for notes only)."""
import json, os, sys
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name, durs = sys.argv[1], [float(x) for x in sys.argv[2:]]
if not durs:
    sys.exit("give one duration per scene")
beats_f = os.path.join(ROOT, "videos", name, "beats.txt")
beats = [l.strip() for l in open(beats_f, encoding="utf-8")] if os.path.exists(beats_f) else []
paras, t = [], 0.0
for i, d in enumerate(durs):
    paras.append({"start": round(t, 3), "end": round(t + d, 3), "text": beats[i] if i < len(beats) else ""})
    t += d
os.makedirs(os.path.join(ROOT, "public", "videos", name), exist_ok=True)
sf.write(os.path.join(ROOT, "public", "videos", name, "narration.wav"), np.zeros(int(t * 24000), np.float32), 24000)
json.dump({"duration": round(t, 3), "paras": paras, "sentences": [], "words": []}, open(os.path.join(ROOT, "videos", name, "timing.json"), "w"), indent=1)
print(f"{len(durs)} scenes, {t:.1f} s")
