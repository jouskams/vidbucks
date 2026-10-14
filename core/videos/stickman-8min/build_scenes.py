# -*- coding: utf-8 -*-
"""Authoring helper: builds scenes.json (one scene per script paragraph). scenes.json is the contract the engine reads."""
import json, math, os

G = 800  # ground line y


def stick(x, pose="idle", s=1.0, face="smile", at="start", **k):
    se = s * 1.2  # global figure scale-up
    d = dict(k="stick", x=x, y=int(G - 240 * se), s=se, pose=pose, face=face, at=at, anim="bob")
    d.update(k)
    if "y" in k: d["y"] = k["y"] - int(240 * (se - s))
    return d


def text(t, x=960, y=300, size=90, at="start", **k):
    d = dict(k="text", t=t, x=x, y=y, size=size, at=at); d.update(k); return d


def icon(n, x, y, size=200, at="start", **k):
    d = dict(k="icon", n=n, x=x, y=y, size=size, at=at); d.update(k); return d


def box(t, x, y, w=420, h=200, at="start", **k):
    d = dict(k="box", t=t, x=x, y=y, w=w, h=h, at=at); d.update(k); return d


def badge(t, x, y, size=240, at="start", color="orange", **k):
    d = dict(k="badge", t=str(t), x=x, y=y, size=size, at=at, color=color, fx="slam"); d.update(k); return d


def bubble(t, x, y, at="start", tail=(-60, 130), **k):
    d = dict(k="bubble", t=t, x=x, y=y, at=at, tail=list(tail)); d.update(k); return d


def line(x, y, w=1500, at="start", **k):
    d = dict(k="line", x=x, y=y, w=w, at=at, fx="fade"); d.update(k); return d


def ground(y=G + 4, at="start"):
    return line(960, y, 1700, at, color="ink", op=0.55)


def curve(at="start", kind="forget", dur=5, reviews=None, x=960, y=430, **k):
    d = dict(k="curve", kind=kind, at=at, dur=dur, x=x, y=y, w=1000, h=480, fx="fade");
    if reviews: d["reviews"] = reviews
    d.update(k); return d


scenes = []
class BG(str):
    pass


def S(*objs, cam=None, sfx=None):
    bgs = [o for o in objs if isinstance(o, BG)]
    objs = [o for o in objs if not isinstance(o, BG)]
    d = dict(bg=str(bgs[0]) if bgs else "paper", objs=list(objs))
    if cam: d["cam"] = cam
    if sfx: d["sfx"] = sfx
    scenes.append(d)


# ---------------------------------------------------------------- HOOK (0-6)
S(ground(),
  stick(520, "hold", 1.05, prop="book", poses=[dict(at="week", to="shrug")], faces=[dict(at="week", to="worry")], label="SAM", y=int(G - 240 * 1.05)),
  text("*HOURS* of studying", 1330, 230, 84, "hours", w=900),
  icon("clock", 1700, 340, 170, "hours"),
  text("a week later...", 1330, 470, 78, "week", color="red", w=900),
  icon("brain", 1230, 660, 230, "head"), icon("question", 1480, 650, 150, "head", loop="float"))
S(ground(),
  stick(480, "shrug", 1.0, "flat"),
  box("LAZY?", 1250, 290, 560, 170, "lazy", font="marker", size=80),
  icon("cross", 1640, 290, 120, "lazy+0.7"),
  box("BROKEN MEMORY?", 1250, 540, 760, 170, "broken", font="marker", size=76),
  icon("cross", 1740, 540, 120, "broken+1.0"))
S(ground(),
  *[stick(780 + k * 200, "idle", 0.55, "smile", "most", delay=0.1 * k) for k in range(5)],
  text("our study habits", 960, 190, 100, "study", font="marker"),
  text("= the fastest way to *forget*", 960, 330, 76, "fastest", color="red"),
  icon("brain", 330, 600, 230, "brains", loop="float"))
S(ground(),
  stick(560, "hold", 1.1, prop="book", label="SAM", y=int(G - 240 * 1.1)),
  icon("note", 1150, 470, 340, "chapter"),
  text("x3", 1150, 220, 150, "three", color="orange"),
  icon("highlighter", 1450, 380, 220, "highlights", loop="swing"),
  icon("heart", 1560, 690, 140, "great", loop="pulse"))
S(ground(), BG("yellow"),
  text("two weeks later...", 960, 120, 74, "weeks", color="red"),
  stick(560, "think", 1.1, "worry", sweat=True, y=int(G - 240 * 1.1)),
  bubble("I have *never* seen this before!", 1130, 330, "thinks", tail=(-170, 190), think=True, w=620),
  box("EXAM  Q7: ???", 1500, 690, 470, 250, "exam", font="marker", size=62))
S(BG("blue"),
  badge("8", 640, 420, 270, "eight", "blue"), text("minutes", 640, 640, 70, "minutes", font="marker"),
  badge("6", 1280, 420, 270, "six", "orange"), text("fixes that work", 1280, 640, 70, "fixes", font="marker"),
  text("WHY it happens", 960, 170, 90, "why", color="red"))
