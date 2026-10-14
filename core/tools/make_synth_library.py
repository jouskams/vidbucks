# -*- coding: utf-8 -*-
"""Synthesised audio library (no samples, no third-party material).
   python tools/make_synth_library.py [--sfx-only|--music-only]
Writes mp3s into public/audio-lib/{sfx,music}/synth_*/ and an index to public/audio-lib/library-synth.json.
"""
import os, sys, json, subprocess, tempfile
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, lfilter

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio-lib")
rng = np.random.default_rng(2026)
INDEX = []

def T(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_ad(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def fade(x, a=0.004, r=0.02):
    n = len(x); na, nr = int(a * SR), int(r * SR)
    x = x.copy()
    if na: x[:na] *= np.linspace(0, 1, na)
    if nr: x[-nr:] *= np.linspace(1, 0, nr)
    return x
def noise(d): return rng.standard_normal(int(d * SR))
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [max(20, lo), min(SR / 2 - 100, hi)], btype="band", fs=SR, output="sos"), x)
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR / 2 - 100), btype="low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)

def sweep_bp(x, f0, f1, q=1.2, block=512):
    out = np.zeros_like(x); n = len(x)
    for s in range(0, n, block):
        k = s / max(n - 1, 1)
        f = f0 * (f1 / f0) ** k
        out[s:s + block] = bp(x[s:s + block], f / (1 + 1 / q), f * (1 + 1 / q), 2) if s + block <= n else bp(x[s:], f / (1 + 1 / q), f * (1 + 1 / q), 2)
    return out

def reverb(x, tail=1.2, mix=0.3):
    y = np.concatenate([x, np.zeros(int(tail * SR))]); out = y.copy()
    for d, g in ((0.037, 0.5), (0.053, 0.42), (0.071, 0.36), (0.097, 0.3), (0.131, 0.22)):
        ds = int(d * SR); out[ds:] += y[:-ds] * g
    # simple one-pole smoothing so the tail is dark
    out = lp(out, 5000, 1)
    return y * (1 - mix) + out * mix

def save(rel, x, kind, category, tags, gain=0.708, mood=None, bpm=None, key=None, bitrate=None):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], axis=1)
    pk = np.max(np.abs(x)) + 1e-9
    x = x / pk * gain
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        w = os.path.join(td, "a.wav"); sf.write(w, x.astype(np.float32), SR)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", w, "-b:a", bitrate or ("160k" if kind == "music" else "192k"), path], check=True)
    INDEX.append(dict(id=os.path.splitext(os.path.basename(rel))[0], kind=kind, category=category, origin="synth", file="audio-lib/" + rel.replace(os.sep, "/"),
                      duration=round(len(x) / SR, 2), title=os.path.basename(rel), creator="own synthesis", license="own (synthesised)", attribution=False,
                      tags=tags, **({"mood": mood} if mood else {}), **({"bpm": bpm} if bpm else {}), **({"key": key} if key else {})))

# ------------------------------------------------------------------------ SFX
def whoosh(d, f0, f1, q=1.0, bell=0.45):
    n = int(d * SR); x = sweep_bp(noise(d), f0, f1, q)
    e = np.sin(np.pi * np.minimum(1, np.arange(n) / n / (bell * 2)) ) ** 2 if False else np.where(np.arange(n) / n < bell, (np.arange(n) / n / bell) ** 1.5, ((1 - np.arange(n) / n) / (1 - bell)) ** 1.2)
    return fade(x * e, 0.01, 0.03)
def impact(d, f_hi=140, f_lo=38, noise_amt=0.6, tail=1.0, rev=0.3):
    t = T(d); n = len(t)
    sub = np.sin(2 * np.pi * np.cumsum(f_lo + (f_hi - f_lo) * np.exp(-t * 14)) / SR) * np.exp(-t * 3.2)
    burst = lp(noise(d), 1800) * np.exp(-t * 22) * noise_amt
    return reverb(fade(sub + burst, 0.001, 0.05), tail, rev)
def riser(d, f0=250, f1=9000, tone=True):
    t = T(d); n = len(t)
    x = sweep_bp(noise(d), f0, f1, 0.8) * (t / d) ** 1.8
    if tone: x += 0.35 * np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0 / 4) ** (t / d)) / SR) * (t / d) ** 2.5
    return fade(x, 0.02, 0.01)
