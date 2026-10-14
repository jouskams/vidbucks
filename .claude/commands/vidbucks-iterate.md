---
description: Compare the latest render with the reference, fix every FIX row, and render again
argument-hint: <reference fingerprint or file> <render>
---
Run the fidelity loop of `vidbucks-reference-to-video` on $ARGUMENTS: `analyze_reference.py --file <render>`, `--compare <ref>/fingerprint.json <render>/fingerprint.json`, `--sidebyside <ref> <render> out/qa/side.png`; LOOK at the side-by-side; fix the FIX rows with the action map in the skill; re-render. Stop after the checks pass or after about 4 loops and report the real scores.