S(ground(),
  stick(480, "talk", 1.05, anim="talk", y=int(G - 240 * 1.05)),
  box("???", 1200, 430, 520, 330, "start", font="marker", size=170, until="two"),
  badge("2", 1200, 430, 300, "two", "orange"),
  text("almost *unfair*", 1200, 680, 74, "unfair", w=900),
  icon("sparkle", 1560, 300, 170, "works", loop="spin"))

# ---------------------------------------------------------------- EBBINGHAUS (7-18)
S(BG("grid"),
  text("1885", 640, 330, 250, "1885", color="blue"),
  stick(1330, "think", 1.0, "think", shirt="purple", glasses=True, label="EBBINGHAUS", poses=[], at="psychologist"),
  icon("brain", 1680, 420, 170, "memory", loop="float"),
  ground())
S(BG("grid"),
  stick(420, "write", 1.0, shirt="purple", glasses=True),
  text("ZUP   KEF   BOL", 1250, 250, 90, "memorized", font="marker", color="purple"),
  text("MIR   TAX   DEV", 1250, 400, 90, "lists", font="marker", color="purple"),
  text("(meaningless!)", 1250, 540, 64, "meaningless", font="hand", color="grey"),
  icon("clock", 1500, 690, 150, "later"), icon("check", 1250, 690, 130, "recall"), ground())
S(BG("grid"),
  stick(500, "tired", 1.0, "sad", shirt="purple", glasses=True, at="start"),
  icon("loop", 1050, 430, 330, "again", loop="spin"),
  text("for *years*", 1500, 330, 100, "years", color="red"),
  text("...alone", 1500, 520, 80, "nobody", font="hand"), ground())
S(BG("yellow"),
  icon("star", 330, 300, 150, "famous", loop="spin"), icon("star", 1590, 300, 150, "famous+0.2", loop="spin"),
  text("THE FORGETTING CURVE", 960, 400, 130, "forgetting", w=1500, fx="slam"),
  dict(k="under", x=960, y=560, w=1100, at="curve", color="red"))
S(curve("learning", dur=5.5),
  text("a lot", 660, 230, 64, "lot", color="green"),
  text("drops *fast*", 930, 500, 70, "quickly", color="red"),
  text("slows down", 1400, 610, 62, "slows", font="hand"))
S(curve("start", dur=0.1),
  box("", 745, 400, 420, 480, "early", color="orange", fill="transparent", round=30),
  text("first hours and days", 745, 810, 66, "hours", color="orange", w=800))
S(curve("start", dur=0.1),
  text("never review = *gone*", 1250, 330, 80, "takes", color="red", w=900),
  stick(1720, "shrug", 0.9, "sad", y=int(G - 240 * 0.9), at="simply"))
S(BG("blue"),
  icon("brain", 620, 440, 400, "brain", loop="pulse"),
  box("not a bug", 1330, 260, 600, 150, "bug", font="marker", size=66),
  icon("cross", 1690, 260, 110, "bug+0.6"),
  text("ON PURPOSE", 1330, 460, 90, "purpose", color="green", w=800),
  text("can't keep everything", 1330, 640, 66, "everything", font="hand", w=800))
S(BG("blue"),
  box("what you *USE*", 600, 330, 560, 220, "keeps", color="green", font="marker", size=60),
  icon("check", 600, 520, 120, "use"),
  box("what you don't", 1320, 330, 560, 220, "lets", color="grey", font="marker", size=60, op=0.7),
  icon("cross", 1320, 520, 120, "not"),
  text("How do we prove it's *worth keeping*?", 960, 740, 70, "question", w=1500))
S(curve("good", kind="reviews", reviews=[0.22, 0.45, 0.7], dur=6),
  icon("bulb", 330, 250, 170, "news", loop="float"),
  text("FLATTER", 1450, 230, 110, "flatter", color="green", rot=-6, fx="slam"))
S(ground(780), BG("green"),
  icon("tree", 120, 520, 330, "forest"), icon("tree", 1750, 480, 330, "forest+0.2"),
  stick(400, "walk", 0.9, y=int(G - 240 * 0.9) - 20, at="walk", anim=None, move=dict(at="walk", to=[1000, int(G - 240 * 0.9) - 20], dur=3.2, linear=True)),
  icon("grass", 1000, 690, 150, "grass"),
  text("once", 700, 230, 80, "once", color="red"), text("every week", 1300, 230, 80, "week", color="green"),
  icon("road", 1450, 560, 330, "road"))
S(BG("dark"),
  text("THE SECRET", 1000, 330, 170, "secret", color="yellow", fx="slam"),
  icon("bulb", 190, 330, 150, "secret+0.3", loop="float"),
  text("the biggest *trap* of all", 960, 600, 90, "biggest", color="paper", w=1500),
  icon("exclaim", 1630, 600, 150, "trap", loop="shake"))

# ---------------------------------------------------------------- FIX 1 (19-26)
S(BG("yellow"),
  badge("1", 480, 430, 330, "one", "red"),
  text("STOP REREADING", 1260, 330, 120, "stop", color="ink", w=1000),
  icon("note", 1260, 650, 200, "notes"), icon("cross", 1260, 650, 220, "notes+0.4"))
