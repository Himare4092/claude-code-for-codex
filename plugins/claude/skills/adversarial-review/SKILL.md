---
name: adversarial-review
description: Use when the user requests /claude:adversarial-review or asks Claude Code to challenge design assumptions and identify failure cases in a change.
---

# /claude:adversarial-review

When `--model` or a model name is provided, first read [model selection and Fable consent](../../references/models.md). Honor space-separated names and `-y`/`-yes`. A `confirmation_required` response is a request for user consent, not a running job.

Call `claude_adversarial_review` with absolute Git `repo`, optional verified `base`, and `prompt` containing the requested focus. Ask Claude to test assumptions with concrete failure scenarios, evidence, and severity rather than inventing objections to meet a quota.

Without base, the review covers tracked working changes against HEAD and untracked text. With base, it compares working content against the merge base. Optional `model` and `effort` (low, medium, high, xhigh, max) preserve defaults when omitted; `timeoutSeconds` defaults to 600 and is capped at 3600.

The returned job ID denotes background execution. Retrieve progress with `claude_status({repo,id})`, then results with `claude_result({repo,id})`. Separate substantiated findings from uncertain risks and report skipped or truncated input. Assess Claude's output before making changes; do not automatically run repeated reviews or repairs.

Claude has Read, Glob, and Grep only. Shell tests belong to Codex's normal authorized workflow.

CLI fallback, after resolving the actual installed plugin root:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:adversarial-review --repo "D:/project" --prompt-file "D:/focus.txt" --background
```

The command alias is accepted by the CLI and skill; a native slash-menu entry depends on the Codex host.
