---
name: status
description: Use when the user requests /claude:status or asks for the progress or job list of this plugin's Claude Code work.
---

# /claude:status

Resolve the repository to an absolute path. Call `claude_status({repo,id})` for a known plugin job or `claude_status({repo})` to list that repository's jobs.

Report the returned ID, state, timestamps, and errors that matter. A running or queued job has no final verdict. For a completed job whose findings the user wants, call `claude_result({repo,id})`. Preserve the distinction between a plugin job ID and a Claude session ID.

A status request does not authorize starting, resuming, cancelling, or editing jobs. If multiple jobs match a vague request, show the relevant candidates rather than silently selecting one. Avoid tight polling loops; wait sensibly only when following an active job is part of the request.

CLI fallback with the actual installed plugin root:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:status JOB_ID --repo "D:/project"
```

Omit JOB_ID to list repository jobs. Resolve the plugin root from this skill's location if MCP is unavailable. A native /claude:status menu item depends on the Codex host; the alias is supported by the CLI and skill.

