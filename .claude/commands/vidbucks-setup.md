---
description: Install and verify everything Vidbucks needs (Remotion, ffmpeg, Python, a voice engine), then get ready for your first reference video
---
Run the `vidbucks-setup` skill. Start with `node scripts/status.mjs --json` and the doctor, show the plan in three lines, then install what is missing step by step. When everything passes (voice test + smoke test) record it with `node scripts/status.mjs --mark-ready` and tell the user - in their language - that Vidbucks is ready and that they can now send a reference video (link or file) together with what they want to say.
