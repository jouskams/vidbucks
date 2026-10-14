---
name: vidbucks-stickman-engine
description: Reference for the JSON-driven stickman/doodle video engine in vidbucks/core (Remotion). Use when writing or editing scenes.json, adding a new object kind, pose, icon or background, or debugging how an animation is anchored to the narration.
---

# vidbucks-stickman-engine

The full contract is `core/docs/SCENES-SPEC.md` — read it, do not guess property names. Highlights:

- A video is `videos/<name>/{script.txt, video.json, scenes.json, timing.json, thumb.json}`; one scene per script paragraph; anchors (`at`) are spoken words (`"word"`, `"word#1"`, `"word+0.4"`, `"start"`, `"end"`, seconds).
- Canvas 1920×1080, object (x,y) is the CENTER, ground y = 800, captions use y > 930, hand-drawn "boil" filter on top.
- Kinds: `stick` (poses, faces, props, walk+move), `text` (`*highlight*`), `box`, `bubble`, `badge`, `icon` (35 icons), `curve` (forgetting-curve schematic), `tline`, `list`, `dots`, `line`, `under`.
- Entrance fx: pop fade slideL/R/U/D drop slam type; loops: float shake pulse spin swing; `move` tweens.
- Sound: `sfxDefaults` per kind in video.json, per-object `sfx`, scene-level `sfx` list, wipe whoosh every N scenes, music playlist with crossfades.

## Extending the engine (code lives in `core/src/engine/`)
- New icon: add a drawing function to `Icons.tsx` (`ICONS[name] = (fill, ink) => <g>…</g>` in a 100×100 box; use `ink` for strokes so dark scenes work) and optionally a default fill in `DEFAULT_FILL`.
- New pose: add angles to `POSES` in `Figure.tsx` (degrees from straight down, positive = facing direction; torso, lArm[upper,fore], rArm, lLeg[thigh,shin], rLeg). Test with a still before using it.
- New object kind: add a `case` in `Body` (`Objs.tsx`), document it in SCENES-SPEC.md, run tsc.
- New background: add to `BG` in `Video.tsx`.
- Theme/colors: `theme.ts` (`PAL`). Do not use `Math.random`, `Date.now`, CSS transitions/animations — frames must be deterministic (use `random("seed")` from remotion).
- After any engine change: `npx tsc --noEmit` and re-shoot a few contact sheets.

## Debugging
- Object not showing: its anchor word is not spoken in that scene (falls back to scene start) or the scene index is shifted; run `check_anchors.py`.
- Everything one scene off: scene count ≠ paragraph count (an inserted paragraph without a scene).
- Render dies silently: `npx tsc --noEmit` first; always pass `src/index.ts`.
- Slow render: set `"boil": false` or reduce concurrency contention.
