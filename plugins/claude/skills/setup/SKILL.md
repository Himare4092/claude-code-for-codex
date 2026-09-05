---
name: setup
description: Use when the user requests /claude:setup or needs to check the local Claude Code installation and authentication for this plugin.
---

# /claude:setup

Check `compatible` as well as `installed` and `authenticated`. This plugin requires Claude Code's `--restricted` flag. Restricted child runs ignore user/project/local settings files, so a model or apiKeyHelper defined only there is not inherited. Use an explicit model when requested; do not bypass restricted mode to repair authentication.

Call the plugin MCP tool `claude_setup` with `{}`. Report the observed CLI version and authentication status, distinguishing unavailable checks from failed checks.

If the MCP tool is unavailable, resolve the installed plugin root from the current skill location (two directories above this skill directory) and run:

```powershell
node "ABS_PLUGIN_ROOT/dist/cli.mjs" /claude:setup
```

Replace ABS_PLUGIN_ROOT with its actual absolute path. The literal `/claude:setup` is this plugin's command alias; slash-menu registration depends on the Codex host.

If authentication is missing, direct the user to sign in using their local Claude Code CLI. Do not copy credentials into prompts or logs. Use the existing account and model configuration; do not install software, switch accounts, or change global settings as part of this check. Claude execution uses the local Claude account or API configuration, independently of Codex usage limits.
