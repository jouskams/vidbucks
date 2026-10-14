---
name: vidbucks-setup
description: Guided installation and onboarding for Vidbucks. Detects what is missing (Node, ffmpeg, Python packages, Remotion and its agent skills, an open-source voice engine, Whisper, yt-dlp), installs it step by step with the user, verifies with a real test, then announces that Vidbucks is ready and asks the user for their first REFERENCE VIDEO. Use on the first run, when `node scripts/status.mjs` reports needs_setup or needs_smoke_test, when the SessionStart hook says tools are missing, when the user says "set up / install / kur / kurulum", or whenever a tool fails because something is not installed.
---

# vidbucks-setup

Goal: a working Vidbucks on this computer, then a clear hand-over: **"setup finished - send me your reference video"**. You do the work; the user only confirms big downloads and answers the few questions that are theirs.

## 0. Locate Vidbucks
Vidbucks home = the folder that contains `core/tools/doctor.mjs`, `scripts/status.mjs` and `CLAUDE.md`. Check in this order: the current folder, `$VIDBUCKS_HOME`, the path inside `~/.vidbucks/home`. If none exists (only the plugin or the skills were installed), clone it: `git clone https://github.com/jouskams/vidbucks ~/vidbucks`, then continue inside that folder. Read `CLAUDE.md` once the setup is done.

## Rules
1. **One step at a time.** One sentence on what the step does, the exact command in a code block, run the check, continue. Never dump the whole list.
2. **System software is installed by the USER in their own terminal** (PowerShell / Terminal): tools installed from inside the assistant's sandbox often do not exist in the user's terminal. You may run read-only checks and the project commands (`npm ci`, `node core/tools/...`, `pip install` into the chosen Python) yourself.
3. **Ask before anything big** (several GB of model downloads, admin rights). Never create accounts, never type passwords or keys. Free API keys (optional) are given by the user and stored only with `node core/tools/doctor.mjs --set KEY=value`; never echo them back.
4. After every step re-check. If it fails, read the error, fix the FIRST problem only, re-check. After two failed attempts show the user the exact error and the matching row of the troubleshooting table below.
5. Keep a running checklist in your replies: done / now / later. Speak the user's language.

## 1. Look at the machine
```
node scripts/status.mjs --json
node core/tools/doctor.mjs
```
`phase` is `needs_setup` (tools missing), `needs_smoke_test` (installed, not yet proven) or `ready`. The doctor prints hardware (accelerator: `cuda` / `mps` / `cpu`), the Python it found and an ordered `plan`. Show the user the plan in three lines and say what you will install first.

## 2. Ask the questions that are the user's
1. **Which language(s) will the voice-overs be in?** (or "no voice-over, music and captions only")
2. **Do they want a cloned/consistent voice or just a good default voice?** (or a voice they already use: any command-line text-to-speech works, see docs/integrations.md)
3. **Which video engine?** Default Remotion. Ask only if they mention another tool or want HTML/GSAP compositions: **HyperFrames** (`node bin/vidbucks.mjs config set renderers hyperframes`, or `remotion,hyperframes`) or their own tool (register it as a custom renderer). Tell them HyperFrames collects anonymous telemetry and let them decide (`npx hyperframes telemetry disable`).
Pick engines with this table (all open source; install only what is needed):

