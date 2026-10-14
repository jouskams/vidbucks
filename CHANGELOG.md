# Changelog

## 2.0.0 - Vidbucks
- Pluggable stack: renderer registry (Remotion, HyperFrames with a tested round trip, custom tools), `config` command, renderer-aware doctor and smoke test, `--engine custom --tts-cmd` for any voice (also in `vo_words.py`).
- New name and open-source release by The Vidbucks Authors (MIT).
- Self-guiding onboarding: `vidbucks-setup` skill, `scripts/status.mjs`, SessionStart hook, doctor with hardware detection and an ordered install plan, voice test, smoke test, and a ready announcement that asks for the first reference video.
- Reference-to-video path: `analyze_reference.py` (file and link modes, fidelity gate, side-by-side), route hints, `vidbucks-reference-to-video` skill.
- Four config-driven templates: IconStory, ObjectStory, KineticType, ParticleBloom.
- Tools: cut-outs without ML, voice-over with word timing, mood track at an exact BPM, built-in licence-free sound library generator.
- Slash commands, agent personas, checklists, plugin manifests.
