# claude-code-for-codex

**Use Claude Code from Codex for code reviews, investigations, and task handoffs.**

[日本語](README.md) | English

This independent project provides the reverse workflow of [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc): Codex delegates work to your locally installed Claude Code CLI, then retrieves the results.

The plugin is named **`claude`** and uses the **`/claude:`** command prefix. It is not an official OpenAI or Anthropic plugin.

## Requirements

- A local Codex environment with plugin, skill, and MCP support.
- Node.js **22 or later**, available as `node` on your PATH.
- Git for repository-based commands.
- Claude Code with **`--restricted` support**, available as `claude` on your PATH or configured through `CLAUDE_PLUGIN_CLI`.
- Working Claude Code authentication and access to the model you want to use.

Follow the [official Claude Code setup instructions](https://code.claude.com/docs/en/setup) to install the CLI. Verify that it runs and complete authentication before using this plugin:

```sh
node --version
git --version
claude --version
claude auth login
```

Local validation has been performed on Windows, including Claude Code 2.1.261. macOS and Linux have not been independently validated in this project.

## Installation

### Install a local copy in Codex

1. Clone this repository using its GitHub URL, or download and extract it using **Code → Download ZIP**.
2. Keep the extracted repository in a permanent local folder. The installable plugin root is **`plugins/claude`**, not the repository root.
3. Open the repository in Codex. If your Codex installation includes the `plugin-creator` skill, ask:

   ```text
   Use plugin-creator to register and install the existing plugin at
   ./plugins/claude in my personal marketplace. Preserve its implementation
   and use the supported local-plugin installation workflow.
   ```

4. Start a **new Codex task** so it picks up the installed plugin, then run:

   ```text
   /claude:setup
   /claude:test --model sonnet
   ```

`setup` checks installation, compatibility, and authentication without inference. `test` makes a real model request and consumes model usage.

The checked-in `plugins/claude/dist` bundles include the Node.js dependencies. End users do not need to run `npm install` when those bundles are present. If they are missing, follow [Development](#development) to build them first.

This repository currently contains a plugin package, but no repository-level marketplace manifest. Register the local package as described above; a direct GitHub marketplace-install command is not provided yet. For host-level plugin information, see the [official OpenAI plugin documentation](https://learn.chatgpt.com/docs/plugins).

If `plugin-creator` is unavailable, you can use the bundled CLI directly as described below. That runs the same implementation but does not register the plugin in Codex.

### Use the bundled CLI directly

From this repository's root:

```sh
node plugins/claude/dist/cli.mjs /claude:setup
node plugins/claude/dist/cli.mjs /claude:test --model sonnet
```

For repository commands, provide the target repository's absolute path:

```sh
node plugins/claude/dist/cli.mjs /claude:review --repo "/absolute/path/to/project" --wait
```

On Windows, a path such as `"D:/projects/my-app"` is valid. If `--repo` is omitted, the CLI uses the current working directory. Paths in the examples are placeholders; replace them with your own.

## Commands

| Command | Purpose |
| --- | --- |
| `/claude:setup` | Check Claude Code installation, compatibility, and authentication. |
| `/claude:test --model MODEL` | Make a short real request to a selected model, with no tools or repository context. |
| `/claude:review` | Review working changes or a comparison against a base branch. |
| `/claude:adversarial-review` | Challenge assumptions, failure modes, and design tradeoffs. |
| `/claude:rescue` | Investigate a problem or make explicitly authorized repairs. |
| `/claude:transfer` | Create a Claude session from a supplied handoff summary. |
| `/claude:status` | List recent jobs or inspect one job. |
| `/claude:result JOB_ID` | Retrieve a saved result and any Claude session ID. |
| `/claude:cancel JOB_ID` | Request cancellation of a specific job. |

These names are skill invocation conventions and aliases accepted by the bundled CLI. Native slash-menu visibility depends on the Codex host. If an alias is not available in the menu, select the installed skill or ask Codex to use Claude to review your changes.

### Review and investigate

```text
/claude:review
/claude:review --base main
/claude:adversarial-review Focus on authentication failures and concurrent requests.
/claude:rescue Investigate this error without modifying files. Respond in English.
/claude:rescue --write Fix the reproduced bug with the smallest appropriate change.
/claude:transfer Summarize the current investigation and next steps in English.
```

Review, adversarial review, rescue, and transfer start **background jobs**. The returned job ID means work has started, not that a review has finished. Use `status` and `result` to obtain the outcome. The CLI's `--wait` option waits for completion; `--background` explicitly selects the default background behavior.

Without `--base`, reviews include staged changes, unstaged changes, and untracked text files. Staged and unstaged diffs are supplied separately. With `--base`, the plugin compares the working tree against the merge base of `HEAD` and the requested reference, plus untracked text. **Review commands require a Git repository with an initial commit.** Inputs over 1 MiB are rejected rather than silently truncated. Untracked binary and non-regular files are skipped with a note.

Rescue is read-only by default. Explicitly authorized `--write` operations add editing tools. Claude cannot run shell commands through this plugin; Codex performs any necessary build and test verification.

Transfer creates a new session from your summary. It does not import the full Codex transcript. A returned Claude `sessionId` can be resumed in your terminal:

```sh
claude --resume SESSION_ID
```

Plugin job IDs and Claude session IDs are different identifiers. Use a session ID from the same repository when passing `--resume` to rescue.

The worker requests the user's language, with Japanese as its fallback. You can explicitly request English in a task description or a focus/handoff prompt. Some built-in confirmation messages are currently Japanese.

### Select a model

`test`, `review`, `adversarial-review`, `rescue`, and `transfer` accept `--model`. The other commands do not run inference and do not accept it.

```text
/claude:test --model Sonnet 5
/claude:review --model Opus 5
/claude:review --model claude-opus-5
/claude:test --model Haiku 4.5
```

The parser accepts compact names, space-separated names, aliases, and model IDs. Examples of its normalization behavior:

| Input | Forwarded model ID |
| --- | --- |
| `Opus 5` or `Opus5` | `claude-opus-5` |
| `Sonnet 5` | `claude-sonnet-5` |
| `Haiku 4.5` | `claude-haiku-4-5` |
| `Fable5` or `Fable 5` | `claude-fable-5` |
| `Fable 5.1` | `claude-fable-5-1` |

These are parser examples, **not a guarantee that a model is available** in your account, provider, or Claude Code version. The plugin forwards the selected ID and reports the actual result. If `--model` is omitted on a background command, Claude Code chooses its default under restricted mode. The test command always requires an explicit model.

### Fable confirmation

Before launching an explicitly selected Fable model, the plugin displays a warning about eligible plans, including Claude Max, and possible credit consumption. It waits for your consent. This is a confirmation mechanism, not a check of your subscription or balance.

```text
/claude:test --model Fable 5.1
/claude:test --model Fable 5.1 -y
/claude:review --model Fable 5 -yes
```

Both **`-y`** and **`-yes`** acknowledge the warning for that request and skip the prompt. They do not grant editing or additional tool permissions. On an interactive terminal, answer `y` or `yes` to approve. Without an interactive terminal or prior consent, the CLI returns `confirmation_required`, exits with code `2`, and does not start Claude.

MCP callers must set `confirmFable: true` only after explicit consent for that request, or a user-supplied `-y`/`-yes` flag. Do not infer consent from general task authorization.

### Connection tests

`/claude:test` sends a fixed short prompt from an empty temporary directory with all Claude tools disabled. It runs synchronously and does not create a job ID. Its default timeout is 30 seconds, configurable from 1 to 120 seconds:

```sh
node plugins/claude/dist/cli.mjs /claude:test --model sonnet --timeout-seconds 60
```

A completed response includes `result`, `requestedModel`, `reportedModels`, `elapsedMs`, and `costUsd` when reported. `reportedModels` comes from CLI usage metadata; it may include auxiliary models. A successful response verifies connectivity at that time, not future capacity or model quality.

### Multiline prompts and background limits

Use a UTF-8 prompt file for longer rescue, transfer, or adversarial-review requests:

```sh
node plugins/claude/dist/cli.mjs /claude:rescue --repo "/absolute/path/to/project" --prompt-file "/absolute/path/to/task.txt" --wait
```

Background commands accept `--timeout-seconds` from 1 to 3600, with a default of 600 seconds. Optional `--effort` values are `low`, `medium`, `high`, `xhigh`, and `max`; actual support depends on the selected model and CLI.

## Authentication, permissions, and storage

- Claude requests use your local Claude Code account or API configuration. Its usage and billing are separate from Codex.
- Children run with `--restricted`. User, project, and local settings files are not inherited. A model or `apiKeyHelper` configured only in those files will not automatically apply. Use explicit model selection and authentication supported in restricted mode.
- Read-only jobs expose `Read`, `Glob`, and `Grep`. Authorized rescue writes add `Edit` and `Write`. Test requests expose no tools. Additional MCP servers, hooks, and slash commands are disabled.
- Tool restrictions are not an OS sandbox. Use trusted repositories and isolate concurrent editing work when necessary.
- Prompts, diffs, and accessed code are sent to the service configured for Claude Code. Submit only material you are authorized to share with that service.
- Job state and results are stored under `~/.claude-plugin-cc/jobs`. They may contain source code and task descriptions. `CLAUDE_PLUGIN_DATA_DIR` overrides this location.
- Only one background job may run per canonical repository. Cancelling a job does not undo edits already made.
- Retrieving a result does not start another inference request.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Claude cannot start | Check `claude --version` in the same environment as Codex. Set `CLAUDE_PLUGIN_CLI` to a native executable path if necessary; Windows `.cmd` wrappers are not supported by this launcher. |
| `compatible: false` | Install a Claude Code version that supports `--restricted`. |
| `authenticated: false` | Check your Claude Code login or API authentication. |
| `authenticated: null` with `authError` | Authentication could not be verified. Inspect the returned diagnostic; this is not necessarily a missing login. Setup exits with code `1`. |
| Model request fails | Inspect the returned error and requested model ID. Check availability for your CLI, account, and provider. Confirmation does not guarantee Fable access. |
| `No changes to review` | Make reviewable changes or supply an appropriate base reference. |
| Review fails before any inference | Check that the target has an initial commit and the review input fits within 1 MiB. |
| Repository has an active lock | Inspect `/claude:status` before starting another job. |
| Job is `interrupted` | Verify that its old worker and Claude process have stopped, then remove only that repository's `active.lock` in the job storage directory. Do not remove a live job's lock. |
| Updated commands are not visible | Reinstall the updated local plugin and start a new Codex task. |

Failed Claude processes retain structured error details from stdout when provided, along with stderr diagnostics. Timeouts and failed model requests are not reported as successful tests.

## MCP interface

| Tool | Inputs |
| --- | --- |
| `claude_setup` | No arguments. |
| `claude_test` | Required `model`; optional `confirmFable`, `timeoutSeconds`. |
| `claude_review` | Required `repo`; optional `base` and shared execution options. |
| `claude_adversarial_review` | Required `repo`; optional `base`, `prompt`, and shared options. |
| `claude_rescue` | Required `repo`, `prompt`; optional `write`, `resume`, and shared options. |
| `claude_transfer` | Required `repo`, `prompt`; optional shared options. |
| `claude_status` | Required `repo`; optional `id`. |
| `claude_result` | Required `repo`, `id`. |
| `claude_cancel` | Required `repo`, `id`. |

Shared background execution options are `model`, `confirmFable`, `effort`, and `timeoutSeconds`. `repo` must be an absolute Git repository path. Start responses contain a job `id`, `state`, and `repo`; an unapproved Fable request instead returns `confirmation_required` without a job ID. The synchronous test command has its own response format described above.

## Development

From the repository root:

```sh
npm ci
npm run check
```

`check` rebuilds the bundled CLI, MCP server, and worker, then runs the automated tests. The regular tests use local fixtures and do not make paid Claude requests.

```text
plugins/claude/
  .codex-plugin/plugin.json   Plugin manifest
  .mcp.json                  Local MCP server configuration
  skills/                    Command instructions for Codex
  references/                Shared model and consent instructions
  src/                       Runtime source
  dist/                      Bundled entry points for installation
tests/                       Automated tests and fixtures
scripts/                     Build and optional live smoke test
```

Run `npm run build` after source changes and include the generated bundles when publishing the plugin. Reinstall an updated source copy through your Codex installation's supported plugin update workflow. Updating this checkout alone does not update an already cached installation.

An optional live integration check is available:

```sh
node scripts/smoke-real.mjs
```

It creates a small synthetic repository, makes real Claude requests, and consumes usage. Its result is saved to the Git-ignored `.claude-plugin-cc/smoke-result.json`.

When reporting a bug, include the command, OS, Node.js and Claude Code versions, and a sanitized error or minimal reproduction. Do not include credentials or private code in public issues.

## License

[MIT](LICENSE). Bundled dependency notices are included in [THIRD_PARTY_LICENSES.txt](plugins/claude/THIRD_PARTY_LICENSES.txt).
