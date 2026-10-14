# -*- coding: utf-8 -*-
"""Narration + word timings for one video.

  python tools/make_narration.py --video stickman-8min --engine omnivoice --voice "male, middle-aged, moderate pitch, american accent"
  python tools/make_narration.py --video my-video --engine kokoro --kokoro-voice am_michael     (no GPU needed)

Reads   videos/<video>/script.txt        paragraphs separated by a blank line (paragraph = scene).
                                         A paragraph that is exactly "[pause 3]" adds 3 s of silence and is NOT a scene.
                                         A paragraph starting with "~" is the antagonist's WHISPER (second voice + whisper effect):
                                         "~" normal, "~~" quieter, "~~~" very quiet (the voice fading away). It is a scene like any other.
Writes  public/videos/<video>/narration.wav
        videos/<video>/timing.json       {duration, paras[{start,end}], sentences[], words[{w,s,e}]}
        videos/<video>/voice.pt          (omnivoice only: frozen voice so re-runs sound identical)
A lock file serialises GPU use (several runs on one PC never collide).
"""
import argparse, json, os, re, sys, time
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--video", required=True)
ap.add_argument("--engine", default="omnivoice", choices=["omnivoice", "kokoro", "piper", "chatterbox", "custom"])
ap.add_argument("--tts-cmd", default=None, help='engine custom: your own voice. A command (no shell) that turns a text file into an audio file, with placeholders {text_file} {text} {out} {voice} {lang} {speed}; e.g. "espeak-ng -v en -f {text_file} -w {out}". Env: VIDBUCKS_TTS_CMD')
ap.add_argument("--tts-voice", default="", help="engine custom: value for {voice}")
ap.add_argument("--tts-lang", default="", help="engine custom: value for {lang}")
ap.add_argument("--voice", default="male, middle-aged, moderate pitch, american accent", help="OmniVoice design instruction")
ap.add_argument("--kokoro-voice", default="am_michael")
ap.add_argument("--kokoro-lang", default="a", help="a=US English b=UK e=Spanish ...")
ap.add_argument("--speed", type=float, default=1.0, help="kokoro speaking speed")
ap.add_argument("--gap", type=float, default=0.45, help="seconds of silence between paragraphs")
ap.add_argument("--steps", type=int, default=32)
ap.add_argument("--whisper", default="base.en")
ap.add_argument("--villain-voice", default="bm_george")
ap.add_argument("--villain-speed", type=float, default=0.82)
ap.add_argument("--piper-model", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "piper", "tr_TR-dfki-medium.onnx"))
ap.add_argument("--piper-length", type=float, default=1.0, help="piper length_scale (>1 = slower)")
ap.add_argument("--piper-noise", type=float, default=0.667, help="piper noise_scale (lower = steadier, clearer)")
ap.add_argument("--piper-noise-w", type=float, default=0.8)
ap.add_argument("--cb-ref", default=None, help="chatterbox: reference wav for voice cloning (rights must be owned)")
ap.add_argument("--cb-lang", default="tr")
ap.add_argument("--cb-tries", type=int, default=2)
ap.add_argument("--cb-accept", type=float, default=0.85, help="chatterbox: accept a take at this Whisper word-match score")
ap.add_argument("--redo", default="", help="comma list of paragraph numbers (1-based) to regenerate even if cached; 'all' = ignore the cache")
ap.add_argument("--cb-exag", type=float, default=0.5, help="chatterbox emotion exaggeration")
ap.add_argument("--cb-cfg", type=float, default=0.5)
ap.add_argument("--villain-pitch", type=float, default=-3.0, help="semitones for the whisper voice (piper: same model, pitched)")
ap.add_argument("--lang", default="en")
a = ap.parse_args()

VID = os.path.join(ROOT, "videos", a.video)
PUB = os.path.join(ROOT, "public", "videos", a.video)
os.makedirs(PUB, exist_ok=True)
script = os.path.join(VID, "script.txt")
if not os.path.exists(script):
    sys.exit(f"missing {script}")
