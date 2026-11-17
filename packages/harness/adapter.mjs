import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SANDBOXES = new Set(["read-only", "workspace-write"]);
const MESSAGES = {
  unavailable: "Codex CLI is unavailable. Install Codex and run codex login locally.",
  cancelled: "The Codex session was cancelled.",
  timeout: "The Codex session exceeded its time limit.",
  output_limit: "The Codex session exceeded its output limit.",
  malformed_output: "Codex returned invalid JSON Lines output.",
  invalid_result: "Codex did not return a valid final result.",
  rate_limit: "Codex reported a usage or rate limit. Retry manually after checking your account.",
  execution_failed: "Codex could not complete this session. Check Codex locally for details.",
  runtime_unwritable: "Codex cannot write its local runtime files. Run the harness with a writable Codex profile on your local machine, then retry.",
};
const PUBLIC_CODES = {
  unavailable: "codex-unavailable", output_limit: "output-limit",
  malformed_output: "invalid-output", invalid_result: "invalid-output",
  rate_limit: "rate-limit", execution_failed: "executor-failed",
  runtime_unwritable: "runtime-unwritable",
};
const windowsStops = new WeakMap();

function adapterError(code) {
  return Object.assign(new Error(MESSAGES[code]), { code: PUBLIC_CODES[code] ?? code });
}

function classifyFailure(value, beforeEvents = false) {
  const filesystemDenied = /read.only file system|\bEACCES\b|permission denied|\bos error (?:13|30)\b/i.test(value);
  const startupFailure = /failed to (?:initialize|initialise|start|create)|in.process app.server|(?:profile|runtime).*(?:startup|initializ)/i.test(value);
  if (filesystemDenied && (beforeEvents || startupFailure)) return "runtime_unwritable";
  return /rate.?limit|quota|usage.?limit|too many requests|limit reached/i.test(value)
    ? "rate_limit"
    : "execution_failed";
}

function stopProcess(child, signal) {
  if (!child.pid) return Promise.resolve();
  if (process.platform === "win32") {
    if (windowsStops.has(child)) return windowsStops.get(child);
    const pending = new Promise((resolve) => {
      // taskkill is the Windows process-tree equivalent of a POSIX process group.
      // Arguments are passed directly; no command shell interprets the PID.
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        shell: false, windowsHide: true, stdio: "ignore",
      });
      let done = false;
      const timer = setTimeout(() => {
        try { killer.kill(); child.kill("SIGKILL"); } catch { /* Already exited. */ }
        finish();
      }, 1000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      }
      killer.once("error", () => {
        try { child.kill(signal); } catch { /* Already exited. */ }
        finish();
      });
      killer.once("close", finish);
    });
    windowsStops.set(child, pending);
    return pending;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch { /* Already exited. */ }
  }
  return Promise.resolve();
}

function usageFrom(value = {}) {
  const usage = {};
  for (const key of ["input_tokens", "output_tokens", "cached_input_tokens"]) {
    usage[key] = Number.isSafeInteger(value[key]) && value[key] >= 0 ? value[key] : 0;
  }
  return usage;
}

// Capture only transient CLI output. Neither prompts nor raw tool events are written here.
function collectCommand(command, args, { cwd, timeout = 5000, maxBytes = 65536 } = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let finished = false;
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(null); }, timeout);
    function finish(code) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    }
    function receive(chunk, stream) {
      bytes += chunk.length;
      if (bytes > maxBytes) { child.kill("SIGKILL"); finish(null); return; }
      if (stream === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    }
    child.stdout.on("data", (chunk) => receive(chunk, "stdout"));
    child.stderr.on("data", (chunk) => receive(chunk, "stderr"));
    child.once("error", () => finish(null));
    child.once("close", (code) => finish(code));
  });
}

