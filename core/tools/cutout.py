#!/usr/bin/env python
"""cutout.py - turn a licensed object photo into a grayscale PNG with transparent background (no ML needed).
  python tools/cutout.py in.jpg out.png --mode key-red|key-dark|none [--max 1100] [--gray 1] [--contrast 1.15] [--thr A B]
key-red : plain saturated-red backdrop (G channel keyed)   key-dark: dark studio backdrop (flood fill from the border)"""
import argparse, numpy as np
from PIL import Image, ImageFilter, ImageEnhance
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("dst"); ap.add_argument("--mode", default="none")
ap.add_argument("--max", type=int, default=1100); ap.add_argument("--gray", type=float, default=1.0); ap.add_argument("--contrast", type=float, default=1.1)
ap.add_argument("--thr", type=float, nargs=2, default=[55, 95]); ap.add_argument("--crop", type=float, nargs=4, default=None, help="x0 y0 x1 y1 as fractions")
ap.add_argument("--clear", type=float, nargs=4, action="append", default=[], help="x0 y0 x1 y1 fractions of the result to make transparent (backdrop leftovers)")
ap.add_argument("--clear-poly", type=float, nargs="+", action="append", default=[], help="x1 y1 x2 y2 ... fractions of a polygon to make transparent")
ap.add_argument("--fade-bottom", type=float, default=0.0, help="fade the last fraction of rows to transparent (hides a flat crop edge)")
ap.add_argument("--fill-rows", action="store_true", help="fill alpha holes between the first and last opaque pixel of every row (convex objects)")
a = ap.parse_args()
im = Image.open(a.src).convert("RGB")
if a.crop: W, H = im.size; im = im.crop((int(a.crop[0] * W), int(a.crop[1] * H), int(a.crop[2] * W), int(a.crop[3] * H)))
im.thumbnail((a.max, a.max)); rgb = np.asarray(im).astype(np.float32); lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
if a.mode == "key-red":
    d = rgb[:, :, 0] - 0.5 * (rgb[:, :, 1] + rgb[:, :, 2])   # "redness": high on the plain red backdrop, lower on pink tissue even in shadow
    t = np.clip((a.thr[1] - d) / (a.thr[1] - a.thr[0]), 0, 1); alpha = t * t * (3 - 2 * t)
    mx, mn = rgb.max(2), rgb.min(2); sat = (mx - mn) / (mx + 1)
    alpha *= 1 - np.clip((sat - 0.66) / 0.14, 0, 1)             # the backdrop is far more saturated than any tissue shadow
elif a.mode == "key-dark":
    h, w = lum.shape; bg = np.zeros((h, w), bool); cand = lum < a.thr[1]
    st = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    st = [p for p in st if cand[p]]
    while st:
        y, x = st.pop()
        if bg[y, x] or not cand[y, x]: continue
        bg[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and cand[ny, nx]: st.append((ny, nx))
    alpha = (~bg).astype(np.float32)
elif a.mode == "key-grad":   # smooth studio gradient: estimate the backdrop per row from the left/right edges
    edge = np.concatenate([lum[:, :8], lum[:, -8:]], 1); bgv = np.median(edge, 1)[:, None]
    diff = np.abs(lum - bgv); t = np.clip((diff - a.thr[0]) / (a.thr[1] - a.thr[0]), 0, 1); alpha = t * t * (3 - 2 * t)
else: alpha = np.ones(lum.shape, np.float32)
for x0, y0, x1, y1 in a.clear:
    h_, w_ = alpha.shape; alpha[int(y0 * h_):int(y1 * h_), int(x0 * w_):int(x1 * w_)] = 0
from PIL import ImageDraw
for pl in a.clear_poly:
    h_, w_ = alpha.shape; mk = Image.new("L", (w_, h_), 0); ImageDraw.Draw(mk).polygon([(pl[i] * w_, pl[i + 1] * h_) for i in range(0, len(pl), 2)], fill=255); alpha[np.asarray(mk) > 0] = 0
if a.fill_rows:
    for r_ in range(alpha.shape[0]):
        idx = np.where(alpha[r_] > 0.5)[0]
        if len(idx) > 3: alpha[r_, idx[0]:idx[-1] + 1] = 1
if a.fade_bottom > 0:
    h_ = alpha.shape[0]; n_ = max(2, int(h_ * a.fade_bottom)); alpha[-n_:] *= np.linspace(1, 0, n_)[:, None] ** 1.5
alpha[alpha < 0.12] = 0
m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
gray = np.stack([lum] * 3, -1); out = rgb * (1 - a.gray) + gray * a.gray
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); res = ImageEnhance.Contrast(res).enhance(a.contrast); res.putalpha(m)
bb = m.point(lambda v: 255 if v > 20 else 0).getbbox()
if bb and a.mode != "none": res = res.crop(bb)
res.save(a.dst); print(a.dst, res.size)
