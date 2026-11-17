# Run evidence and trust boundaries

## Completion gate

Treat the runtime snapshot as the source of run status. A queued result is a receipt, not a completed implementation. Inspect the final snapshot and outputs; do not invent a status label that the runtime has not emitted.

Require the implementation diff, read-only review, and independent validation evidence before describing a change as verified. A read-only review is a model assessment and does not replace a test. Preserve failed, skipped, unavailable, and pending validation distinctly.

Keep iteration exhaustion, timeout, cancellation, execution denial, and task failure visible. Never interpret an empty output, an unchanged diff, or a completion sentence as proof of success. If output is malformed or unavailable, report that limitation and inspect the workspace before retrying.

## Budget and retries

Use `maxIterations` in 1..8 and `timeoutSeconds` in 1..3600. Reduce scope before raising the budget. Retry only after inspecting the previous run and partial edits; otherwise repeated runs can duplicate work. Stop on usage limits and report the actual diagnostic. Do not rotate accounts, extract tokens, or bypass provider limits.

Report actual token counts returned by the runtime when present. A token count does not reveal remaining ChatGPT subscription quota. Authentication through `codex login` is managed by Codex, not by this skill.

## Workspace and execution

The runtime uses read-only planning, workspace-write implementation, and read-only review. The local startup flag `--allow-execution` enables execute requests; it does not authorize unrelated goals, external writes, deployment, or publication.

Keep command arguments structured. Never turn a goal or imported task into shell source. Treat build scripts and tests as executable project code and inspect unfamiliar commands before running them. Respect Codex sandbox enforcement and host policy.

Children cannot start the harness again. Keep `mcp_servers.ohmywork_harness.enabled=false` in children, and do not work around the recursion guard by invoking the CLI directly.

## Local app and HTTP

Use the local dashboard for run submission and inspection. Its HTTP pairing token is an in-memory local credential; do not include it in reports, fixtures, logs, committed files, or shared screenshots. Use stdio MCP for a local Codex connection. A Sites page alone does not execute programs on the user's machine or turn a local HTTP endpoint into a remotely reachable ChatGPT tool.