def bell(f, d, ratios=(1, 2.76, 5.4, 8.93), amps=(1, .5, .25, .12), decay=0.6):
    t = T(d); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (decay / (1 + 0.4 * i))) for i, (r, a) in enumerate(zip(ratios, amps)))
    return fade(x, 0.002, 0.02)
def blip(f0, f1, d, wave="sin"):
    t = T(d); ph = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * (t / d)) / SR
    x = np.sin(ph) if wave == "sin" else np.sign(np.sin(ph)) * 0.6
    return fade(x * env_ad(len(t), 0.002, d / 2.2), 0.001, 0.01)
def click(f, d=0.012, bw=0.6):
    return fade(bp(noise(d + 0.02), f * (1 - bw / 2), f * (1 + bw / 2)) * env_ad(int((d + .02) * SR), 0.0005, d / 2.5), 0, 0.004)
def kick(f0=130, f1=42, d=0.5, click_amt=0.25):
    t = T(d); x = np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 28)) / SR) * np.exp(-t * 7)
    return x + click_amt * hp(noise(d), 2500) * np.exp(-t * 250)
def snare(d=0.3, tone=190, snap=1.0):
    t = T(d); return np.sin(2 * np.pi * tone * t) * np.exp(-t * 22) * 0.6 + hp(noise(d), 1500) * np.exp(-t * 17) * snap
def clap(d=0.28):
    t = T(d); base = bp(noise(d), 900, 3800) * np.exp(-t * 20)
    out = base.copy()
    for off in (0.011, 0.024, 0.036): s = int(off * SR); out[s:] += base[:-s] * 0.7
    return out
def hat(d=0.08, openh=False):
    t = T(0.35 if openh else d); return hp(rng.standard_normal(len(t)), 6500) * np.exp(-t * (9 if openh else 70))
def tom(f, d=0.5):
    t = T(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.35 * np.exp(-t * 18))) / SR) * np.exp(-t * 6.5)
def whistle(d, f=2700, trill=34):
    t = T(d); ph = 2 * np.pi * f * t + 6 * np.sin(2 * np.pi * trill * t)
    x = (np.sin(ph) * (1 + 0.18 * np.sin(2 * np.pi * trill * t)) + 0.3 * np.sin(2 * ph)) + 0.08 * noise(d)
    return fade(x, 0.02, 0.06)
def horn(d, notes=(220, 277.2, 329.6), det=0.004):
    t = T(d); x = sum(np.sign(np.sin(2 * np.pi * f * (1 + k * det) * t)) for f in notes for k in (-1, 0, 1)) / 4
    return fade(lp(x, 3200), 0.02, 0.08)
def crowd(d, bright=0.5):
    n = noise(d); t = T(d)
    x = lp(n, 900) * 1.2 + lp(n, 4000) * bright
    e = np.minimum(1, t / (d * 0.3)) ** 1.5 * np.exp(-np.maximum(0, t - d * 0.45) * (2.4 / d))
    return x * e * (1 + 0.2 * np.sin(2 * np.pi * 3.1 * t))
def applause(d, dens=900):
    x = np.zeros(int(d * SR))
    for _ in range(int(dens * d)):
        s = rng.integers(0, len(x) - 800); l = rng.integers(120, 700)
        x[s:s + l] += bp(rng.standard_normal(l), 1200, 6000) * np.exp(-np.arange(l) / (l / 4)) * rng.uniform(0.2, 1)
    t = T(d); return x * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)
def glitch(d=0.6, crush=6):
    n = int(d * SR); x = np.zeros(n); pos = 0
    while pos < n:
        l = int(rng.uniform(0.01, 0.06) * SR); f = rng.choice([180, 440, 1200, 2600, 5200]); tt = np.arange(l) / SR
        seg = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + 0.5 * rng.standard_normal(l)
        seg = np.repeat(seg[::crush], crush)[:l]
        x[pos:pos + l] = seg[: n - pos] if rng.random() > 0.25 else 0
        pos += l + int(rng.uniform(0, 0.02) * SR)
    return fade(x, 0.001, 0.03)
def zap(f0, f1, d, fm=60):
    t = T(d); f = f0 * (f1 / f0) ** (t / d)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * fm * t)) * env_ad(len(t), 0.002, d / 1.8), 0.001, 0.02)
def swell(d, notes, att=0.5):
    t = T(d); x = sum(np.sin(2 * np.pi * hz(m) * t) + 0.5 * np.sin(2 * np.pi * hz(m) * 1.004 * t) for m in notes)
    return x * np.minimum(1, t / (d * att)) * np.minimum(1, (d - t) / (d * 0.35))
