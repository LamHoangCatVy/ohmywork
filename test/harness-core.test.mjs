import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHarness, redact } from '../packages/harness/core.mjs';

async function repository(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ohmywork-core-'));
  execFileSync('git', ['init', '-q', root]);
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function settled(harness, id) {
  for (let count = 0; count < 200; count++) {
    const run = await harness.getRun(id);
    if (!['queued', 'running'].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Run did not settle');
}
function fake(outputs = []) {
  const calls = [];
  return { calls, doctor: async () => ({ available: true, version: 'test', authenticated: true, method: 'chatgpt' }), run: async (request) => {
    calls.push(request);
    const output = outputs.shift();
    if (output instanceof Error) throw output;
    request.onEvent({ type: 'turn.completed', secret: 'must not be exposed' });
    return { text: '', structured: output, usage: { input_tokens: 10, output_tokens: 3, cached_input_tokens: 2 } };
  } };
}

test('plan uses read-only executor and persists only metadata', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([{ tasks: ['Add an observable health endpoint'] }]);
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const created = await harness.createRun({ goal: 'private customer goal password=secret-value' });
  const run = await settled(harness, created.id);
  assert.equal(created.status, 'queued');
  assert.equal(run.status, 'completed');
  assert.deepEqual(run.result, { tasks: ['Add an observable health endpoint'] });
  assert.equal(adapter.calls[0].sandbox, 'read-only');
  assert.deepEqual(run.usage, { input_tokens: 10, output_tokens: 3, cached_input_tokens: 2 });
  assert.ok(run.events.every((entry) => !('secret' in entry)));
  const disk = await readFile(path.join(workspaceRoot, '.ohmywork/harness', `${run.id}.json`), 'utf8');
  for (const forbidden of ['customer', 'secret-value', 'health endpoint', 'tasks', 'events', 'workspaceRoot']) assert.ok(!disk.includes(forbidden), forbidden);
  assert.equal((await harness.doctor()).codex.method, 'chatgpt');
  assert.ok((await harness.listSkills()).some((skill) => skill.id === 'shape-idea'));
});

test('execution is opt-in and run parameters reject invalid bounds', async (t) => {
  const workspaceRoot = await repository(t);
  const harness = await createHarness({ workspaceRoot, adapter: fake() });
  t.after(() => harness.close());
  await assert.rejects(harness.createRun({ goal: 'build', mode: 'execute' }), { code: 'execution-disabled' });
  for (const input of [{ goal: '' }, { goal: 'x', maxIterations: 9 }, { goal: 'x', timeoutSeconds: 0 }, { goal: 'x', tasks: [] }, { goal: 'x', mode: 'danger' }]) await assert.rejects(harness.createRun(input));
});

test('execute generates a plan then reviews each task in separate read-only calls', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([{ tasks: ['task one', 'task two'] }, undefined, { verdict: 'pass', summary: 'Tested one', findings: [] }, undefined, { verdict: 'pass', summary: 'Tested two', findings: [] }]);
  const harness = await createHarness({ workspaceRoot, adapter, allowExecution: true });
  t.after(() => harness.close());
  const run = await settled(harness, (await harness.createRun({ goal: 'build feature', mode: 'execute' })).id);
  assert.equal(run.status, 'completed');
  assert.deepEqual(adapter.calls.map((request) => request.sandbox), ['read-only', 'workspace-write', 'read-only', 'workspace-write', 'read-only']);
  assert.equal(run.result.tasks.length, 2);
  assert.equal(run.usage.input_tokens, 50);
});

test('bounded fixes end needs_review when evidence still fails', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([undefined, { verdict: 'changes_requested', summary: 'Missing check', findings: ['Add a real test'] }, undefined, { verdict: 'changes_requested', summary: 'Still failing', findings: ['Repair test'] }]);
  const harness = await createHarness({ workspaceRoot, adapter, allowExecution: true });
  t.after(() => harness.close());
  const run = await settled(harness, (await harness.createRun({ goal: 'feature', tasks: ['implement'], mode: 'execute', maxIterations: 2 })).id);
  assert.equal(run.status, 'needs_review');
  assert.equal(run.iteration, 2);
  assert.match(adapter.calls[2].prompt, /Add a real test/);
  assert.equal(adapter.calls.length, 4);
});

test('blocked and invalid reviews never count as completion', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([undefined, { verdict: 'blocked', summary: 'Requires a manual check', findings: [] }, undefined, { verdict: 'pass', summary: 123, findings: [] }]);
  const harness = await createHarness({ workspaceRoot, adapter, allowExecution: true });
  t.after(() => harness.close());
  const blocked = await settled(harness, (await harness.createRun({ goal: 'feature', tasks: ['implement'], mode: 'execute' })).id);
  assert.equal(blocked.status, 'needs_review');
  const malformed = await settled(harness, (await harness.createRun({ goal: 'feature', tasks: ['implement'], mode: 'execute' })).id);
  assert.equal(malformed.status, 'failed');
  assert.equal(malformed.error.code, 'invalid-output');
});