raw = [p.strip() for p in open(script, encoding="utf-8").read().split("\n\n") if p.strip()]
items = []  # ("say", text) | ("pause", seconds)
for p in raw:
    m = re.fullmatch(r"\[pause\s+([0-9.]+)\]", p)
    if m: items.append(("pause", float(m.group(1)), 0)); continue
    vc = len(p) - len(p.lstrip("~")) if p.startswith("~") else 0
    items.append(("say", " ".join(p.lstrip("~").split()), min(vc, 3)))
paras = [t for k, t, _ in items if k == "say"]
print(f"{len(paras)} paragraphs, {sum(len(p.split()) for p in paras)} words, engine={a.engine}", flush=True)

SR = 24000
gap = int(a.gap * SR)

def run_omnivoice():
    import torch
    from omnivoice import OmniVoice
    from omnivoice.models.omnivoice import VoiceClonePrompt
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)
    vp_path = os.path.join(VID, "voice.pt")
    first = None
    if os.path.exists(vp_path):
        vp = VoiceClonePrompt.load(vp_path)
    else:
        first = np.asarray(model.generate(text=paras[0], instruct=a.voice, num_step=a.steps)[0], dtype=np.float32)
        ref = os.path.join(VID, "voice_ref.wav"); sf.write(ref, first, SR)
        vp = model.create_voice_clone_prompt(ref_audio=ref, ref_text=paras[0]); vp.save(vp_path)
    def gen(i, text, vc=0):
        if i == 0 and first is not None: return first
        return np.asarray(model.generate(text=text, voice_clone_prompt=vp, num_step=a.steps)[0], dtype=np.float32)
    try:
        return build(gen)
    finally:
        del model; torch.cuda.empty_cache()

def run_kokoro():
    from kokoro import KPipeline
    pipe = KPipeline(lang_code=a.kokoro_lang)
    vpipe = KPipeline(lang_code="b" if a.villain_voice.startswith("b") else "a") if any(v for _, _, v in items) else None
    def gen(i, text, vc=0):
        if vc:
            out = [np.asarray(x[2], dtype=np.float32) for x in vpipe(text, voice=a.villain_voice, speed=a.villain_speed)]
        else:
            out = [np.asarray(x[2], dtype=np.float32) for x in pipe(text, voice=a.kokoro_voice, speed=a.speed)]
        return np.concatenate(out)
    return build(gen)

def build(gen):
    """Takes are cached per paragraph in videos/<video>/takes/ (key = engine + voice settings + text), so a re-run
    only synthesises paragraphs whose text changed (or the ones listed in --redo)."""
    import hashlib
    cache = os.path.join(VID, "takes"); os.makedirs(cache, exist_ok=True)
    redo = set() if not a.redo else ({"all"} if a.redo == "all" else {int(x) for x in a.redo.split(",") if x.strip()})
    vkey = json.dumps([a.engine, a.voice if a.engine == "omnivoice" else "", a.kokoro_voice, a.kokoro_lang, a.speed, a.villain_voice, a.villain_speed,
                       getattr(a, "piper_model", ""), getattr(a, "piper_length", 1), getattr(a, "cb_ref", None), getattr(a, "cb_lang", ""), getattr(a, "cb_exag", 0),
                       getattr(a, "cb_cfg", 0), a.villain_pitch, a.tts_cmd or os.environ.get("VIDBUCKS_TTS_CMD", ""), a.tts_voice, a.tts_lang], sort_keys=True)
    def cached_gen(i, text, vc):
        h = hashlib.sha1((vkey + "|" + str(vc) + "|" + text).encode()).hexdigest()[:16]
        f = os.path.join(cache, f"{h}.wav")
        if os.path.exists(f) and "all" not in redo and (i + 1) not in redo:
            w, _ = sf.read(f, dtype="float32"); print(f"  (cached) {text[:50]}", flush=True); return w
        w = gen(i, text, vc); sf.write(f, w, SR); return w
    chunks, spans, t, n = [], [], 0.0, 0
    for kind, val, vc in items:
        if kind == "pause":
            chunks.append(np.zeros(int(val * SR), dtype=np.float32)); t += val; continue
        w = cached_gen(n, val, vc)
        spans.append({"start": round(t, 3), "end": round(t + len(w) / SR, 3), "text": val, **({"voice": "whisper", "level": vc} if vc else {})})
        chunks += [w, np.zeros(gap, dtype=np.float32)]
        t += len(w) / SR + gap / SR
        n += 1
        print(f"  {n}/{len(paras)} {len(w) / SR:.1f}s", flush=True)
    return np.concatenate(chunks), spans

