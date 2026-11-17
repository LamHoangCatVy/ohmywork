import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { createLocalServer } from '../packages/harness/server.mjs';
import { createMcpHandler, startStdioServer, validateRunInput, PROTOCOL_VERSIONS } from '../packages/harness/mcp.mjs';
import { parseArgs } from '../packages/harness/cli.mjs';

function fakeHarness() {
  const runs = [];
  return {
    async doctor() { return { codex: { available: true, authenticated: false }, allowExecution: false }; },
    async listSkills() { return [{ id: 'shape-idea' }]; },
    async listRuns() { return runs; },
    async getRun(id) { return runs.find(run => run.id === id); },
    async createRun(input) { const run = { id: `run-${runs.length}`, status: 'queued', ...input }; runs.push(run); return run; },
    async cancelRun(id) { const run = runs.find(run => run.id === id); if (run) run.status = 'cancelled'; return run; },
    async close() {},
  };
}
const token = 'test-token-for-local-pairing-123456';
async function request(server, pathname, { method = 'GET', headers = {}, body } = {}) {
  const url = new URL(pathname, server.url);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, res => {
      let text = '';
      res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
      res.on('end', () => { let data; try { data = JSON.parse(text); } catch { data = text; } resolve({ status: res.statusCode, headers: res.headers, data }); });
    });
    req.on('error', reject); req.end(body);
  });
}
const auth = { Authorization: `Bearer ${token}` };
const json = { ...auth, 'Content-Type': 'application/json' };

test('local API rejects unpaired, foreign-origin and DNS-rebinding requests', async t => {
  const server = await createLocalServer({ harness: fakeHarness(), token, port: 0 });
  t.after(server.close);
  assert.equal((await request(server, '/api/health')).status, 200);
  assert.equal((await request(server, '/api/runs')).status, 401);
  assert.equal((await request(server, '/api/runs', { headers: { ...auth, Origin: 'https://malicious.example' } })).status, 403);
  assert.equal((await request(server, '/api/runs', { headers: { ...auth, Host: 'malicious.example' } })).status, 403);
  assert.equal((await request(server, '/api/runs', { headers: { Authorization: `Bearer ${token}extra` } })).status, 401);
  const response = await request(server, '/api/doctor', { headers: { ...auth, Origin: server.url } });
  assert.equal(response.status, 200);
  assert.equal(response.data.codex.authenticated, false);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
});

test('local API queues, polls and cancels without accepting arbitrary execution options', async t => {
  const server = await createLocalServer({ harness: fakeHarness(), token, port: 0 }); t.after(server.close);
  const created = await request(server, '/api/runs', { method: 'POST', headers: json, body: JSON.stringify({ goal: 'Inspect fixtures' }) });
  assert.equal(created.status, 202); assert.equal(created.data.status, 'queued'); assert.equal(created.data.mode, 'plan');
  assert.equal((await request(server, `/api/runs/${created.data.id}`, { headers: auth })).data.id, created.data.id);
  assert.equal((await request(server, `/api/runs/${created.data.id}/cancel`, { method: 'POST', headers: auth })).data.status, 'cancelled');
  assert.equal((await request(server, '/api/runs/missing', { headers: auth })).status, 404);
  assert.equal((await request(server, '/api/runs', { method: 'POST', headers: json, body: '{' })).status, 400);
  assert.equal((await request(server, '/api/runs', { method: 'POST', headers: json, body: JSON.stringify({ goal: 'test', workspaceRoot: '/' }) })).status, 400);
  assert.equal((await request(server, '/api/runs', { method: 'POST', headers: auth, body: '{}' })).status, 415);
  assert.equal((await request(server, '/api/runs', { method: 'POST', headers: json, body: JSON.stringify({ goal: 'x'.repeat(530000) }) })).status, 413);
  const largestValid = { goal: 'ệ'.repeat(20000), tasks: Array.from({ length: 24 }, () => 'ệ'.repeat(2000)) };
  const accepted = await request(server, '/api/runs', { method: 'POST', headers: json, body: JSON.stringify(largestValid) });
  assert.equal(accepted.status, 202);
  assert.equal((await request(server, '/../../core.mjs')).status, 404);
});

test('run validation enforces bounded inputs and rejects shell-like model identifiers', () => {
  assert.equal(validateRunInput({ goal: 'Inspect' }).mode, 'plan');
  for (const input of [null, [], { goal: '' }, { goal: 'x', mode: 'shell' }, { goal: 'x', tasks: [] }, { goal: 'x', maxIterations: 9 }, { goal: 'x', timeoutSeconds: 0 }, { goal: 'x', model: 'model;echo hi' }, { goal: 'x', unsafe: true }]) assert.throws(() => validateRunInput(input));
});

