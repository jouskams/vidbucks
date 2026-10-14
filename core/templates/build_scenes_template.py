# -*- coding: utf-8 -*-
"""Copy to videos/<name>/build_scenes.py and edit. One S(...) per script paragraph, in order.
Run:  python videos/<name>/build_scenes.py   (needs timing.json from tools/make_narration.py)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
from scenekit import *

# 0  hook: character + the promise (first object visible at once; anchors on spoken words)
S(ground(),
  stick(520, "talk", 1.05, label="SAM"),
  text("*Big* promise here", 1300, 300, 96, "promise", w=900),
  icon("brain", 1300, 600, 220, "head"))

# 1  one idea per scene, 3-6 objects, nothing below y 900
S(BG("blue"),
  badge("1", 480, 430, 300, "one"),
  text("FIRST THING", 1250, 400, 120, "first"))

finish(__file__)
