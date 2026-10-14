# Voice engines - install notes (no model weights are shipped; they download on first use)

The `vidbucks-setup` skill installs what you choose; this page is the reference. All engines here are open source; check each model/voice licence before commercial use (see `references/voice-engine-matrix.md`).

## Pick the narration engine
Quick guide: **Kokoro** for the simplest start (any PC, English); **Piper** for fully offline CPU voices in many languages; **Chatterbox** for expressive multilingual voices and cloning (GPU or Apple Silicon); **OmniVoice** for a designed consistent English voice (NVIDIA GPU). Details for OmniVoice and Kokoro below, Piper and Chatterbox after them.

| | OmniVoice | Kokoro |
|---|---|---|
| hardware | NVIDIA GPU, ≥ 6 GB VRAM (tested RTX 2060 6 GB, fp16) | any CPU (a GPU is not needed) |
| speed on 8 min script | ~4-5 min on RTX 2060 (+ ~1 min model load) | ~realtime or faster on a modern CPU |
| voices | **voice design** by attributes + frozen clone (`voice.pt`) → same voice for the whole video; clones from a reference wav | fixed preset voices (`am_michael`, `af_heart`, `bf_emma`, …) |
| languages | many (English tested) | English (US/UK), Spanish, French, … (needs espeak for non-English) |
| pace | ~195 words/min | ~165 words/min |
| use for | the best, most natural English voice with a consistent persona | PCs without GPU, other languages, quick drafts |

`python core/tools/make_narration.py --video <name> --engine omnivoice|kokoro|piper|chatterbox …` handles both; both then use Whisper (faster-whisper `base.en`, CPU) for word timestamps — for non-English scripts pass `--whisper base --lang xx` (multilingual model).

## OmniVoice
```
git clone https://github.com/k2-fsa/OmniVoice
cd OmniVoice
pip install -e . --no-deps
pip install torch --index-url https://download.pytorch.org/whl/cu124     # CUDA build matching your driver
pip install transformers accelerate soundfile numpy
```
- Keep the clone in a PERMANENT folder (a temp/scratch folder can be wiped and breaks `pip install -e`). If `import omnivoice` fails after a cleanup: re-run `pip install -e . --no-deps` in the clone.
- First run downloads `k2-fsa/OmniVoice` (a few GB) into the HuggingFace cache.
- **Voice design instruction** must be attribute-style, comma + space separated, English only, e.g. `male, young adult, moderate pitch, american accent` or `female, middle-aged, low pitch, british accent`. Free-form sentences ("friendly and clear") are rejected with a "supported items" tip. Supported attributes: gender (male/female), age (child, teenager, young adult, middle-aged, elderly), pitch (very low … very high), style (whisper), accent (american, british, australian, indian, …).
- `num_step` (default 32 in our tool) trades speed for quality (16 = faster draft).
- Only ONE process may use the GPU: the tool takes a lock file (`core/.gpu.lock`); delete it only if a crashed run left it behind.
- Never generate a whole long text in one call — the tool synthesises paragraph by paragraph (long inputs drift/skip).

## Kokoro
```
pip install kokoro soundfile numpy
# non-English: pip install espeakng-loader phonemizer-fork   (and, in code, set EspeakWrapper library/data path if needed)
```
- `--kokoro-voice am_michael` (US male), `af_heart` (US female), `bf_emma` (UK female); language code `--kokoro-lang a|b|e|f|…`.
- misaki (its English G2P) can crash on rare proper names (e.g. unusual first names). Fix by respelling ONLY the TTS text (e.g. "Gil" → "Gill"); keep the on-screen spelling correct.
- Spanish needed espeak: install the two packages above, then Kokoro `lang_code="e"` works.

## Piper
```
pip install piper-tts
# download a voice (.onnx + .onnx.json) from https://huggingface.co/rhasspy/piper-voices - READ THE VOICE'S MODEL CARD: licences differ, some voices are non-commercial
python core/tools/make_narration.py --video <name> --engine piper --piper-model path/to/voice.onnx
```
- Offline, CPU, fast. It can swallow sentence-final consonants and soft initial letters: respell or add a lead-in word so key words are not last; `--piper-noise 0.4 --piper-noise-w 0.6` is steadier. Output changes every run, so re-check anchors after each narration run.

## Chatterbox
```
pip install chatterbox-tts "setuptools<81"      # the watermarker needs pkg_resources
python core/tools/make_narration.py --video <name> --engine chatterbox --cb-lang <code>
```
- MIT licence, expressive and multilingual, optional voice cloning from a reference clip you have the right to use. Heavy first download; runs best on CUDA or Apple Silicon (MPS), roughly 20x real time on a recent MacBook.
- It sometimes babbles after the sentence or garbles a word. The tool therefore checks every paragraph with Whisper, retries with different seeds and trims after the last expected word; keep paragraphs short.

## Whisper (word timestamps)
`pip install faster-whisper "av<16"` (newer `av` breaks it with a `metadata_errors` error) — model `base.en` runs on CPU int8 in about real-time/5. Mis-hearings ("notes" → "note", "mix" → "makes") are tolerated by the anchor matcher (stems, number words) but run `python core/tools/check_anchors.py <name>` anyway.

## Remotion / Chrome
First render downloads a headless Chrome (~110 MB). No GPU needed. A 8-min 1080p video renders in ~30-60 min on a 4-core CPU with the wobble filter, ~3× faster with `"boil": false`.

## Troubleshooting
| symptom | fix |
|---|---|
| render dies silently | `npx tsc --noEmit` shows the real error |
| `EISDIR` on Windows | always pass `src/index.ts` as the entry file |
| `python3` opens the Microsoft Store (Windows) | use `python` |
| no sound in render | `public/videos/<name>/narration.wav` missing, or music id not in `src/audio-lib.json` (generate the built-in library: `python core/tools/make_synth_library.py`) |
| narration shorter/longer than planned | edit script (words) not the video; `script_lint.py --wpm 195` predicts it |
| Chrome screenshot of a background tab is grey | only the front tab renders; analyse one video/tab at a time |