def heartbeat(beats=4, gap=0.85):
    out = np.zeros(int((beats * gap + 0.6) * SR))
    for b in range(beats):
        for off, amp in ((0, 1), (0.26, .65)):
            h = lp(kick(70, 45, 0.3, 0), 200) * amp; s = int((b * gap + off) * SR); out[s:s + len(h)] += h
    return out
def ticktock(beats=6, gap=0.5):
    out = np.zeros(int((beats * gap + 0.2) * SR))
    for b in range(beats):
        c = click(1900 if b % 2 == 0 else 1300, 0.014) * 1.0; s = int(b * gap * SR); out[s:s + len(c)] += c
    return out
def typing(d=1.6, rate=9):
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.05:
        c = click(rng.choice([1500, 2100, 2900, 3600]), 0.01) * rng.uniform(0.5, 1); s = int(t * SR); out[s:s + len(c)] += c[: len(out) - s]
        t += rng.uniform(0.6, 1.5) / rate
    return out
def pen(d=0.8, hf=3500):
    n = noise(d); t = T(d)
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * rng.uniform(5, 9) * t + rng.uniform(0, 3)))
    return fade(bp(n, hf * 0.5, hf * 1.6) * am * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1), 0.01, 0.05)
def pageturn(d=0.55):
    t = T(d); return fade(bp(noise(d), 1500, 6500) * np.sin(np.pi * t / d) ** 2 * (1 + 0.5 * hp(noise(d), 40)), 0.01, 0.05)
def shutter():
    out = np.zeros(int(0.3 * SR))
    for snd, at in ((click(2500, 0.02), 0), (0.5 * click(900, 0.03), 0), (0.8 * click(2100, 0.018), 0.06)):
        s0 = int(at * SR); out[s0:s0 + len(snd)] += snd
    return out
def coin(f=988):
    return np.concatenate([bell(f, 0.09, (1, 2.01, 3.02), (1, .6, .3), 0.08), bell(f * 1.335, 0.55, (1, 2.01, 3.02), (1, .6, .3), 0.35)])
def room(d=16, lo=300): return lp(np.cumsum(noise(d)) * 0.0004 + noise(d) * 0.2, lo, 1)
def wind(d=16): t = T(d); return sweep_bp(noise(d), 300, 900, 0.7) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 1))
def drone(d=16, root=36):
    t = T(d); x = sum(np.sign(np.sin(2 * np.pi * hz(root) * (1 + k * 0.003) * t)) for k in (-2, -1, 0, 1, 2))
    return lp(x, 520, 2) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t)) * np.minimum(1, t / 2) * np.minimum(1, (d - t) / 2)