test('usage limit is terminal with a fixed message and no retry', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([Object.assign(new Error('arbitrary secret stderr'), { code: 'rate-limit' })]);
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const run = await settled(harness, (await harness.createRun({ goal: 'feature' })).id);
  assert.equal(run.status, 'failed');
  assert.equal(run.error.code, 'rate-limit');
  assert.equal(adapter.calls.length, 1);
  assert.ok(!JSON.stringify(run).includes('arbitrary secret'));
});

test('single concurrency, queued cancellation and active cancellation', async (t) => {
  const workspaceRoot = await repository(t);
  let active = 0;
  let maximum = 0;
  const adapter = { doctor: async () => ({}), run: ({ signal }) => new Promise((resolve, reject) => {
    active++; maximum = Math.max(maximum, active);
    signal.addEventListener('abort', () => { active--; reject(Object.assign(new Error('cancelled'), { code: 'cancelled' })); }, { once: true });
  }) };
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const first = await harness.createRun({ goal: 'first' });
  const second = await harness.createRun({ goal: 'second' });
  assert.equal((await harness.cancelRun(second.id)).status, 'cancelled');
  assert.equal((await harness.cancelRun(first.id)).status, 'cancelled');
  await settled(harness, first.id);
  assert.ok(maximum <= 1);
  await harness.close();
  await assert.rejects(harness.createRun({ goal: 'closed' }), { code: 'closed' });
});

test('recovery marks interrupted metadata without replaying input', async (t) => {
  const workspaceRoot = await repository(t);
  const stateDir = path.join(workspaceRoot, '.ohmywork/harness');
  await mkdir(stateDir, { recursive: true });
  const id = '12345678-1234-1234-1234-123456789abc';
  await writeFile(path.join(stateDir, `${id}.json`), JSON.stringify({ id, mode: 'execute', status: 'running', stage: 'review', iteration: 1, createdAt: '2026-11-18T00:00:00.000Z', updatedAt: '2026-11-18T00:00:00.000Z', usage: {}, goal: 'do not load', result: 'do not load' }));
  const adapter = fake();
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const run = await harness.getRun(id);
  assert.equal(run.status, 'interrupted');
  assert.equal(run.recovered, true);
  assert.ok(!('goal' in run));
  assert.ok(!('result' in run));
  assert.equal(adapter.calls.length, 0);
});

