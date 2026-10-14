#!/usr/bin/env python
"""vo_words.py - quick voice-over + word timings (Whisper) for short kinetic-type videos. Default voice: Kokoro; ANY other voice via --tts-cmd.
python tools/vo_words.py --text "..." --out public/<dir> [--voice am_michael] [--speed 1.0] [--lang en]
python tools/vo_words.py --text "..." --out public/<dir> --tts-cmd "espeak-ng -f {text_file} -w {out}"   # placeholders: {text_file} {text} {out} {voice} {lang} {speed}
writes <out>/vo.wav and <out>/words.json ([{w,start,end}])"""
import argparse, json, os, numpy as np, soundfile as sf
ap = argparse.ArgumentParser(); ap.add_argument("--text", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--voice", default="am_michael"); ap.add_argument("--speed", type=float, default=1.0)
ap.add_argument("--lang", default="en", help="Whisper language for the word timing (en, tr, es, ...)")
ap.add_argument("--tts-cmd", default=None, help="use your own voice: command that writes an audio file (see make_narration.py --engine custom); env VIDBUCKS_TTS_CMD")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
cmd = a.tts_cmd or os.environ.get("VIDBUCKS_TTS_CMD")
if cmd:
    import shlex, subprocess, tempfile
    with tempfile.TemporaryDirectory() as tmp:
        tf, out = os.path.join(tmp, "text.txt"), os.path.join(tmp, "out.audio"); open(tf, "w", encoding="utf-8").write(a.text)
        subs = {"text_file": tf, "text": a.text, "out": out, "voice": a.voice, "lang": a.lang, "speed": str(a.speed)}
        r = subprocess.run([x.format(**subs) for x in shlex.split(cmd)], capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(out): raise SystemExit(f"custom TTS failed ({r.returncode}): {(r.stderr or r.stdout)[-300:]}")
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", out, "-ac", "1", "-ar", "24000", "-f", "f32le", "-"], capture_output=True).stdout
        au = np.frombuffer(pcm, dtype=np.float32).copy()
else:
    from kokoro import KPipeline
    pipe = KPipeline(lang_code="a")
    chunks = [np.asarray(au) for _, _, au in pipe(a.text, voice=a.voice, speed=a.speed)]
    au = np.concatenate(chunks)
wav = os.path.join(a.out, "vo.wav"); sf.write(wav, au, 24000)
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(wav, language=a.lang, word_timestamps=True)
words = [{"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open(os.path.join(a.out, "words.json"), "w"), indent=1)
print("duration", round(len(au) / 24000, 2), "words", len(words)); print(" ".join(f"{x['w']}@{x['start']}" for x in words))
