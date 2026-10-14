# Voice engine matrix
| engine | licence | hardware | languages | strengths | caveats |
|---|---|---|---|---|---|
| Kokoro | Apache-2.0 | CPU ok | English + several via espeak-ng | fastest to set up, consistent presets | Python 3.10-3.12 |
| Piper | MIT code, voices vary | CPU | many | fully offline, small | voice licences differ; pronunciation quirks |
| Chatterbox | MIT | GPU or Apple Silicon recommended | multilingual | expressive, voice cloning | heavy; needs `setuptools<81`; the tool re-checks each paragraph with Whisper |
| OmniVoice | see its repository | NVIDIA >= 6 GB | many | designed consistent English voice | GPU only |
| faster-whisper | MIT | CPU ok | many | word timestamps | pin `av<16` |
| any other (custom) | yours | yours | yours | plug in a local model, an OS voice or a cloud service via `--engine custom --tts-cmd` | a command that writes an audio file; no shell; respect that voice's licence |
