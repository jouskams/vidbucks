---
name: vidbucks-reference-to-video
description: THE main path of the package. Turn ANY reference (YouTube link, mp4/screen recording, image set, channel, or just a written brief) into an original video in that style and quality, end to end and autonomously - measure, look, classify the video type, collect assets, build (templates or new code), measure the result against the reference, iterate, deliver. Use whenever the user sends a reference or says "analyse this video / make one like this / in this style / benzerini yap / bu tarzda yap", or asks for a promo, short, reel or explainer whose look must come from a reference. Works for every type, not only stickman videos.
---

# vidbucks-reference-to-video

Goal: the reference's STYLE and QUALITY level, with the user's own content. The reference decides the route; there is no fixed look. The steps are defaults, not limits.

## Autonomy rules (binding)
- **Never ask the user for reference images, photos, analysis, tools or "which approach".** Find, analyse, classify and choose yourself; say what you chose in one line.
- Ask ONLY user-owned decisions: language/voice they want, the topic or brand claims when unknown, anything that spends money or touches accounts, publishing.
- Hard rules of CLAUDE.md apply: no downloading of others' videos, no re-using Google Images (viewing for research is fine), licensed assets only with credits, no private people's faces / celebrity likeness / logos (use statues, busts, models, objects, silhouettes, procedural art), never publish.
- If something is needed that this package has not done before, do it anyway (new Remotion/canvas code, a new tool, media processing) and log the lesson in `knowledge/learned.md`.

## Pipeline (run from `core/`)
1. **Reference in.** Link, file, channel, images or brief. User directions override the reference. Several references: analyse each, merge the measured specs, say which wins where.
2. **Measure.** File: `python tools/analyze_reference.py --file <mp4>` -> `knowledge/references/<slug>/` with `report.md`, `fingerprint.json`, `style_spec.json` (palette roles, cut/brightness/motion curves, transition mix, tempo, sound-hit rate, loudness, route hints), `scene_plan.md`, `sheet.png`. Link: `--link <url>` (metadata, engagement, title skeleton, thumbnail palette, captions, chapters, channel context, scene proposal).
   **Link only (no file)?** Do everything the link allows, in order, without asking for the file: (a) `--link`; (b) a VISUAL PASS in the Browser pane: `resize_window mobile`, open the Shorts/watch URL, `javascript_tool`: `v=document.querySelector('video'); v.pause(); v.muted=true; v.currentTime=T`, then a screenshot at scale 0.3 every ~0.7 s for Shorts (every 2-3 s for longer videos); read the on-screen text, objects, motion, layout positions (as fractions of frame height), palette, font character, scene count; reset the viewport to desktop afterwards. View only: nothing is downloaded or stored as an asset. (c) State what stays unknown (audio, exact timings, cut statistics) and compare by side-by-side of the sampled frames instead of the numeric gate. If the user later supplies the mp4, run the numeric gate too.