S(ground(),
  stick(500, "hold", 1.1, prop="book", face="smile", y=int(G - 240 * 1.1)),
  bubble("I *know* this!", 650, 220, "knowing-1.5", tail=(-60, 150), w=480),
  text("familiar", 1300, 280, 120, "familiar", color="blue"),
  text("= knowing?", 1300, 450, 100, "knowing", color="red"), icon("question", 1620, 330, 150, "knowing+0.3", loop="float"))
S(BG("grid"),
  text("THE ILLUSION OF KNOWING", 960, 170, 100, "illusion", w=1700, color="purple"),
  icon("note", 620, 500, 300, "recognize"), icon("check", 620, 710, 120, "recognize+0.4"),
  text("recognize", 620, 310, 66, "recognize", font="hand"),
  icon("card", 1300, 500, 300, "produce"), icon("cross", 1300, 710, 120, "produce+0.4"),
  text("produce", 1300, 310, 66, "produce", font="hand"))
S(BG("yellow"),
  text("rereading + highlighting", 960, 200, 90, "highlighting", w=1600),
  icon("highlighter", 520, 520, 300, "highlighting", loop="swing"),
  icon("battery", 1250, 520, 330, "low", color="red"),
  text("low usefulness", 1250, 740, 66, "usefulness", color="red"))
S(ground(),
  text("not *useless*", 960, 250, 120, "useless", w=1300),
  text("just a *weak* use of your time", 960, 430, 84, "weak", w=1700),
  icon("clock", 300, 640, 200, "time", loop="float"),
  stick(1640, "shrug", 1.0, "flat"))
S(BG("blue"),
  stick(300, "think", 0.95, y=int(G - 240 * 0.95), at="start"),
  bubble("Do I *recognize* this?", 900, 250, "recognize", tail=(-200, 160), w=620),
  icon("cross", 1310, 250, 120, "recognize+1.2"),
  bubble("Can I *produce* this?", 1220, 560, "produce", tail=(-160, 130), w=620),
  icon("check", 1630, 560, 130, "produce+1.0"))
S(ground(), BG("paper"),
  text("WORKS", 520, 230, 100, "work", color="green"),
  stick(520, "tired", 0.85, "worry", sweat=True, y=int(G - 240 * 0.85), at="work"),
  text("feels hard", 520, 870, 56, "harder", font="hand"),
  text("FAILS", 1400, 230, 100, "fail", color="red"),
  stick(1400, "cheer", 0.85, "smile", y=int(G - 240 * 0.85), at="fail"),
  text("feels easy", 1400, 870, 56, "easier", font="hand"))
S(BG("paper"), ground(),
  stick(520, "hold", 1.0, prop="note", face="flat"), text("a recipe, read *10* times", 1250, 260, 70, "ten", w=1000),
  icon("cross", 1250, 470, 140, "looking"), text("cook it *once* from memory", 1150, 660, 66, "once", w=1000, color="green"), icon("check", 1760, 660, 120, "teaches"))

S(ground(),
  stick(520, "tired", 1.0, "sad", label="SAM", sweat=True),
  box("effort", 1230, 260, 420, 140, "effort", font="marker", size=60), icon("check", 1560, 260, 110, "effort+0.4"),
  box("the wrong kind of work", 1330, 500, 780, 160, "wrong", font="marker", size=56, color="red"), icon("cross", 1760, 700, 110, "wrong+0.8"))

# ---------------------------------------------------------------- FIX 2 (27-37)
S(BG("blue"),
  badge("2", 480, 430, 330, "two", "orange"),
  text("TEST YOURSELF", 1280, 330, 120, "test", w=1000),
  text("before you feel *ready*", 1280, 560, 72, "ready", w=1000), icon("question", 1700, 330, 130, "test+0.4", loop="float"))
S(BG("paper"),
  dict(k="list", x=830, y=430, w=1100, size=76, mark="num", at="close", items=[dict(t="Close the book", at="close"), dict(t="Grab a *blank* page", at="blank"), dict(t="Write *everything* you remember", at="write")]),
  stick(1600, "write", 1.0, prop="pencil", y=int(G - 240) , at="write"), ground())
S(BG("grid"),
  text("BIOLOGY", 960, 160, 100, "biology", color="red"),
  icon("heart", 700, 520, 360, "heart"),
  text("atrium", 470, 380, 60, "label", font="hand"), text("ventricle", 960, 650, 60, "label+0.5", font="hand"),
  text("valve", 450, 650, 60, "label+1.0", font="hand"), text("aorta", 960, 300, 60, "label+1.5", font="hand"),
  icon("pencil", 1500, 600, 230, "memory", loop="swing"), text("from *memory*", 1500, 450, 70, "memory", w=700))
S(BG("paper"),
  icon("book", 480, 460, 300, "open"),
  dict(k="list", x=1230, y=470, w=800, size=66, at="check", items=[dict(t="chambers", mark="check", at="check+0.4"), dict(t="valves", mark="cross", at="check+1.0"), dict(t="aorta", mark="check", at="check+1.6")]),
  text("check what you *missed*", 960, 790, 70, "missed", color="red", w=1500))
