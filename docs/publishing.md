# Publishing checklist (for the maintainers)

1. **Pick the GitHub owner and repo name** and replace the existing `<owner>/vidbucks` in `README.md`, `package.json`, `core/package.json`, `.claude-plugin/*.json`, `CONTRIBUTING.md`, `skills/vidbucks-setup/SKILL.md` (one search-and-replace).
2. **Ownership text:** the repository states ownership by "The Vidbucks Authors" (LICENSE, NOTICE, AUTHORS.md, package manifests). Replace it with your legal entity or names if you want that on record, in the same files.
3. **Run the checks:** `node core/tools/doctor.mjs`, `node core/tools/smoke.mjs`, `cd core && npx tsc --noEmit`.
4. **Scan for private material** (names, e-mail addresses, absolute paths, brand names): `node scripts/release.mjs --scan-only` reads an optional private deny file kept OUTSIDE the repository (`~/.vidbucks/release-deny` or `$VIDBUCKS_RELEASE_DENY`, one case-insensitive regex per line: your names, brands, e-mail) in addition to the built-in patterns. Publish with `git push` (tracked files only) or `scripts/release.mjs`; never zip the folder by hand, it may contain local state such as `.vidbucks/`.
5. **Create the repository on GitHub, push, add topics** (`claude-code`, `agent-skills`, `remotion`, `video`, `tts`), enable private vulnerability reporting, and add a social preview image.
6. **Optional:** tag `v2.0.0` and attach `node scripts/release.mjs` output as a release asset.