3. **Look and classify.** Always LOOK at `sheet.png`, `thumb.jpg` and a dense frame strip (`ffmpeg -vf fps=4,scale=200:-1,tile=8x6`). Name the type and the devices (slam, whip, split-open frame, light cone, typed captions, pendulum...). Read `approach_hint` as a hint only; if speech was not analysed it says so.
4. **Plan.** Rewrite `scene_plan.md` for the user's content: one idea per phrase, times, the icon/object per beat, captions, sound. Decide formats (9:16 / 16:9 from one responsive composition), duration, voice-over or not, the tempo grid, and the loudness target = the reference's LUFS (unknown -> -16).
5. **Collect assets yourself.** Visual research: Google Images in the Browser pane (VIEW ONLY). Licensed media: `node tools/fetch-stock.mjs --q "<specific query>" --type image --n 4 --source wikimedia,openverse --out public/<video>/stock` (specific Wikimedia queries beat Openverse's loose ranking; look at a contact sheet and pick). Cut-outs: `python tools/cutout.py in.jpg out.png --mode key-red|key-dark|key-grad|none [--clear x0 y0 x1 y1] [--clear-poly ...] [--fill-rows] [--fade-bottom 0.08]` - look at the result on a grey ground. Procedural/canvas assets when no licensed photo exists. User material (screenshots, logos, documents): analyse -> architecture -> rebuild as clean vectors, never paste as-is.
6. **Build.** Read the selected renderer(s): `node bin/vidbucks.mjs config get` (default Remotion). **Remotion:** closest template in `src/templates` (copy its config from `demos.ts`, register the new composition in `src/Root.tsx` or `src/templates/index.tsx`), or new code following ``docs/motion-rules.md` and the Remotion skill `/remotion-best-practices``. Voice-over: `python tools/vo_words.py --text "..." --out public/<video> --voice af_heart --speed 0.92` (times the captions from word times). Music: `python tools/make_pulse_track.py --bpm B --dur D --mood dark|bright|calm --out public/<video>/pulse.wav` with B = 60*n/T so a chosen moment T lands on beat n. SFX from the audio library on the visual change points. Each phrase must end ~0.25 s before the next starts (no overlapping captions). **HyperFrames:** `npx -y hyperframes init <name> --example blank --resolution portrait --non-interactive --skip-transcribe`, author with its skills (`/hyperframes`, `/motion-graphics`, `/music-to-video`...), `npx hyperframes check`, `npx hyperframes render -o out.mp4`; see `examples/hyperframes/typed-caption`. **Other renderer:** follow its entry in `.vidbucks/renderers/<id>.json` (`agentSkills`, `scaffold`, `render`). **Any voice:** `--engine custom --tts-cmd "..."`. Whatever built the video, step 7 (measure, compare, side-by-side) is identical.
7. **Measure the result and iterate.** `npx tsc --noEmit`; render; `python tools/analyze_reference.py --file out/<render>.mp4`; `--compare <ref>/fingerprint.json <render>/fingerprint.json`; `--sidebyside <ref.mp4> <render.mp4> out/qa/side.png` and LOOK. Fix every FIX row, re-render, repeat (about 4 loops). A clean score does not replace looking; a photographic reference caps what code can reach.
8. **Deliver.** Files, the score table, credit lines for CC BY assets, what was verified and what was not (you cannot hear audio), and the one change that would raise quality most.

## Route by type
| type (what you see) | route |
|---|---|
| kinetic typography, text-driven trailers | template **KineticType** (events on a BPM grid; words, glitch, orb, logo card, picture cards) |
| object-metaphor / editorial / monochrome with a voice-over (paper grain, photographed objects, split frame, light cone) | template **ObjectStory** + licensed cut-outs (`fetch-stock` + `cutout.py`) + `vo_words.py` + pulse track |
| minimal icon-and-line story, tiny serif captions typed with a voice | template **IconStory** (ballCoins, pendulum wave, dotted sphere; add icons in the same style) |
| particle / 3D-scroll look, rope or bloom shapes | template **ParticleBloom** (a word as particles); a photoreal subject or a filmed room needs real plates |
| product / UI / screen-recording promo | rebuild the UI as vector components, camera moves, never raw screenshots |
| motion-design promo (bento, poster, blocks, line, retro-game/CRT) | vector primitives on a beat grid; take the layout language from the reference |
| stickman / doodle explainer, long-form | long-form route in CLAUDE.md section 5 (`vidbucks-script` -> `vidbucks-longform-build`, `vidbucks-stickman-engine`) |
| character / hand-drawn animation | engine characters (`Doomer`, `Face2`, `Meme` in `src/engine`) or sourced art; state the limits |
| maps / documentary | `GeoMap` kit with Natural Earth data (`tools/geo_export.py`) |
| filmed real-world, talking head, vlog, phone-filmed screen | real licensed footage, the user's own footage if the output must contain it, or an honest mock-up; expect a lower score |
| music-only loop / meme / caption template | replicate the structure and caption format with own text; seamless loop where the reference loops |
| unknown | build the smallest prototype, measure, decide |
Mixed types: take the route for each layer. A template is a starting point: change the code freely when the reference needs it.

## FIX row -> action
`cuts_per_min` / `shot_len_median_s` -> change scene lengths; slow the easing of big moves (every fast eased move registers as a cut) | `brightness_mean` / `dark_frame_ratio` -> background tone, vignette | `loudness_lufs` -> loudnorm to the reference LUFS (+ gain trim) | `bpm` -> new pulse track at the measured tempo (octave-free) | `cuts_on_beat` -> move the big moments onto beats | `transition_mix` -> hard cut vs blur/whip/flash to match | `sound_hit_on_cuts` -> SFX on the detected transition times (`transition_list` in `fingerprint.json`) | curve correlations -> reshape the pacing over time | `palette_distance` -> theme colours.

## Stability rules (learned the hard way)
- Never ship without looking at stills of every scene at the key moments AND the side-by-side with the reference.
- Overlapping captions, text outside the frame, a stray artefact in a cut-out, an element hidden behind another: check each explicitly.
- Heavy textures/geometry are built once (module load / `useMemo`) and shown as images or drawn once per frame; use `delayRender` for anything async; keep randomness deterministic (seeded or `random("key"+frame)`).
- Fonts: load with `@remotion/google-fonts`; never rely on system fonts.
- Loudness target = the reference's; never leave audio un-normalised.
- BPM estimates are octave-ambiguous and unreliable on quiet music mixed with effects: use them as a hint.
- Speed: stills at `--scale 0.3-0.4` for review, render once the stills are right.
