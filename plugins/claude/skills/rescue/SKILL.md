---
name: rescue
description: Use when the user requests /claude:rescue or wants Codex to delegate a bounded investigation or authorized repair to Claude Code.
---

# /claude:rescue

When `--model` or a model name is provided, first read [model selection and Fable consent](../../references/models.md). Honor space-separated names and `-y`/`-yes`. A `confirmation_required` response is a request for user consent, not a running job. Fable consent does not authorize edits.

Call `claude_rescue` with absolute `repo` and a required `prompt`. Describe the objective, observed failure, relevant files, work already attempted, and completion criteria. Preserve the scope of the user's request.

Use `write:false` (the default) for investigation. Set `write:true` only when the user has authorized edits to this task; existing authorization suffices. Explain the intended edit scope in the prompt. If edits may conflict with concurrent work, use an isolated checkout. Write mode adds Edit and Write to Read, Glob, and Grep. It does not grant shell execution. Codex runs tests and inspects the resulting diff.

Optional arguments: `resume` (an explicit Claude session UUID), `model`, `effort` (low, medium, high, xhigh, max), and `timeoutSeconds` (600 by default, maximum 3600). Resume IDs are Claude session IDs, not plugin job IDs; use only a known session for this repository. Child runs use `--restricted`, which confines file tools to the working directory and ignores user/project/local settings files.

Starts return `id`, `state`, and `repo`. Use `claude_status({repo,id})` and `claude_result({repo,id})`. Report remaining work and validation limits. Do not escalate permissions, run automatic retry loops, or forward unrelated sensitive context.

CLI fallback with an actual plugin root:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:rescue --repo "D:/project" --prompt-file "D:/task.txt" --background
```

The example is read-only. Use --write for authorized editing. Slash-menu availability is controlled by Codex.
