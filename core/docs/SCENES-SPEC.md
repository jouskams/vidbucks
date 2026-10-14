# Stickman engine — the video contract

A video = a folder `core/videos/<name>/` with these files. Everything the engine draws comes from them.

| file | made by | purpose |
|---|---|---|
| `script.txt` | you (assistant) | narration. Blank line = new SCENE. A paragraph that is only `[pause 3]` adds 3 s of silence (not a scene) |
| `video.json` | you | id, title, music playlist, sfx defaults |
| `timing.json` | `tools/make_narration.py` | audio length + word times (never edit) |
| `scenes.json` | you | one entry per script paragraph, in order |
| `thumb.json` | you (optional) | thumbnail objects (same object kinds) |
| `narration.wav` | tool | in `public/videos/<name>/` |

Scene count MUST equal paragraph count (`python tools/check_anchors.py <name>` verifies, and also lists anchor words that are not spoken in their scene).
After adding a video: `node tools/register.mjs` (rewrites `src/registry.ts`), then `npx tsc --noEmit`.

## video.json
```json
{ "id": "StudyMemory", "title": "...", "narration": "videos/<name>/narration.wav", "captions": true, "boil": true,
  "wipeEvery": 5, "wipeSfx": ["whoosh", 0.16],
  "sfxDefaults": { "badge": ["impact", 0.3], "box": ["ui", 0.16], "icon:check": ["success", 0.2] },
  "music": [ { "id": "<audio-lib id>", "from": 0, "to": 150, "vol": 0.13 } ] }
```
`id` = Remotion composition id (CamelCase, unique). `boil` = hand-drawn wobble (slower render; set false for speed).
Music segments are crossfaded in/out (2 s); the playlist must cover the whole video; use ids from `src/audio-lib.json`; entries with `"attribution": true` need a credit line in the description.

## scenes.json
```json
[ { "bg": "paper", "cam": "push", "objs": [ ...objects... ], "sfx": [ { "at": "word", "c": "whoosh", "v": 0.3 } ] } ]
```
`bg`: `paper` `grid` `dark` `blue` `yellow` `green` `pink` `ink` (dark/ink flip strokes to light). `cam`: `push` `pull` `none` (default alternates).
Canvas 1920x1080, object (x,y) = CENTER. Keep important things inside x 100..1820, y 80..900 — the caption pill covers y > 930. Ground line for figures: y = 800.

### Anchors (`at`, `until`, `ats`, `delay`)
`"start"` · `"end"` · seconds as number · `"word"` first time the word is spoken in THIS scene · `"word#1"` second time · `"word+0.4"` offset seconds.
Matching ignores case/punctuation, treats stems as equal (note/notes) and number words as digits (ten = 10). If the word is not spoken the object appears at the scene start. Whisper sometimes mishears a word — run `check_anchors.py` and read `timing.json` words when unsure.

### Common props (all kinds)
`x y` position · `s` scale · `rot` degrees · `op` opacity · `at` appear · `until` disappear · `delay` seconds added to `at` · `flip` mirror
`fx` entrance: `pop`(default) `fade` `slideL` `slideR` `slideU` `slideD` `drop`(bounce) `slam` `type`(text) `none`
`loop`: `float` `shake` `pulse` `spin` `swing` · `move`: `{ "to": [x,y], "at": "word", "dur": 1.2, "linear": false }`
`sfx`: `"category"` or `["category", volume]` or `false` — overrides the default sound for this object (`sfxRate` changes pitch).

### Kinds
- `stick` — the character. `pose`: idle talk point pointup think cheer shrug tired hold write stop wave sit lean walk. `poses: [{at,to}]` change pose on a word. `face`: smile flat sad open worry shock think sleep; `faces: [{at,to}]`. `prop`: any icon name held in the right hand. `shirt` color name, `glasses`, `sweat`, `label` (name under feet), `anim`: bob(default) talk nod shake wave. Size ~330 px at s=1. Use `walk` + `move` for walking (linear).
- `text` — `t` (use `*word*` for a marker highlight), `size` (default 90), `color`, `font`: marker(default) | hand, `w` max width, `align`. `fx:"type"` + `typeDur` frames types it.
- `box` — rounded card: `t`, `w h`, `fill`, `color` (border), `tcolor`, `size`, `font`, `round`. Empty `t` + `fill:"transparent"` = highlight frame.
- `bubble` — speech/think bubble: `t`, `w`, `tail:[dx,dy]` (tip offset below the bubble center), `think:true` for cloud dots.
- `badge` — number circle: `t`, `size`, `color`.
- `icon` — `n` name, `size`, `color` (fill). Names: book note pencil highlighter clock hourglass brain bulb calendar moon zzz question exclaim check cross card trophy cap battery bed speaker magnifier star heart road grass tree phone coffee arrowr loop sparkle. `check`/`cross` get success/fail sounds. `battery` with `color:"red"` = low.
- `curve` — memory curve chart: `kind:"forget"|"reviews"`, `reviews:[0.2,0.45,..]` (positions 0..1), `dur` seconds to draw, `w h` (default 1000x480; origin ~ (x-480, y+210)), `xl yl` axis labels. It is a schematic ("illustration"), never real data.
- `tline` — timeline: `labels`, `ats` (one anchor per label), `w`.
- `list` — rows that appear one by one: `items:[{t, at, mark}]`, `mark`: dot|check|cross|num, `size`, `w`.
- `dots` — row of `n` circles filling on `ats`.
- `line` — horizontal rule (ground): `w`, `h`, `color`.
- `under` — hand-drawn underline: `w`, `color`.

Colors: `ink blue orange green red yellow purple grey paper` or any CSS color.

## Layout rules that avoid the usual bugs
1. One idea per scene; 3-6 objects; the first object visible within 0.3 s of the scene start (no blank first half).
2. Do not put text on top of a figure: figure body spans y from (ground-330*s) to ground; head top ~ ground-300*s.
3. Text width: size 90 marker ~ 0.62*size px per character. Long headlines: size <= 110 and `w` <= 1700.
4. Keep a figure 150 px away from chart axes/labels; no object below y 900.
5. Numbers in the marker font: `1` looks like a tick — prefer words or the badge/hand font.
6. Dark backgrounds (`dark`,`ink`) automatically invert strokes; give custom fills a light color.

## Authoring helpers
`tools/scenekit.py` (see `templates/build_scenes_template.py`) builds scenes.json from Python: `S(BG("blue"), ground(), stick(...), text(...), …)`, `move_after()`, `finish(__file__)`. `tools/blank_start.py <name> [--fix]` finds scenes whose first object appears later than 0.6 s.

## Commands
```
node tools/register.mjs && npx tsc --noEmit && python tools/check_anchors.py <name>
node tools/stills.mjs <name> --scenes 0-20 --scale 0.4        # QA contact sheets in out/qa/<name>/
npx remotion render src/index.ts <CompId> out/<name>-raw.mp4 --concurrency=3
ffmpeg -y -i out/<name>-raw.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/<name>-final.mp4
node tools/qa.mjs out/<name>-final.mp4 --minutes 8
npx remotion still src/index.ts <CompId>Thumb out/<name>-thumb.png      # needs thumb.json
```
Always pass the explicit entry file `src/index.ts` (a folder named like the composition breaks the CLI on Windows).
