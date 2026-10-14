---
name: vidbucks-script
description: Write and optimise a YouTube narration script for retention and honesty - hook, open loops, one-idea scenes, true claims, correct length for the TTS voice - and gate it with tools/script_lint.py. Use for any "write the script", "improve this text", "make it hold attention" request.
---

# vidbucks-script

Read `knowledge/creator-playbook.md` §3-§4 and `knowledge/metrics-rules.json` (`hook_rules`, `packaging`). Ask for the language and voice engine first (words per minute differ: OmniVoice ~195, Kokoro ~165, human ~150).

## Write
- Target words ≈ minutes × wpm minus 0.5 s per paragraph of pauses. 8 min with OmniVoice ≈ 1450 words.
- Paragraph = scene (8-35 words, one idea). Blank line between paragraphs. `[pause N]` alone on a line for deliberate silence (e.g. a "pause the video and answer" moment).
- Hook ≤ 25 words with an open loop; promise + 2 curiosities in the first 30 s; first value by ~second 10; no intro/logo/"welcome back".
- Sections numbered (viewer feels progress); a one-line curiosity teaser between sections; a question to the viewer mid-video; an engagement mechanic that fits the topic (quiz, "pause and guess"); CTA only after value; end on the strongest moment (≤ 10 s tail).
- A recurring character or concrete example per abstract point (stickman "Sam"): story beats make scenes drawable.
- Truth: only established facts, hedged ("usually", "often"); never "studies show" without a real study you can name; never invent numbers; fictional characters must read as fictional.
- Spoken style: contractions, short sentences, active verbs, no filler ("in today's video", "let's dive in", "game-changer").
- TTS safety: unusual proper names can crash Kokoro/misaki — respell for TTS only; no emojis; spell out symbols; check how years/ranges are read.

## Gate
`python core/tools/script_lint.py core/videos/<name>/script.txt --minutes N [--wpm 195]` → fix HIGH/MED; read every VERIFY claim and source it, hedge it or delete it. Aim for score ≥ 90. The linter is a heuristic: you still read the text once as a viewer, and compare against the reference channel's beat sheet.

## Improving an existing script
Do not rewrite wholesale. List the problems (slow hook, long scenes, repeated phrasing, unsupported claims, missing loops), fix in place, show the user a change summary, re-lint.
