# -*- coding: utf-8 -*-
"""Text-quality gate for a narration script (English). Heuristic, fast, no network.

  python tools/script_lint.py videos/<name>/script.txt [--minutes 8] [--wpm 150] [--json out.json]

Checks (each adds warnings; the score starts at 100):
  length      estimated duration vs target
  rhythm      sentence length (<=16 words ideal, mean <=13), paragraph size (scene) 8-40 words
  hook        first paragraph <= 25 words; an open loop (question / "but" / promise) in the first 3 paragraphs
  loops       open loops spread over the video (curiosity sentences between sections)
  filler      generic AI / YouTube filler phrases
  claims      numbers, percentages, "studies show"-type claims -> marked VERIFY (never invent statistics)
  repetition  the same sentence opener used 3+ times in a row, repeated 4-word phrases
  cta         a call to action exists near the end, not inside the first 20%
It never rewrites the script; it tells the author (you) what to fix.
"""
import argparse, json, re, sys
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument("script"); ap.add_argument("--minutes", type=float, default=0); ap.add_argument("--wpm", type=float, default=195, help="words per minute of the voice (OmniVoice ~195-200, Kokoro ~165, human ~150)"); ap.add_argument("--json")
a = ap.parse_args()
raw = open(a.script, encoding="utf-8").read()
paras = [" ".join(p.split()) for p in raw.split("\n\n") if p.strip() and not re.fullmatch(r"\[pause\s+[0-9.]+\]", p.strip())]
sents = [(i, s.strip()) for i, p in enumerate(paras) for s in re.split(r"(?<=[.!?])\s+", p) if s.strip()]
wc = lambda t: len(re.findall(r"[A-Za-z0-9']+", t))
total = sum(wc(p) for p in paras)
warn, ok = [], []
def W(sev, tag, msg): warn.append({"sev": sev, "tag": tag, "msg": msg})

# length
est = total / a.wpm * 60 + 0.45 * len(paras)
if a.minutes:
    tgt = a.minutes * 60
    if abs(est - tgt) > 30: W("high", "length", f"estimated {est:.0f}s vs target {tgt:.0f}s (+-30s allowed): {'add' if est < tgt else 'cut'} ~{abs(est - tgt) / 60 * a.wpm:.0f} words")
    else: ok.append(f"length {est:.0f}s within target {tgt:.0f}s+-30")

# rhythm
lens = [wc(s) for _, s in sents]
mean = sum(lens) / max(1, len(lens))
long = [(i, s) for i, s in sents if wc(s) > 22]
if mean > 14: W("med", "rhythm", f"mean sentence length {mean:.1f} words (aim <= 13)")
for i, s in long[:6]: W("med", "rhythm", f"scene {i}: {wc(s)}-word sentence, split it: \"{s[:70]}...\"")
for i, p in enumerate(paras):
    n = wc(p)
    if n > 40: W("med", "rhythm", f"scene {i}: {n} words (>40) - one scene should be ~8-35 words / 3-14 s")
    if n < 5: W("low", "rhythm", f"scene {i}: only {n} words")

# hook
if wc(paras[0]) > 25: W("high", "hook", f"first paragraph has {wc(paras[0])} words (aim <= 25, 5-10 s)")
head = " ".join(paras[:3]).lower()
if not re.search(r"\?|\bbut\b|\bnever\b|\bsecret\b|\bwhy\b|\bhow\b|i will show|in the next|not because|the reason|the truth|mistake|wrong", head): W("high", "hook", "no open loop in the first 3 paragraphs (question / contradiction / promise)")
else: ok.append("hook has an open loop")

# loops over time
loop_pat = re.compile(r"\?|\bbut\b.*\bnext\b|\bsave it for\b|\bwait\b|\bstay\b|\blater\b|\bnext\b|\bstrange\b|\bsurpris", re.I)
marks = [i for i, p in enumerate(paras) if loop_pat.search(p)]
if len(paras) > 20:
    thirds = [sum(1 for i in marks if lo <= i < hi) for lo, hi in ((0, len(paras) // 3), (len(paras) // 3, 2 * len(paras) // 3), (2 * len(paras) // 3, len(paras)))]
    if min(thirds) == 0: W("med", "loops", f"curiosity/loop sentences per third: {thirds} - add short teasers between sections")
    else: ok.append(f"curiosity sentences per third {thirds}")

# filler
FILL = ["in today's video", "let's dive in", "dive into", "without further ado", "it's important to note", "it is important to note", "delve", "in conclusion", "game-changer", "game changer", "unlock the power", "in this video we will", "welcome back", "don't forget to like", "smash that", "buckle up", "at the end of the day", "in the world of", "navigate the", "tapestry", "ever-evolving", "revolutionize"]
low = raw.lower()
for f in FILL:
    if f in low: W("med", "filler", f"filler phrase: \"{f}\"")

# claims
claim_pat = re.compile(r"\b\d+(\.\d+)?\s*(%|percent|times|x)\b|\b(studies|research|scientists|experts|harvard|stanford|mit)\b\s+(show|says?|prove|found|have found)", re.I)
for i, s in sents:
    if claim_pat.search(s): W("verify", "claims", f"scene {i}: check this claim has a real source or hedge it: \"{s[:90]}\"")
nums = [(i, s) for i, s in sents if re.search(r"\b\d{2,}\b", s)]
for i, s in nums[:8]:
    if not claim_pat.search(s): W("low", "claims", f"scene {i}: number in text - confirm it is true (or clearly fictional): \"{s[:80]}\"")

# repetition
op = [s.split()[0].lower() for _, s in sents if s.split()]
run = 1
for k in range(1, len(op)):
    run = run + 1 if op[k] == op[k - 1] else 1
    if run == 4: W("low", "repetition", f"four sentences in a row start with \"{op[k]}\"")
grams = Counter(tuple(w.lower() for w in re.findall(r"[A-Za-z']+", s)[j:j + 4]) for _, s in sents for j in range(0, max(0, wc(s) - 3)))
for g, c in grams.most_common(5):
    if c >= 4 and len(set(g)) > 2: W("low", "repetition", f"phrase repeated {c}x: \"{' '.join(g)}\"")

# cta
cta_pat = re.compile(r"\b(comment|subscribe|like the video|tell me|let me know|link below|follow)\b", re.I)
pos = [i for i, p in enumerate(paras) if cta_pat.search(p)]
if not pos: W("med", "cta", "no call to action found (ask a question / comment prompt near the end)")
elif pos[0] < len(paras) * 0.2: W("med", "cta", "call to action in the first 20% - give value first")
else: ok.append("call to action after the value")

weights = {"high": 12, "med": 6, "low": 2, "verify": 3}
score = max(0, 100 - sum(weights[w["sev"]] for w in warn))
rep = {"words": total, "paragraphs": len(paras), "sentences": len(sents), "mean_sentence_words": round(mean, 1), "est_seconds": round(est), "score": score, "ok": ok, "warnings": warn}
print(f"words {total}  scenes {len(paras)}  mean sentence {mean:.1f}  est {est:.0f}s ({est / 60:.1f} min)  SCORE {score}/100")
for o in ok: print("  ok   ", o)
for w in warn: print(f"  {w['sev'].upper():6s}[{w['tag']}] {w['msg']}")
if a.json: json.dump(rep, open(a.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
sys.exit(0 if score >= 70 else 2)