S(BG("yellow"),
  text("RETRIEVAL PRACTICE", 960, 260, 130, "retrieval", w=1700, fx="slam"),
  icon("brain", 520, 560, 260, "practice", loop="float"), icon("arrowr", 880, 560, 220, "practice+0.5"), icon("note", 1220, 560, 240, "practice+0.8"),
  text("one of the best-studied effects", 960, 790, 62, "best", font="hand", w=1500), icon("star", 1620, 330, 130, "best", loop="spin"))
S(ground(), BG("blue"),
  text("a week later", 960, 150, 84, "week", color="red"),
  stick(520, "hold", 0.9, prop="book", y=int(G - 240 * 0.9), at="students", label="REREAD"),
  stick(1400, "write", 0.9, prop="pencil", y=int(G - 240 * 0.9), at="practiced", label="RECALL"),
  icon("trophy", 1400, 250, 150, "more", loop="float"), text("remembered *more*", 1400, 372, 54, "more", font="hand", w=600))
S(BG("paper"),
  stick(480, "think", 1.0, "worry", at="start"),
  bubble("1869? ...no, 1871?", 1000, 240, "guess", tail=(-220, 190), w=520), icon("cross", 1380, 240, 110, "wrong"),
  icon("bulb", 1480, 560, 260, "sticks", loop="float"), text("a wrong guess *helps*", 1300, 690, 72, "helps", w=1100), ground())
S(BG("green"),
  text("answer *FIRST*", 960, 190, 100, "answer", w=1400),
  box("Q: ???", 600, 480, 420, 280, "flashcards", font="marker", size=80),
  icon("arrowr", 960, 480, 160, "flip"),
  box("A: ✓", 1320, 480, 420, 280, "flip", font="marker", size=80, fill="#d6f5dc"))
S(ground(), BG("paper"),
  stick(520, "cheer", 1.1, "smile", sweat=True, y=int(G - 240 * 1.1)),
  text("hard = *good*", 1300, 330, 130, "good", w=1100, fx="slam"),
  text("that feeling *is* the learning", 1300, 580, 68, "learning", w=1100))
S(BG("dark"),
  text("DESIRABLE DIFFICULTY", 960, 230, 130, "desirable", w=1700, color="yellow", fx="slam"),
  icon("exclaim", 540, 560, 230, "warning"), icon("cross", 540, 560, 250, "warning+0.6"),
  text("not a warning sign", 540, 760, 54, "warning", font="hand", color="paper"),
  icon("bulb", 1380, 560, 230, "signal", loop="float"), text("the signal", 1380, 760, 54, "signal", font="hand", color="paper"))
S(ground(),
  stick(480, "think", 1.0, "worry", label="SAM"),
  text("4 / 20", 1240, 270, 190, "four", color="red"),
  icon("magnifier", 1200, 600, 200, "knows", loop="swing"), text("now Sam knows *what to study*", 1360, 700, 58, "exactly", w=1100))

# ---------------------------------------------------------------- FIX 3 (38-48)
S(BG("blue"),
  badge("3", 480, 430, 330, "three", "green"),
  text("SPREAD IT OUT", 1280, 330, 120, "spread", w=1000),
  *[icon("calendar", 1050 + k * 170, 600, 140, "out", delay=0.12 * k) for k in range(4)])
S(BG("dark"),
  stick(500, "tired", 1.05, "worry", sweat=True, y=int(G - 240 * 1.05), shirt="blue"),
  icon("moon", 1450, 230, 190, "one", loop="float"), text("5 hours. 1 night.", 1150, 450, 90, "five", color="paper", w=900),
  icon("battery", 1000, 650, 220, "short", color="red"), text("short term memory", 1450, 660, 62, "short", font="hand", color="yellow", w=700))
S(BG("paper"),
  text("TOMORROW", 600, 220, 80, "tomorrow's", color="green"), icon("calendar", 600, 470, 260, "tomorrow's"), icon("check", 600, 700, 120, "test"),
  text("NEXT MONTH", 1320, 220, 80, "month", color="red"), icon("calendar", 1320, 470, 260, "month"), icon("cross", 1320, 700, 120, "month+0.5"))
S(curve("spaced", dur=0.1),
  icon("arrowr", 830, 440, 130, "about", rot=90, loop="float"), text("review *here*!", 830, 300, 74, "review", color="green"),
  text("just as you're about to forget", 1320, 760, 60, "forget", font="hand", w=900))
S(BG("grid"),
  dict(k="tline", x=960, y=470, w=1300, at="review", labels=["1 day", "3 days", "1 week", "1 month"], ats=["day", "three", "week", "month"]),
  text("spaced repetition", 960, 170, 100, "example", color="purple"))
S(curve("each", kind="reviews", reviews=[0.2, 0.42, 0.66], dur=6),
  text("every review = *flatter*", 1500, 90, 60, "flattens", color="green", w=800))
