# FAQ

**Does Vidbucks download the reference video?** No. Links are analysed through public metadata, captions and thumbnails plus viewing in the browser; files you provide are measured locally. You are responsible for the rights to any file you supply.

**Can it copy a video exactly?** No, by design: it copies *structure, pacing and style* and builds original content with your words, brand and licensed assets. It never copies titles, footage, people or logos.

**What is it bad at?** Photographic references (a filmed room, a real face, real footage): code-drawn stand-ins cap around half the match; it will tell you and suggest real licensed footage or a different subject. Audio: it cannot listen, so it reports measured loudness/tempo and says it did not hear the result.

**Which voice engine should I choose?** Kokoro to start (any PC, English). Chatterbox for expressive multilingual voices if you have a GPU or Apple Silicon. Piper for offline CPU voices in many languages (check the voice licence). OmniVoice only with an NVIDIA GPU. See [voice-engines.md](voice-engines.md).

**Is it free?** The code is MIT and the tools are free/open source; the AI coding agent is the paid part. Remotion has its own licence (free for individuals and small teams; larger companies need a company license).

**Where do the sound effects come from?** `python core/tools/make_synth_library.py` generates a licence-free library on your machine; `make_pulse_track.py` generates mood tracks at an exact BPM. You may also add your own audio library.

**Can I use it without Claude Code?** The skills are plain workflows with local tools, so other agents that read `SKILL.md` files can follow them; the hook and slash commands are Claude Code specific.
