# Claude plugin implementation plan

**Goal:** Deliver a usable Codex plugin that delegates to local Claude Code.
**Architecture:** Skills call MCP tools backed by a shared Node service and detached workers. A direct CLI accepts the same `/claude:*` names.
**Tech stack:** Node 22+, MCP SDK, Zod, esbuild, node:test.
**Spec:** ../specs/2026-09-05-claude-plugin-design.md

## Global constraints

Use the `claude` namespace, explicit repository paths, shell-free argument arrays, bounded execution, persisted results, and restricted Claude tools. Windows is the primary validation environment. Models are selected only by user input or Claude defaults.

## Execution

- [x] Create failing contract tests in `tests/core.test.mjs`: `parseCommand(argv)`, `buildArgs(request)`, and `reviewContext(repo, base)`; run `npm test` before implementing.
- [x] Implement these interfaces in `plugins/claude/src/command.mjs`, `claude.mjs`, and `git.mjs`. Exercise temporary Git repositories with staged, unstaged, untracked and branch changes.
- [x] Add lifecycle tests using an external fake CLI fixture (no network): create jobs, wait for results, request cancellation, exceed timeout, fail startup, resume, and reject cross-repository IDs. Implement `service.mjs`, `store.mjs`, and `worker.mjs` against those tests.
- [x] Register `claude_setup`, `claude_review`, `claude_adversarial_review`, `claude_rescue`, `claude_transfer`, `claude_status`, `claude_result`, and `claude_cancel` in `server.mjs`. Build a stdio client integration test. Implement direct `cli.mjs` routing and strict flag validation.
- [x] Bundle with `scripts/build.mjs`, write the eight skills and Japanese README, run manifest and skill validators, and register the plugin in the personal marketplace.
- [x] Run `npm run check`, setup against the installed CLI, and a bounded real review smoke test. Report actual verification and any unavailable host integration.

Implement inline in this dedicated new workspace. The conversation already authorizes the design and implementation; no additional design gate is needed.
