# -*- coding: utf-8 -*-
"""scenekit — authoring helpers for scenes.json (the pattern used to build the 89-scene sample).

Usage in videos/<name>/build_scenes.py:

    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
    from scenekit import *

    S(BG("yellow"), ground(), stick(520, "talk"), text("Hello *world*", 1300, 300, 100, "world"))
    ...
    finish(__file__)          # writes scenes.json, auto-fixes blank starts, prints a report

Why a generator and not hand-written JSON: coordinates, ground line and anchors stay consistent, and a scene that has to move
(e.g. a paragraph was inserted in the script) is one `move_after()` call instead of editing 800 lines.

Conventions: canvas 1920x1080, (x,y) = object CENTER, ground y = 800, caption pill covers y > 930.
`stick(...)` is scaled up by FIG_SCALE and keeps its feet on the ground line whatever `s` you pass.
"""
import json, os, subprocess, sys

G = 800          # ground line y
FIG_SCALE = 1.2  # figures are drawn ~330 px tall at s=1; 1.2 reads better at 1080p

__all__ = ["G", "stick", "text", "icon", "box", "badge", "bubble", "line", "ground", "curve", "tline", "lst", "dots", "BG", "CAM", "S", "scenes", "move_after", "finish"]


def stick(x, pose="idle", s=1.0, face="smile", at="start", **k):
    se = s * FIG_SCALE
    d = dict(k="stick", x=x, y=int(G - 240 * se), s=se, pose=pose, face=face, at=at, anim="bob")
    d.update(k)
    if "y" in k:  # an explicit y was computed for the unscaled figure: keep the same offset
        d["y"] = k["y"] - int(240 * (se - s))
    return d


def text(t, x=960, y=300, size=90, at="start", **k):
    d = dict(k="text", t=t, x=x, y=y, size=size, at=at); d.update(k); return d


def icon(n, x, y, size=200, at="start", **k):
    d = dict(k="icon", n=n, x=x, y=y, size=size, at=at); d.update(k); return d


def box(t, x, y, w=420, h=200, at="start", **k):
    d = dict(k="box", t=t, x=x, y=y, w=w, h=h, at=at); d.update(k); return d


def badge(t, x, y, size=240, at="start", color="orange", **k):
    d = dict(k="badge", t=str(t), x=x, y=y, size=size, at=at, color=color, fx="slam"); d.update(k); return d


def bubble(t, x, y, at="start", tail=(-60, 130), **k):
    d = dict(k="bubble", t=t, x=x, y=y, at=at, tail=list(tail)); d.update(k); return d


def line(x, y, w=1500, at="start", **k):
    d = dict(k="line", x=x, y=y, w=w, at=at, fx="fade"); d.update(k); return d


def ground(y=G + 4, at="start"):
    return line(960, y, 1700, at, color="ink", op=0.55)


def curve(at="start", kind="forget", dur=5, reviews=None, x=960, y=430, **k):
    d = dict(k="curve", kind=kind, at=at, dur=dur, x=x, y=y, w=1000, h=480, fx="fade")
    if reviews: d["reviews"] = reviews
    d.update(k); return d


def tline(labels, ats, x=960, y=470, w=1300, at="start", **k):
    d = dict(k="tline", labels=labels, ats=ats, x=x, y=y, w=w, at=at); d.update(k); return d


def lst(items, x=900, y=450, size=70, mark="dot", at="start", w=1100, **k):
    """items: [(text, anchor)] or [(text, anchor, mark)]"""
    its = []
    for it in items:
        d = dict(t=it[0], at=it[1])
        if len(it) > 2: d["mark"] = it[2]
        its.append(d)
    d = dict(k="list", items=its, x=x, y=y, size=size, mark=mark, at=at, w=w); d.update(k); return d


def dots(n, ats=None, x=960, y=450, size=70, color="blue", at="start", **k):
    d = dict(k="dots", n=n, x=x, y=y, size=size, color=color, at=at)
    if ats: d["ats"] = ats
    d.update(k); return d


scenes = []


class CAM(dict):
    """S(BG("night"), CAM(zoom=[1,1.1], focus=[x,y], shake=2, fadeIn=True), ...) scene-level camera options."""


class BG(str):
    """S(BG("yellow"), ...) sets the background (paper grid dark blue yellow green pink ink)."""


def S(*objs, cam=None, sfx=None, **extra):
    """extra: zoom=[z0,z1], focus=[x,y], shake=px, fadeIn=True (scene-level camera options)"""
    bgs = [o for o in objs if isinstance(o, BG)]
    cams = [o for o in objs if isinstance(o, CAM)]
    objs = [o for o in objs if not isinstance(o, (BG, CAM))]
    d = dict(bg=str(bgs[0]) if bgs else "paper", objs=list(objs))
    for c in cams: d.update(c)
    if cam: d["cam"] = cam
    if sfx: d["sfx"] = sfx
    d.update(extra)
    scenes.append(d)


def _find(sub):
    return next(i for i, sc in enumerate(scenes) if sub in json.dumps(sc, ensure_ascii=False))


def move_after(new_substr, anchor_substr):
    """Move the scene that contains `new_substr` right after the scene that contains `anchor_substr`
    (fixes a scene that was authored in the wrong place after a paragraph was inserted into the script)."""
    sc = scenes.pop(_find(new_substr)); scenes.insert(_find(anchor_substr) + 1, sc)


def finish(build_file):
    """Write scenes.json next to build_file, then run the automatic quality fixers."""
    folder = os.path.dirname(os.path.abspath(build_file))
    out = os.path.join(folder, "scenes.json")
    json.dump(scenes, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(len(scenes), "scenes ->", out)
    tools = os.path.dirname(os.path.abspath(__file__))
    name = os.path.basename(folder)
    if os.path.exists(os.path.join(folder, "timing.json")):
        subprocess.run([sys.executable, os.path.join(tools, "blank_start.py"), name, "--fix"])
        subprocess.run([sys.executable, os.path.join(tools, "check_anchors.py"), name])
    else:
        print("timing.json missing - run tools/make_narration.py first, then re-run this script")