S(BG("paper"),
  dict(k="dots", x=640, y=440, n=5, size=80, color="blue", at="several", ats=["several", "short", "sessions", "usually", "beat"]),
  box("", 1380, 440, 560, 110, "one", fill="#ffb27a", round=40), text("5 short", 640, 600, 70, "sessions", color="blue"), text("1 long", 1380, 600, 70, "long", color="orange"),
  text("same total time", 960, 250, 84, "same", w=1500, color="grey"), icon("check", 640, 740, 110, "beat"))
S(BG("paper"),
  box("too easy", 480, 470, 400, 220, "sweet", color="grey", font="marker", size=54, op=0.8),
  box("JUST RIGHT", 960, 470, 440, 280, "slightly", color="green", fill="#d6f5dc", font="marker", size=64),
  box("impossible", 1440, 470, 400, 220, "impossible", color="red", font="marker", size=54, op=0.8),
  text("slightly hard", 960, 700, 70, "hard", color="green"))
S(ground(), BG("green"),
  icon("calendar", 560, 450, 360, "busy"), text("fits a *busy* week", 560, 700, 62, "easily", w=800),
  stick(1400, "cheer", 1.0, "smile"), icon("moon", 1000, 360, 140, "giant"), icon("cross", 1000, 360, 160, "giant+0.6"))
S(BG("blue"),
  icon("phone", 600, 460, 330, "apps"), text("Anki", 600, 720, 80, "anki", color="blue"),
  text("or", 960, 460, 90, "but", font="hand"),
  icon("calendar", 1320, 460, 330, "calendar"), text("a simple calendar", 1320, 720, 60, "simple", font="hand", w=700))
S(BG("blue"),
  text("longer memory = longer gaps", 960, 200, 90, "rule", w=1700, color="purple"),
  icon("arrowr", 500, 520, 120, "gaps"), icon("arrowr", 900, 520, 200, "gaps+0.4"), icon("arrowr", 1450, 520, 320, "gaps+0.8"),
  text("1 day", 500, 680, 56, "gaps", font="hand"), text("1 week", 900, 680, 56, "gaps+0.4", font="hand"), text("1 month", 1450, 680, 56, "gaps+0.8", font="hand"))

S(BG("green"),
  dict(k="list", x=820, y=420, w=1200, size=76, mark="check", at="rereading", items=[dict(t="Stop rereading", mark="check", at="rereading"), dict(t="Test yourself", mark="check", at="test"), dict(t="Spread it out", mark="check", at="spread")]),
  badge("3", 1560, 300, 190, "three", "orange"), text("more to go", 1560, 460, 60, "go", font="hand"),
  icon("loop", 1560, 640, 150, "backwards", loop="spin"), text("feels backwards", 1560, 790, 54, "backwards", font="hand", w=600))

# ---------------------------------------------------------------- FIX 4 (49-56)
S(BG("blue"),
  badge("4", 480, 430, 330, "four", "purple"),
  text("MIX IT UP", 1280, 360, 130, "mix", w=1000),
  *[icon("loop", 1000 + k * 200, 650, 150, "up", delay=0.15 * k, loop="spin") for k in range(3)])
def blocks(mixed, at, y=350):
    out = []
    cols = ["blue", "orange", "green"]
    seq = [0, 1, 2, 0, 2, 1, 1, 0, 2] if mixed else [0, 0, 0, 1, 1, 1, 2, 2, 2]
    for k, c in enumerate(seq):
        out.append(box("ABC"[c], 410 + k * 140, y, 110, 110, at, delay=0.1 * k, fill=cols[c], tcolor="paper", font="marker", size=60, round=18))
    return out
S(BG("paper"), *blocks(False, "one"),
  text("BLOCKED practice", 960, 170, 100, "blocked", color="red"),
  stick(500, "tired", 0.85, "flat", y=int(G - 240 * 0.85)), ground())
S(BG("paper"), *blocks(True, "mixing"),
  text("INTERLEAVING", 960, 170, 110, "interleaving", color="green", fx="slam"))
S(ground(),
  stick(520, "shrug", 1.05, "worry", sweat=True, y=int(G - 240 * 1.05)),
  icon("cross", 1100, 330, 150, "feels"), icon("cross", 1280, 460, 150, "feels+0.4"), icon("cross", 1460, 330, 150, "feels+0.8"),
  text("more mistakes", 1300, 640, 90, "mistakes", color="red", w=900))
S(BG("yellow"),
  icon("trophy", 480, 420, 330, "wins", loop="float"),
  text("mixed practice *wins*", 1250, 300, 96, "wins", w=1100),
  box("choose the right *method*", 1250, 560, 820, 170, "choose", font="marker", size=56),
  stick(1810, "cheer", 0.8, y=int(G - 240 * 0.8)))
S(BG("paper"),
  text("PAINTING STYLES", 960, 170, 100, "painting", color="purple"),
  *[box("ABC"[c], 480 + k * 240, 470, 200, 260, "mixed", delay=0.12 * k, fill=["#ffd23f", "#9ad49a", "#8fb8ff"][c], font="marker", size=90, rot=[-4, 3, -2, 4, -3, 2][k]) for k, c in enumerate([0, 2, 1, 0, 1, 2])],
  text("artists *mixed* together = better", 960, 790, 66, "better", w=1700), icon("check", 1700, 300, 130, "better"))
