# Worked examples - one per video type (what was seen, the route, the result)

These are generic case studies of the reference-to-video path. Names, brands and files of the people who ran them are intentionally not part of the package. Use them to calibrate: which route to expect, which score is realistic, which mistakes to avoid.

| # | reference type | route | result | main lesson |
|---|---|---|---|---|
| 1 | **Trailer-style kinetic typography** (30-60 s): one word per beat, hard colour inversions, smears, a glitch burst, a light orb that opens a logo card, picture cards | template `KineticType` (events on a BPM grid); both 9:16 and 16:9 from one config | clean in both formats; ~45 % fidelity on the first filmed-screen reference because transitions were hard cuts while the reference was blur/whip-driven | look at the SIDE-BY-SIDE: a polished render can still be a different style family; match the transition vocabulary (motion blur, RGB split) |
| 2 | **Particle / "3D scroll site" look** (8 s loop, filmed monitor, meme caption) | template `ParticleBloom` + code-drawn mock-up of the room | structure matched (word -> dust -> rope bundle -> glowing bloom -> back); 50 % fidelity | a photoreal subject (a real head) and a real room cannot be matched by code: substitute a drawable subject and say so; real plates would close the gap |
| 3 | **Editorial object-metaphor with voice-over** (14 s, monochrome, paper grain, split-open photo frame, object, light cone over a dark stage) | template `ObjectStory` + licensed photo cut-outs + `vo_words.py` + pulse track at the reference tempo | 64 % -> **100 % (14/14)** after slowing the cone, placing sound hits on transitions and syncing the tempo | real licensed photographs beat procedural drawings; every fast eased move counts as a cut |
| 4 | **Minimal icon story, link only** (9 s Short: black, one white ball, thin lines, tiny serif captions typed with a voice, one icon per phrase) | link analysis + visual pass in the Browser pane -> template `IconStory` | same visual family on the side-by-side of sampled frames; no numeric gate (no file) | link-only is enough to read structure and layout; say what is unknown (audio, exact timing) |
| 5 | **Product / UI promo** (vertical 15 s) | rebuild the user's screens as vector components (never paste screenshots), camera moves between modules on a beat grid | a first version that pasted screenshots was rejected; the vector rebuild was accepted | analyse -> architecture -> rebuild; keep text at phone-legible sizes (>= 28 px at 1080 wide) |
| 6 | **Stickman / doodle long-form** (3-10 min) | long-form route: Decision Card -> script -> voice -> scenes -> QA -> packaging | the original 8-minute sample (`core/videos/stickman-8min`) | one narration line = one picture that does what the line says; something visible within 0.6 s; look at every contact sheet |

## Expected scores
Graphic / typographic / cut-out / particle references: 70-100 % is realistic after 2-4 loops. Photographic references (filmed rooms, real faces, real footage): ~50 % with code-drawn stand-ins; use real licensed footage or accept and state the lower fidelity.

## What every run delivered
The video file(s), the score table (`--compare`), a side-by-side image, credit lines for CC BY assets, and a short honest note: what was measured, what was only looked at, what could not be verified (audio).
