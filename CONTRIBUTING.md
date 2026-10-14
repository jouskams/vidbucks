# Contributing to Vidbucks

Thank you for helping. Vidbucks is built so that an AI coding agent can follow it reliably, so changes are judged by one question: **does the output get closer to the reference, and is it honest about what it could not verify?**

## Ways to contribute
- **A new template or icon/route** for a video type that is not covered (add a demo config in `core/src/templates/demos.ts`, register it, add one row to `examples/worked-examples.md` with the measured score).
- **Measurement improvements** in `core/tools/analyze_reference.py` (new metrics, better hints). Every new metric must be tagged measured or inferred and tested on a real video.
- **Setup fixes**: a missing detection, a new voice engine, a platform quirk (add the row to the troubleshooting table in `skills/vidbucks-setup/SKILL.md`).
- **Docs and worked examples** (generic: no private brands, names or files).

## Ground rules
1. **No third-party media, models or brand material in the repo.** Examples use placeholders or generated assets. Anything fetched at run time carries its own licence and credit line.
2. **No personal data**: names, e-mail addresses, absolute paths of your machine, API keys, `.env` files.
3. **Skills are workflows, not essays**: steps, checks, exit criteria. Keep `SKILL.md` frontmatter (`name`, `description` that says when to use it).
4. **Keep the hard rules** in `CLAUDE.md` (honesty, legal, no publishing, autonomy limits). A change that weakens them needs a very good reason in the PR.
5. **Test what you touch**: `node core/tools/smoke.mjs` must pass; typecheck with `cd core && npx tsc --noEmit`; render a still of a template you changed and look at it.
6. **Small PRs** (about 100 lines of logic) with a clear description: what changed, how you verified it, what you could not verify.

## Development setup
```bash
git clone https://github.com/jouskams/vidbucks && cd vidbucks
node scripts/setup.mjs
node core/tools/doctor.mjs
node core/tools/smoke.mjs
```

## Licence of contributions
By submitting a contribution you agree to license it under the MIT License of this project and confirm that you have the right to do so.