def build_sfx():
    S = "sfx"
    for i, (d, f0, f1, q) in enumerate([(0.5, 400, 4000, 1.0), (0.7, 6000, 500, 1.0), (0.9, 300, 7000, 0.8), (1.1, 5000, 300, 0.8), (0.45, 1200, 9000, 1.6), (1.6, 250, 3500, 0.7), (0.6, 8000, 2000, 1.4), (1.3, 600, 1500, 0.6)], 1):
        save(f"{S}/synth_whoosh/synth-whoosh-{i:02d}.mp3", whoosh(d, f0, f1, q), "sfx", "whoosh", ["whoosh", "swish", "transition", "up" if f1 > f0 else "down"])
    for i, (d, fh, fl, na, tail, rev) in enumerate([(0.9, 150, 40, .6, 0.8, .25), (1.4, 120, 34, .8, 1.5, .35), (0.5, 220, 55, 1.0, 0.4, .15), (1.8, 100, 30, .5, 2.2, .45), (0.7, 180, 48, .9, 0.7, .2), (1.1, 140, 36, 1.2, 1.2, .3)], 1):
        save(f"{S}/synth_impact/synth-impact-{i:02d}.mp3", impact(d, fh, fl, na, tail, rev), "sfx", "impact", ["impact", "hit", "boom", "slam"])
    for i, (d, f0, f1, tone) in enumerate([(1.5, 250, 9000, True), (2.5, 200, 7000, True), (3.2, 300, 10000, False), (4.0, 150, 6000, True), (2.0, 500, 12000, False)], 1):
        save(f"{S}/synth_riser/synth-riser-{i:02d}.mp3", riser(d, f0, f1, tone), "sfx", "riser", ["riser", "build", "tension", "swell"])
    for i, (d, f0, f1) in enumerate([(1.2, 5000, 250), (2.0, 7000, 200), (0.8, 3000, 400)], 1):
        save(f"{S}/synth_downer/synth-downer-{i:02d}.mp3", riser(d, f1, f0, True)[::-1], "sfx", "downer", ["downer", "fall", "drop", "release"])
    for i, f in enumerate([523.3, 659.3, 784.0, 880.0, 1046.5, 1318.5], 1):
        save(f"{S}/synth_ui/synth-blip-{i:02d}.mp3", blip(f, f * 1.5, 0.09, "sin"), "sfx", "ui", ["blip", "ui", "select", "beep"])
    for i, f in enumerate([1200, 1800, 2600, 3500, 900, 4500], 1):
        save(f"{S}/synth_ui/synth-click-{i:02d}.mp3", click(f, 0.012), "sfx", "ui", ["click", "tick", "ui"])
    for i, (f0, f1) in enumerate([(700, 160), (520, 120), (900, 200), (400, 90)], 1):
        save(f"{S}/synth_ui/synth-pop-{i:02d}.mp3", blip(f0, f1, 0.09), "sfx", "ui", ["pop", "bubble", "ui"])
    for i, (f0, f1) in enumerate([(300, 900), (400, 1200), (250, 700)], 1):
        save(f"{S}/synth_ui/synth-bubble-{i:02d}.mp3", blip(f0, f1, 0.12), "sfx", "ui", ["bubble", "pop", "up"])
    for i, root in enumerate([72, 76, 79, 81, 84, 88], 1):
        save(f"{S}/synth_chime/synth-chime-{i:02d}.mp3", bell(hz(root), 1.6), "sfx", "success", ["chime", "bell", "ding", "positive"])
    for i, notes in enumerate([(72, 76, 79), (74, 78, 81, 86), (67, 71, 74, 79), (76, 79, 83)], 1):
        seq = np.zeros(int(2.4 * SR))
        for k, m in enumerate(notes):
            b = bell(hz(m), 1.2, decay=0.5); s = int(k * 0.09 * SR); seq[s:s + len(b)] += b[: len(seq) - s]
        save(f"{S}/synth_chime/synth-success-{i:02d}.mp3", seq, "sfx", "success", ["success", "arpeggio", "level-up", "positive"])
    for i in range(1, 5):
        seq = np.zeros(int(1.8 * SR))
        for k in range(14):
            b = bell(hz(int(rng.integers(88, 100))), 0.5, (1, 2.01, 3.0), (1, .5, .3), 0.2) * rng.uniform(0.3, 1); s = int(rng.uniform(0, 1.2) * SR); seq[s:s + len(b)] += b[: len(seq) - s]
        save(f"{S}/synth_chime/synth-sparkle-{i:02d}.mp3", seq, "sfx", "magic", ["sparkle", "magic", "glitter"])
    for i, f in enumerate([140, 110, 170], 1):
        d = np.concatenate([np.sign(np.sin(2 * np.pi * f * T(0.2))) * 0.6 * np.ones(int(0.2 * SR)), np.zeros(int(0.08 * SR)), np.sign(np.sin(2 * np.pi * f * T(0.35))) * 0.6])
        save(f"{S}/synth_fail/synth-error-{i:02d}.mp3", fade(lp(d, 1800), 0.005, 0.03), "sfx", "fail", ["error", "wrong", "buzz", "negative"])
    for i, (f0, f1) in enumerate([(600, 180), (500, 140), (700, 260)], 1):
        t = T(0.9); x = np.sin(2 * np.pi * np.cumsum((f0 + (f1 - f0) * (t / .9)) * (1 + 0.03 * np.sin(2 * np.pi * 6 * t))) / SR) * np.minimum(1, (0.9 - t) / 0.1)
        save(f"{S}/synth_fail/synth-fail-slide-{i:02d}.mp3", fade(x, 0.01, 0.05), "sfx", "fail", ["fail", "sad", "slide", "negative"])
    for i, (c, dr) in enumerate([(6, 0.6), (10, 0.9), (4, 0.5), (8, 1.2), (14, 0.7), (5, 1.0)], 1):
        save(f"{S}/synth_glitch/synth-glitch-{i:02d}.mp3", glitch(dr, c), "sfx", "glitch", ["glitch", "digital", "error", "stutter"])
    for i, (f0, f1, d, fm) in enumerate([(3000, 300, 0.35, 60), (1800, 200, 0.5, 30), (4000, 500, 0.25, 90), (2400, 120, 0.7, 20)], 1):
        save(f"{S}/synth_scifi/synth-zap-{i:02d}.mp3", zap(f0, f1, d, fm), "sfx", "scifi", ["zap", "laser", "sci-fi"])
    for i, (f0, f1) in enumerate([(120, 1800), (200, 3200), (90, 900)], 1):
        save(f"{S}/synth_scifi/synth-powerup-{i:02d}.mp3", zap(f0, f1, 0.9, 6), "sfx", "scifi", ["power-up", "charge", "sci-fi", "up"])
        save(f"{S}/synth_scifi/synth-powerdown-{i:02d}.mp3", zap(f1, f0, 1.1, 6), "sfx", "scifi", ["power-down", "shutdown", "sci-fi", "down"])
    for i, notes in enumerate([(45, 52, 57, 64), (41, 48, 53, 60), (48, 55, 60, 67)], 1):
        save(f"{S}/synth_swell/synth-swell-{i:02d}.mp3", reverb(swell(3.2, notes), 1.2, .3), "sfx", "swell", ["swell", "pad", "cinematic", "build"])
    save(f"{S}/synth_human/synth-heartbeat-01.mp3", heartbeat(4, 0.85), "sfx", "human", ["heartbeat", "pulse", "tension"])
    save(f"{S}/synth_human/synth-heartbeat-02.mp3", heartbeat(6, 0.6), "sfx", "human", ["heartbeat", "pulse", "fast", "tension"])
    save(f"{S}/synth_human/synth-ticktock-01.mp3", ticktock(6, 0.5), "sfx", "human", ["clock", "tick", "tock", "time"])
    save(f"{S}/synth_human/synth-ticktock-02.mp3", ticktock(8, 0.25), "sfx", "human", ["clock", "tick", "fast", "time"])
    for i, (f0, f1, d) in enumerate([(130, 42, 0.5), (110, 50, 0.4), (150, 38, 0.7)], 1):
        save(f"{S}/synth_drums/synth-kick-{i:02d}.mp3", kick(f0, f1, d), "sfx", "drums", ["kick", "drum", "stomp"])
    for i, (tn, sn) in enumerate([(190, 1.0), (230, 0.8), (160, 1.2)], 1):
        save(f"{S}/synth_drums/synth-snare-{i:02d}.mp3", snare(0.3, tn, sn), "sfx", "drums", ["snare", "drum"])
    for i in range(1, 4):
        save(f"{S}/synth_drums/synth-clap-{i:02d}.mp3", clap(0.28), "sfx", "drums", ["clap", "hands"])
    save(f"{S}/synth_drums/synth-hat-closed-01.mp3", hat(0.08), "sfx", "drums", ["hat", "closed"])
    save(f"{S}/synth_drums/synth-hat-open-01.mp3", hat(0.3, True), "sfx", "drums", ["hat", "open"])
    for i, f in enumerate([80, 110, 150, 200], 1):
        save(f"{S}/synth_drums/synth-tom-{i:02d}.mp3", tom(f, 0.5), "sfx", "drums", ["tom", "drum"])
    for i, (d, f, tr) in enumerate([(0.35, 2700, 34), (1.2, 2700, 34), (0.6, 3100, 30), (0.9, 2400, 38)], 1):
        save(f"{S}/synth_sports/synth-whistle-{i:02d}.mp3", whistle(d, f, tr), "sfx", "whistle_horn", ["whistle", "referee", "sports"])
    dbl = np.concatenate([whistle(0.3), np.zeros(int(0.12 * SR)), whistle(0.3)])
    save(f"{S}/synth_sports/synth-whistle-double.mp3", dbl, "sfx", "whistle_horn", ["whistle", "double", "referee"])
    for i, (d, n) in enumerate([(0.9, (220, 277.2, 329.6)), (1.4, (196, 247, 294)), (0.6, (261.6, 329.6, 392))], 1):
        save(f"{S}/synth_sports/synth-horn-{i:02d}.mp3", horn(d, n), "sfx", "whistle_horn", ["horn", "air-horn", "stadium"])
    for i, (f, d) in enumerate([(118, 0.8), (150, 0.6), (95, 1.2)], 1):
        b = np.sign(np.sin(2 * np.pi * f * T(d))) + np.sign(np.sin(2 * np.pi * (f + 3) * T(d))) * 0.8
        save(f"{S}/synth_sports/synth-buzzer-{i:02d}.mp3", fade(lp(b, 2500), 0.005, 0.05), "sfx", "whistle_horn", ["buzzer", "horn", "timeout"])
    for i, (d, br) in enumerate([(3.2, .5), (4.5, .7), (2.4, .3)], 1):
        save(f"{S}/synth_crowd/synth-crowd-roar-{i:02d}.mp3", crowd(d, br), "sfx", "crowd", ["crowd", "roar", "stadium", "cheer"])
    for i, (d, dens) in enumerate([(3.0, 700), (4.5, 1100), (2.2, 500)], 1):
        save(f"{S}/synth_crowd/synth-applause-{i:02d}.mp3", applause(d, dens), "sfx", "crowd", ["applause", "clap", "audience"])
    for i, (a, b2) in enumerate([(988, 1319), (1175, 1568), (880, 1175)], 1):
        save(f"{S}/synth_ui/synth-coin-{i:02d}.mp3", coin(a), "sfx", "money", ["coin", "pickup", "reward"])
    for i in range(1, 4):
        save(f"{S}/synth_camera/synth-shutter-{i:02d}.mp3", shutter() * (1 - 0.1 * i), "sfx", "camera", ["shutter", "camera", "photo"])
    for i in range(1, 4):
        save(f"{S}/synth_paper/synth-typing-{i:02d}.mp3", typing(1.6, 7 + 2 * i), "sfx", "keyboard", ["typing", "keys", "keyboard"])
    for i, hf_ in enumerate([2500, 3500, 4800, 3000], 1):
        save(f"{S}/synth_paper/synth-pen-{i:02d}.mp3", pen(0.8, hf_), "sfx", "paper_pen", ["pen", "scribble", "marker", "draw"])
    for i in range(1, 4):
        save(f"{S}/synth_paper/synth-pageturn-{i:02d}.mp3", pageturn(0.45 + 0.1 * i), "sfx", "paper_pen", ["page", "paper", "turn"])
    for i, lo in enumerate([250, 500], 1):
        save(f"{S}/synth_ambience/synth-roomtone-{i:02d}.mp3", room(16, lo), "sfx", "ambience", ["room", "tone", "ambience", "loop"], gain=0.25)
    save(f"{S}/synth_ambience/synth-wind-01.mp3", wind(16), "sfx", "ambience", ["wind", "air", "ambience"], gain=0.3)
    for i, root in enumerate([33, 38, 43], 1):
        save(f"{S}/synth_ambience/synth-drone-{i:02d}.mp3", reverb(drone(16, root), 1.5, .25), "sfx", "ambience", ["drone", "dark", "tension", "ambience"], gain=0.4)

