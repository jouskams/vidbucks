# Example: a Vidbucks "IconStory" beat written for HyperFrames

A ball drops and settles; a serif caption types in character by character (4 s, vertical). Same visual language as the Remotion `IconStory` template, authored as HTML + GSAP.

```bash
npx -y hyperframes init demo --example blank --resolution portrait --non-interactive --skip-transcribe
cp index.html demo/index.html
cd demo && npx hyperframes check && npx hyperframes render -o out.mp4
# measure it with Vidbucks (renderer-agnostic)
python ../../../core/tools/analyze_reference.py --file out.mp4 --no-transcript
```
`hyperframes check` passes (0 errors, 0 warnings, contrast AA). Replace the text, the colours and the timeline with your own content; keep the `data-*` attributes and the `window.__timelines["main"]` registration (see the HyperFrames project's own CLAUDE.md).
