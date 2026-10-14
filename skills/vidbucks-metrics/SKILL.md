---
name: vidbucks-metrics
description: Read YouTube Studio metrics (CTR, first-30-second retention, average view %, impressions, traffic sources) against the metrics rules in `knowledge/metrics-rules.json` and decide continue / wait / intervene / abandon, with one concrete action. Use when the user pastes analytics, asks why a video is not growing, or wants to choose what to do next on a channel.
---

# vidbucks-metrics

Data: `knowledge/metrics-rules.json` (thresholds are rules of thumb; ±10 % tolerance; shift for format/audience; doubtful claims are listed there).

## Inputs to ask for (if missing)
Category (evergreen / cash cow / trend / hype), video age and how many videos are in the window, impressions, CTR, first-30 s retention (or a description of the retention graph), average view % and duration, traffic sources, audience age, upload cadence. If it is a single video: say that a decision cannot rest on one video.

## Procedure
1. Data window: first 48 h → "wait, noisy". Fewer than 30-40 views / 300-500 impressions → "no signal yet" (0-1 views = technical problem).
2. Read in order **CTR → first 30 s → average view %**. Compare each with the category table (expect / intervene / abandon). Apply the audience/length adjustments.
3. Combination table: CTR high + first30 good + avg low = promise not delivered; CTR high + first30 weak = bad hook; CTR low + others high = packaging / audience too narrow; all in range = do not touch.
4. Decision flow: in range → CONTINUE; window not over → WAIT; signal present → EXTEND; intervention zone → INTERVENE with ONE rung (thumbnail → intro → length/format → title pattern → concept); after 3 failed interventions and ≥ 3 of 4 abandon signals → ABANDON the concept.
5. Retention graph → action: intro drop → cut/shorten; early body → answer sooner; late body → shorten; ending → cut ≤ 10 s after the last value.
6. Output: verdict, the single metric that decided it, one action, the date/video count to re-check, and a confidence note (which rule is solid, which is rule-of-thumb). Never recommend changing the title of a video that gets distribution; never change two variables at once.
7. Log it in `knowledge/learned.md` (video, numbers, action, date).
