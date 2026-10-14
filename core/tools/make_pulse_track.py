#!/usr/bin/env python
"""make_pulse_track.py - synthesise a royalty-free mood track at an exact BPM so cuts can sit on the beat grid.
  python tools/make_pulse_track.py --bpm 145.2 --dur 14 --mood dark --out public/<dir>/pulse.wav
moods: dark (sub drone + soft kick + off-beat tick), bright (pluck arp + kick + clap), calm (pad + sparse tick)
Beat 0 is at t=0, so with BPM = 60*n/T a moment T seconds in lands exactly on beat n. Own synthesis: no credit needed."""
import argparse, numpy as np, soundfile as sf
ap = argparse.ArgumentParser(); ap.add_argument("--bpm", type=float, required=True); ap.add_argument("--dur", type=float, default=14); ap.add_argument("--mood", default="dark"); ap.add_argument("--out", required=True)
a = ap.parse_args(); sr = 44100; n = int(a.dur * sr); t = np.arange(n) / sr; beat = 60 / a.bpm; rng = np.random.default_rng(3)
y = np.zeros(n)
def add(sig, at):
    i = int(at * sr); j = min(n, i + len(sig))
    if i < n: y[i:j] += sig[: j - i]
def kick(vol):
    k = np.arange(int(0.32 * sr)) / sr; f = 48 + 90 * np.exp(-k * 28); return vol * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-k * 9)
def tick(vol, hp=True):
    k = np.arange(int(0.05 * sr)) / sr; s = rng.standard_normal(len(k)) * np.exp(-k * 90); return vol * (np.diff(s, prepend=0) if hp else s)
def clap(vol):
    k = np.arange(int(0.18 * sr)) / sr; s = rng.standard_normal(len(k)); return vol * np.convolve(s, np.ones(6) / 6, "same") * np.exp(-k * 24)
if a.mood == "dark":
    drone = 0.20 * np.sin(2 * np.pi * 55 * t) + 0.09 * np.sin(2 * np.pi * 55.4 * t + 1) + 0.05 * np.sin(2 * np.pi * 82.4 * t)
    y += drone * (0.55 + 0.45 * np.sin(2 * np.pi * t / (beat * 16) - 1.2) ** 2)
    for b in np.arange(0, a.dur, beat): add(kick(0.55), b)
    for b in np.arange(beat / 2, a.dur, beat): add(tick(0.10), b)
elif a.mood == "bright":
    notes = [220, 277.2, 329.6, 440]
    for i, b in enumerate(np.arange(0, a.dur, beat / 2)):
        f = notes[i % 4]; k = np.arange(int(0.2 * sr)) / sr; add(0.16 * np.sin(2 * np.pi * f * k) * np.exp(-k * 14), b)
    for b in np.arange(0, a.dur, beat): add(kick(0.5), b)
    for b in np.arange(beat, a.dur, beat * 2): add(clap(0.25), b)
else:
    y += 0.10 * np.sin(2 * np.pi * 110 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 7)) + 0.06 * np.sin(2 * np.pi * 164.8 * t)
    for b in np.arange(0, a.dur, beat * 2): add(tick(0.08), b)
d = int(0.08 * sr * 10); echo = np.zeros(n); echo[int(0.23 * sr):] += 0.28 * y[: n - int(0.23 * sr)]; y = y + echo   # tiny room
y = np.tanh(y * 1.4); y /= max(1e-6, np.abs(y).max()); y *= 0.8
fade = int(0.4 * sr); y[:200] *= np.linspace(0, 1, 200); y[-fade:] *= np.linspace(1, 0, fade)
sf.write(a.out, y.astype(np.float32), sr); print("wrote", a.out, f"{a.bpm} BPM, beat {beat:.4f}s")