export function createCodexAdapter({ codexCommand = "codex", maxOutputBytes = 2 * 1024 * 1024 } = {}) {
  if (typeof codexCommand !== "string" || !codexCommand || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1024) {
    throw new Error("Invalid Codex adapter configuration.");
  }

  async function doctor({ workspaceRoot } = {}) {
    const versionResult = await collectCommand(codexCommand, ["--version"], { cwd: workspaceRoot });
    const version = /\bcodex(?:-cli)?\s+([0-9][\w.+-]*)/i.exec(versionResult.stdout)?.[1] ?? null;
    if (versionResult.code !== 0) return { available: false, version: null, authenticated: false, method: "none" };
    const authResult = await collectCommand(codexCommand, ["login", "status"], { cwd: workspaceRoot });
    const authenticated = authResult.code === 0;
    const authText = `${authResult.stdout}\n${authResult.stderr}`;
    const method = !authenticated ? "none"
      : /chatgpt/i.test(authText) ? "chatgpt"
        : /api.?key/i.test(authText) ? "api_key" : "unknown";
    return { available: true, version, authenticated, method };
  }

  async function run({ workspaceRoot, prompt, sandbox = "read-only", schema, model, timeoutSeconds = 300, signal, onEvent = () => {} }) {
    if (!SANDBOXES.has(sandbox)) throw new Error("Only read-only and workspace-write sandboxes are supported.");
    if (typeof workspaceRoot !== "string" || !path.isAbsolute(workspaceRoot)) throw new Error("workspaceRoot must be an absolute path.");
    if (typeof prompt !== "string" || !prompt.trim() || Buffer.byteLength(prompt) > 1024 * 1024) throw new Error("Invalid Codex prompt.");
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 0.01 || timeoutSeconds > 3600) throw new Error("Invalid Codex time limit.");
    if (model !== undefined && (typeof model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model))) throw new Error("Invalid model name.");
    if (signal?.aborted) throw adapterError("cancelled");
    let schemaDirectory;
    try {
      const args = ["exec", "--json", "--ephemeral", "--sandbox", sandbox,
        "-c", "approval_policy=\"never\"", "--cd", workspaceRoot];
      // A dotted override creates a new table if the server does not exist, which
      // makes Codex reject the missing transport. Inspect only the canonical
      // server's existence and discard its potentially sensitive configuration.
      const mcpStatus = await collectCommand(codexCommand, ["mcp", "get", "ohmywork_harness", "--json"], {
        cwd: workspaceRoot, timeout: Math.min(5000, timeoutSeconds * 1000),
      });
      if (signal?.aborted) throw adapterError("cancelled");
      if (mcpStatus.code === 0) {
        let exists = false;
        try { exists = JSON.parse(mcpStatus.stdout)?.name === "ohmywork_harness"; } catch { /* No verified server. */ }
        if (exists) args.push("-c", "mcp_servers.ohmywork_harness.enabled=false");
      }
      if (model) args.push("--model", model);
      if (schema !== undefined) {
        schemaDirectory = await mkdtemp(path.join(os.tmpdir(), "ohmywork-schema-"));
        const schemaPath = path.join(schemaDirectory, "output.json");
        await writeFile(schemaPath, JSON.stringify(schema), { mode: 0o600 });
        args.push("--output-schema", schemaPath);
      }
      args.push("-");
      return await new Promise((resolve, reject) => {
        let buffer = "";
        let stderr = "";
        let totalBytes = 0;
        let finalText;
        let turnCompleted = false;
        let sawEvents = false;
        let forcedError;
        let finished = false;
        let hardKillTimer;
        const usage = usageFrom();
        const child = spawn(codexCommand, args, {
          cwd: workspaceRoot, shell: false, detached: process.platform !== "win32", windowsHide: true,
          env: { ...process.env, OHMYWORK_HARNESS_CHILD: "1" }, stdio: ["pipe", "pipe", "pipe"],
        });
        const timer = setTimeout(() => fail("timeout"), timeoutSeconds * 1000);
        const abort = () => fail("cancelled");
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) abort();
        function fail(code) {
          if (finished || forcedError) return;
          forcedError = adapterError(code);
          stopProcess(child, "SIGTERM");
          hardKillTimer = setTimeout(() => stopProcess(child, "SIGKILL"), 300);
          hardKillTimer.unref();
        }
        function consume(line) {
          if (!line.trim() || forcedError) return;
          let event;
          try { event = JSON.parse(line); } catch { fail("malformed_output"); return; }
          if (!event || typeof event !== "object" || typeof event.type !== "string") { fail("malformed_output"); return; }
          sawEvents = true;
          if (event.type === "item.completed" && event.item?.type === "agent_message" && typeof event.item.text === "string") finalText = event.item.text;
          if (event.type === "turn.completed") {
            turnCompleted = true;
            const nextUsage = usageFrom(event.usage);
            for (const key of Object.keys(usage)) usage[key] += nextUsage[key];
          }
          if (event.type === "turn.failed" || event.type === "error") {
            fail(classifyFailure(JSON.stringify(event.error ?? event.message ?? "")));
          }
          if (/^[a-z][a-z._]{0,63}$/.test(event.type)) {
            try { onEvent({ type: event.type }); } catch { /* Observers cannot fail execution. */ }
          }
        }
        function receive(chunk, source) {
          totalBytes += Buffer.byteLength(chunk);
          if (totalBytes > maxOutputBytes) { fail("output_limit"); return; }
          if (source === "stderr") { stderr += chunk; return; }
          buffer += chunk;
          let end;
          while ((end = buffer.indexOf("\n")) !== -1) {
            consume(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
          }
        }
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => receive(chunk, "stdout"));
        child.stderr.on("data", (chunk) => receive(chunk, "stderr"));
        child.stdin.on("error", () => { /* Spawn/close determines the public error. */ });
        child.once("error", () => finish(adapterError("unavailable")));
        child.once("close", async (code) => {
          if (buffer) consume(buffer);
          if (forcedError) {
            // The leader may exit on SIGTERM before descendants do. Kill its group
            // again before settling so an ignored SIGTERM cannot leave work running.
            await stopProcess(child, "SIGKILL");
            return finish(forcedError);
          }
          if (code !== 0) return finish(adapterError(classifyFailure(stderr, !sawEvents)));
          if (!turnCompleted || typeof finalText !== "string" || !finalText.trim()) return finish(adapterError("invalid_result"));
          let structured;
          if (schema !== undefined) {
            try { structured = JSON.parse(finalText); } catch { return finish(adapterError("invalid_result")); }
          }
          finish(null, { text: finalText, structured, usage });
        });
        function finish(error, result) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          clearTimeout(hardKillTimer);
          signal?.removeEventListener("abort", abort);
          if (error) reject(error); else resolve(result);
        }
        child.stdin.end(prompt);
      });
    } finally {
      if (schemaDirectory) await rm(schemaDirectory, { recursive: true, force: true });
    }
  }
  return { doctor, run };
}
