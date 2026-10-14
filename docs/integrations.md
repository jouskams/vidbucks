# Works with your stack: renderers, voices and agents

Vidbucks has three layers. Only the first one is fixed.

| layer | what it does | pluggable? |
|---|---|---|
| **Measure and verify** | `analyze_reference.py` (cuts, palette, tempo, loudness, transitions, curves, captions), `--compare`, `--sidebyside`, cut-outs, asset licensing, route choice | **no renderer needed:** it reads any `.mp4` |
| **Build** (renderer) | turns the plan into frames | **yes:** Remotion (built-in templates), HyperFrames, or any tool that ends in a video file |
| **Voice** | narration + word timing | **yes:** Kokoro, Piper, Chatterbox, OmniVoice, or any command that writes an audio file |

The fidelity loop is the same whatever built the video: render -> measure the render -> compare with the reference -> side-by-side -> fix -> repeat.

## Choose the renderer(s)
```bash
node bin/vidbucks.mjs config set renderers remotion              # default
node bin/vidbucks.mjs config set renderers hyperframes
node bin/vidbucks.mjs config set renderers remotion,hyperframes  # both
node bin/vidbucks.mjs config set renderers remotion,custom:manim # your own (see below)
```
`doctor` and `smoke` then check exactly what you selected (Remotion's dependencies are not required if you do not use Remotion).

### Remotion (default)
Vidbucks ships four config-driven templates (`IconStory`, `ObjectStory`, `KineticType`, `ParticleBloom`) and the long-form doodle engine. Agent skills: `npx skills add remotion-dev/skills`.

### HyperFrames (HeyGen, Apache-2.0)
HTML compositions with GSAP, rendered to MP4/WebM/MOV/GIF by the `hyperframes` CLI. **Tested here:** scaffold a portrait project, write a GSAP composition, `hyperframes check`, `hyperframes render -o out.mp4`, then measure the result with Vidbucks (`node core/tools/smoke.mjs` runs this round trip when HyperFrames is selected). See [examples/hyperframes/typed-caption](../examples/hyperframes/typed-caption).
How to work with it:
1. `npx -y hyperframes init <name> --example blank --resolution portrait --non-interactive --skip-transcribe` (set `HYPERFRAMES_SKIP_SKILLS=1` to skip its skills check).
2. Author with HyperFrames' own skills (`npx hyperframes skills update`, then `/hyperframes` -> `/motion-graphics`, `/music-to-video`, `/faceless-explainer` ...). They know its `data-*` attributes and the `window.__timelines` rule; Vidbucks does not duplicate them.
3. Vidbucks contributes what happens around the build: measure the reference, classify the type, collect licensed assets, plan the scenes, then run the loop on the rendered MP4.
4. Vidbucks' four templates are Remotion-only. To reuse one, port it with HyperFrames' `/remotion-to-hyperframes`.
**Privacy:** HyperFrames collects anonymous usage telemetry (linked to a HeyGen account if you sign in). Tell the user and let them decide: `npx hyperframes telemetry disable`.
**Not tested here:** Windows/Linux, distributed rendering (Lambda / Cloud Run), the HyperFrames desktop app.

### Any other renderer (Manim, Motion Canvas, Revideo, Blender, After Effects, ffmpeg graphs ...)
1. Copy `core/renderers/custom.template.json` to `.vidbucks/renderers/<id>.json` and fill in `detect`, `install`, `render` (and optionally `scaffold`, `check`, `stills`).
2. `node bin/vidbucks.mjs config set renderers remotion,custom:<id>`.
3. The setup skill installs it with the user; the build step follows your `notes`/`agentSkills`; the measurement loop needs only the output file.

## Choose the voice
Built-in engines are installed by the setup skill (Kokoro, Piper, Chatterbox, OmniVoice). **Anything else** works as a command that turns a text file into an audio file:
```bash
python core/tools/make_narration.py --video my-video --engine custom \
  --tts-cmd 'espeak-ng -v en -f {text_file} -w {out}'
python core/tools/vo_words.py --text "Hello" --out core/public/my-vo --tts-cmd 'say -f {text_file} -o {out} --file-format=WAVE --data-format=LEI16@24000'
```
Placeholders: `{text_file} {text} {out} {voice} {lang} {speed}` (set `--tts-voice`, `--tts-lang`). The command runs **without a shell**; put pipes or API calls in a small wrapper script. wav, aiff, mp3 and flac are all accepted (ffmpeg converts). Whisper then supplies the word timings whatever voice produced the audio. Set `VIDBUCKS_TTS_CMD` to avoid repeating the flag.
Cloud voices (any provider you have an account with) work the same way through a wrapper script. Keys belong to the user: never ask for them in chat except to store them in `core/.env`; creating accounts or paying is the user's decision. Respect each voice's licence and never clone a real person's voice without consent.
**Tested here:** the macOS built-in voice (`say`) through both tools, and Kokoro.

## Choose the agent
The skills are plain `SKILL.md` workflows plus local scripts. Claude Code gets the hook, slash commands and plugin manifest. Other agents that read `SKILL.md` (for example Codex, Cursor, Gemini CLI, Copilot via the open `skills` CLI) can follow the same workflows by reading `CLAUDE.md` and `skills/vidbucks-reference-to-video/SKILL.md`; the Claude-specific parts (browser-pane visual pass, push notification) degrade to "ask the user to open the link" or are skipped. Not tested with agents other than Claude Code.
