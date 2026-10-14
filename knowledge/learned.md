# learned.md - lessons from real builds (append new ones; never delete)

Format: `YYYY-MM-DD · video · lesson · how it is handled now`. These are field notes from building the first 8-minute sample (stickman-8min), the five 1-minute style videos and earlier pilots. Read before a new build.

## Process
- 2026-10-07 · stickman-8min · An unattended scheduled/overnight run stalled on a tool-permission prompt and produced nothing for 16 h. · For long unattended work, first run it once interactively ("Run now") so permissions are granted; poll status early; keep a STATE.md handoff.
- 2026-10-07 · stickman-8min · Running two heavy jobs at once halves render speed (542 → ~250 frames/min); a parallel agent team hit the usage limit. · Do light work (writing, docs) while a render runs; never more than 2 agents; prefer doing the work yourself.
- 2026-10-07 · stickman-8min · The user can say "stop everything": all background renders were killed and resumed later. · Keep every long job restartable (explicit output paths, no hidden state) and log to a file; on "stop" kill your own processes and confirm none are left.
- 2026-10-07 · stickman-8min · A first narration (366 s) came out far below the 8-minute target. · Calibrate with `script_lint.py --wpm` (OmniVoice ≈ 195 wpm, Kokoro ≈ 165): plan words = minutes × wpm, then add real content (examples, a recap, an engagement moment), never padding.
- 2026-10-07 · stickman-8min · Voice-design text must be attribute style (`male, young adult, moderate pitch, american accent`); free sentences are rejected. · Documented in models-notes and vidbucks-longform-build.

## Script / retention
- Open loop in the first 3 paragraphs, a promise + teasers ("one of them feels almost unfair, I will save it for number two"), numbered sections, a quick recap midway, a "pause and answer" quiz moment (`[pause 4]` + countdown scene) that doubles as the topic's own technique, CTA after value, strongest line last.
- A recurring fictional character (Sam) turned abstract advice into drawable scenes and gave the video a through-line.
- Paragraph = scene; keep 8-35 words. 89 scenes for 8 min ≈ 11 scenes/min (avg 5.4 s) matched the studied stickman channel.
- Claims: only established facts, hedged; fictional numbers only for fictional characters; charts are schematic and say so.

## Engine / build
- Scene count must equal paragraph count. Inserting a paragraph without a scene shifts every later scene (it happened twice). · `check_anchors.py` reports a mismatch; `scenekit.move_after()` repositions a scene.
- Whisper mis-hears words (notes→note, mix→makes, shuffle→shuffled, ten→10). · The anchor matcher accepts stems and number words; `check_anchors.py` lists anchors that are not spoken at all.
- 23 of 89 scenes started blank for 0.6-3.3 s (objects anchored to late words). · `blank_start.py --fix` (run by `scenekit.finish`) makes the first object appear at once. Rule: something visible within 0.6 s.
- Dark backgrounds make ink strokes invisible, and light-filled icons vanish. · Engine takes stroke colour from context (InkContext) and darkens default fills on dark scenes.
- Default icon fills in paper colour made arrows/loops ghost-pale. · Give action icons real colours (orange arrows, blue loops).
- Text over a figure, labels on the ground line, chart labels colliding, text wider than its slot were the most common visual defects. · SCENES-SPEC layout rules + contact-sheet review of every scene (2 stills each, 6 scenes per sheet).
- The marker font draws `1` like a tick. · Prefer words or the badge font for digits.
- Wobble ("boil") filter costs ~3× render time. · `"boil": false` for drafts and long videos; keep it for hooks if the budget allows.
- Render of 14.5k frames ≈ 35-40 min on 4 workers when nothing else runs. · Always run `tsc` first, pass the explicit entry `src/index.ts`, run in the background and poll the log.
- Remotion's bundled sample sounds have an unverified licence. · Excluded from category rotation (only by explicit id).
- Sound rotation per category avoids hearing the same effect repeatedly; a whoosh on every cut is too much (use every ~5th scene).
- To change only the sound mix: render audio-only (`--codec=wav`, ~13 min for 8 min) and mux it with the existing video (`ffmpeg -map 0:v -map 1:a -c:v copy`) instead of re-rendering frames.
- Loudness: a single-pass `loudnorm=I=-16:TP=-1.5` on the final mix landed at −16.4 LUFS / −1.1 dBTP (within tolerance).
- A voice that is too fast can be slowed without TTS: `stretch_narration.py` (atempo + timing rescale); fixed-time constants in hand-made scenes must be scaled too.
- Large master (139 MB for 1 min): use `--crf 26-27` for share versions (30 MB).

## Windows / environment
- Git-bash heredocs break on quotes/backslashes → write files with the editor tool. `python` not `python3`. GNU tar from Git-bash cannot write zips → `python -m zipfile`.
- `spawnSync` with `shell:true` mangles `python -c "import x"` quoting on Windows → no shell for python/ffmpeg.
- CLI tools installed from inside the Claude desktop (MSIX) sandbox may not exist in the user's own terminal → ask the user to run installers in their own terminal.
- OmniVoice must live in a permanent folder (a scratch/temp folder was wiped once).
- Only one process may use the GPU (lock file).