| need | engine | notes |
|---|---|---|
| any PC, English, simplest | **Kokoro** (Apache-2.0) | CPU is fine; Python 3.10-3.12; non-English voices need `espeak-ng` |
| many languages, fully offline on CPU | **Piper** (MIT code; each voice has its OWN licence - read the voice's model card; some are non-commercial) | download a voice from `rhasspy/piper-voices` |
| expressive, multilingual (for example Turkish, Spanish, German...), optional voice cloning | **Chatterbox** (MIT) | wants a GPU or Apple Silicon; heavy download |
| natural English with a "designed" consistent voice | **OmniVoice** | NVIDIA GPU with >= 6 GB only; see `docs/voice-engines.md` |
Always also needed: **faster-whisper** (word timestamps for captions and for measuring references).
Default recommendation when the user has no preference: Kokoro first (works everywhere); add Chatterbox when the machine has Apple Silicon/CUDA and the language is not English.

## 3. Install, in this order (skip what the doctor shows as OK)
1. **Node 20+**: Windows `winget install OpenJS.NodeJS.LTS` - macOS `brew install node` - Linux https://nodejs.org. New terminal, `node -v`.
2. **ffmpeg**: Windows `winget install Gyan.FFmpeg` - macOS `brew install ffmpeg` - Linux `sudo apt install ffmpeg`. New terminal, `ffmpeg -version`.
3. **Python 3.10-3.12** (3.12 is the safest; the Kokoro engine does not support newer versions yet). Windows `winget install Python.Python.3.12` (tick Add to PATH) - macOS `brew install python@3.12` - Linux `sudo apt install python3 python3-venv`. If only `python3` exists nothing more is needed (Vidbucks resolves it); if the newest Python is too new, create a venv and tell the tools: `python3.12 -m venv ~/.vidbucks-venv` then set `VIDBUCKS_PYTHON=~/.vidbucks-venv/bin/python` (Windows: `...\Scripts\python.exe`) in the user's shell profile.
4. **Python packages** (into that Python): `pip install numpy soundfile pillow scipy faster-whisper "av<16" yt-dlp`
5. **Project dependencies**: `node scripts/setup.mjs` (installs the Vidbucks skills into `~/.claude/skills`, records `~/.vidbucks/home`, runs `npm ci` in `core/`; a few minutes the first time).
6. **Renderer and its agent skills.** Remotion (default): `npx skills add remotion-dev/skills` (the `/remotion-best-practices` skill covers all the others; NOT bundled, Remotion's own terms). HyperFrames: nothing to install globally, run `npx -y hyperframes doctor` once and, inside a HyperFrames project, `npx hyperframes skills update`. Custom renderer: run its `install` from the registry entry with the user.
7. **Voice engine(s)** chosen in section 2 (commands below). Models download on first use: tell the user the size before the first run.
8. **Built-in sound library** (optional, licence-free, generated on this machine): `python core/tools/make_synth_library.py` (needs ffmpeg + scipy). Without it videos still render, just without the sound-effect library.
9. **Free stock keys** (optional): ask ONCE whether they want Pexels/Pixabay keys (free, instant sign-ups the user does themselves). Without keys Openverse and Wikimedia are used.

### Voice engine commands
```
# Kokoro (CPU ok)           pip install kokoro soundfile      (+ non-English: espeak-ng via brew/apt/winget)
# Piper                     pip install piper-tts             (+ download a voice .onnx and its .json; check its licence)
# Chatterbox                pip install chatterbox-tts "setuptools<81"
# OmniVoice (NVIDIA only)   follow docs/voice-engines.md (clone into a PERMANENT folder, pip install -e . --no-deps, CUDA torch)
```

## 4. Prove it
1. **Hear a voice** (user-owned approval): make a 10-second sample with the installed engine and give the user the file path:
   Kokoro: `python core/tools/vo_words.py --text "Vidbucks is ready. Send me a reference video." --out core/public/_voice-test`
   Any engine: create `core/videos/_voice-test/script.txt` with two sentences, run `python core/tools/make_narration.py --video _voice-test --engine <kokoro|piper|chatterbox|omnivoice>`, play/send `core/public/videos/_voice-test/narration.wav`; delete the test folders afterwards. You cannot hear it yourself: say so and let the user judge.
2. **Smoke test:** `node core/tools/smoke.mjs` -> every line `PASS` (it tests the renderer(s) selected in the config, including a HyperFrames round trip when selected). The first run downloads a headless Chrome (~110 MB) and takes a few minutes.
3. **Skills loaded?** Skills are read when Claude Code starts: if you installed the Remotion or Vidbucks skills during this session, tell the user to restart Claude Code in the Vidbucks folder once (the SessionStart hook will then greet them).

## 5. Finish: record it, announce it, ask for the reference
1. `node scripts/status.mjs --mark-ready` (writes `.vidbucks/state.json` and `~/.vidbucks/home`).
2. **Tell the user, in their language and in this shape** (this is the notification the whole onboarding exists for):
   - Setup is finished. In one line each: engines installed (and the accelerator), Remotion skills, sound library, what is still optional.
   - **"Now send me your REFERENCE VIDEO."** Options: paste a YouTube/Shorts/Reels link, give the path of a video or screen-recording file (drag it into the terminal), send images or describe the look in words. Several references are fine.
   - And tell me **what you want to say**: topic or script, the brand name/colours if any, the language of the voice-over, the format (vertical 9:16, horizontal 16:9 or both) and the length.
   - What happens next: Vidbucks measures the reference, looks at it, builds an original video in that style with your content, measures the result against the reference and refines it, then delivers the files with a score table.
3. `node scripts/status.mjs --mark-announced`.
4. If the user stepped away during a long install and a push-notification tool is available, send ONE short notification: "Vidbucks is ready - send your reference video."
5. When the user then sends a reference, switch to skill `vidbucks-reference-to-video`.

## Troubleshooting (first fix, then re-check)
| symptom | fix |
|---|---|
| `faster-whisper` crashes with `open() got an unexpected keyword argument 'metadata_errors'` | `pip install "av<16"` |
| Kokoro / torch will not install on a new Python | use Python 3.10-3.12 (venv + `VIDBUCKS_PYTHON`) |
| Kokoro non-English voice fails | install `espeak-ng` (brew / apt / winget) |
| Chatterbox: `No module named 'pkg_resources'` | `pip install "setuptools<81"` |
| Chatterbox mumbles or repeats words | the tool already re-checks each paragraph with Whisper and retries; keep paragraphs short |
| OmniVoice `import omnivoice` fails after a cleanup | the clone must live in a permanent folder: re-run `pip install -e . --no-deps` there |
| `python: command not found` | use `python3`, or set `VIDBUCKS_PYTHON` |
| Remotion or Chrome download blocked | antivirus/proxy: allow it, or point `--browser-executable` to an installed Chrome |
| `npm ci` fails | Node older than 20, no network, or a full disk: fix that first |
| zsh: `no matches found` / variables not split | quote globs; use functions with `"$@"` |
Windows tips: run installers in PowerShell; `python` may be a Microsoft Store stub - install Python from winget and tick Add to PATH.