def run_piper():
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(a.piper_model)
    vsr = voice.config.sample_rate
    def rs(x, src, dst):
        return np.interp(np.arange(0, len(x), src / dst), np.arange(len(x)), x).astype(np.float32) if len(x) else x
    def gen(i, text, vc=0):
        cfg = SynthesisConfig(length_scale=a.piper_length * (1.0 / a.villain_speed if vc else 1.0), noise_scale=a.piper_noise, noise_w_scale=a.piper_noise_w)
        x = np.concatenate([np.asarray(c.audio_float_array, dtype=np.float32) for c in voice.synthesize(text, syn_config=cfg)])
        if vc and a.villain_pitch:
            k = 2 ** (a.villain_pitch / 12.0)          # play the clip slower: lower pitch (and a bit longer)
            x = rs(x, vsr * k, vsr)
        return rs(x, vsr, SR)
    return build(gen)

def run_custom():
    """Bring your own voice: ANY text-to-speech that can be called as a command (a local model, a cloud service you have an account for,
    an OS voice...). The command turns a text file into an audio file; wav/aiff/mp3/flac are all fine (ffmpeg converts to 24 kHz mono).
    Placeholders in --tts-cmd: {text_file} {text} {out} {voice} {lang} {speed}. It is run WITHOUT a shell (arguments are split with shlex),
    so put pipes or API calls in a small wrapper script and call that script. Paragraph takes are cached like for the built-in engines."""
    import shlex, subprocess, tempfile
    cmd = a.tts_cmd or os.environ.get("VIDBUCKS_TTS_CMD")
    if not cmd: sys.exit("--engine custom needs --tts-cmd (or the VIDBUCKS_TTS_CMD environment variable)")
    def gen(i, text, vc=0):
        with tempfile.TemporaryDirectory() as tmp:
            tf, out = os.path.join(tmp, "text.txt"), os.path.join(tmp, "out.audio")
            open(tf, "w", encoding="utf-8").write(text)
            subs = {"text_file": tf, "text": text, "out": out, "voice": a.tts_voice, "lang": a.tts_lang, "speed": str(a.speed)}
            argv = [part.format(**subs) for part in shlex.split(cmd)]
            r = subprocess.run(argv, capture_output=True, text=True)
            if r.returncode != 0 or not os.path.exists(out): sys.exit(f"custom TTS failed ({r.returncode}): {(r.stderr or r.stdout)[-300:]}")
            pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", out, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
            x = np.frombuffer(pcm.stdout, dtype=np.float32).copy()
            if not len(x): sys.exit("custom TTS produced no audio")
            return x
    return build(gen)