test('state path traversal and symlinks cannot escape the selected repository', async (t) => {
  const workspaceRoot = await repository(t);
  await assert.rejects(createHarness({ workspaceRoot, stateDir: path.join(workspaceRoot, '..', 'outside'), adapter: fake() }), { code: 'invalid-state-directory' });
  const outside = await mkdtemp(path.join(os.tmpdir(), 'ohmywork-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, path.join(workspaceRoot, '.ohmywork'));
  await assert.rejects(createHarness({ workspaceRoot, adapter: fake() }), { code: 'invalid-state-directory' });
  assert.deepEqual(await readdir(outside), []);
});

test('reports redact common token formats before returning them', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([{ tasks: ['Never expose sk-testtokenABCDEFGHIJ1234 or password=secret-value'] }]);
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const run = await settled(harness, (await harness.createRun({ goal: 'feature' })).id);
  assert.ok(!JSON.stringify(run).includes('testtoken'));
  assert.ok(!JSON.stringify(run).includes('secret-value'));
});


test('recovery refuses leaf symlinks and cannot follow a fixed temporary-file symlink', async (t) => {
  const workspaceRoot = await repository(t);
  const stateDir = path.join(workspaceRoot, '.ohmywork/harness');
  await mkdir(stateDir, { recursive: true });
  const outside = await mkdtemp(path.join(os.tmpdir(), 'ohmywork-snapshot-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const target = path.join(outside, 'important.json');
  const id = '12345678-1234-1234-1234-123456789abc';
  const secondId = '22345678-1234-1234-1234-123456789abc';
  const stored = { id, mode: 'plan', status: 'running', stage: 'plan', iteration: 0, createdAt: '2026-11-18T00:00:00.000Z', updatedAt: '2026-11-18T00:00:00.000Z', usage: {} };
  await writeFile(target, JSON.stringify(stored));
  const before = await readFile(target, 'utf8');
  await writeFile(path.join(stateDir, `${id}.json`), before);
  await symlink(target, path.join(stateDir, `${id}.json.tmp`));
  await symlink(target, path.join(stateDir, `${secondId}.json`));
  const harness = await createHarness({ workspaceRoot, adapter: fake() });
  t.after(() => harness.close());
  assert.equal((await harness.getRun(id)).status, 'interrupted');
  await assert.rejects(harness.getRun(secondId), { code: 'run-not-found' });
  assert.equal(await readFile(target, 'utf8'), before);
});

test('redaction covers JSON quoted strings and recursively sensitive object keys', () => {
  const input = { api_key: 'synthetic-value', nested: { refreshToken: 'synthetic-refresh', harmless: '{"password": "synthetic-password", "OPENAI_API_KEY": "synthetic-key"}' }, usage: { input_tokens: 5 } };
  const output = redact(input);
  assert.equal(output.api_key, '[REDACTED]');
  assert.equal(output.nested.refreshToken, '[REDACTED]');
  for (const secret of ['synthetic-value', 'synthetic-refresh', 'synthetic-password', 'synthetic-key']) assert.ok(!JSON.stringify(output).includes(secret));
  assert.equal(output.usage.input_tokens, 5);
});

test('real subprocess adapter integrates success, quota, malformed, timeout and runtime startup failures', async (t) => {
  const workspaceRoot = await repository(t);
  const command = path.join(workspaceRoot, 'fake-codex.mjs');
  await writeFile(command, `#!/usr/bin/env node
let input = '';
for await (const chunk of process.stdin) input += chunk;
if (input.includes('CASE:quota')) { console.error('usage limit reached; synthetic-private-message'); process.exit(1); }
if (input.includes('CASE:readonly')) { console.error('Error: failed to initialize in-process app-server client: Read-only file system (os error 30); synthetic-private-message'); process.exit(1); }
if (input.includes('CASE:eacces')) { console.error('Error: EACCES opening local runtime profile; synthetic-private-message'); process.exit(1); }
if (input.includes('CASE:tool-readonly')) { console.log(JSON.stringify({ type: 'turn.failed', error: { message: 'Read-only file system; synthetic-private-message' } })); process.exit(0); }
if (input.includes('CASE:malformed')) { process.stdout.write('{broken\\n'); process.exit(0); }
if (input.includes('CASE:timeout')) { setInterval(() => {}, 1000); }
else {
 console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify({ tasks: ['Inspect the feature'] }) } }));
 console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 7, output_tokens: 2, cached_input_tokens: 1 } }));
}
`, { mode: 0o700 });
  const harness = await createHarness({ workspaceRoot, codexCommand: command });
  t.after(() => harness.close());
  const success = await settled(harness, (await harness.createRun({ goal: 'CASE:success' })).id);
  assert.equal(success.status, 'completed');
  assert.deepEqual(success.usage, { input_tokens: 7, output_tokens: 2, cached_input_tokens: 1 });
  for (const [name, code] of [['quota', 'rate-limit'], ['malformed', 'invalid-output'], ['timeout', 'timeout'], ['readonly', 'runtime-unwritable'], ['eacces', 'runtime-unwritable'], ['tool-readonly', 'executor-failed']]) {
    const created = await harness.createRun({ goal: `CASE:${name}`, timeoutSeconds: 1 });
    let run;
    for (let attempt = 0; attempt < 400; attempt++) {
      run = await harness.getRun(created.id);
      if (!['queued', 'running'].includes(run.status)) break;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal(run.status, 'failed', name);
    assert.equal(run.error.code, code, name);
    if (code === 'runtime-unwritable') assert.match(run.error.message, /writable Codex profile on your local machine/);
    assert.ok(!JSON.stringify(run).includes('synthetic-private-message'));
  }
});

test('fresh reviewer receives redacted executor claims and must independently verify them', async (t) => {
  const workspaceRoot = await repository(t);
  const calls = [];
  const adapter = { doctor: async () => ({}), run: async (request) => {
    calls.push(request);
    return request.sandbox === 'workspace-write'
      ? { text: 'Claimed test PASS; password=synthetic-value', usage: {} }
      : { structured: { verdict: 'blocked', summary: 'Cannot independently verify the claim', findings: [] }, usage: {} };
  } };
  const harness = await createHarness({ workspaceRoot, adapter, allowExecution: true });
  t.after(() => harness.close());
  const run = await settled(harness, (await harness.createRun({ goal: 'feature', tasks: ['task'], mode: 'execute' })).id);
  assert.equal(run.status, 'needs_review');
  assert.match(calls[1].prompt, /Claimed test PASS/);
  assert.match(calls[1].prompt, /not proof/);
  assert.doesNotMatch(calls[1].prompt, /synthetic-value/);
});

test('plan mode refines supplied candidate tasks through read-only planning', async (t) => {
  const workspaceRoot = await repository(t);
  const adapter = fake([{ tasks: ['Verify the imported transfer workflow against repository contracts'] }]);
  const harness = await createHarness({ workspaceRoot, adapter });
  t.after(() => harness.close());
  const importedTasks = ['Inspect imported transfer workflow', 'Implement only after the plan is reviewed'];
  const run = await settled(harness, (await harness.createRun({ goal: 'Refine the imported transfer plan', mode: 'plan', tasks: importedTasks })).id);
  assert.equal(run.status, 'completed');
  assert.equal(adapter.calls.length, 1);
  assert.equal(adapter.calls[0].sandbox, 'read-only');
  for (const candidate of importedTasks) assert.ok(adapter.calls[0].prompt.includes(candidate));
  assert.match(adapter.calls[0].prompt, /UNTRUSTED CANDIDATE PLAN/);
  assert.match(adapter.calls[0].prompt, /Refine and verify/);
  assert.match(adapter.calls[0].prompt, /not actions to execute/);
  assert.deepEqual(run.result.tasks, ['Verify the imported transfer workflow against repository contracts']);
});
