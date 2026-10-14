# Motion rules (apply to every composition)

1. **No linear motion.** Every `interpolate()` gets an easing curve and `extrapolateLeft/Right: "clamp"`. Entrances prefer `spring()`. Use gentle sine curves for long moves: every fast eased move registers as a "cut" when measured.
2. **Entrances animate two or three properties together** (opacity + translate + scale/blur). A lone fade looks cheap.
3. **Stagger.** Lists, words, letters, rays: 3-6 frame offsets; nothing enters at once.
4. **Exits are faster than entrances** (about half the duration) and never overlap the next caption: end each phrase ~0.25 s before the next starts.
5. **Layers, bottom to top:** background (never a flat colour unless the reference is flat) -> assets -> graphics/type -> colour grade -> grain + vignette.
6. **Idle things breathe:** anything on screen more than two seconds gets a tiny sine motion.
7. **Everything derives from `fps`.** Times in seconds, converted once. No magic frame numbers.
8. **One theme object** (colours, easings, fonts) per composition; one accent colour.
9. **Heavy work once.** Build textures/geometry at module load or in `useMemo`; use `delayRender`/`continueRender` for async work (fonts, geometry); deterministic randomness (seeded or `random("key"+frame)`).
10. **Responsive by construction.** Size unit `u = min(width, height)/1080`; positions as fractions of width/height; check every requested format.
11. **Fonts via `@remotion/google-fonts`**, never system fonts. Keep text >= 28 px at 1080 wide on phones.
12. **Render -> look -> fix.** Stills at `--scale 0.3-0.4` first; look for text outside the frame, overlaps, artefacts, an empty first 0.3 s; then render and measure.
