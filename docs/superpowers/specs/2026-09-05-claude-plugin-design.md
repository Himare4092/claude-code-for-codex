# Claude plugin design

Approved in the conversation on 2026-09-05, with the command namespace changed to `/claude`.

The repository is `claude-plugin-cc`; the installable plugin is `plugins/claude`, whose manifest name is `claude`. Commands are `/claude:setup`, `/claude:review`, `/claude:adversarial-review`, `/claude:rescue`, `/claude:transfer`, `/claude:status`, `/claude:result`, and `/claude:cancel`. Codex receives skills and MCP tools; slash text is also accepted by the executable CLI. Native slash-menu availability is a host capability, not something this plugin can guarantee.

Node.js 22 or later launches the installed Claude Code CLI without a shell. Review includes tracked working changes and untracked text, or changes against a merge base. Review and transfer expose only Read/Glob/Grep. Rescue additionally exposes Edit/Write when `write` is explicitly requested. Arbitrary shell execution is excluded; Codex runs tests. Hooks are disabled and external MCP configuration is excluded in child runs to avoid re-entry. Authentication remains with Claude Code.

Code review refinement: child runs require Claude's `--restricted` flag to confine file tools to their working directory. This intentionally ignores user/project/local settings, including model selections and apiKeyHelper defined only in those settings; explicit model selection and ordinary Claude OAuth/environment authentication remain supported. Setup feature-detects the required flag. This is a tool permission boundary, not an OS sandbox.

An MCP server and direct CLI share a job service. Jobs persist under the user's home, grouped by canonical repository path. A detached worker owns the Claude process, parses JSON output, handles cancellation requests, applies time/output limits, and writes atomic terminal state. Cancellation never kills a PID read from a stale state file. A repository lease prevents concurrent plugin jobs from racing edits. Crashed workers are reported interrupted using heartbeats. Results are local, may contain source, and are not committed.

Transfer creates a Claude session from a supplied task summary; it does not import an entire Codex transcript. Session IDs are explicit for resume. Defaults preserve Claude's model choice. Setup checks version and authentication without an inference request.

Tests cover Git targets, command parsing, read/write restrictions, launch failures, malformed output, timeout, cancellation, persistence, repository scoping, resume, and MCP protocol. Bundle server, worker, and CLI for installation without npm dependencies. Provide Japanese documentation and a personal marketplace entry. Do not publish to GitHub.
