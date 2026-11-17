import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCodexAdapter } from "../packages/harness/adapter.mjs";

const FIXTURE = `#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('codex-cli 0.167.0-alpha.4'); process.exit(0); }
if (args[0] === 'login') { console.error('Logged in using ChatGPT'); process.exit(0); }
if (args[0] === 'mcp') {
  if (__MCP_CONFIGURED__) { console.log(JSON.stringify({name:'ohmywork_harness'})); process.exit(0); }
  process.exit(1);
}
let input = '';
for await (const chunk of process.stdin) input += chunk;
const emit = value => process.stdout.write(JSON.stringify(value)+'\\n');
if (input === 'malformed') { process.stdout.write('{invalid\\n'); setInterval(()=>{},1000); }
else if (input === 'failed') { emit({type:'turn.failed', error:{message:'private internal value'}}); }
else if (input === 'rate') { console.error('usage limit reached; private internal value'); process.exit(1); }
else if (input === 'empty') { emit({type:'turn.completed',usage:{}}); }
else if (input === 'schema-invalid') { emit({type:'item.completed', item:{type:'agent_message', text:'not json'}}); }
else if (input === 'overflow') { process.stdout.write('x'.repeat(10000)); setInterval(()=>{},1000); }
else if (input.startsWith('hold:')) {
  const descendant = spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{}); process.send('ready'); setInterval(()=>{},1000)"],{stdio:['ignore','ignore','ignore','ipc']});
  await new Promise(resolve => descendant.once('message', resolve));
  writeFileSync(input.slice(5), String(descendant.pid));
  setInterval(()=>{},1000);
}
else {
  const result = {input,args,child:process.env.OHMYWORK_HARNESS_CHILD};
  emit({type:'item.completed', item:{type:'command_execution',command:'unredacted-tool-payload'}});
  const line = JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify(result)}});
  process.stdout.write(line.slice(0,9));
  await new Promise(r=>setTimeout(r,5));
  process.stdout.write(line.slice(9)+'\\n');
  // Omit final newline to exercise the trailing JSONL decoder.
  process.stdout.write(JSON.stringify({type:'turn.completed',usage:{input_tokens:12,output_tokens:7,cached_input_tokens:3}}));
}
`;

async function fixture(t, { configuredMcp = true } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ohmywork-adapter-test-"));
  const command = path.join(directory, "fake-codex.mjs");
  await writeFile(command, FIXTURE.replace('__MCP_CONFIGURED__', String(configuredMcp)), { mode: 0o700 });
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, command };
}

test("adapter uses CLI auth status and exposes no raw status output", async (t) => {
  const { directory, command } = await fixture(t);
  const status = await createCodexAdapter({ codexCommand: command }).doctor({ workspaceRoot: directory });
  assert.deepEqual(status, { available: true, version: "0.167.0-alpha.4", authenticated: true, method: "chatgpt" });
  assert.deepEqual(await createCodexAdapter({ codexCommand: path.join(directory, "missing") }).doctor(), {
    available: false, version: null, authenticated: false, method: "none",
  });
});

test("adapter does not create an incomplete MCP configuration when canonical server is absent", async (t) => {
  const { directory, command } = await fixture(t, { configuredMcp: false });
  const result = await createCodexAdapter({ codexCommand: command }).run({
    workspaceRoot: directory, prompt: "ok", schema: { type: "object" },
  });
  assert.ok(!result.structured.args.includes("mcp_servers.ohmywork_harness.enabled=false"));
  assert.equal(result.structured.child, "1");
});

test("adapter uses stdin, bounded sandboxes, ephemeral sessions, and metadata-only events", async (t) => {
  const { directory, command } = await fixture(t);
  const events = [];
  const prompt = "Literal shell characters: $(touch unexpected) `echo nope`";
  const result = await createCodexAdapter({ codexCommand: command }).run({
    workspaceRoot: directory, prompt, sandbox: "workspace-write", model: "test-model",
    schema: { type: "object" }, onEvent: (event) => events.push(event),
  });
  assert.equal(result.structured.input, prompt);
  assert.equal(result.structured.child, "1");
  const args = result.structured.args;
  assert.ok(args.includes("--ephemeral"));
  assert.equal(args[args.indexOf("--sandbox") + 1], "workspace-write");
  assert.ok(args.includes("approval_policy=\"never\""));
  assert.ok(args.includes("mcp_servers.ohmywork_harness.enabled=false"));
  assert.equal(args.at(-1), "-");
  assert.ok(!args.includes(prompt));
  assert.ok(!args.some((arg) => arg.includes("bypass")));
  assert.equal(args[args.indexOf("--model") + 1], "test-model");
  assert.deepEqual(result.usage, { input_tokens: 12, output_tokens: 7, cached_input_tokens: 3 });
  assert.deepEqual(events, [{ type: "item.completed" }, { type: "item.completed" }, { type: "turn.completed" }]);
  await assert.rejects(readFile(args[args.indexOf("--output-schema") + 1]), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(directory, "unexpected")), { code: "ENOENT" });
});

test("adapter reports malformed, failed, empty, rate-limit and oversized sessions without stderr", async (t) => {
  const { directory, command } = await fixture(t);
  const adapter = createCodexAdapter({ codexCommand: command, maxOutputBytes: 2048 });
  for (const [prompt, code] of [["malformed", "invalid-output"], ["failed", "executor-failed"], ["empty", "invalid-output"], ["rate", "rate-limit"], ["overflow", "output-limit"]]) {
    await assert.rejects(adapter.run({ workspaceRoot: directory, prompt }), (error) => {
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private internal value/);
      return true;
    });
  }
  await assert.rejects(adapter.run({ workspaceRoot: directory, prompt: "schema-invalid", schema: { type: "object" } }), { code: "invalid-output" });
});

async function waitForFile(file) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { return await readFile(file, "utf8"); } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
  }
  throw new Error("Fixture did not start.");
}

async function assertStopped(pid) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      process.kill(pid, 0);
      // A reparented Linux zombie is no longer executing; its parent owns reaping.
      if (process.platform === "linux" && /\) Z /.test(await readFile(`/proc/${pid}/stat`, "utf8"))) return;
    } catch { return; }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Descendant process remained active after cancellation.");
}

test("adapter cancels an active process tree and rejects already-aborted sessions", { skip: process.platform === "win32" }, async (t) => {
  const { directory, command } = await fixture(t);
  const pidFile = path.join(directory, "child.pid");
  const controller = new AbortController();
  const adapter = createCodexAdapter({ codexCommand: command });
  const pending = adapter.run({ workspaceRoot: directory, prompt: `hold:${pidFile}`, signal: controller.signal });
  const pid = Number(await waitForFile(pidFile));
  controller.abort();
  await assert.rejects(pending, { code: "cancelled" });
  await assertStopped(pid);
  await assert.rejects(adapter.run({ workspaceRoot: directory, prompt: "ok", signal: controller.signal }), { code: "cancelled" });
});

test("adapter enforces timeout and rejects sandbox escalation", async (t) => {
  const { directory, command } = await fixture(t);
  const adapter = createCodexAdapter({ codexCommand: command });
  await assert.rejects(adapter.run({ workspaceRoot: directory, prompt: `hold:${path.join(directory, "timeout.pid")}`, timeoutSeconds: 0.15 }), { code: "timeout" });
  await assert.rejects(adapter.run({ workspaceRoot: directory, prompt: "ok", sandbox: "danger-full-access" }), /Only read-only/);
});
