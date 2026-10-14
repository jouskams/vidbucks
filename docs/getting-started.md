# Getting started

## 1. Get Vidbucks and the Claude Code agent
```bash
git clone https://github.com/jouskams/vidbucks
cd vidbucks
node scripts/setup.mjs
```
`setup.mjs` installs the Vidbucks skills into `~/.claude/skills`, records where Vidbucks lives, runs `npm ci` in `core/` and prints what is still missing. You need Node 20+; the assistant installs the rest with you.

## 2. Let the assistant finish the installation
Open [Claude Code](https://claude.com/claude-code) **inside the `vidbucks` folder**. The SessionStart hook reports the status. Say:

> Set up Vidbucks

(or run `/vidbucks-setup`). The `vidbucks-setup` skill:
1. looks at your machine (OS, Python, GPU / Apple Silicon / CPU) and shows an ordered plan;
2. asks two questions that are yours: **which language(s) for voice-overs** and **whether you want a cloned/consistent voice**;
3. installs, one step at a time: ffmpeg, Python packages, the official Remotion agent skills (`npx skills add remotion-dev/skills`), a voice engine (Kokoro, Piper, Chatterbox or OmniVoice) and Whisper, plus the optional licence-free sound library and free stock keys;
4. proves it: a 10-second voice sample you can listen to, and `node core/tools/smoke.mjs`;
5. **tells you it is finished and asks for your reference video.**

Restart Claude Code once if the Remotion or Vidbucks skills were installed during the session (skills load at startup).

## 3. Send your first reference
Paste a YouTube/Shorts/Reels link, or give the path of a video / screen-recording file (drag it into the terminal), or send images, or describe the look. Say what you want to say: topic or script, brand name and colours, language of the voice-over, format (9:16, 16:9 or both) and length.

```text
> Reference: https://www.youtube.com/shorts/...   Make one for my bakery, English voice, vertical + horizontal, 20 seconds.
```
Vidbucks measures the reference, looks at it, builds, measures its own render against the reference, refines, and hands you the files with a score table, a side-by-side image and the credit lines.

## What if something fails?
Run `node core/tools/doctor.mjs` (every WARN/FAIL has the exact fix) or `/vidbucks:status`. The troubleshooting table is in `skills/vidbucks-setup/SKILL.md`; voice-engine specifics are in [voice-engines.md](voice-engines.md).

## Manual installation (without the assistant)
1. Install Node 20+, ffmpeg, Python 3.10-3.12.
2. `pip install numpy scipy pillow soundfile faster-whisper "av<16" yt-dlp kokoro`
3. `node scripts/setup.mjs && npx skills add remotion-dev/skills`
4. `node core/tools/doctor.mjs && node core/tools/smoke.mjs && node scripts/status.mjs --mark-ready`