## Legal / ethics (unchanged, restated)
No downloading other channels' videos, no Google Images scraping, only CC0/CC BY/CC BY-SA/Pexels/Pixabay with credits, no real faces/logos, no invented statistics, never claim to have listened/watched what you did not.

## Reference analysis and the fidelity gate (reference-to-video route)
- Measure, do not guess: `analyze_reference.py` replaces eyeballed numbers. File mode gives cuts/min, shot-length distribution, palette (k-means), brightness, motion, transitions (hard cut / flash / blur-whip-zoom), loudness, tempo, sound hits and 3-second curves; link mode gives metadata, engagement, title skeleton, thumbnail palette, captions, chapters and channel context. `--compare` scores a render against the reference; `--sidebyside` makes the visual comparison. Looking at the side-by-side is mandatory - a clean score does not replace it.
- Caption tags like `[music]` and `>>` must be stripped, otherwise near-wordless films produce nonsense scenes; use chapters as the scene backbone when speech is sparse. yt-dlp flat playlists carry no view counts: fetch the last ~12 videos with `--print`.
- A single global cut threshold fails on videos in constant motion or on filmed screens. A cut = a local spike of the mean of the 8 % most-changed pixels (>= 2.2x its +-0.5 s neighbourhood). Every fast eased move registers as a cut: slow easing (sine curves, longer swings) to match a calmer reference.
- Tempo from autocorrelation is octave-ambiguous (86 vs 172) and unreliable on quiet music mixed with effects: compare modulo octave, skip when the rhythm strength is below 0.15, treat it as a hint. With `--no-transcript` the tool must not claim "music-only".
- Link only (no file): do the link analysis, then a visual pass in the Browser pane (mobile viewport, `video.currentTime` seeks, 0.3-scale screenshots every ~0.7 s for a Short); view only. State what stays unknown (audio, exact timings, cut statistics).
- What the score predicts: references made of drawable things (typography, vector icons, cut-out objects, particles) reach 70-100 %; references whose look is photographic (a filmed room, a real head) cap around 50 % with code-drawn stand-ins. A filmed screen puts the room's colours in the palette. For those, use real licensed footage/photos or accept and state the lower fidelity.
- First-time results of the loop: fidelity went from ~45 % to 100 % on a graphic reference by (1) slowing big moves so fewer "cuts" are detected, (2) a synthesised track at the reference tempo with the big moments on beats (BPM = 60*n/T), (3) sound effects placed on the detected transition times, (4) loudness matched to the reference.

## Assets and cut-outs
- Gather reference imagery yourself; never ask the user for photos. Google Images in the Browser pane is for viewing only. Usable assets come from licensed sources with credits; specific Wikimedia queries ("human brain lateral view anatomy", "anatomical model of an eye") beat Openverse's loose ranking - always check a contact sheet. Use statues, busts, models and objects instead of portraits of real people.
- `cutout.py` lessons: key a plain red backdrop on "redness" (R minus mean(G,B)) plus saturation, not on a single channel (shadows get eaten); estimate a gradient studio backdrop per row from the image edges; fade a flat crop edge; clear JPEG-block leftovers with rectangles/polygons; always look at the result on a grey ground.
- Real licensed photographs lifted visual fidelity far more than procedural drawings. A procedural face never reads as photoreal (it turns uncanny): substitute a subject that code can draw well (a word made of particles, a vector icon) and say so.
- Procedural folds from raw noise look like crumpled foil; turn smooth warped noise into sinuous bands (`|sin(k*n)|`) for gyri-like surfaces.

## Audio for reference-driven videos
- `vo_words.py`: English voice-over + Whisper word times; caption timing comes from word times, never by eye. Each phrase must end ~0.25 s before the next starts, otherwise consecutive captions overlap while fading.
- `make_pulse_track.py` makes a royalty-free mood track at an exact BPM; choose BPM = 60*n/T so a chosen moment T lands on beat n. Place sound effects on the visual change points; one clear hit per meaningful change.
- Match the loudness of the reference (unknown: -16 LUFS); normalise with loudnorm then trim with a small gain; keep a limiter. You cannot hear the result: report the measured numbers and say that listening was not done.

## Build technique (templates)
- Build heavy textures/geometry once (module load, `useMemo`) and show them as images or draw them once per frame; use `delayRender`/`continueRender` for anything async (fonts, geometry); keep randomness deterministic (seeded, or `random("key"+frame)`). ~40k canvas particles drawn with ImageData splats plus stroked ropes render in ~0.1 s per frame.
- One responsive composition serves 9:16 and 16:9: size unit `u = min(W,H)/1080`, positions as fractions of width/height. Check both formats.
- `mix-blend-mode: difference` keeps text readable over both a dark stage and a light beam. A split-open frame is two `clip-path` halves sliding apart. CSS `drop-shadow` gives cut-out objects depth.
- Review checklist before delivery: captions overlapping, text outside the frame, a leftover artefact on a cut-out, an element hidden behind another, the first 0.3 s empty, the last frame abrupt.
- Shell quirks (zsh): unquoted variables are not word-split (use functions with `"$@"`), `echo ====` is parsed as a command (quote separators).
- Keep a user's private work separate from the distributable package: the release builder copies from an allow-list and runs a brand/personal-data scan before zipping.
