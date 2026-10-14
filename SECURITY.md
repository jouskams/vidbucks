# Security

Vidbucks runs locally and executes shell commands, installs packages and renders media on your machine on your behalf (through your AI coding agent). Treat it like any other tool that can run code.

## Reporting a vulnerability
Please do **not** open a public issue for a security problem. Use GitHub's "Report a vulnerability" (private security advisory) on this repository. Include what you found, how to reproduce it, and the impact. We aim to answer within a week.

## What counts
- command injection or unsafe file writes in `scripts/`, `bin/` or `core/tools/`
- the setup skill or hooks doing something the user did not approve
- leaking API keys (`core/.env`) or private paths
- anything that makes the tool download, copy or redistribute material it should not

## Built-in safeguards
Setup never creates accounts or types credentials; API keys are stored only in the git-ignored `core/.env`; the SessionStart hook only reads the local status; reference videos are analysed through public metadata and viewing, not downloaded.