def run_chatterbox():
    """Chatterbox can repeat words or babble after the sentence. Each paragraph is checked with Whisper:
    retry with another seed (up to --cb-tries) until the words match, keep the best take, and cut everything
    after the last expected word."""
    import torch, difflib
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from faster_whisper import WhisperModel
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    M = {}
    def model():   # loaded lazily: a fully cached run never pays the ~45 s load
        if not M:
            M["m"] = ChatterboxMultilingualTTS.from_pretrained(device=dev)
            M["wm"] = WhisperModel(a.whisper, device="cpu", compute_type="int8")
        return M["m"], M["wm"]
    msr = 24000
    def rs(x, src, dst):
        return np.interp(np.arange(0, len(x), src / dst), np.arange(len(x)), x).astype(np.float32) if len(x) else x
    ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
    TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
    ORD = {"bir": "birinci", "iki": "ikinci", "üç": "üçüncü", "dört": "dördüncü", "beş": "beşinci", "altı": "altıncı", "yedi": "yedinci", "sekiz": "sekizinci", "dokuz": "dokuzuncu", "on": "onuncu"}
    def spell(n):
        if n == 0: return ["sıfır"]
        out = []
        for val, name in ((10**9, "milyar"), (10**6, "milyon"), (1000, "bin")):
            if n >= val:
                q, n = divmod(n, val)
                if not (val == 1000 and q == 1): out += spell(q)
                out.append(name)
        if n >= 100:
            q, n = divmod(n, 100)
            if q > 1: out.append(ONES[q])
            out.append("yüz")
        if n >= 10: out.append(TENS[n // 10]); n %= 10
        if n: out.append(ONES[n])
        return out
    def norm(t):
        out = []
        t = t.lower().replace("i̇", "i")
        t = re.sub(r"(\d)[.,](\d{3})", r"\1\2", t)
        for w in re.sub(r"[^\wçğıöşüâ'. ]", " ", t).split():
            w = w.split("'")[0]
            m_ = re.fullmatch(r"(\d+)(\.?)", w)
            if m_:
                ws = spell(int(m_.group(1)))
                if m_.group(2) and ws and ws[-1] in ORD: ws[-1] = ORD[ws[-1]]
                out += ws
            else:
                w = w.strip(".")
                if w: out.append(w)
        return out
    def score(x, text):
        x16 = rs(x, msr, 16000)
        segs, _ = model()[1].transcribe(np.concatenate([x16, np.zeros(8000, np.float32)]), language=a.lang, word_timestamps=True, condition_on_previous_text=False)
        words = [w for sg in segs for w in sg.words]
        heard = " ".join(w.word for w in words)
        want = norm(text)
        r = difflib.SequenceMatcher(None, want, norm(heard)).ratio()
        # end of speech = end of the last heard word that matches the last expected word (fallback: last word)
        end = None
        last = want[-1] if want else ""
        for w in words:
            nw = norm(w.word)
            if nw and (nw[-1] == last or difflib.SequenceMatcher(None, nw[-1], last).ratio() > 0.7):
                end = w.end
        n_heard = len(norm(heard))
        extra = max(0, n_heard - len(want)) / max(1, len(want))
        return r - 0.5 * extra, end, heard
    def gen(i, text, vc=0):
        best = None
        for k in range(a.cb_tries):
            torch.manual_seed(1000 + i * 17 + k * 101)
            x = model()[0].generate(text, language_id=a.cb_lang, audio_prompt_path=a.cb_ref, exaggeration=a.cb_exag, cfg_weight=a.cb_cfg).squeeze().cpu().numpy().astype(np.float32)
            sc, end, heard = score(x, text)
            if end is not None:
                x = x[: int(min(len(x), (end + 0.28) * msr))]
            print(f"     try {k + 1}: score {sc:.2f} | {heard.strip()[:70]}", flush=True)
            if best is None or sc > best[0]:
                best = (sc, x)
            if sc >= a.cb_accept:
                break
        x = best[1]
        fade = int(0.04 * msr); x[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        if vc and a.villain_pitch:
            x = rs(x, msr * 2 ** (a.villain_pitch / 12.0), msr)
        return rs(x, msr, SR)
    return build(gen)

LOCK = os.path.join(ROOT, ".gpu.lock")
t0 = time.time()
if a.engine == "omnivoice":
    while True:
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, f"{a.video} {os.getpid()}".encode()); os.close(fd); break
        except FileExistsError:
            if time.time() - os.path.getmtime(LOCK) > 3600: os.remove(LOCK); continue
            if time.time() - t0 > 1800: sys.exit("GPU lock timeout")
            print("waiting for GPU lock...", flush=True); time.sleep(15)
try:
    full, spans = run_omnivoice() if a.engine == "omnivoice" else run_piper() if a.engine == "piper" else run_chatterbox() if a.engine == "chatterbox" else run_custom() if a.engine == "custom" else run_kokoro()
finally:
    if a.engine == "omnivoice":
        try: os.remove(LOCK)
        except FileNotFoundError: pass

def whisper_fx(w, level):
    """Turn clean speech into a breathy whisper: keep the spectral envelope, randomise the phase (unvoiced), high-pass, add room."""
    import torch
    x = torch.tensor(w); n_fft, hop = 1024, 256
    win = torch.hann_window(n_fft)
    S = torch.stft(x, n_fft, hop, window=win, return_complex=True)
    y = torch.istft(S.abs() * torch.exp(1j * torch.rand(S.shape) * 2 * np.pi), n_fft, hop, window=win, length=len(w)).numpy()
    Y = np.fft.rfft(y); f = np.fft.rfftfreq(len(y), 1 / SR)
    Y *= np.clip((f - 120) / 280, 0, 1) * np.clip((9500 - f) / 2500, 0, 1)         # band-limit 120 Hz - 9.5 kHz
    y = np.fft.irfft(Y, len(y)).astype(np.float32)
    env = np.convolve(np.abs(y), np.ones(1200) / 1200, "same")
    y = y + (np.random.default_rng(7).standard_normal(len(y)).astype(np.float32) * 0.18 * env)  # breath
    ir_n = int(SR * 1.4); rng = np.random.default_rng(3)
    ir = (rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / (SR * 0.32))).astype(np.float32); ir[0] = 1.0
    tail = np.fft.irfft(np.fft.rfft(y, len(y) + ir_n) * np.fft.rfft(ir, len(y) + ir_n), len(y) + ir_n).astype(np.float32)
    y = np.concatenate([y, np.zeros(ir_n, np.float32)]) * 0.62 + tail * 0.20
    rms = float(np.sqrt((y.astype(np.float64) ** 2).mean())) + 1e-9
    y = y / rms * 0.045                                   # same loudness as a normal narration line (about -27 dBFS RMS)
    y = np.tanh(y * 1.2) / 1.2                            # tame peaks
    return (y * {1: 1.0, 2: 0.55, 3: 0.3}.get(level, 1.0)).astype(np.float32)

wav = os.path.join(PUB, "narration.wav"); sf.write(wav, full, SR)
from faster_whisper import WhisperModel
# Word timings: transcribe each paragraph on its own (we know its exact span), so a Whisper slip in one place
# cannot drop or shift words elsewhere. If Whisper misses words, fall back to spreading the script words evenly.
wm = WhisperModel(a.whisper, device="cpu", compute_type="int8")
words = []
for sp in spans:
    a0, a1 = int(sp["start"] * SR), int(sp["end"] * SR)
    seg = full[a0:a1]
    seg16 = np.interp(np.arange(0, len(seg), SR / 16000), np.arange(len(seg)), seg).astype(np.float32)
    got = []
    try:
        ss, _ = wm.transcribe(seg16, word_timestamps=True, language=a.lang, condition_on_previous_text=False)
        got = [{"w": w.word.strip(), "s": round(sp["start"] + w.start, 3), "e": round(sp["start"] + w.end, 3)} for s_ in ss for w in s_.words]
    except Exception as ex:
        print("whisper failed on a paragraph:", ex)
    expect = sp["text"].split()
    if len(got) < 0.7 * len(expect):
        dur = sp["end"] - sp["start"]; n = len(expect)
        got = [{"w": w, "s": round(sp["start"] + dur * k / n, 3), "e": round(sp["start"] + dur * (k + 1) / n, 3)} for k, w in enumerate(expect)]
        print(f"  timing fallback (even spread) for: {sp['text'][:40]}")
    words += got
sents, cur = [], []
for w in words:
    cur.append(w)
    if re.search(r"[.!?][\"')]*$", w["w"]):
        sents.append({"text": " ".join(x["w"] for x in cur), "start": cur[0]["s"], "end": cur[-1]["e"]}); cur = []
if cur: sents.append({"text": " ".join(x["w"] for x in cur), "start": cur[0]["s"], "end": cur[-1]["e"]})
fx_full = full.copy()
for sp in spans:
    if sp.get("voice") == "whisper":
        a0, a1 = int(sp["start"] * SR), int(sp["end"] * SR)
        y = whisper_fx(full[a0:a1], sp["level"])
        fx_full[a0:a1] = 0; seg = y[: len(fx_full) - a0]; fx_full[a0:a0 + len(seg)] += seg
if fx_full is not full and any(sp.get("voice") for sp in spans):
    sf.write(os.path.join(PUB, "narration_clean.wav"), full, SR); sf.write(wav, fx_full, SR)
json.dump({"duration": round(len(full) / SR, 3), "paras": spans, "sentences": sents, "words": words}, open(os.path.join(VID, "timing.json"), "w"), indent=1)
print(f"DONE {len(full) / SR:.1f}s, {len(words)} words, {len(sents)} sentences -> {os.path.join(VID, 'timing.json')}")
