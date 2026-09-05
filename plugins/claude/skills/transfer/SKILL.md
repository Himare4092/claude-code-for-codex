---
name: transfer
description: Use when the user requests /claude:transfer or wants to hand Claude Code a concise summary of the current Codex task for read-only continuation.
---

# /claude:transfer

When `--model` or a model name is provided, first read [model selection and Fable consent](../../references/models.md). Honor space-separated names and `-y`/`-yes`. A `confirmation_required` response is a request for user consent, not a running job.

Create a focused handoff summary from the current task: objective, authorized scope, repository, relevant files, decisions, work completed, observed failures, and concrete next steps. Include only context needed for this task. State uncertainties and omit credentials.

Call `claude_transfer` with absolute `repo` and this summary as required `prompt`. This starts a new read-only Claude job. It does not import the Codex transcript, move the Codex task, or grant edit permissions. Use the rescue workflow when the user actually requests implementation.

Optional `model` and `effort` (low, medium, high, xhigh, max) preserve defaults when omitted. `timeoutSeconds` defaults to 600, maximum 3600.

Retain the returned job `id`. Use `claude_status({repo,id})` and `claude_result({repo,id})` to obtain the response; a started job is not completed work. Claude has Read, Glob, and Grep only.

CLI fallback with the installed plugin root resolved:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:transfer --repo "D:/project" --prompt-file "D:/handoff.txt" --background
```

Describe the result as a summary handoff. Codex controls native slash-menu availability; the CLI and skill recognize this alias.
