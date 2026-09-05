# Validation — 2026-09-05

Environment: Windows, Node.js 24.18.0, Codex CLI 0.153.4, Claude Code 2.1.251.

- `npm run check`: build succeeded; 10 tests passed. Tests use real temporary Git repositories and child processes, replacing only external Claude inference with a fixture.
- Six job lifecycle tests passed in three consecutive runs after fixing Windows test teardown retry behavior.
- Plugin manifest validation passed, and all eight skills passed `quick_validate.py`.
- Installed and enabled as `claude@personal`. Codex app-server `skills/list` recognized all eight `claude:*` skill names; MCP configuration was discovered as server `claude`.
- The installed bundled MCP server completed an SDK stdio handshake, listed all eight tools, and returned installed/compatible/authenticated from `claude_setup`.
- Real read-only review of a synthetic changed `average.mjs` detected division by `length - 1` instead of `length` and persisted the result and Claude session ID.
- Real `rescue` with `write:true` corrected only the synthetic `average.mjs`; reading the resulting file verified the change. No tool denials were reported.
- Code review identified broad file access and pre-launch cancellation gaps. Child runs now use Claude's restricted mode; a queued cancellation regression test proves Claude does not start.

Limitations: no macOS/Linux execution in this environment; native slash-menu UI rendering was not exercised. Claude inference was tested using the local authenticated account, not every supported authentication provider. Stale-worker recovery deliberately retains the repository lock until a person confirms the previous process has stopped. Restricted mode ignores user/project/local settings files.

Source code and bundles are in this repository. The personal marketplace uses a copy at `~/plugins/claude`; see README for updates. At the time of this initial validation, nothing had been published to GitHub.

## Model selection update — 2026-09-05

- `npm run check`: 15 tests passed, including multiword model parsing, official ID normalization, Fable blocking before job/filesystem creation, fake-child argument forwarding after consent, MCP confirmation responses, and noninteractive CLI behavior.
- `-y` and `-yes` skip the Fable warning only for the current invocation. `--wait` no longer prints a started message when consent is pending.
- Fable inference was not invoked during validation; a fake external process exercises approved launches without spending model usage credits.
- Independent local review reported no additional actionable findings after the pending-confirmation wait fix. Four execution skills share the required warning/consent workflow in `plugins/claude/references/models.md`.


## Publication validation — 2026-09-06

- Build and 29 automated tests passed on Windows, including error preservation, setup failure exit codes, dot-prefixed filenames, and transient Windows state-file lock recovery.
- Repository marketplace registration and plugin installation succeeded in an isolated Codex home.
- Distribution includes all three runtime bundles; end users do not need npm dependencies.
- Local logs, synthetic review repositories, installation-test caches, and node_modules are excluded from Git.
