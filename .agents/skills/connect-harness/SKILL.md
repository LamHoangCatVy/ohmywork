---
name: connect-harness
description: Connect the local ohmywork agent harness to Codex through stdio MCP, prepare its local dashboard, or explain the manual ChatGPT connection boundary. Use when the user asks to install or configure ohmywork MCP, pair the local app, use an existing Codex ChatGPT sign-in, or troubleshoot harness connection. Do not use for ordinary coding execution, generic MCP theory, or a request to reuse browser cookies or private ChatGPT endpoints.
---

# Connect the local harness

Prepare a reviewable local connection and verify the tools the client can actually reach. Keep authentication in Codex's first-party sign-in flow.

## Inspect before configuring

1. Identify the absolute paths to Node.js, the ohmywork checkout, and the intended project workspace on the same machine as the MCP client.
2. Read workspace instructions and run `node /absolute/path/to/ohmywork/packages/harness/cli.mjs doctor --workspace /absolute/path/to/project`.
3. If Codex sign-in is missing, ask the user to run `codex login` locally and finish first-party ChatGPT sign-in. Never read `auth.json`, print access tokens, extract browser cookies, or automate private ChatGPT web endpoints. Existing Codex authentication is sufficient; this package does not implement its own OAuth token-sharing integration.
4. Check the desired client: Codex stdio MCP, the local dashboard, or a manual ChatGPT connection. Do not claim a generic MCP endpoint embeds an app UI in ChatGPT.

## Prepare a Codex stdio connection

Read [`references/connection-guide.md`](references/connection-guide.md). Start with [`assets/codex-mcp.template.toml`](assets/codex-mcp.template.toml), replacing every placeholder with a verified absolute path. Keep `--allow-execution` absent for a plan-only connection. Include it only when the user has authorized local execution for that workspace.

Show the exact proposed configuration before changing it. Do not write client configuration, credentials, or authentication files autonomously. When the user explicitly requests configuration installation, merge only the named MCP server entry and preserve unrelated client settings; never overwrite the full config or an unmanaged entry silently.

After the user enables the entry, verify tool discovery and call `harness_doctor` from that client. Check the actual tool list:

- `harness_doctor`: inspect local readiness;
- `harness_skills`: inspect available skills;
- `harness_runs`: list runs;
- `harness_get_run`: inspect a returned run ID;
- `harness_run`: queue a plan or authorized execution;
- `harness_cancel`: request cancellation.

Use a read-only plan to smoke-test a requested working connection. Inspect its returned ID until terminal status. Report `prepared`, `connected and verified`, or `blocked` according to observed evidence; a configuration snippet alone is only prepared.

## Prepare the local dashboard

Run the server only on the machine whose workspace will execute:

```bash
node /absolute/path/to/ohmywork/packages/harness/cli.mjs serve --workspace /absolute/path/to/project --port 4318
```

Add `--allow-execution` only for authorized local implementation. The local HTTP pairing token stays in memory. Pair through the local app; never commit, log, or include the token in reports or shared screenshots. Keep loopback hosting and do not silently expose the server over a public tunnel.

## Explain the ChatGPT boundary accurately

The shipped connection is a local dashboard plus stdio MCP. A Sites preview cannot start Codex on the user's computer by itself. ChatGPT requires a supported, reachable MCP connection and user-managed client setup; generic MCP tool access does not imply an embedded ChatGPT interface.

Treat a ChatGPT Secure MCP Tunnel as an optional manual integration. This package does not create, authenticate, or connect that tunnel. Check current first-party client documentation before proposing concrete tunnel setup, and label the connection unverified until its tools are observed in ChatGPT. Do not publish a local executor or claim ChatGPT is connected merely because localhost works.

For a coding run after connection, use `run-agent-harness`. For connection evaluation, use [`references/evaluation-cases.json`](references/evaluation-cases.json) and [`references/evaluation-rubric.md`](references/evaluation-rubric.md).