# ------------------------------------------------------------------------ MUSIC
def ks(freq, d, decay=0.996, bright=0.5):
    N = int(SR / freq); n = int(d * SR)
    x = np.zeros(n); x[:N] = rng.uniform(-1, 1, N) * (1 - bright) + np.sin(2 * np.pi * np.arange(N) / N) * bright * 0
    a = np.zeros(N + 2); a[0] = 1; a[N] = -0.5 * decay; a[N + 1] = -0.5 * decay
    return lfilter([1], a, x)
def epiano(f, d, vel=1.0):
    t = T(d); mod = np.sin(2 * np.pi * f * 2 * t) * 1.6 * np.exp(-t * 5)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.2) * vel * np.minimum(1, t / 0.005)
def padv(freqs, d, a=1.0, r=1.5, wave="saw"):
    t = T(d); x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.006, 0, 0.006):
            ph = 2 * np.pi * f * (1 + det) * t
            x += (np.sin(ph) + 0.3 * np.sin(2 * ph)) if wave == "sin" else (2 * ((f * (1 + det) * t) % 1) - 1) * 0.5
    x = lp(x, 2200, 2) if wave != "sin" else x
    return x * np.minimum(1, t / a) * np.minimum(1, (d - t) / r) / (len(freqs) * 3)
