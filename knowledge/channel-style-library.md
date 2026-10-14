# Style archetypes (distilled from studies of many channels; names intentionally omitted)

Rule of the whole system: **copy the structure, never the material.** Same pacing, title skeleton, hook shape, thumbnail recipe - new topic, new examples, new art, no real faces / brand logos / copyrighted footage, no invented statistics. Hex values and fonts found in a study are visual guesses from screenshots (say so); view counts are rounded. Write your own studies with `vidbucks-channel-study` and the files in `templates/`.

| archetype | format | length | avg shot | cuts/min | look | title skeleton |
|---|---|---|---|---|---|---|
| skill explainer, stickman | numbered steps, drill cards, rival comparison | 8-12 min | ~4 s (hook 2.5-3 s) | ~15 (hook ~22) | black background, pale-blue hero + red rival, one yellow caption per key line, red/green numbers | `{N} Simple Steps to {skill} Like {Star} (just {M} minutes a day)` |
| tool guide, "cozy productivity" | beginner -> pro levels | 10-20 min | ~4.5 s | ~12 | navy / coral / cream, few colours per scene, lowercase headline band, level cards | `Use [TOOL] better than 99% of people (Beginner to Pro)` |
| comparison / roundup | test several, one winner | 10-15 min | ~6 s | ~10 | dark screen-recording look, white text with one bold keyword (1-2 per minute), verdict graphics, gold only for the winner | `I Tested [A] vs [B] vs [C] So You Don't Have To` |
| nostalgia / history photo documentary | slow narration over photographs | 18-26 min | ~8.5 s | ~7 | warm vintage photos, slow push-ins, no burned-in captions | `Why the {decade} {thing} Felt So Different From Today` |
| screen-recording tutorial | one task, imperative labels | ~5 min | ~20 s | ~2.5 | real UI recording, high-contrast step labels (2-5 imperative words) | `Do [task] with one click` |
| wordless animated short film | one abstract concept, music + few lines | 2.5-4.5 min | ~5 s | ~12 | near-black background, one hero, one accent colour, a recurring HUD/counter | `{CONCEPT} \| An Animated Short Film` |
| narrated map documentary | "why is X rich/poor" | 9-10 min | ~5 s | ~12 | relief map, camera flights, pinned icons, year cards | `Why {place} {fact}` |
| minimal motion-graphics Short | one ball/dot, thin lines, tiny serif captions, one icon per phrase | 8-15 s | ~1-2 s | ~30-50 | pure black or paper, a single accent | none (visual hook) |

## What transfers to the stickman engine
Skill explainer -> hook = shock line + visual in < 3 s, numbered steps each with a drill card, `bg:"ink"` + `shirt:"blue"` figure + `badge` numbers + red/green `text`. Tool guide -> level structure (`badge` or `box` "LEVEL 02"), max 3 colours per scene. Comparison -> compare, test, then ONE winner with gold only at the end; keyword highlight 1-2/min (`*word*` in `text`). Documentary -> slower cuts (~8 s), real photos only from CC0 / CC BY / CC BY-SA sources with credits, never modern photos for "old" claims. Screen tutorial -> long steady shots with imperative labels; never fake the UI of a real product.

## Packaging patterns that repeated across channels (observation, not proof)
1. The title skeleton is one repeatable template; the biggest hits put a famous name/brand/number in the first words. The same skeleton on an unknown name tops out low.
2. The thumbnail repeats the title's key words (a number or decade, large), one hero subject, strong contrast, <= 6-8 words.
3. Description: keyword hook sentence + 3-5 bullets/chapters + one comment CTA; no unverified statistics.
4. The first 2-3 videos often carry most of a channel's views (outlier dependence): do not copy a single outlier, copy what repeats across 10+ videos.

## Pacing presets (for `scenes.json`)
| preset | scene length | objects/scene | use when |
|---|---|---|---|
| fast explainer | 3-5 s | 2-4 | hooks, listicles, 8-12 min videos (default) |
| steady guide | 6-10 s | 3-6 | tutorials, comparisons |
| slow documentary | 8-14 s | 1-3 | nostalgia/history, emotional narration |
In the script this is paragraph length: fast ~ 10-18 words, steady ~ 20-30, slow ~ 25-40.
