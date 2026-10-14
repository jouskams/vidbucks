---
name: vidbucks
description: Entry point of Vidbucks. Use whenever the user wants to make, plan, script, voice, animate, package, revise or analyse a video or a YouTube video, sends a reference (link, file, images, "make one like this"), asks for a promo/short/reel/explainer, or says "new video", "revise the video", "analyse this". Loads the operating manual and routes to the right skill; with any reference it starts vidbucks-reference-to-video.
---

# vidbucks (entry)

1. Locate Vidbucks home: the folder with `CLAUDE.md` + `core/tools/doctor.mjs` + `scripts/status.mjs` (cwd, `$VIDBUCKS_HOME`, or the path in `~/.vidbucks/home` / `PACKAGE_PATH.txt` next to this skill). Run `node scripts/status.mjs`. Read `CLAUDE.md` completely - it is the law (golden path, autonomy and hard rules, routes, long-form pipeline, revision protocol). Then read `knowledge/learned.md`.
2. Status `needs_setup` / `needs_smoke_test` -> skill `vidbucks-setup` until the smoke test passes, then it announces readiness and asks for the reference video. Status `ready` -> continue.
3. Work in progress? `core/videos/*/STATUS.md`. Resume instead of restarting.
4. **Any reference or style wish (link, mp4, screenshots, "like this", a promo/short/reel)** -> skill **`vidbucks-reference-to-video`**. Do not ask the user for reference images, photos or analysis; ask only user-owned decisions.
5. **A long explainer / stickman / doodle video** -> long-form route (CLAUDE.md section 5): Decision Card -> `vidbucks-script` -> voice -> `vidbucks-longform-build` (+ `vidbucks-stickman-engine`) -> `vidbucks-qa-revise`.
6. **A channel to learn from** -> `vidbucks-channel-study`. **Published numbers to judge** -> `vidbucks-metrics`. **Feedback on a built video** -> `vidbucks-qa-revise` (revision protocol).
7. After every step update the video's `STATUS.md`; append decisions to `DECISIONS.md`.
8. End every deliverable with an honest note: what was verified (numbers, stills, scores) and what was not (you cannot hear audio).