S(BG("paper"),
  text("MATH", 520, 220, 90, "math", color="blue"), text("+  −  ×  ÷", 520, 450, 130, "mix", font="marker"),
  text("LANGUAGE", 1360, 220, 90, "language", color="green"),
  icon("book", 1130, 520, 190, "vocabulary"), icon("speaker", 1360, 520, 190, "listening"), bubble("Hello!", 1600, 440, "speaking", tail=(-30, 110), w=250),
  text("vocabulary · listening · speaking", 1360, 740, 54, "speaking", font="hand", w=900))
S(BG("grid"),
  text("PHYSICS", 960, 160, 100, "physics", color="purple"),
  icon("note", 600, 400, 240, "chapter"), icon("note", 960, 400, 240, "chapter+0.1"), icon("note", 1320, 400, 240, "chapter+0.2"),
  text("Ch.1", 600, 560, 60, "chapter", font="hand"), text("Ch.2", 960, 560, 60, "chapter", font="hand"), text("Ch.3", 1320, 560, 60, "chapter", font="hand"),
  text("shuffle them *together*", 960, 760, 76, "shuffle", w=1500, color="green"))
S(BG("blue"),
  box("BASKETBALL drills", 560, 380, 700, 170, "basketball", font="marker", size=58),
  box("PIANO scales", 1360, 380, 700, 170, "piano", font="marker", size=58),
  text("mixed practice helps here too", 960, 640, 76, "motor", w=1500, color="green"), icon("sparkle", 960, 780, 120, "motor", loop="spin"))

# ---------------------------------------------------------------- FIX 5 (57-62)
S(BG("dark"),
  badge("5", 480, 430, 330, "five", "blue"),
  text("SLEEP", 1280, 330, 150, "sleep", color="yellow", w=1000),
  icon("moon", 1700, 220, 190, "sleep+0.3", loop="float"), icon("zzz", 1500, 560, 190, "studying", loop="float"))
S(BG("dark"),
  icon("brain", 960, 470, 440, "brain", loop="pulse"), icon("loop", 960, 470, 560, "replays", op=0.85, loop="spin", color="yellow"),
  text("replay", 440, 330, 80, "replays", color="yellow"), text("lock it in", 1480, 330, 80, "stabilizes", color="paper"),
  icon("moon", 330, 640, 170, "sleep", loop="float"))
S(BG("dark"), ground(),
  text("SLEPT", 560, 190, 90, "sleep", color="green"), stick(560, "tired", 0.9, "sleep", y=int(G - 240 * 0.9), shirt="blue"),
  icon("star", 560, 340, 150, "more", loop="float"),
  text("STAYED AWAKE", 1380, 190, 90, "awake", color="red"), stick(1380, "tired", 0.9, "worry", sweat=True, y=int(G - 240 * 0.9), shirt="orange"))
S(BG("dark"),
  icon("coffee", 480, 440, 300, "nighter"), text("TRAP", 960, 330, 220, "trap", color="red", fx="slam", rot=-6),
  icon("moon", 1000, 650, 180, "give"), icon("cross", 1000, 650, 200, "give+0.5"),
  icon("clock", 1450, 460, 220, "hours", loop="float"))
S(BG("dark"),
  dict(k="tline", x=960, y=470, w=1250, at="plan", labels=["EVENING: study", "MORNING: review", "ALWAYS: sleep"], ats=["evening", "morning", "protect"], ),
  text("a better plan", 960, 170, 100, "plan", color="yellow"))
S(BG("dark"),
  icon("brain", 640, 440, 360, "tired", loop="float"), icon("battery", 640, 700, 200, "tired+0.4", color="red"),
  text("remembers less", 1330, 300, 76, "less", color="paper", w=800),
  text("can't take in the *new*", 1280, 520, 70, "new", color="paper", w=1000), icon("cross", 1780, 520, 110, "anything"))

S(BG("dark"), ground(),
  icon("bed", 640, 470, 330, "nap"), text("a short nap helps", 640, 700, 62, "short", color="paper", font="hand", w=800),
  icon("moon", 1330, 440, 300, "nothing", loop="float"), text("nothing replaces a *full night*", 1330, 700, 62, "full", color="paper", w=800))

# ---------------------------------------------------------------- FIX 6 (63-71)
S(BG("blue"), ground(),
  badge("6", 400, 330, 270, "six", "red"),
  stick(1050, "talk", 1.05, anim="talk", shirt="green", y=int(G - 240 * 1.05)),
  stick(1560, "idle", 0.6, "smile", y=int(G - 240 * 0.6), shirt="orange"), text("10", 1560, 440, 70, "ten", color="orange", font="marker"),
  text("EXPLAIN IT SIMPLY", 960, 130, 76, "explain", w=1500, color="blue"))
