#!/usr/bin/env python
"""analyze_reference.py - measure a reference video and propose a scene-by-scene plan.

  python tools/analyze_reference.py --link <youtube url> [--lang en] [--no-channel]
  python tools/analyze_reference.py --file <video.mp4>   [--lang en] [--no-transcript]
  python tools/analyze_reference.py --compare <reference/fingerprint.json> <candidate/fingerprint.json>

LINK mode uses public metadata, captions and the thumbnail only (NO media download, YouTube ToS).
FILE mode measures the video itself (cuts, palette, motion, beat sync, loudness, transcript) - the user supplies the file.
Both write knowledge/references/<slug>/ : report.md, fingerprint.json, scene_plan.json, scene_plan.md (+thumb / sheet).
Every number is tagged measured or inferred. Dependencies: numpy, Pillow, ffmpeg, yt-dlp (link), faster-whisper (optional).
"""
import argparse, json, math, os, re, statistics, subprocess, sys, tempfile, urllib.request
from collections import Counter
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REFS = os.path.join(ROOT, "knowledge", "references")

# ------------------------------------------------------------------ small helpers
def run(cmd, timeout=300, check=True):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])}... failed: {r.stderr[-400:]}")
    return r

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:48] or "ref"

def hexc(c):
    return "#%02X%02X%02X" % tuple(int(v) for v in c)

def mmss(t):
    t = max(0, t)
    return f"{int(t // 60)}:{int(t % 60):02d}"