test('MCP negotiates supported versions and advertises correct tool hints', async () => {
  for (const protocolVersion of PROTOCOL_VERSIONS) {
    const handle = createMcpHandler(fakeHarness());
    const response = await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion } });
    assert.equal(response.result.protocolVersion, protocolVersion);
    assert.equal(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), undefined);
    const listed = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert.equal(listed.result.tools.length, 6);
    assert.equal(listed.result.tools.find(tool => tool.name === 'harness_doctor').annotations.readOnlyHint, true);
    assert.equal(listed.result.tools.find(tool => tool.name === 'harness_run').annotations.openWorldHint, true);
  }
  const handle = createMcpHandler(fakeHarness());
  assert.equal((await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1900-01-01' } })).error.code, -32602);
  assert.equal((await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).error.code, -32002);
});

test('MCP validates tool arguments, returns queued runs and distinguishes operational errors', async () => {
  const handle = createMcpHandler(fakeHarness());
  await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSIONS[0] } });
  const call = (name, args) => handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } });
  const run = await call('harness_run', { goal: 'Inspect fixtures' });
  assert.equal(run.result.structuredContent.result.status, 'queued');
  assert.equal((await call('harness_get_run', { id: 'missing' })).result.isError, true);
  assert.equal((await call('harness_get_run', { id: '../secret' })).error.code, -32602);
  assert.equal((await call('harness_doctor', { extra: true })).error.code, -32602);
  assert.equal((await call('arbitrary_shell', {})).error.code, -32602);
  assert.equal((await handle([])).error.code, -32600);
});

test('stdio accepts fragmented JSONL, produces protocol-only output and handles malformed JSON', async () => {
  const input = new PassThrough(); const output = new PassThrough(); let text = '';
  output.on('data', chunk => { text += chunk; });
  let closed; const finished = new Promise(resolve => { closed = resolve; });
  startStdioServer({ harness: fakeHarness(), input, output, onClose: closed });
  const request = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSIONS[0] } });
  input.write(request.slice(0, 10)); input.write(request.slice(10) + '\n');
  input.write('{bad}\n'); input.end(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
  await finished;
  const messages = text.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(messages.length, 3); assert.equal(messages[0].result.protocolVersion, PROTOCOL_VERSIONS[0]);
  assert.equal(messages[1].error.code, -32700); assert.equal(messages[2].result.tools.length, 6);
});

test('CLI parses a fixed local workspace and requires explicit execution opt-in', () => {
  assert.equal(parseArgs([]).command, 'serve'); assert.equal(parseArgs(['mcp']).allowExecution, false);
  assert.equal(parseArgs(['serve', '--workspace', '/tmp/example', '--allow-execution', '--port', '4321']).port, 4321);
  for (const args of [['shell'], ['serve', '--port', '0'], ['serve', '--workspace'], ['mcp', '--unsafe'], ['serve', '--port', '4318junk']]) assert.throws(() => parseArgs(args));
});

test('CLI MCP initializes, lists tools and diagnoses a separate repository over real stdio', async t => {
  const { spawn, execFileSync } = await import('node:child_process');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const workspace = await mkdtemp(path.join(tmpdir(), 'ohmywork-mcp-target-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', workspace]);
  const cli = fileURLToPath(new URL('../packages/harness/cli.mjs', import.meta.url));
  const child = spawn(process.execPath, [cli, 'mcp', '--workspace', workspace], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const finished = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 15000); t.after(() => clearTimeout(timeout));
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'harness_doctor', arguments: {} } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'harness_skills', arguments: {} } },
  ];
  child.stdin.end(messages.map(message => JSON.stringify(message)).join('\n') + '\n');
  assert.equal(await finished, 0); assert.equal(stderr, '');
  const responses = stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(responses.length, 4);
  assert.equal(responses[0].result.protocolVersion, '2025-11-25');
  assert.equal(responses[1].result.tools.length, 6);
  assert.equal(responses[2].result.structuredContent.result.workspaceRoot, workspace);
  assert.equal(responses[2].result.structuredContent.result.allowExecution, false);
  assert.equal(typeof responses[2].result.structuredContent.result.codex.available, 'boolean');
  assert.ok(responses[3].result.structuredContent.result.some(skill => skill.id === 'shape-idea'));
});
