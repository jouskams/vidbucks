# -*- coding: utf-8 -*-
"""python tools/contact_sheet.py <dir> <first> <last>  -> sheet-<k>.png with 12 scenes (each: frame a | frame b) per sheet."""
import os, sys
from PIL import Image, ImageDraw

d, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
per = 6  # scenes per sheet, 2 frames each => 3 rows x 4 cols
k = 0
for s0 in range(a, b + 1, per):
    tiles = []
    for i in range(s0, min(b, s0 + per - 1) + 1):
        for t in "ab":
            p = os.path.join(d, f"s{i:03d}{t}.png")
            if os.path.exists(p):
                im = Image.open(p).convert("RGB")
                dr = ImageDraw.Draw(im)
                dr.rectangle([0, 0, 62, 26], fill=(0, 0, 0))
                dr.text((4, 6), f"{i}{t}", fill=(255, 255, 0))
                tiles.append(im)
    if not tiles:
        continue
    w, h = tiles[0].size
    cols = 2
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, h * rows), (30, 30, 30))
    for j, im in enumerate(tiles):
        sheet.paste(im, ((j % cols) * w, (j // cols) * h))
    out = os.path.join(d, f"sheet-{s0:03d}.png")
    sheet.save(out)
    print("sheet", out, sheet.size)
    k += 1