S(BG("paper"), ground(),
  stick(520, "talk", 1.1, anim="talk", y=int(G - 240 * 1.1), shirt="green"),
  bubble("In *simple* words...", 1150, 280, "simple", tail=(-300, 210), w=640),
  icon("note", 1550, 620, 210, "notes"), icon("cross", 1550, 620, 230, "notes+0.4"))
S(BG("yellow"), ground(),
  stick(520, "shrug", 1.1, "shock", y=int(G - 240 * 1.1), faces=[dict(at="gap", to="worry")]),
  bubble("uhh... because... ???", 1130, 270, "stuck", tail=(-280, 220), w=700),
  text("GAP FOUND", 1300, 650, 120, "gap", color="red", fx="slam", rot=-5))
S(BG("green"),
  icon("loop", 480, 450, 320, "back", loop="spin"),
  dict(k="list", x=1230, y=450, w=900, size=82, mark="num", at="back", items=[dict(t="Go back", at="back"), dict(t="Fill the gap", at="fill"), dict(t="Try again", at="try")]))
S(BG("grid"),
  text("THE FEYNMAN TECHNIQUE", 960, 190, 112, "feynman", w=1700, color="purple"),
  stick(560, "point", 1.0, shirt="green", glasses=True, label="PHYSICIST", at="physicist"),
  icon("lightbulb" if False else "bulb", 1350, 520, 300, "physicist", loop="float"))
S(BG("paper"), ground(),
  box("FRIEND", 520, 430, 400, 170, "friend", font="marker", size=60),
  box("PET", 960, 430, 400, 170, "pet", font="marker", size=60),
  box("EMPTY CHAIR", 1400, 430, 440, 170, "chair", font="marker", size=54),
  text("teaching = retrieval with a *purpose*", 960, 700, 66, "teaching", w=1700))
S(BG("paper"), ground(),
  stick(520, "cheer", 1.0, "smile", faces=[dict(at="falls", to="worry")], poses=[dict(at="falls", to="shrug")]),
  box("my explanation", 1280, 300, 640, 190, "confident", font="marker", size=56, move=dict(at="falls", to=[1330, 640], dur=0.8), rot=0),
  text("falls apart", 1280, 840, 80, "apart", color="red", w=900))
S(BG("blue"),
  box("NEW FACT", 540, 400, 480, 200, "connect", font="marker", size=62, color="blue"),
  icon("arrowr", 960, 400, 190, "already"),
  box("WHAT I KNOW", 1380, 400, 540, 200, "already", font="marker", size=60, color="green"),
  box("+ a picture", 640, 680, 420, 130, "picture", size=54), box("+ a little story", 1180, 680, 520, 130, "story", size=54))
def web():
    out = [icon("brain", 960, 440, 320, "paths", loop="pulse")]
    for k in range(6):
        a = math.radians(k * 60 + 20)
        out.append(icon("arrowr", 960 + math.cos(a) * 330, 440 + math.sin(a) * 270, 140, "paths", delay=0.2 * k, rot=math.degrees(a) + 180))
    return out
S(BG("paper"), *web(), text("more paths = *easier* to retrieve", 960, 800, 66, "easier", w=1700))

# ---------------------------------------------------------------- OUTRO (72-82)
S(BG("yellow"), ground(),
  text("QUIZ TIME", 960, 200, 160, "test", color="red", fx="slam"),
  stick(520, "think", 1.05, "think", y=int(G - 240 * 1.05)),
  text("name 3 of the 6 fixes", 1300, 400, 78, "name", w=900),
  text("3", 1300, 600, 190, "wait+0.2", until="wait+1.2", color="orange"), text("2", 1300, 600, 190, "wait+1.2", until="wait+2.2", color="orange"), text("1", 1300, 600, 190, "wait+2.2", until="wait+3.2", color="orange"))