def place(buf, snd, at, g=1.0):
    s = int(at * SR)
    if s < len(buf): e = min(len(buf), s + len(snd)); buf[s:e] += snd[: e - s] * g

def chords_of(prog): return prog
def music_calm(D=60):
    n = int(D * SR); m = np.zeros(n); P = [(57, 60, 64, 69), (53, 57, 60, 65), (48, 52, 55, 60), (55, 59, 62, 67)]
    for b in range(int(D / 8) + 1):
        place(m, padv([hz(x) for x in P[b % 4]], 10.5, 2.5, 3, "sin"), b * 8, 0.8)
    for i in range(int(D / 2.0)):
        ch = P[(i * 2 // 8) % 4]
        if rng.random() < 0.7: place(m, ks(hz(ch[i % 4] + 12), 2.5, 0.997) * 0.5, i * 2.0 + rng.uniform(0, .3))
    return reverb(m, 1.6, .35)
def music_lofi(D=60, bpm=80):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat
    P = [(50, 57, 60, 64, 69), (43, 53, 59, 62, 67), (48, 55, 59, 64, 67), (45, 52, 57, 60, 64)]
    for b in range(int(D / bar)):
        for k, nt in enumerate(P[b % 4]): place(m, epiano(hz(nt), bar * 0.95, 0.5), b * bar + k * 0.012)
        place(m, kick(110, 45, 0.4) * 0.8, b * bar); place(m, kick(100, 45, 0.4) * 0.6, b * bar + 2.5 * beat)
        place(m, snare(0.25, 180, 0.7) * 0.5, b * bar + beat); place(m, snare(0.25, 180, 0.7) * 0.5, b * bar + 3 * beat)
        for k in range(8): place(m, hat(0.06) * 0.25, b * bar + k * beat / 2 + (0.03 * beat if k % 2 else 0))
        place(m, hp(lp(np.sign(np.sin(2 * np.pi * hz(P[b % 4][0] - 24) * T(beat * 2))), 300, 2), 30) * 0.8, b * bar, 0.5)
    for _ in range(int(D * 6)): place(m, click(rng.uniform(2000, 6000), 0.004) * 0.15, rng.uniform(0, D))
    return lp(m, 6500, 1)
def music_upbeat(D=60, bpm=112):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat; P = [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)]
    for b in range(int(D / bar)):
        ch = P[b % 4]
        for k in range(8): place(m, ks(hz(ch[k % 3] + 12 * (k % 2)), 0.5, 0.993, 0.3) * 0.5, b * bar + k * beat / 2)
        for k in range(4): place(m, kick(120, 48, 0.3) * 0.7, b * bar + k * beat)
        place(m, clap(0.2) * 0.5, b * bar + beat); place(m, clap(0.2) * 0.5, b * bar + 3 * beat)
        for k in range(8): place(m, hat(0.05) * 0.25, b * bar + k * beat / 2 + beat / 4)
        place(m, lp(np.sign(np.sin(2 * np.pi * hz(ch[0] - 24) * T(beat * 3.5))), 400, 2) * 0.5, b * bar)
    return m
def music_tension(D=60, bpm=70):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; t = T(D)
    place(m, drone(D, 29), 0, 0.8); place(m, drone(D, 36), 0, 0.5)
    for b in range(int(D / (beat * 2))):
        h = lp(kick(70, 42, 0.3, 0), 160); place(m, h, b * beat * 2, 0.7); place(m, h, b * beat * 2 + 0.28, 0.45)
    for _ in range(10): place(m, bell(rng.choice([220, 233, 349, 466]), 3.0, decay=1.5) * 0.12, rng.uniform(4, D - 6))
    place(m, riser(10, 150, 7000) * 0.8, D - 10)
    return reverb(m, 1.8, .3)
def music_epic(D=60, bpm=90):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat; P = [(38, 45, 50, 57), (34, 41, 46, 53), (41, 48, 53, 60), (36, 43, 48, 55)]
    for b in range(int(D / bar)):
        g = 0.35 + 0.65 * b / (D / bar)
        place(m, padv([hz(x) for x in P[b % 4]], bar + 1.2, 0.6, 1.2) * 1.0, b * bar, g)
        place(m, tom(60, 0.8) * 1.2, b * bar, g); place(m, tom(80, 0.6), b * bar + 2 * beat, g * 0.8)
        if b > 4:
            for k in range(8): place(m, snare(0.2, 200, 0.6) * 0.4, b * bar + k * beat / 2, g * 0.6)
        place(m, hat(0.3, True) * 0.3, b * bar, g)
    place(m, riser(12, 150, 9000) * 0.8, D - 12)
    return reverb(m, 2.2, .4)
def music_acoustic(D=60, bpm=100):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat; P = [(55, 59, 62, 67), (52, 55, 59, 64), (48, 52, 55, 60), (50, 54, 57, 62)]
    for b in range(int(D / bar)):
        ch = P[b % 4]
        for k, pos in enumerate([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]): place(m, ks(hz(ch[[0, 2, 1, 3, 2, 1, 3, 1][k]]), 1.6, 0.998, 0.2) * 0.55, b * bar + pos * beat)
        place(m, kick(100, 48, 0.4) * 0.35, b * bar); place(m, kick(100, 48, 0.4) * 0.3, b * bar + 2 * beat)
        for k in range(8): place(m, hat(0.05) * 0.12, b * bar + k * beat / 2)
    return reverb(m, 1.0, .25)
def music_tech(D=60, bpm=120):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat; sc = [57, 60, 62, 64, 67, 69, 72]
    for b in range(int(D / bar)):
        for k in range(16):
            if rng.random() < 0.75: place(m, ks(hz(sc[(k * 3 + b) % len(sc)] + 12), 0.25, 0.99, 0.6) * 0.4, b * bar + k * beat / 4)
        for k in range(4): place(m, kick(130, 45, 0.3) * 0.8, b * bar + k * beat)
        for k in range(16): place(m, hat(0.04) * (0.18 if k % 2 == 0 else 0.1), b * bar + k * beat / 4)
        place(m, clap(0.2) * 0.4, b * bar + beat); place(m, clap(0.2) * 0.4, b * bar + 3 * beat)
        place(m, lp(np.sign(np.sin(2 * np.pi * hz([33, 33, 36, 31][b % 4]) * T(beat * 4))), 250, 2) * 0.6, b * bar)
    return lp(m, 12000, 1)
def music_sports(D=60, bpm=92):
    n = int(D * SR); m = np.zeros(n); beat = 60 / bpm; bar = 4 * beat
    for b in range(int(D / bar)):
        place(m, kick(130, 42, 0.45) * 1.0, b * bar); place(m, kick(130, 42, 0.45) * 1.0, b * bar + beat)
        place(m, clap(0.28) * 0.9, b * bar + 2 * beat)
        if b > 1:
            for k in range(8): place(m, hat(0.06) * 0.2, b * bar + k * beat / 2 + beat / 4)
        note = [55.0, 55.0, 65.4, 49.0][b % 4]
        place(m, (np.sign(np.sin(2 * np.pi * note * T(0.5))) * 0.5 + np.sin(2 * np.pi * note * T(0.5))) * np.exp(-T(0.5) * 3.2) * 0.6, b * bar)
        if b > 3: place(m, padv([hz(57), hz(64), hz(69)], bar, 0.3, 0.3) * 0.5, b * bar)
    return m

def build_music():
    M = "music"
    for name, fn, bpm, key, mood, tags in [
        ("calm-ambient", music_calm, None, "Am", "calm", ["calm", "ambient", "pad", "reflective"]),
        ("lofi-chill", music_lofi, 80, "Dm", "chill", ["lofi", "chill", "study", "warm"]),
        ("upbeat-pop", music_upbeat, 112, "C", "happy", ["upbeat", "pop", "bright", "energetic"]),
        ("tension-drone", music_tension, 70, "D", "tense", ["tension", "dark", "suspense", "heartbeat"]),
        ("epic-build", music_epic, 90, "Dm", "epic", ["epic", "cinematic", "build", "trailer"]),
        ("warm-acoustic", music_acoustic, 100, "G", "warm", ["acoustic", "guitar", "warm", "folk"]),
        ("minimal-tech", music_tech, 120, "Am", "driving", ["tech", "electronic", "minimal", "driving"]),
        ("stomp-clap-sports", music_sports, 92, "Am", "hype", ["sports", "stomp", "clap", "hype"]),
    ]:
        save(f"{M}/synth_music/synth-music-{name}.mp3", fn(), "music", "music_" + name.split("-")[0], tags, gain=0.5, mood=mood, bpm=bpm, key=key)
        print("music:", name, flush=True)

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else ""
    if only != "--music-only": build_sfx()
    if only != "--sfx-only": build_music()
    json.dump(INDEX, open(os.path.join(ROOT, "library-synth.json" if not only else f"library-synth{only.replace('--','_')}.json"), "w"), indent=1)
    print("synth entries:", len(INDEX))
