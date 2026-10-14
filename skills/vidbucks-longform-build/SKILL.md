---
name: vidbucks-longform-build
description: Build a video end to end inside the vidbucks core - narration, scenes.json for the stickman engine, stock media, music/SFX, render, loudness, thumbnail and packaging. Use after the script is approved (Decision Card complete) or when the user says "build / render / produce the video".
---

# vidbucks-longform-build

Long-form route (stickman/doodle engine). For reference-driven promos, shorts and reels use `vidbucks-reference-to-video` and the templates in `core/src/templates`.

Prerequisites: Decision Card has no UNRESOLVED field; script lint ≥ 90. Work from `core/`. Read `core/docs/SCENES-SPEC.md` before writing `scenes.json`.

1. **Voice sample** (G2): make a throw-away video folder `<name>-sample` with 2 paragraphs, run `python tools/make_narration.py --video <name>-sample --engine omnivoice|kokoro --voice "<design text>"`, let the user listen (send the wav), delete the sample folder. OmniVoice voice design text must use the supported attribute style, e.g. `"male, young adult, moderate pitch, american accent"` (free sentences are rejected). Kokoro: `--kokoro-voice am_michael|af_heart|…`.
2. **Narration**: `python tools/make_narration.py --video <name> …` (add `--gap 0.5`). Read the DONE line: duration must be inside target ±30 s; otherwise edit the script (add/cut paragraphs) and re-run — the voice stays frozen in `voice.pt`.
3. **video.json**: id (CamelCase), narration path, music playlist covering the full length (pick calm/lofi/acoustic beds from `src/audio-lib.json`, avoid `attribution:true` unless you add credits), sfx defaults. Music volume 0.12-0.2.
4. **scenes.json**: one scene per script paragraph. Authoring method: copy `core/templates/build_scenes_template.py` to `videos/<name>/build_scenes.py` and use `tools/scenekit.py` (`stick text icon box badge bubble curve tline lst dots S BG ground move_after finish`); `finish()` writes scenes.json, runs `blank_start.py --fix` (no scene may start empty) and `check_anchors.py`. `videos/stickman-8min/build_scenes.py` is the worked example of 89 scenes. Rules: first object visible in the first 0.3 s, 3-6 objects, anchors on spoken words, nothing below y 900, no text over figures, a running character, variety (alternate `bg`, figure poses, charts, lists, big-number badges), one sound per meaningful hit.
5. `node tools/register.mjs && npx tsc --noEmit && python tools/check_anchors.py <name>` — all clean.
6. **Look**: `node tools/stills.mjs <name> --scale 0.4` and read every `out/qa/<name>/sheet-*.png`. Fix every overlap/blank/misaligned scene (a scene count ≠ paragraph count shifts everything). Re-shoot only the changed range: `--scenes a-b`.
7. **Render** in the background: `npx remotion render src/index.ts <CompId> out/<name>-raw.mp4 --concurrency=4 > render.log` (wobble filter costs time: ~1 s per 4 frames per worker; `"boil": false` is ~3× faster). Do not run heavy jobs in parallel. Poll the log, never busy-wait.
8. **Pace/size fixes without redoing the voice**: `python tools/stretch_narration.py <name> --wpm-target 160` (atempo + timing rescale). Sound-only change: `npx remotion render … --codec=wav` and mux. Share master: `--crf=26`.
8b. **Master**: `ffmpeg -y -i out/<name>-raw.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/<name>-final.mp4` then `node tools/qa.mjs out/<name>-final.mp4 --minutes N`.
9. **Packaging**: `thumb.json` → `npx remotion still src/index.ts <CompId>Thumb out/<name>-thumb.png`; check at 160 px width. Write `videos/<name>/packaging.md` (3 titles from the reference skeletons, description: search-word first line, chapter lines from `timing.json` scene starts, comment question, credits for CC BY/BY-SA assets, tags, thumbnail concept) and `NOTES.md` (original vs copied-in-spirit, not verified, improvements).
10. Update `STATUS.md`. Report with real numbers: duration, resolution, loudness, size, what was and was not checked.

Chapters: use scene start times (`timing.json` paras[i].start) of the numbered sections, formatted `m:ss`.
