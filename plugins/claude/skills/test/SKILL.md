---
name: test
description: Use when the user requests /claude:test --model or asks to verify that a specified Claude model can actually be called from this plugin.
---

# /claude:test

Call `claude_test` with the requested `model`. This makes one real, short inference request, so it consumes the selected model's usage. It requires no repository and uses an empty temporary working directory with all tools disabled. Do not substitute setup/auth checks for the actual call.

First read [model selection and Fable consent](../../references/models.md). Accept names such as `Opus 5`, `Fable5`, and `Fable 5.1`. Fable must wait for consent unless the user supplied `-y` or `-yes`; pass `confirmFable:true` only for that consent. Never test an unapproved Fable model as a fallback.

The call waits for a response, with a default timeout of 30 seconds and an optional `timeoutSeconds` from 1 to 120. A `completed` result includes response text, `requestedModel`, `reportedModels` when reported by the CLI, and `elapsedMs`. Show the response or concrete failure. Distinguish the requested model from CLI-reported models; do not use a model's self-description as identity evidence. This is a connectivity test, not a quality evaluation or a guarantee of future capacity.

A `confirmation_required` response means nothing has started. A `failed` or `timed_out` response is not a successful test. This command creates no background job ID, so do not call status/result/cancel for it. Do not automatically retry or test additional models.

CLI fallback after resolving the installed plugin root:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:test --model Opus 5
```

Do not pass repo, prompts, write, resume, or background options. The native slash-menu display is controlled by Codex.
