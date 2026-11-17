# Local connection guide

## Readiness and paths

Run the harness doctor on the same machine that runs the MCP client. Resolve Node.js, the ohmywork checkout, and workspace to absolute paths. A cloud scratch path or Sites preview URL is not a path on the user's laptop. Keep stdio stdout reserved for protocol messages; diagnostics belong on stderr.

Use the current installed Codex CLI and its first-party `codex login` flow. Let Codex manage the saved authentication; do not read or copy it. ChatGPT sign-in can use an eligible plan's Codex access subject to its usage limits. Do not promise that a subscription grants unlimited execution or that emitted tokens reveal remaining allowance.

This implementation invokes the installed Codex CLI with its existing login. It does not implement its own Sign in with ChatGPT OAuth/token-sharing client. For future token-sharing development, consult the current first-party documentation at https://developers.openai.com/siwc/token-sharing-open-source rather than inferring support from third-party proxies.

## Configuration and scope

The template declares `mcp_servers.ohmywork_harness` with an absolute Node command and absolute harness/workspace arguments. Preserve other MCP entries and client settings. Do not overwrite a pre-existing entry without inspecting it and resolving ownership with the user.

Plan-only startup omits `--allow-execution`; the runtime denies execute requests in that state. A user-approved execution startup adds that flag. Do not weaken sandbox settings or add approval bypass flags. Codex children disable `mcp_servers.ohmywork_harness.enabled=false` and block recursion so the harness cannot accidentally launch itself indefinitely.

## Verify in the client

Observe discovery of the six documented harness tools. Call `harness_doctor` and `harness_skills` through the actual connection. If a smoke test is requested, queue a small `mode: "plan"` run and poll its ID to a terminal state. Do not infer a successful connection from process startup or a copied config alone.

For failures, report the failing layer: executable/path, project access, Codex readiness/sign-in, MCP discovery, run submission, or terminal result. Never include pairing tokens or authentication material in diagnostics.

## Local HTTP and ChatGPT

The local dashboard uses port 4318 by default and an in-memory pairing token. Local browser access and stdio MCP are separate transports; do not paste an HTTP token into the stdio config.

Remote ChatGPT tool access needs a supported reachable MCP transport. A ChatGPT Secure MCP Tunnel is optional manual client setup and is not implemented or connected by this package. If the user requests it, verify current first-party documentation and provide a reviewable setup; do not silently expose a local code executor to the internet. A generic MCP connection provides tools, not an embedded ChatGPT app UI.