def grid():
    names = ["1 · Stop rereading", "2 · Test yourself", "3 · Spread it out", "4 · Mix it up", "5 · Sleep", "6 · Teach it"]
    ats = ["rereading", "test", "spread", "mix", "sleep", "teach"]
    cols = ["red", "orange", "green", "blue", "purple", "ink"]
    out = []
    for k, (n, a) in enumerate(zip(names, ats)):
        out.append(box(n, 520 + (k % 3) * 440, 330 + (k // 3) * 270, 410, 220, a, font="marker", size=46, color=cols[k]))
    return out
S(BG("green"), *grid())
def week(upto, now):
    days = ["MON", "TUE", "WED", "THU", "FRI"]
    acts = {0: ("study new", "blue"), 1: ("recall on paper", "orange"), 3: ("quiz + old topics", "green")}
    out = []
    for k, d in enumerate(days):
        x = 400 + k * 280
        out.append(box(d, x, 330, 250, 120, "start" if upto >= 0 else "x", font="marker", size=54, fx="none" if now != "all" else "pop"))
    for k, (t, c) in acts.items():
        if k < upto: out.append(box(t, 400 + k * 280, 560, 250, 190, "start", size=44, fill=c, tcolor="paper", fx="none", font="hand"))
    return out
S(BG("paper"), *[box(d, 400 + k * 280, 330, 250, 120, "routine", font="marker", size=54, delay=0.1 * k) for k, d in enumerate(["MON", "TUE", "WED", "THU", "FRI"])],
  box("study something new", 400, 560, 250, 190, "monday", size=42, fill="blue", tcolor="paper", font="hand"),
  text("a simple weekly routine", 960, 160, 90, "weekly", color="purple", w=1700))
S(BG("paper"), *week(1, "x"),
  box("close the book, write it down", 680, 560, 250, 190, "tuesday", size=38, fill="orange", tcolor="paper", font="hand"))
S(BG("paper"), *week(2, "x"),
  box("quiz + older topics", 1240, 560, 250, 190, "thursday", size=42, fill="green", tcolor="paper", font="hand"))
S(BG("paper"), *week(2, "x"), box("quiz + older topics", 1240, 560, 250, 190, "start", size=42, fill="green", tcolor="paper", font="hand", fx="none"),
  box("NEXT WEEK: explain it out loud", 960, 800, 1100, 120, "next", size=50, fill="#e8dcff", font="marker"),
  icon("moon", 1700, 560, 160, "sleep", loop="float"), text("sleep every night", 1700, 700, 46, "sleep", font="hand", w=380))
S(ground(), BG("green"),
  stick(520, "cheer", 1.1, "smile", label="SAM", y=int(G - 240 * 1.1)),
  text("1 month later", 1280, 170, 74, "month", color="purple", w=800),
  box("EXAM  ✓  ✓  ✓", 1280, 470, 640, 240, "exam", font="marker", size=64, fill="#fff"), text("calm", 1280, 700, 100, "calm", color="green", fx="slam"),
  icon("check", 1700, 470, 130, "familiar", loop="float"))
S(BG("blue"),
  icon("brain", 620, 470, 420, "memory", loop="pulse"), icon("check", 620, 470, 160, "broken"),
  text("not *broken*", 1360, 280, 100, "broken", w=1000), text("it forgets whatever seems *unimportant*", 1360, 560, 66, "forget", w=900))
S(BG("yellow"),
  icon("magnifier", 350, 430, 190, "retrieval"), icon("calendar", 650, 430, 190, "spacing"), icon("loop", 950, 430, 190, "mixing", loop="spin"), icon("moon", 1250, 430, 190, "sleep"), icon("cap", 1550, 430, 190, "teaching"),
  text("THIS ONE MATTERS", 960, 720, 120, "matters", color="red", fx="slam", w=1700))
S(BG("green"),
  *[box(str(k + 1), 480 + k * 190, 640 - k * 40, 160, 160 + k * 40, "pick" if k == 0 else "next", delay=0.0 if k == 0 else 0.25 * k, fill="orange" if k == 0 else "#fff", font="marker", size=70, round=18) for k in range(6)],
  text("one at a time", 960, 170, 100, "pick", w=1500, color="orange"), text("habit for *two weeks*", 960, 330, 66, "weeks", w=1500))
S(BG("yellow"), ground(),
  stick(520, "think", 1.05, y=int(G - 240 * 1.05)), icon("calendar", 1050, 400, 280, "three"), text("+3 days", 1050, 620, 80, "days", color="red"),
  text("list all *six* fixes", 1540, 300, 54, "list", w=640), icon("loop", 1540, 540, 150, "spaced", loop="spin"), text("spaced retrieval", 1540, 700, 52, "action", font="hand", w=500))
S(ground(), BG("paper"),
  stick(500, "point", 1.1, y=int(G - 240 * 1.1)),
  text("ONE fix this week", 1260, 270, 110, "one", w=1200, color="orange"),
  box("tell me in the *comments*", 1260, 530, 840, 190, "comments", font="marker", size=56),
  icon("arrowr", 1260, 700, 130, "comments+0.5", rot=90, loop="float"))
S(BG("yellow"), ground(),
  stick(480, "tired", 0.95, "sad", prop="clock", y=int(G - 240 * 0.95), shirt="orange"), icon("cross", 480, 330, 130, "studies"), text("studies longest", 480, 220, 54, "longest", font="hand", w=500),
  stick(1380, "cheer", 0.95, "smile", y=int(G - 240 * 0.95), at="tries"), icon("brain", 1380, 330, 150, "tries", loop="float"),
  text("TRIES TO REMEMBER", 960, 110, 90, "tries", color="red", fx="slam", w=1700))

def _find(sub): return next(i for i, sc in enumerate(scenes) if sub in json.dumps(sc, ensure_ascii=False))
def _move_after(new, anchor):
    sc = scenes.pop(_find(new)); scenes.insert(_find(anchor) + 1, sc)
_move_after("a recipe, read", "the wrong kind of work")
_move_after("longer memory = longer gaps", "JUST RIGHT")
_move_after("remembers less", "nothing replaces")

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes.json")
json.dump(scenes, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
import subprocess, sys
subprocess.run([sys.executable, os.path.join(os.path.dirname(out), "..", "..", "tools", "blank_start.py"), os.path.basename(os.path.dirname(out)), "--fix"])
print(len(scenes), "scenes ->", out)
