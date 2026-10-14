---
name: vidbucks-channel-study
description: Study a reference YouTube CHANNEL to extract its repeatable formula (title skeleton, thumbnail recipe, length band, cadence, hook shape, caption style, palette) and write a style brief + beat sheet, using only public data and measurements. Use when the user names a channel to learn from or asks for "the style of channel X". For building the actual video from a reference use vidbucks-reference-to-video.
---

# vidbucks-channel-study

Goal: understand HOW a channel is built (packaging + structure), then create ORIGINAL content in that structure. This skill covers the channel level (titles, thumbnails, length, cadence, hook); the video level (look, motion, sound, build, measurement) is `vidbucks-reference-to-video` - run it for the reference video you pick in step 3.

## Allowed data (never download videos; never bypass ToS)
Public channel pages, video lists, titles, durations, view counts, upload dates, descriptions, captions, thumbnails (analysis only); your own viewing in the Browser pane. `yt-dlp` is used for metadata and captions only (never media). Rounded numbers are fine; say so. A video FILE the user supplies may be measured (the responsibility for it is the user's).

## Steps
1. **Measure:** `python core/tools/analyze_reference.py --link "<video url>"` for 3-5 videos of the channel (typical and best). It prints engagement, title skeleton, thumbnail palette/contrast/edge density, caption timing, chapters and the channel context (median views, outlier multiple, cadence, typical length, top titles, skeleton counts).
2. **Formula:** what repeats in ~9 of 10 videos? Title skeleton(s) with slots (`{N} ... {skill} ...`), thumbnail recipe (subject, words, colours, contrast), length band, cadence. Ask "how is it built", not "what is it about". Note outlier dependence (do 2-3 videos carry everything?) and the realistic ceiling for a small channel.
3. **Reference video:** pick the one that best matches the channel's typical ratios (not necessarily the most viewed) and hand it to `vidbucks-reference-to-video` for the visual/motion/sound analysis and the build.
4. **Beat sheet:** a 60-second (or target-length) timeline with slots for the new topic.
5. **Transfer rules:** copy structure; change topic, examples, voice, art; never copy title text, channel history, real faces, logos or footage.
6. **Write** from the skeletons in `knowledge/templates/` (`channel-study.template.md`, `style.template.json`) into `knowledge/channel-studies/<channel>.md`, `knowledge/style-briefs/<channel>.style.json` and `knowledge/beat-sheets/<channel>.md` (create the folders when needed); add the archetype to `knowledge/channel-style-library.md` if it is new. Read the library first - the style may already be there.
7. **Confidence statement:** which numbers are measured, which are inferred, which are unknown.
