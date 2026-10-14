#!/usr/bin/env python
"""make_placeholders.py - neutral shaded placeholder objects for the ObjectStory demo (no photos, no licences).
   python tools/make_placeholders.py [--out public/templates]
Replace them with licensed cut-outs (tools/fetch-stock.mjs + tools/cutout.py) for a real video."""
import argparse, os, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument("--out", default="public/templates"); a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
L = np.array([-0.5, -0.6, 0.62]); L = L / np.linalg.norm(L)
def shade(nx, ny, nz, mask, base=232):
    d = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1); v = np.clip(0.2 + 0.95 * d, 0, 1) * base
    out = np.zeros(mask.shape + (4,), np.uint8); out[..., :3] = v[..., None].astype(np.uint8); out[..., 3] = (mask * 255).astype(np.uint8); return Image.fromarray(out)
def ellipsoid(w, h, ax=0.46, ay=0.40):
    y, x = np.mgrid[0:h, 0:w]; X = (x - w / 2) / (w * ax); Y = (y - h / 2) / (h * ay); q = X ** 2 + Y ** 2; m = np.clip((1 - q) * 18, 0, 1); z = np.sqrt(np.clip(1 - q, 0, 1))
    n = np.stack([X, Y, z]); n = n / (np.linalg.norm(n, axis=0) + 1e-6); ridges = 0.08 * np.sin(18 * X + 5 * np.sin(7 * Y)) * np.sin(14 * Y)
    return shade(n[0] + ridges, n[1] + ridges, n[2], m)
ellipsoid(780, 537).save(os.path.join(a.out, "object-a.png"))            # wide organic-looking object
ellipsoid(620, 538, 0.48, 0.48).save(os.path.join(a.out, "object-b.png"))  # sphere
ellipsoid(780, 537, 0.46, 0.34).save(os.path.join(a.out, "stage-object.png"))
# portrait placeholder: dark gradient with a lit head-and-shoulders silhouette
w, h = 800, 1000; y, x = np.mgrid[0:h, 0:w]; img = np.zeros((h, w, 3), np.float32) + 24
hd = ((x - w / 2) / 150) ** 2 + ((y - 380) / 190) ** 2 < 1; sh = (np.abs(x - w / 2) < 340 - np.maximum(0, 640 - y) * 0.9) & (y > 560)
for m, b in ((hd, 210), (sh, 170)): img[m] = b * (0.55 + 0.45 * (1 - (x[m] / w)))[:, None]
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(a.out, "portrait.png")); print("placeholders ->", a.out)
