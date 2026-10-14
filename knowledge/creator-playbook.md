# Creator playbook — how a video gets decided, written, built and judged

Guidance, not law: the numbers in `metrics-rules.json` are rules of thumb. Use them as defaults, state when you deviate, and shift thresholds for format and audience.

## 1. Before anything: classify the channel / idea
Ask the user (once, store in `project-brief.json`) — do NOT guess these:
1. **Language** of narration and of title/description.
2. **Category**: Evergreen (people search for it) / Cash Cow (browse-driven, voice-over, 1-3 yr) / Trend / Hype. Tests: would someone SEARCH this? does it depend on current events? would it work with no YouTuber on screen?
3. **Audience** (age, device, country) — drives thumbnail contrast, tone, length.
4. **Target length** and **upload cadence**.
5. **Voice**: engine (OmniVoice GPU / Kokoro CPU), gender, tone, accent; the user approves a 10-second sample before the full run.
6. **Topic**: either given by the user, or you propose 5 ideas scored (below) and the user picks.
7. **Style reference**: one of the five studied channels or "my own".
If an answer is missing the pipeline stops at the Decision Card gate (CLAUDE.md §4). The system never silently picks a user-owned decision.

## 2. Topic scoring (0-3 each, keep >= 11/15)
1. *Known topic x unknown detail* (viewers know the subject, have never thought about this angle).
2. *Askable*: can the title be asked as "how / why"? If not, rewrite.
3. *Narrow*: one sub-niche, repeatable for 20+ videos.
4. *Provable*: every claim can be told truthfully with common knowledge or a real source — no invented numbers.
5. *Visual*: can the idea be drawn with simple figures/icons/charts (stickman engine) or openly licensed media?

## 3. Title / thumbnail / description (decide BEFORE the build; never change a title once it gets distribution)
- Title patterns: number/scale first · "how/why" askable · gap (withhold the answer) / contradiction / cost. Never describe the video; leave something to close. Evergreen: clear + search words. Cash cow/trend: curiosity + scale. Make 3 options, score each against the archetype skeletons in `channel-style-library.md`, pick one, keep the other two as A/B backups for later thumbnails.
- Thumbnail: one subject, <= 2 words ideal (<= 6-8 max), high contrast, text never over a face, readable at 160 px wide (half-second test). Same thumbnail language for >= 5 videos.
- Description: line 1 = the title's search words + the promise; 3-5 chapter lines; one comment question; hashtags; credit lines for every CC BY / BY-SA asset; no unverified statistics.

## 4. Script rules (the biggest quality lever)
- Hook <= 25 words, one open loop in the first 5-10 s; total of 3 open loops in 30 s (1 promise + 2 curiosities) that close at different times. No intro, logo, "welcome back".
- Value first; the viewer already clicked: do not re-sell the video.
- One idea per paragraph (= scene, 3-14 s). Sentences <= 16 words, mean <= 13. Short curiosity sentence between sections. A question to the viewer in the middle and at the end.
- A running character (like Sam) makes abstract advice concrete and gives scenes a face.
- End on the strongest moment, one CTA after the value, no summary/thank-you tail beyond ~10 s.
- Only true claims: well-established facts, hedged ("usually", "often"), or clearly fictional characters. No "studies show" without a real study; no percentages unless sourced.
- Run `python tools/script_lint.py videos/<name>/script.txt --minutes N` until score >= 90 and read every HIGH/MED warning yourself.
- Length: OmniVoice speaks ~195 wpm, Kokoro ~165 wpm incl. nothing; add 0.5 s per paragraph. 8 min ~ 1450 words (OmniVoice).

## 5. Build gates (every video, in order)
G0 Decision Card complete → G1 script lint >= 90 + claims reviewed → G2 voice sample approved → G3 narration within target ±30 s → G4 `check_anchors` clean + `tsc` clean → G5 contact sheets viewed (2 stills/scene) and fixed → G6 render → G7 loudnorm + `qa.mjs` all PASS → G8 thumbnail + packaging.md + credits → G9 honest report (what was and was not checked — you cannot hear audio or watch every frame).

## 6. Judging a published video (analytics mode)
Order: CTR (packaging) → first-30 s retention (hook) → average view % (content). Compare to category thresholds in `metrics-rules.json`, with ±10 % tolerance and the time/video window. One variable at a time, never decide on one video, no decisions in the first 48 h. Retention drop location → action: intro → cut/shorten; early body → answer sooner; late body → shorten; end → cut at ≤ 10 s. Intervention ladder: thumbnail → intro → length/format → title pattern → concept. Abandon only with ≥ 3 of 4 signals.

## 7. Revision handling
See CLAUDE.md §6. Summary: turn feedback into numbered change items with the scene numbers they touch, edit only those scenes (or script lines), re-run only the affected steps (script change → narration + timing + anchors; visual change → stills of changed scenes + render), keep `v1/v2` outputs and a `REVISIONS.md` log, and re-run the gates the change can break.
