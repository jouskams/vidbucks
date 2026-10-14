# Templates

Four config-driven Remotion templates live in `core/src/templates/`. Each has a **demo composition** (placeholder content) you can open in Remotion Studio (`cd core && npx remotion studio`) or render:

| composition id | template | render a still |
|---|---|---|
| `Tpl-IconStory` | `IconStory.tsx` | `npx remotion still src/index.ts Tpl-IconStory out/a.png --frame 60` |
| `Tpl-ObjectStory` | `ObjectStory.tsx` | `... Tpl-ObjectStory out/b.png --frame 150` |
| `Tpl-KineticType-Vertical` / `-Horizontal` | `KineticType.tsx` | `... Tpl-KineticType-Vertical out/c.png --frame 120` |
| `Tpl-ParticleBloom` | `ParticleBloom.tsx` | `... Tpl-ParticleBloom out/d.png --frame 100` |

## Using one
1. Copy the closest demo config in `core/src/templates/demos.ts` and change the content: texts, times (seconds), colours, images, audio.
2. Register your composition next to the demos in `core/src/templates/index.tsx` (copy a `<Composition>` line, new id).
3. Render stills at `--scale 0.35`, look, fix, then render the video; measure it with `analyze_reference.py` and compare with the reference.

## What each template takes
- **IconStory:** `phrases` (words with start/end seconds relative to the voice), `icons` (`ballCoins`, `pendulum`, `sphere` timeline), optional `lockup` and `tag`, theme colours, optional `audio`.
- **ObjectStory:** a portrait (fills the split-open frame), three transparent object PNGs (`tools/cutout.py` makes them from licensed photos), `captions` (small light words + one bold keyword, with times), the key moments `t.split / eyeIn / cut / lockupAt`, paper and stage colours.
- **KineticType:** `events` on a BPM grid: `word` (fx: slam, whip, stretch, zoom, type; bg: dark/light/accent), `glitch`, `orb`, `logo`, `card` (headline + picture); palette; optional HUD. Works at any size.
- **ParticleBloom:** the word to build from particles and a palette; timing of dissolve / bloom / return.

Templates are starting points. When a reference needs something else, write a new composition (see `docs/motion-rules.md`) and add it as a template if it generalises.
