---
name: cancel
description: Use when the user requests /claude:cancel or asks to stop a running Claude Code job managed by this plugin.
---

# /claude:cancel

Cancellation requires a specific plugin job ID and repository. Use the ID named by the user or the unambiguous active job in this task. Otherwise call `claude_status({repo})` to identify candidates. If several active jobs remain plausible, ask the user which one to stop; do not assume the newest job or cancel all jobs.

Call `claude_cancel({repo,id})` with the repository's absolute path and resolved ID. User instructions to cancel authorize this action; do not request confirmation again for an identified job.

Report the actual returned state and any failure to stop the process. A cancelled rescue job may already have edited files. Cancellation does not roll back changes; inspect relevant differences when needed and preserve them unless the user authorizes a rollback. Do not kill unrelated Claude processes or delete job history.

CLI fallback with the actual installed plugin root:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:cancel JOB_ID --repo "D:/project"
```

JOB_ID is a plugin job ID, not a Claude session UUID. The CLI and skill accept /claude:cancel; native slash-menu registration is host-controlled.

