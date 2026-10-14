---
name: vidbucks-qa-revise
description: Quality gates for a built video and the revision protocol - contact-sheet review, anchors/tsc, loudness/duration QA, and turning user feedback into a numbered change list with minimal re-rendering. Use when checking a video before delivery or when the user asks for changes to a video.
---

# vidbucks-qa-revise

## QA gates (run in order, stop at the first failure)
0. On a fresh PC first `node tools/smoke.mjs` (render pipeline works without a TTS engine).
1. `npx tsc --noEmit` clean · `python tools/blank_start.py <name>` reports 0 blank starts · `python tools/check_anchors.py <name>` clean (scene count = paragraph count; anchor words spoken).
2. Contact sheets (`node tools/stills.mjs <name> --scale 0.4`): for every scene look at both frames. Defects to hunt: blank first half, text on a figure, objects outside the 1920×1080 frame or under the caption pill (y > 930), overlapping text, wrong content for the spoken paragraph (shifted scenes), unreadable color on `dark`, ghost-pale icons, text wider than its box.
3. Render, then `ffprobe`/`node tools/qa.mjs`: 1080p, audio stream, duration vs target ±30 s, loudness −16 ±1.5 LUFS, true peak ≤ −1 dBTP, no silence > 2.5 s, no black frames, size.
4. Sound: no more than 2 simultaneous effects; whoosh not on every cut; music under voice. You cannot hear the audio — say so, and ask the user to listen to two spots (the hook and one random middle section).
5. Thumbnail half-second test (view at 160 px).
6. Compare against the Decision Card (length, language, title) and `knowledge/creator-playbook.md` §5 gates.

## Revision protocol (details in CLAUDE.md §6)
1. Write the numbered change list `R1..Rn` with the targets (scene numbers / script lines / voice / music / thumbnail / title) and whether timing changes.
2. Ask only about ambiguous or user-owned items.
3. Edit source files only (script.txt, scenes.json, video.json, thumb.json); never edit timing.json by hand.
4. Cheapest redo path: text change → re-narrate + anchors + stills + render; visual change → stills of those scenes + render; audio-only change → render with new mix (or remux); packaging change → stills only.
5. Keep versions (`-v1-final`, `-v2-final`), append to `REVISIONS.md`, re-run the gates the change can break, report verified vs not verified.
6. If the user's change contradicts a guideline, do it and note the trade-off once.

## Common fixes
- A figure overlapping text → move the text or use `s` smaller; ground label overlapping the ground line → drop `label`.
- A word anchor that Whisper misheard (e.g. "notes" → "note") is matched by stem; for totally different words pick another word in the same sentence or a numeric time.
- Long scene with nothing happening → add a `list`/`dots`/`tline` that fills on spoken words, or split the paragraph in the script (then re-narrate).