def kmeans(px, k=6, it=18, seed=1):
    rng = np.random.default_rng(seed)
    px = px.astype(np.float32)
    if len(px) > 60000:
        px = px[rng.choice(len(px), 60000, replace=False)]
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        d = ((px[:, None, :] - c[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = lab == j
            if m.any():
                c[j] = px[m].mean(0)
    w = np.bincount(lab, minlength=k) / len(lab)
    o = np.argsort(-w)
    return [(hexc(c[j]), round(float(w[j]), 3)) for j in o if w[j] > 0.01]

STOP = {"en": set("the a an and or but of to in on at for with is are was were be been it its this that these those i you he she we they my your his her our their as by from not no so if then than just about into out up down over can could would should will do does did have has had what which who when where why how there here very more most some any all each every than too also".split()),
        "tr": set("ve bir bu şu o de da ki mi mı mu mü ile için gibi ama fakat çok daha en ne neden nasıl ben sen biz siz onlar var yok olarak olan olduğu kadar sonra önce her tüm bütün çünkü yani ise".split())}

# ------------------------------------------------------------------ transcript -> scene plan
RULES = [
    ("money", r"[$€₺£]|\b(million|billion|milyon|milyar|dollars?|euros?|\bTL\b|lira|revenue|profit|gelir|kâr)\b", "money counter / big number badge on dark backing", "badge + curve"),
    ("number", r"\b\d[\d.,]*\s?(%|percent|x|times|years?|days?|hours?|minutes?|yıl|gün|saat|dakika|kez|kişi|people)?\b", "big-number badge, count up to the value", "badge"),
    ("question", r"\?|^(what|why|how|who|when|where|is|are|do|does|can|ne|neden|nasıl|kim|nerede|hangi)\b", "question card, hold a beat before the answer", "bubble + text"),
    ("list", r"\b(first|second|third|fourth|step|number (one|two|three)|rule|tip|ilk|ikinci|üçüncü|adım|kural|ipucu)\b|\b\d\.", "numbered list reveal (one item per beat)", "lst"),
    ("compare", r"\b(vs\.?|versus|instead|rather than|compared|than|unlike|yerine|karşılaştır|oysa)\b", "split screen A | B with a divider wipe", "box x2"),
    ("time", r"\b(1[0-9]{3}|20[0-9]{2})\b|\b(years? ago|decades?|century|in the end|day \d+|yıl önce|asır|yüzyıl|gün \d+)\b", "timeline / date stamp that ticks forward", "tline"),
    ("turn", r"\b(but|however|until|actually|instead|except|yet|turns out|ama|fakat|ancak|meğer|oysa)\b", "turn: hard cut or colour inversion, change camera", "bg switch + zoom"),
    ("emphasis", r"\b(never|always|only|every|everyone|nobody|nothing|everything|impossible|hiç|asla|herkes|kimse|hiçbir|imkansız)\b", "kinetic word slam on the key word", "text (big)"),
    ("place", r"\b(city|country|map|border|ocean|sea|river|mountain|şehir|ülke|harita|sınır|deniz|nehir|dağ)\b", "map / location shot, camera flies to the place", "geomap"),
]
CTA = r"\b(subscribe|like (the|this)|comment|follow|next video|link in|abone|beğen|yorum|takip|bir sonraki)\b"
ROLE_NOTES = {
    "hook": ("something moves in the first 0.3 s; open a question or show the payoff; no logo/intro", "hard cut or whip in; riser then impact", "high"),
    "setup": ("establish the world/stakes with one clear picture per sentence", "match cut between pictures", "medium"),
    "build": ("raise the stakes: new element every 2-4 s, camera never static", "push-in; stagger entrances", "medium-high"),
    "turn": ("the surprise: change colour/camera/scale so the viewer feels the pivot", "colour inversion or smash cut", "high"),
    "payoff": ("show the answer as one concrete, readable thing (a number, a before/after)", "slow push, hold 1 s", "high"),
    "cta": ("short, honest ask; end card with the one thing to remember", "fade to end card", "low"),
}

TAG = re.compile(r"^(\[[^\]]*\]|\([^)]*\)|>>+|-+|♪+|[♪♫]+)$")

def tokenize_words(words):
    """words: list of (t, text). Drops caption tags like [music] / >> . returns list of dict(t, w, end)."""
    words = [(t, w) for t, w in words if not TAG.match(w.strip())]
    out = []
    for i, (t, w) in enumerate(words):
        nt = words[i + 1][0] if i + 1 < len(words) else t + 0.45
        out.append({"t": t, "w": w, "end": min(nt, t + 1.2) if i + 1 < len(words) else t + 0.45})
    return out

def chunk_words(ws, hard=(), gap=0.45, max_w=22, max_t=9.0, min_t=2.2):
    chunks, cur = [], []
    hard = sorted(hard)
    def flush():
        nonlocal cur
        if cur:
            chunks.append(cur)
        cur = []
    for w in ws:
        if cur:
            prev = cur[-1]
            crossed = any(prev["t"] < h <= w["t"] for h in hard)
            sent_end = re.search(r"[.?!…]$", prev["w"]) and (prev["end"] - cur[0]["t"]) >= 2.0
            if crossed or sent_end or w["t"] - prev["end"] >= gap or len(cur) >= max_w or w["t"] - cur[0]["t"] > max_t:
                flush()
        cur.append(w)
    flush()
    merged = []
    for c in chunks:
        if merged:
            p = merged[-1]
            dur_p = p[-1]["end"] - p[0]["t"]
            crossed = any(p[-1]["t"] < h <= c[0]["t"] for h in hard)
            if not crossed and dur_p < min_t and (c[-1]["end"] - p[0]["t"]) <= 7.5:
                p.extend(c)
                continue
        merged.append(list(c))
    return merged

def key_words(text, lang, n=4):
    toks = re.findall(r"[\w'’%$€₺.,]+", text)
    stop = STOP.get(lang, STOP["en"])
    scored = []
    for i, t in enumerate(toks):
        low = t.lower().strip(".,")
        if low in stop or len(low) < 3 and not re.search(r"\d", low):
            continue
        s = 1.0
        if re.search(r"\d", low): s += 2.0
        if t[:1].isupper() and i > 0: s += 1.2
        s += min(len(low), 9) / 12
        scored.append((s, low))
    seen, out = set(), []
    for s, w in sorted(scored, reverse=True):
        if w not in seen:
            seen.add(w); out.append(w)
        if len(out) >= n: break
    return out

def make_items(chunks, total, chapters, gap_min=3.0, gap_max=6.0):
    """Timeline of scene items: speech chunks + visual-only intervals (music / silence) so the whole runtime is covered."""
    chapters = chapters or []
    cur_ch = lambda t: next((c.get("title") for c in reversed(chapters) if c["start_time"] <= t + 0.01), None)
    items = [{"t0": c[0]["t"], "t1": c[-1]["end"], "text": " ".join(w["w"] for w in c).strip(), "words": len(c), "speech": True, "chapter": cur_ch(c[0]["t"])} for c in chunks]
    bounds = sorted({c["start_time"] for c in chapters})
    def add_gap(a, b):
        cuts = [a] + [x for x in bounds if a + 1.0 < x < b - 1.0] + [b]
        for k in range(len(cuts) - 1):
            x0, x1 = cuts[k], cuts[k + 1]
            n = max(1, math.ceil((x1 - x0) / gap_max))
            for q in range(n):
                t0 = x0 + (x1 - x0) * q / n; t1 = x0 + (x1 - x0) * (q + 1) / n
                if t1 - t0 >= 1.0:
                    ch = cur_ch(t0)
                    base = f"({ch})" if ch else "(no speech - music / visuals carry this beat)"
                    items.append({"t0": t0, "t1": t1, "text": base if n == 1 else base[:-1] + f" · beat {q + 1}/{n})", "words": 0, "speech": False, "chapter": ch,
                                  "seq": ("first" if q == 0 else "last" if q == n - 1 else "mid") if n > 1 else "single"})
    prev = 0.0
    for it in sorted(list(items), key=lambda x: x["t0"]):
        if it["t0"] - prev >= gap_min: add_gap(prev, it["t0"])
        prev = max(prev, it["t1"])
    if total - prev >= gap_min: add_gap(prev, total)
    return sorted(items, key=lambda x: x["t0"])

def plan_scenes(items, total, lang, chapters=None, shots=None):
    plan = []
    sp = [it for it in items if it["speech"]]
    wpms = [it["words"] / max(0.5, it["t1"] - it["t0"]) * 60 for it in sp]
    med = statistics.median(wpms) if wpms else 150
    n = len(items)
    cta_idx = None
    for i in range(n - 1, max(-1, n - 4), -1):
        if items[i]["speech"] and re.search(CTA, items[i]["text"].lower()):
            cta_idx = i; break
    for i, it in enumerate(items):
        t0, t1, text = it["t0"], it["t1"], it["text"]
        frac = t0 / total if total else 0
        chap = (it.get("chapter") or "")
        probe_text = (re.sub(r" · beat \d+/\d+", "", text) + " " + chap).lower()
        if cta_idx is not None and i >= cta_idx: role = "cta"
        elif t0 < min(30, total * 0.12): role = "hook"
        elif frac > 0.86: role = "payoff"
        elif frac < 0.28: role = "setup"
        else: role = "build"
        devs = [{"device": nm, "suggestion": sg, "engine_hint": en} for nm, pat, sg, en in RULES
                if re.search(pat, probe_text, re.I) and (it["speech"] or nm in ("time", "number", "place", "compare", "money"))]
        if it["speech"] and re.search(r"\b(but|however|until|ama|fakat|ancak|meğer|oysa)\b", text.lower()) and role in ("build", "setup") and i > 0 and frac > 0.3:
            role = "turn"
        order = ["money", "question", "list", "compare", "time", "turn", "number", "emphasis", "place"]
        devs.sort(key=lambda d: order.index(d["device"]) if d["device"] in order else 99)
        if not devs:
            if it["speech"]:
                devs = [{"device": "illustrate", "suggestion": "show the described action as a picture that DOES what the line says (no text-only scene)", "engine_hint": "stick + 1-2 props"}]
            else:
                seq = {"first": "establish the chapter's picture", "mid": "vary it: new angle/place/time of day, same thread, raise the stakes a notch", "last": "land it: the picture that closes the chapter and hands over to the next", "single": "one clear picture with a small change over time"}[it.get("seq", "single")]
                devs = [{"device": "visual beat", "suggestion": f"no words{' - chapter \"' + chap + '\"' if chap else ''}: {seq} (a prop changes state, camera moves)", "engine_hint": "set piece + camera move"}]
        wpm = it["words"] / max(0.5, t1 - t0) * 60 if it["speech"] else 0
        note, trans, energy = ROLE_NOTES[role]
        kw = key_words(text, lang) if it["speech"] else []
        title_txt = chap.upper() if (chap and not kw) else " ".join(w.upper() for w in kw[:3])
        plan.append({
            "idx": i + 1, "start": round(t0, 2), "end": round(t1, 2), "dur": round(t1 - t0, 2), "role": role, "speech": it["speech"],
            "chapter": it.get("chapter"), "text": text, "words": it["words"], "wpm": round(wpm),
            "pace": "music" if not it["speech"] else ("fast" if wpm > med * 1.2 else "slow" if wpm < med * 0.8 else "normal"),
            "devices": devs[:3], "on_screen_text": title_txt, "key_words": kw, "direction": note, "transition": trans, "energy": energy,
            "sfx": {"hook": "impact on the first word, riser into the cut", "setup": "soft pop on each new object", "build": "tick/click per element, whoosh on camera moves",
                    "turn": "downer or silence for 0.3 s then impact", "payoff": "swell then one clean hit", "cta": "light chime"}[role],
            "shots_in_ref": [x for x in (shots or []) if t0 - 0.05 <= x["start"] < t1],
        })
    return plan

def plan_markdown(plan, header):
    L = [f"# Scene-by-scene proposal - {header}", "",
         "Heuristic suggestions built from the measured transcript timing. Roles, devices and effects are INFERRED from wording and position; "
         "they are starting points, not facts about the reference. `engine_hint` maps to tools/scenekit.py helpers.", ""]
    L.append("| # | time | role | pace | spoken | on-screen text | visual device (+ engine hint) |")
    L.append("|---|---|---|---|---|---|---|")
    for s in plan:
        dv = "; ".join(f"**{d['device']}**: {d['suggestion']} (`{d['engine_hint']}`)" for d in s["devices"][:2])
        txt = s["text"][:110] + ("..." if len(s["text"]) > 110 else "")
        L.append(f"| {s['idx']} | {mmss(s['start'])}-{mmss(s['end'])} ({s['dur']:.1f}s) | {s['role']} | {s['pace']}{' ' + str(s['wpm']) + 'wpm' if s.get('speech') else ''} | {txt} | {s['on_screen_text']} | {dv} |")
    L.append("")
    L.append("## Per-scene direction")
    for s in plan:
        L.append(f"- **#{s['idx']} {mmss(s['start'])} [{s['role']}]** {s['direction']}. Transition: {s['transition']}. Sound: {s['sfx']}. Energy: {s['energy']}.")
    return "\n".join(L)

# ------------------------------------------------------------------ LINK mode
def parse_json3(path):
    d = json.load(open(path, encoding="utf-8"))
    words, last = [], -1
    for ev in d.get("events", []):
        if "segs" not in ev: continue
        t0 = ev.get("tStartMs", 0); dur = ev.get("dDurationMs", 0)
        segs = [s for s in ev["segs"] if s.get("utf8", "").strip()]
        has_off = any("tOffsetMs" in s for s in segs)
        if has_off:
            for s in segs:
                tt = (t0 + s.get("tOffsetMs", 0)) / 1000
                for w in s["utf8"].split():
                    words.append((tt, w))
        else:
            text = " ".join(s["utf8"].replace("\n", " ") for s in segs).split()
            for k, w in enumerate(text):
                words.append((t0 / 1000 + dur / 1000 * k / max(1, len(text)), w))
    words.sort(key=lambda x: x[0])
    out = []
    for t, w in words:
        if out and abs(out[-1][0] - t) < 0.001 and out[-1][1] == w: continue
        out.append((t, w))
    return out

def get_transcript(url, vid, lang, tmp):
    langs = f"{lang}.*,{lang}" if lang else "en.*,en,tr.*,tr"
    r = run(["yt-dlp", "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", langs, "--sub-format", "json3",
             "--no-warnings", "-o", os.path.join(tmp, "%(id)s.%(ext)s"), url], timeout=180, check=False)
    files = [f for f in os.listdir(tmp) if f.endswith(".json3")]
    if not files:
        return [], None, (r.stderr or "")[-200:]
    manual = [f for f in files if not re.search(r"-orig|\.auto", f)]
    f = sorted(files)[0]
    lg = f.split(".")[-2] if f.count(".") >= 2 else lang
    return parse_json3(os.path.join(tmp, f)), lg, None

def thumb_stats(path):
    im = Image.open(path).convert("RGB")
    im.thumbnail((320, 180))
    a = np.asarray(im)
    px = a.reshape(-1, 3)
    pal = kmeans(px, 5)
    g = a.mean(2)
    gx = np.abs(np.diff(g, axis=1)).mean(); gy = np.abs(np.diff(g, axis=0)).mean()
    return {"palette": pal, "brightness": round(float(g.mean() / 255), 3), "contrast_std": round(float(g.std() / 255), 3),
            "edge_density": round(float((gx + gy) / 2 / 255), 3), "dark_ratio": round(float((g < 60).mean()), 3), "light_ratio": round(float((g > 200).mean()), 3)}

def title_features(t):
    return {"has_number": bool(re.search(r"\d", t)), "has_pipe_or_dash": bool(re.search(r"[|–—-]\s", t)), "is_question": t.strip().endswith("?"),
            "all_caps_words": len(re.findall(r"\b[A-Z]{3,}\b", t)), "length_chars": len(t), "has_brackets": bool(re.search(r"[\[(]", t)),
            "skeleton": re.sub(r"\b\d[\d.,]*\b", "{N}", re.sub(r"\b[A-Z]{3,}\b", "{CAPS}", t))}

def channel_context(meta, this_views, depth=12):
    cu = meta.get("channel_url") or meta.get("uploader_url")
    if not cu: return None
    fmt = "%(title)s\t%(view_count)s\t%(duration)s\t%(upload_date)s\t%(id)s"
    r = run(["yt-dlp", "--skip-download", "--playlist-end", str(depth), "--print", fmt, "--no-warnings", cu.rstrip("/") + "/videos"], timeout=420, check=False)
    vids = []
    for ln in r.stdout.splitlines():
        p = ln.split("\t")
        if len(p) == 5 and p[0]:
            f = lambda x: float(x) if re.match(r"^[\d.]+$", x or "") else None
            vids.append({"title": p[0], "view_count": f(p[1]), "duration": f(p[2]), "upload_date": p[3], "id": p[4]})
    if not vids: return {"note": "channel list not available (yt-dlp returned nothing)"}
    views = [v["view_count"] for v in vids if v["view_count"]]
    durs = [v["duration"] for v in vids if v["duration"]]
    med = statistics.median(views) if views else None
    top = sorted([v for v in vids if v["view_count"]], key=lambda v: -v["view_count"])[:8]
    dates = sorted(v["upload_date"] for v in vids if re.match(r"^\d{8}$", v["upload_date"] or ""))
    cadence = None
    if len(dates) >= 3:
        import datetime as _dt
        ds = [_dt.datetime.strptime(x, "%Y%m%d") for x in dates]
        cadence = round(statistics.median((ds[i + 1] - ds[i]).days for i in range(len(ds) - 1)), 1)
    return {"n_videos": len(vids), "median_views": med, "this_vs_median": round(this_views / med, 2) if med and this_views else None, "median_days_between_uploads": cadence,
            "duration_median_s": statistics.median(durs) if durs else None,
            "duration_p10_p90_s": [float(np.percentile(durs, 10)), float(np.percentile(durs, 90))] if durs else None,
            "top_titles": [{"title": v["title"], "views": int(v["view_count"]), "duration": v["duration"]} for v in top],
            "title_skeletons": Counter(title_features(v["title"])["skeleton"] for v in vids).most_common(5),
            "share_with_number": round(sum(title_features(v["title"])["has_number"] for v in vids) / len(vids), 2),
            "share_with_pipe": round(sum(title_features(v["title"])["has_pipe_or_dash"] for v in vids) / len(vids), 2),
            "share_questions": round(sum(title_features(v["title"])["is_question"] for v in vids) / len(vids), 2)}

def analyze_link(url, lang, want_channel):
    meta = json.loads(run(["yt-dlp", "--skip-download", "--dump-single-json", "--no-warnings", url], timeout=180).stdout)
    vid = meta["id"]; out = os.path.join(REFS, slug(meta.get("title", vid)) + "-" + vid)
    os.makedirs(out, exist_ok=True)
    dur = meta.get("duration") or 0
    with tempfile.TemporaryDirectory() as tmp:
        words, tl, err = get_transcript(url, vid, lang or (meta.get("language") or ""), tmp)
    tr_lang = tl or meta.get("language") or "en"
    lang_short = "tr" if str(tr_lang).startswith("tr") else "en"
    ws = tokenize_words(words)
    chapters = meta.get("chapters") or []
    chunks = chunk_words(ws, hard=[c["start_time"] for c in chapters]) if ws else []
    plan = plan_scenes(make_items(chunks, dur, chapters), dur, lang_short, chapters) if (chunks or chapters or dur) else []
    thumb = None
    if meta.get("thumbnail"):
        try:
            p = os.path.join(out, "thumb.jpg"); urllib.request.urlretrieve(meta["thumbnail"], p); thumb = thumb_stats(p)
        except Exception as e:
            thumb = {"error": str(e)}
    tf = title_features(meta.get("title", ""))
    fp = {"mode": "link", "id": vid, "title": meta.get("title"), "channel": meta.get("channel"), "duration_s": dur, "views": meta.get("view_count"),
          "likes": meta.get("like_count"), "comments": meta.get("comment_count"), "upload_date": meta.get("upload_date"),
          "like_ratio": round(meta["like_count"] / meta["view_count"], 4) if meta.get("like_count") and meta.get("view_count") else None,
          "width": meta.get("width"), "height": meta.get("height"), "fps": meta.get("fps"), "aspect": round(meta["width"] / meta["height"], 3) if meta.get("width") and meta.get("height") else None,
          "chapters": [{"start": c["start_time"], "title": c.get("title")} for c in chapters], "title_features": tf, "thumbnail": thumb,
          "tags": (meta.get("tags") or [])[:15], "transcript_lang": tr_lang, "transcript_words": len(ws)}
    if ws:
        spoken = ws[-1]["end"] - ws[0]["t"]
        wpm_min = []
        for m in range(int(dur // 60) + 1):
            n_ = sum(1 for w in ws if m * 60 <= w["t"] < (m + 1) * 60); wpm_min.append(n_)
        gaps = [ws[i + 1]["t"] - ws[i]["end"] for i in range(len(ws) - 1)]
        fp.update({"wpm_overall": round(len(ws) / max(1, spoken) * 60), "wpm_per_minute": wpm_min, "first_word_at_s": round(ws[0]["t"], 2),
                   "pauses_over_1s": sum(1 for g in gaps if g > 1.0), "speech_ratio": round(sum(w["end"] - w["t"] for w in ws) / max(1, dur), 3),
                   "scene_count_proposed": len(plan), "scene_len_median_s": round(statistics.median(s["dur"] for s in plan), 2) if plan else None,
                   "hook_text_first_30s": " ".join(w["w"] for w in ws if w["t"] < 30),
                   "hook_open_loops": len(re.findall(r"\?|\b(but|until|what if|secret|never|why|how|ama|neden|nasıl|sır)\b", " ".join(w["w"] for w in ws if w["t"] < 30).lower()))})
    ctx = channel_context(meta, meta.get("view_count")) if want_channel else None
    if ctx: fp["channel_context"] = ctx
    gaps_txt = ["Visual style (cuts, shot length, palette of the video, motion, music/beat, loudness): NOT measurable from a link without the media.",
                "-> to measure them, give an mp4 or a screen recording of the video and run: python tools/analyze_reference.py --file <video.mp4>"]
    if err: gaps_txt.insert(0, f"No captions found ({err.strip()[:120]}); scene plan is empty. Try --lang or provide a file.")
    json.dump(fp, open(os.path.join(out, "fingerprint.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    json.dump(plan, open(os.path.join(out, "scene_plan.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    open(os.path.join(out, "scene_plan.md"), "w", encoding="utf-8").write(plan_markdown(plan, meta.get("title", vid)))
    write_report_link(out, fp, plan, gaps_txt)
    return out, fp, plan

def write_report_link(out, fp, plan, gaps):
    L = [f"# Reference analysis (LINK) - {fp['title']}", "", f"Channel: {fp.get('channel')} · {mmss(fp['duration_s'])} · {fp.get('views'):,} views · upload {fp.get('upload_date')}" if fp.get("views") else "", ""]
    L += ["## Measured from public data", f"- Format: {fp.get('width')}x{fp.get('height')} @ {fp.get('fps')} fps (aspect {fp.get('aspect')})",
          f"- Engagement: likes {fp.get('likes')}, comments {fp.get('comments')}, like ratio {fp.get('like_ratio')}"]
    tf = fp["title_features"]
    L += [f"- Title skeleton: `{tf['skeleton']}` · number {tf['has_number']} · pipe/dash {tf['has_pipe_or_dash']} · question {tf['is_question']} · caps words {tf['all_caps_words']} · {tf['length_chars']} chars"]
    if fp.get("thumbnail") and "palette" in fp["thumbnail"]:
        t = fp["thumbnail"]
        L += [f"- Thumbnail palette (k-means, measured): {', '.join(f'{h} ({w:.0%})' for h, w in t['palette'])}", f"  brightness {t['brightness']}, contrast {t['contrast_std']}, edge density {t['edge_density']} (higher = busier/more text), dark {t['dark_ratio']:.0%}, light {t['light_ratio']:.0%}  -> see thumb.jpg"]
    if "wpm_overall" in fp:
        L += [f"- Speech: {fp['wpm_overall']} wpm overall, first word at {fp['first_word_at_s']} s, {fp['pauses_over_1s']} pauses > 1 s, speech covers {fp['speech_ratio']:.0%} of the runtime",
              f"- Words per minute by minute: {fp['wpm_per_minute']}", f"- Hook (first 30 s) open-loop markers: {fp['hook_open_loops']}", f"- Hook text: \"{fp['hook_text_first_30s'][:260]}\""]
    if fp.get("chapters"): L += ["- Chapters: " + " · ".join(f"{mmss(c['start'])} {c['title']}" for c in fp["chapters"])]
    c = fp.get("channel_context")
    if c and "n_videos" in c:
        L += ["", "## Channel context (public list of recent videos)", f"- {c['n_videos']} videos, median views {c['median_views']:,.0f}; this video = {c['this_vs_median']}x the median" if c.get("median_views") else "",
              f"- Upload cadence: every {c['median_days_between_uploads']} days (median)" if c.get("median_days_between_uploads") is not None else "",
              f"- Typical length: median {mmss(c['duration_median_s'] or 0)} (p10-p90 {mmss(c['duration_p10_p90_s'][0])}-{mmss(c['duration_p10_p90_s'][1])})" if c.get("duration_median_s") else "",
              f"- Titles with number {c['share_with_number']:.0%}, with | or dash {c['share_with_pipe']:.0%}, questions {c['share_questions']:.0%}",
              "- Top titles: " + " · ".join(f"{t['title']} ({t['views']:,})" for t in c["top_titles"][:5]),
              "- Skeletons: " + " · ".join(f"`{s}` x{n}" for s, n in c["title_skeletons"])]
    L += ["", "## NOT measurable from a link"] + [f"- {g}" for g in gaps]
    L += ["", f"## Scene-by-scene proposal ({len(plan)} scenes, median {fp.get('scene_len_median_s')} s) -> scene_plan.md / scene_plan.json",
          "Inferred from wording + timing. Treat as a starting structure for your own script, not as a copy of the reference's pictures.", "",
          "## Transfer rules", "- Copy structure, pacing and devices; change topic, wording, art and voice. Never copy title text, real faces, logos or footage."]
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(l for l in L if l is not None))

# ------------------------------------------------------------------ FILE mode
def probe(path):
    j = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", path]).stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {})
    a = any(s["codec_type"] == "audio" for s in j["streams"])
    n, d = (v.get("r_frame_rate", "30/1") + "/1").split("/")[:2]
    return {"duration": float(j["format"]["duration"]), "width": v.get("width"), "height": v.get("height"), "fps": round(float(n) / float(d), 2) if float(d) else 30, "has_audio": a}

def read_frames(path, fps=15, w=192, h=108):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale={w}:{h},format=rgb24", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, timeout=900).stdout
    n = len(raw) // (w * h * 3)
    return np.frombuffer(raw[: n * w * h * 3], dtype=np.uint8).reshape(n, h, w, 3), fps

def find_roi(fr):
    """bounding box (y0,y1,x0,x1) of the area that actually changes - handles filmed screens, letterbox bars, phone-in-frame."""
    g = fr.astype(np.float32).mean(3)
    sd = g.std(0)
    if sd.max() < 1: return None
    m = sd > max(3.0, 0.3 * np.percentile(sd, 99))
    rows, cols = np.where(m.any(1))[0], np.where(m.any(0))[0]
    if len(rows) < 3 or len(cols) < 3: return None
    y0, y1, x0, x1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    if (y1 - y0) * (x1 - x0) > 0.88 * fr.shape[1] * fr.shape[2] or (y1 - y0) * (x1 - x0) < 0.02 * fr.shape[1] * fr.shape[2]: return None
    return int(y0), int(y1), int(x0), int(x1)

def detect_cuts(fr, fps):
    """A cut = a local spike of the 'most-changed pixels' score: >= 2.2x its +-0.5 s neighbourhood and above an absolute floor.
    Works for hard cuts, flash/whip transitions and for videos that are in constant motion (no single global threshold)."""
    g = fr.astype(np.float32).mean(3)
    ad = np.abs(np.diff(g, axis=0)).reshape(len(g) - 1, -1)
    k = max(8, int(ad.shape[1] * 0.08))
    d = np.partition(ad, ad.shape[1] - k, axis=1)[:, -k:].mean(1)
    w = max(3, int(0.5 * fps))
    floor = max(18.0, 0.22 * float(np.percentile(d, 99.5)))
    cuts = []
    for i in range(len(d)):
        lo, hi = max(0, i - w), min(len(d), i + w + 1)
        nb = np.delete(d[lo:hi], i - lo)
        local = float(np.median(nb)) if len(nb) else 0.0
        if d[i] >= floor and d[i] >= 2.2 * max(local, 1.0) and d[i] == d[max(0, i - 2):i + 3].max():
            cuts.append(i + 1)
    minimal = max(2, int(0.25 * fps)); out = []
    for c in cuts:
        if not out or c - out[-1] >= minimal: out.append(c)
    return out, d, float(floor)

def audio_mono(path, sr=22050):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, timeout=600).stdout
    return np.frombuffer(raw, dtype=np.float32), sr

def beat_analysis(y, sr, cut_times):
    if len(y) < sr * 4: return None
    hop, n = 512, 2048
    win = np.hanning(n)
    nfr = (len(y) - n) // hop
    mag = np.empty((nfr, n // 2 + 1), dtype=np.float32)
    for i in range(nfr):
        mag[i] = np.abs(np.fft.rfft(y[i * hop: i * hop + n] * win))
    flux = np.maximum(0, np.diff(np.log1p(mag * 10), axis=0)).sum(1)
    flux = flux - np.convolve(flux, np.ones(43) / 43, mode="same")
    flux = np.maximum(flux, 0)
    fps_e = sr / hop
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lo, hi = int(fps_e * 60 / 190), int(fps_e * 60 / 70)
    seg = ac[lo:hi]
    lag = lo + int(np.argmax(seg))
    bpm = 60 * fps_e / lag
    while bpm < 85: bpm *= 2
    while bpm > 175: bpm /= 2
    period = 60 / bpm
    best = (0, 0)
    for ph in np.linspace(0, period, 60, endpoint=False):
        times = np.arange(ph, len(y) / sr, period)
        idx = np.clip((times * fps_e).astype(int), 0, len(flux) - 1)
        sc = float(flux[idx].sum())
        if sc > best[0]: best = (sc, ph)
    ph = best[1]
    strength = float(ac[lag] / (ac[0] + 1e-9))
    res = {"bpm": round(bpm, 1), "phase_s": round(ph, 3), "rhythm_strength": round(strength, 3)}
    # sound hits: local flux peaks well above the median (impacts, whooshes, clicks), independent of the musical grid
    thr_f = float(np.median(flux) + 3.0 * np.std(flux))
    hits = [i / fps_e for i in range(2, len(flux) - 2) if flux[i] > thr_f and flux[i] == flux[i - 2:i + 3].max()]
    res["sound_hits_per_min"] = round(len(hits) / (len(y) / sr) * 60, 1)
    if len(cut_times) >= 3 and hits:
        res["cuts_with_sound_hit_80ms"] = round(sum(1 for t in cut_times if min(abs(t - h) for h in hits) <= 0.08) / len(cut_times), 3)
    rms = [float(np.sqrt((y[int(k * 3 * sr):int((k + 1) * 3 * sr)] ** 2).mean() + 1e-12)) for k in range(int(len(y) / sr // 3))]
    res["energy_curve_db"] = [round(20 * math.log10(v), 1) for v in rms]
    if len(cut_times) >= 3:
        d = [min(((t - ph) % period), period - ((t - ph) % period)) for t in cut_times]
        half = [min(((t - ph) % (period / 2)), (period / 2) - ((t - ph) % (period / 2))) for t in cut_times]
        res["cuts_on_beat_60ms"] = round(sum(1 for x in d if x <= 0.06) / len(d), 3)
        res["cuts_on_half_beat_60ms"] = round(sum(1 for x in half if x <= 0.06) / len(half), 3)
        res["chance_level"] = round(min(1, 0.12 / period), 3)
    return res

def loudness(path):
    r = run(["ffmpeg", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], check=False, timeout=300)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr); p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    l = re.findall(r"LRA:\s+(-?[\d.]+) LU", r.stderr)
    return {"lufs": float(m[-1]) if m else None, "true_peak_db": float(p[-1]) if p else None, "lra": float(l[-1]) if l else None}

def whisper_words(path, lang):
    try:
        from faster_whisper import WhisperModel
    except Exception:
        return [], None
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", "16000", wav])
        for size in ("small", "base"):
            try:
                m = WhisperModel(size, device="cpu", compute_type="int8"); break
            except Exception:
                m = None
        if m is None: return [], None
        segs, info = m.transcribe(wav, language=lang or None, word_timestamps=True, vad_filter=True)
        words = [(w.start, w.word.strip()) for s in segs for w in (s.words or []) if w.word.strip()]
        return words, info.language

def analyze_file(path, lang, want_tr):
    name = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(REFS, slug(name)[:30] + "-file"); os.makedirs(out, exist_ok=True)
    pr = probe(path)
    fr_full, fps = read_frames(path, fps=15 if pr["duration"] < 240 else 8)
    roi = find_roi(fr_full)
    fr = fr_full[:, roi[0]:roi[1], roi[2]:roi[3]] if roi else fr_full
    cuts, d, thr = detect_cuts(fr, fps)
    cut_t = [c / fps for c in cuts]
    bounds = [0.0] + cut_t + [pr["duration"]]
    shots = [{"start": round(bounds[i], 2), "end": round(bounds[i + 1], 2), "dur": round(bounds[i + 1] - bounds[i], 2)} for i in range(len(bounds) - 1)]
    lens = [s["dur"] for s in shots]
    g = fr.astype(np.float32).mean(3)
    bright = g.mean((1, 2)) / 255
    pal = kmeans(fr.reshape(-1, 3)[:: max(1, fr.shape[0] * fr.shape[1] * fr.shape[2] // 80000)], 6)
    motion = np.abs(np.diff(g, axis=0)).mean((1, 2)) / 255
    for s in shots:
        a, b_ = int(s["start"] * fps), max(int(s["start"] * fps) + 1, int(s["end"] * fps))
        seg = fr[a:b_]
        if len(seg):
            s["palette"] = [h for h, _ in kmeans(seg.reshape(-1, 3), 3)]
            s["brightness"] = round(float(bright[a:b_].mean()), 2)
            s["motion"] = round(float(motion[a:b_ - 1].mean()) if b_ - 1 > a else 0, 3)
    # transition taxonomy from the change profile around each cut
    trans = []
    for c in cuts:
        i = c - 1
        pk = float(d[i]) if 0 <= i < len(d) else 0
        wdt = 1
        for q in range(1, 8):
            if i - q >= 0 and d[i - q] > 0.4 * pk: wdt += 1
            else: break
        for q in range(1, 8):
            if i + q < len(d) and d[i + q] > 0.4 * pk: wdt += 1
            else: break
        b0, b1 = float(bright[max(0, c - 4):c].mean()) if c > 0 else 0, float(bright[c:c + 4].mean()) if c < len(bright) else 0
        flash = float(bright[max(0, c - 3):c + 4].max() - min(b0, b1)) if len(bright) else 0
        kind = "hard cut" if wdt <= 2 else ("flash" if flash > 0.3 else "blur/whip/zoom")
        trans.append({"t": round(c / fps, 2), "kind": kind, "width_frames": wdt})
    tmix = dict(Counter(t["kind"] for t in trans))
    # time series in 3 s windows (curves, not just averages)
    win = 3.0; series = []
    for k in range(int(pr["duration"] // win) + 1):
        a_, b_ = int(k * win * fps), min(len(fr), int((k + 1) * win * fps))
        if b_ - a_ < 2: continue
        series.append({"t": k * win, "cuts": sum(1 for c in cuts if a_ <= c < b_), "brightness": round(float(bright[a_:b_].mean()), 3),
                       "motion": round(float(motion[a_:b_ - 1].mean()), 4), "dominant": kmeans(fr[a_:b_:2].reshape(-1, 3), 1)[0][0]})
    fp = {"mode": "file", "file": os.path.basename(path), "transcript_checked": bool(want_tr), "transitions": {"mix": tmix, "median_width_frames": statistics.median(t["width_frames"] for t in trans) if trans else None},
          "series_3s": series, **{k: pr[k] for k in ("duration", "width", "height", "fps")},
          "aspect": round(pr["width"] / pr["height"], 3), "duration_s": round(pr["duration"], 2), "cuts": len(cuts),
          "cuts_per_min": round(len(cuts) / pr["duration"] * 60, 1), "shot_len_median_s": round(statistics.median(lens), 2), "shot_len_mean_s": round(statistics.mean(lens), 2),
          "shot_len_p10_s": round(float(np.percentile(lens, 10)), 2), "shot_len_p90_s": round(float(np.percentile(lens, 90)), 2), "cut_threshold": round(thr, 1), "roi_yxyx": list(roi) if roi else None, "roi_note": "measurements use only the changing region of the frame" if roi else "full frame",
          "palette": pal, "brightness_mean": round(float(bright.mean()), 3), "dark_frame_ratio": round(float((bright < 0.25).mean()), 3), "light_frame_ratio": round(float((bright > 0.7).mean()), 3),
          "motion_mean": round(float(motion.mean()), 4), "motion_p90": round(float(np.percentile(motion, 90)), 4)}
    if pr["has_audio"]:
        y, sr = audio_mono(path)
        fp["loudness"] = loudness(path); fp["beat"] = beat_analysis(y, sr, cut_t)
    ws, lg = ([], None)
    if want_tr:
        ws, lg = whisper_words(path, lang)
    words = tokenize_words(ws)
    lang_short = "tr" if lg == "tr" else "en"
    plan = []
    if words:
        fp["transcript_lang"] = lg; fp["wpm_overall"] = round(len(words) / max(1, words[-1]["end"] - words[0]["t"]) * 60)
        chunks = chunk_words(words, hard=[s["start"] for s in shots if s["start"] > 0 and False])
        plan = plan_scenes(make_items(chunks, pr["duration"], None), pr["duration"], lang_short, None, shots)
        fp["scene_count_proposed"] = len(plan)
    else:
        for i, s in enumerate(shots):
            plan.append({"idx": i + 1, "start": s["start"], "end": s["end"], "dur": s["dur"], "role": "hook" if s["start"] < 5 else "build", "text": "(no speech detected)", "words": 0, "wpm": 0, "pace": "-",
                         "devices": [{"device": "shot", "suggestion": f"palette {', '.join(s.get('palette', []))}; brightness {s.get('brightness')}; motion {s.get('motion')}", "engine_hint": "-"}],
                         "on_screen_text": "", "key_words": [], "direction": "visual shot measured from the file; describe its device after viewing sheet.png", "transition": "-", "energy": "-", "sfx": "-"})
    # contact sheet of the shot mid-frames
    cols = 8
    pick = shots if len(shots) <= 64 else shots[:: math.ceil(len(shots) / 64)]
    thumbs = []
    for s in pick:
        t = (s["start"] + s["end"]) / 2
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", "-vf", "scale=180:-1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        if r.stdout:
            import io
            thumbs.append(Image.open(io.BytesIO(r.stdout)).convert("RGB"))
    if thumbs:
        tw, th = thumbs[0].size; rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * tw, rows * th), "white")
        for i, im in enumerate(thumbs): sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
        sheet.save(os.path.join(out, "sheet.png"))
    json.dump(dict(fp, shots=shots, transition_list=trans), open(os.path.join(out, "fingerprint.json"), "w"), indent=1, ensure_ascii=False)
    write_style_spec(out, fp, shots)
    json.dump(plan, open(os.path.join(out, "scene_plan.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    open(os.path.join(out, "scene_plan.md"), "w", encoding="utf-8").write(plan_markdown(plan, os.path.basename(path)))
    b = fp.get("beat") or {}
    L = [f"# Reference analysis (FILE) - {os.path.basename(path)}", "", "## Measured",
         f"- {fp['width']}x{fp['height']} @ {fp['fps']} fps, {mmss(fp['duration_s'])}; analysed region: {fp['roi_note']} {fp['roi_yxyx'] or ''}",
         f"- Cuts: {fp['cuts']} ({fp['cuts_per_min']}/min); shot length median {fp['shot_len_median_s']} s, mean {fp['shot_len_mean_s']} s, p10 {fp['shot_len_p10_s']} s, p90 {fp['shot_len_p90_s']} s",
         f"- Palette (k-means over all frames): {', '.join(f'{h} ({w:.0%})' for h, w in pal)}",
         f"- Brightness mean {fp['brightness_mean']}; dark frames {fp['dark_frame_ratio']:.0%}, light frames {fp['light_frame_ratio']:.0%}", f"- Motion energy mean {fp['motion_mean']}, p90 {fp['motion_p90']}"]
    if fp.get("loudness"): L.append(f"- Loudness {fp['loudness']['lufs']} LUFS, true peak {fp['loudness']['true_peak_db']} dBFS, LRA {fp['loudness']['lra']}")
    if b: L.append(f"- Music: ~{b['bpm']} BPM (rhythm strength {b['rhythm_strength']}); cuts on the beat {b.get('cuts_on_beat_60ms')} (chance level {b.get('chance_level')}), on half-beats {b.get('cuts_on_half_beat_60ms')}")
    if fp.get("wpm_overall"): L.append(f"- Speech: {fp['wpm_overall']} wpm ({fp.get('transcript_lang')})")
    L += ["", "## Production-route hints (heuristic, confirm by looking)"] + [f"- {x}" for x in approach_hints(fp)]
    L += ["", "## Not measured", "- Device names (what each effect is called), fonts and on-screen wording need a human look at sheet.png; BPM is an estimate from a spectral-flux autocorrelation.", "",
          f"## Scene proposal: {len(plan)} scenes -> scene_plan.md; contact sheet -> sheet.png"]
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(L))
    return out, fp, plan

def lum(h): 
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5)); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
def sat(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)); mx, mn = max(r, g, b), min(r, g, b); return 0 if mx == 0 else (mx - mn) / mx

def approach_hints(fp):
    """Heuristic production-route hints from measured features. A starting point for the human-eye classification in skill vidbucks-reference-to-video, never a verdict."""
    h = []; pal = fp.get("palette") or []
    domin = [(c, w) for c, w in pal if w >= 0.08]
    sats = [sat(c) for c, w in domin] or [0]
    wpm = fp.get("wpm_overall") or 0; b = fp.get("beat") or {}; dur = fp.get("duration_s") or 0
    cpm = fp.get("cuts_per_min") or 0; mot = fp.get("motion_mean") or 0; asp = fp.get("aspect") or 1
    if dur and dur < 25: h.append("short hook/loop format: replicate the structure beat-for-beat; one idea, no intro; consider a seamless loop")
    elif dur > 150: h.append("long-form: use the full pipeline (script -> VO -> scenes -> QA); scene length target = measured median shot length")
    if asp < 0.7: h.append("vertical 9:16 reference: keep key content in the middle 75 %; captions in the platform-safe band")
    elif asp > 1.5: h.append("landscape 16:9 reference")
    if max(sats) < 0.14 and len(domin) <= 6: h.append("monochrome / low-saturation look: drawable in code (typography, cut-out objects, grain, vignette); real licensed photographs lift it most")
    elif max(sats) > 0.5: h.append("saturated, colour-driven look: motion-graphics primitives, UI cards, gradients; keep one hero colour")
    if wpm > 110: h.append(f"voice-over driven ({wpm} wpm): write the script first, TTS + Whisper word times, captions timed from words (tools/vo_words.py or make_narration.py)")
    elif not fp.get("transcript_checked", True): h.append("speech was NOT checked (run without --no-transcript) - do not assume the reference is music-only")
    elif wpm < 30: h.append("music/visual driven (little or no speech): build to a beat grid; make a track at the measured BPM (tools/make_pulse_track.py) so key moments land on beats")
    if b.get("rhythm_strength", 0) >= 0.3 and b.get("bpm"): h.append(f"clear pulse ~{b['bpm']} BPM: choose BPM = 60*n/T so the big moments fall on beat n")
    tm = (fp.get("transitions") or {}).get("mix", {})
    if tm and sum(tm.values()) >= 6 and tm.get("blur/whip/zoom", 0) / sum(tm.values()) > 0.5: h.append("blur/whip/zoom-driven edit: motion blur, RGB split, fast eased pushes; slow easing = fewer detected cuts")
    if cpm and cpm < 12 and mot < 0.03: h.append("near single continuous take: morph between states instead of cutting; if the take is a FILMED real-world scene (room, screen, hands) a code-drawn mockup will always look illustrated - use real licensed footage/photos or accept a lower fidelity score")
    if cpm > 35: h.append("rapid-cut edit: many short shots; plan a scene list with ~1 s median; keep every shot readable")
    if not h: h.append("no strong signal: classify by looking at sheet.png, build the smallest prototype, measure, iterate")
    return h

def write_style_spec(out, fp, shots):
    """Measured style specification: what the builder must hit, plus what a human must still look at. Not a template."""
    pal = fp.get("palette") or []
    bg = pal[0][0] if pal else None
    accents = sorted([(h, w) for h, w in pal if sat(h) > 0.45 and 0.12 < lum(h) < 0.92 and max(int(h[i:i + 2], 16) for i in (1, 3, 5)) > 90 and w >= 0.015], key=lambda x: -x[1])
    texts = sorted([(h, w) for h, w in pal if lum(h) > 0.75], key=lambda x: -x[1])
    b = fp.get("beat") or {}
    spec = {"source": fp.get("file") or fp.get("title"), "format": {"w": fp.get("width"), "h": fp.get("height"), "fps": fp.get("fps"), "aspect": fp.get("aspect"), "duration_s": fp.get("duration_s")},
            "colour": {"background": bg, "accent_candidates": [h for h, _ in accents[:3]], "light_text_candidates": [h for h, _ in texts[:2]], "palette": pal,
                       "dark_frame_ratio": fp.get("dark_frame_ratio"), "brightness_mean": fp.get("brightness_mean"), "note": "measured; if the reference is a filmed screen, room colours leak into the palette - confirm on sheet.png"},
            "pace": {"cuts_per_min": fp.get("cuts_per_min"), "shot_len_s": {"p10": fp.get("shot_len_p10_s"), "median": fp.get("shot_len_median_s"), "p90": fp.get("shot_len_p90_s")},
                     "cut_density_curve_per_3s": [x["cuts"] for x in fp.get("series_3s", [])], "brightness_curve": [x["brightness"] for x in fp.get("series_3s", [])],
                     "motion_curve": [x["motion"] for x in fp.get("series_3s", [])]},
            "transitions": fp.get("transitions"),
            "audio": {"lufs": (fp.get("loudness") or {}).get("lufs"), "bpm": b.get("bpm"), "rhythm_strength": b.get("rhythm_strength"), "cuts_on_beat": b.get("cuts_on_beat_60ms"),
                      "sound_hits_per_min": b.get("sound_hits_per_min"), "cuts_with_sound_hit": b.get("cuts_with_sound_hit_80ms"), "energy_curve_db_per_3s": b.get("energy_curve_db")},
            "builder_targets": {"match": ["cuts_per_min within 15%", "shot_len median within 20%", "transition mix", "cut-density curve shape (corr >= 0.6)", "loudness +-1.5 LU", "sound hit on >= the reference share of cuts"],
                                "free": ["topic", "wording", "illustration/assets", "exact fonts unless the user wants them copied"]},
            "approach_hint": approach_hints(fp),
            "needs_human_eye": ["typeface character (wide/condensed/serif/hand), weight and size relative to frame", "what each transition looks like (name the devices)", "how text/objects enter and exit (easing feel, overshoot)",
                                "illustration / photo / UI language", "sound design vocabulary (impact, whoosh, click) - listen is impossible, infer from hit times"]}
    json.dump(spec, open(os.path.join(out, "style_spec.json"), "w"), indent=1, ensure_ascii=False)

# ------------------------------------------------------------------ compare (quality gate)
def compare(ref_path, cand_path):
    r = json.load(open(ref_path)); c = json.load(open(cand_path))
    rows = []
    def add(name, rv, cv, tol, kind="rel"):
        if rv is None or cv is None: return
        err = abs(cv - rv) / (abs(rv) + 1e-9) if kind == "rel" else abs(cv - rv)
        rows.append((name, rv, cv, round(err, 3), tol, err <= tol))
    add("cuts_per_min", r.get("cuts_per_min"), c.get("cuts_per_min"), 0.35)
    add("shot_len_median_s", r.get("shot_len_median_s"), c.get("shot_len_median_s"), 0.35)
    add("brightness_mean", r.get("brightness_mean"), c.get("brightness_mean"), 0.15, "abs")
    add("dark_frame_ratio", r.get("dark_frame_ratio"), c.get("dark_frame_ratio"), 0.2, "abs")
    add("motion_mean", r.get("motion_mean"), c.get("motion_mean"), 0.5)
    rl, cl = (r.get("loudness") or {}).get("lufs"), (c.get("loudness") or {}).get("lufs")
    add("loudness_lufs", rl, cl, 2.0, "abs")
    rb, cb = (r.get("beat") or {}), (c.get("beat") or {})
    if rb.get("bpm") and cb.get("bpm") and min(rb.get("rhythm_strength", 0), cb.get("rhythm_strength", 0)) >= 0.15:
        ratio = cb["bpm"] / rb["bpm"]
        octave = min(abs(ratio - m) / m for m in (0.5, 1, 2))   # BPM estimates are octave-ambiguous: 86 and 172 count as the same tempo
        rows.append(("bpm (octave-free)", rb["bpm"], cb["bpm"], round(octave, 3), 0.12, octave <= 0.12))
    else:
        print("note: BPM skipped - rhythm too weak in one of the videos to compare reliably")
    if rb.get("cuts_on_beat_60ms") is not None and rb.get("rhythm_strength", 0) >= 0.15:
        add("cuts_on_beat", rb.get("cuts_on_beat_60ms"), cb.get("cuts_on_beat_60ms"), 0.25, "abs")
    if r.get("palette") and c.get("palette"):
        def dist(p, q):
            a = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h, _ in p], float); wa = np.array([w for _, w in p])
            b_ = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h, _ in q], float)
            return float(sum(w * np.sqrt(((b_ - col) ** 2).sum(1)).min() for col, w in zip(a, wa)) / (wa.sum() * 441.7))
        pd = dist(r["palette"], c["palette"]); rows.append(("palette_distance", 0, round(pd, 3), round(pd, 3), 0.18, pd <= 0.18))
    def corr(a_, b_):
        if not a_ or not b_: return None
        n = 24; xa = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(a_)), a_); xb = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(b_)), b_)
        return None if xa.std() < 1e-9 or xb.std() < 1e-9 else float(np.corrcoef(xa, xb)[0, 1])
    for nm, key in (("cut_density_curve", "cuts"), ("brightness_curve", "brightness"), ("motion_curve", "motion")):
        cv_ = corr([x[key] for x in r.get("series_3s", [])], [x[key] for x in c.get("series_3s", [])])
        if cv_ is not None: rows.append((nm + " (corr)", 1.0, round(cv_, 3), round(1 - cv_, 3), 0.4, cv_ >= 0.6))
    rt, ct = (r.get("transitions") or {}).get("mix", {}), (c.get("transitions") or {}).get("mix", {})
    if rt and ct:
        kinds = set(rt) | set(ct); rs, cs = sum(rt.values()), sum(ct.values())
        tv = 0.5 * sum(abs(rt.get(k, 0) / rs - ct.get(k, 0) / cs) for k in kinds)
        rows.append(("transition_mix (TV dist)", 0, round(tv, 3), round(tv, 3), 0.25, tv <= 0.25))
    add("sound_hit_on_cuts", rb.get("cuts_with_sound_hit_80ms"), cb.get("cuts_with_sound_hit_80ms"), 0.3, "abs")
    ok = sum(1 for x in rows if x[5])
    print(f"{'metric':22} {'ref':>9} {'candidate':>10} {'err':>7} {'tol':>6}  verdict")
    for n, rv, cv, e, t, p in rows:
        print(f"{n:22} {rv:>9} {cv:>10} {e:>7} {t:>6}  {'OK' if p else 'FIX'}")
    print(f"\nFIDELITY {ok}/{len(rows)}  ({round(100 * ok / max(1, len(rows)))}%)  - FIX rows say what to adjust (cut rate, brightness, loudness, music tempo...)")
    return ok, len(rows)

def sidebyside(ref, cand, out_png, n=8):
    """ref row on top, candidate row below, at the same relative times - for the visual part of the loop."""
    import io
    def frame(path, t):
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", "-vf", "scale=-2:360", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        return Image.open(io.BytesIO(r.stdout)).convert("RGB") if r.stdout else None
    ra, ca = probe(ref)["duration"], probe(cand)["duration"]
    ts = [(k + 0.5) / n for k in range(n)]
    rows = [[frame(ref, t * ra) for t in ts], [frame(cand, t * ca) for t in ts]]
    h = 360; ws = [max((im.width for im in (rows[0][k], rows[1][k]) if im), default=200) for k in range(n)]
    sheet = Image.new("RGB", (sum(ws), 2 * h + 6), "white")
    for ri, row in enumerate(rows):
        x = 0
        for k, im in enumerate(row):
            if im: sheet.paste(im, (x, ri * (h + 6)))
            x += ws[k]
    os.makedirs(os.path.dirname(out_png) or ".", exist_ok=True); sheet.save(out_png); print("SIDEBYSIDE", out_png)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--link"); ap.add_argument("--file"); ap.add_argument("--lang", default="")
    ap.add_argument("--no-channel", action="store_true"); ap.add_argument("--no-transcript", action="store_true")
    ap.add_argument("--compare", nargs=2); ap.add_argument("--sidebyside", nargs=3, metavar=("REF_MP4", "CAND_MP4", "OUT_PNG"))
    a = ap.parse_args()
    if a.compare: compare(*a.compare); return
    if a.sidebyside: sidebyside(*a.sidebyside); return
    if a.link: out, fp, plan = analyze_link(a.link, a.lang, not a.no_channel)
    elif a.file: out, fp, plan = analyze_file(a.file, a.lang, not a.no_transcript)
    else: ap.error("give --link, --file or --compare"); return
    print("OUT", out); print(open(os.path.join(out, "report.md"), encoding="utf-8").read())

if __name__ == "__main__":
    main()
