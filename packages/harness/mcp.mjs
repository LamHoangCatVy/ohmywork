import { StringDecoder } from 'node:string_decoder';

export const PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
export const RUN_INPUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['goal'],
  properties: {
    goal: { type: 'string', minLength: 1, maxLength: 20000 },
    mode: { type: 'string', enum: ['plan', 'execute'], default: 'plan' },
    tasks: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'string', minLength: 1, maxLength: 2000 } },
    maxIterations: { type: 'integer', minimum: 1, maximum: 8 },
    timeoutSeconds: { type: 'integer', minimum: 1, maximum: 3600 },
    model: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$' },
  },
};

function invalid(message) {
  const error = new Error(message);
  error.code = -32602;
  throw error;
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function validateRunInput(value) {
  if (!object(value)) invalid('Run input must be an object');
  if (Object.keys(value).some(key => !Object.hasOwn(RUN_INPUT_SCHEMA.properties, key))) invalid('Unknown run input field');
  if (typeof value.goal !== 'string' || !value.goal.trim() || value.goal.length > 20000) invalid('goal must contain 1–20000 characters');
  if (value.mode !== undefined && !['plan', 'execute'].includes(value.mode)) invalid('mode must be plan or execute');
  if (value.tasks !== undefined && (!Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 24 || value.tasks.some(task => typeof task !== 'string' || !task.trim() || task.length > 2000))) invalid('tasks must contain 1–24 non-empty task strings');
  if (value.maxIterations !== undefined && (!Number.isInteger(value.maxIterations) || value.maxIterations < 1 || value.maxIterations > 8)) invalid('maxIterations must be an integer from 1 to 8');
  if (value.timeoutSeconds !== undefined && (!Number.isInteger(value.timeoutSeconds) || value.timeoutSeconds < 1 || value.timeoutSeconds > 3600)) invalid('timeoutSeconds must be an integer from 1 to 3600');
  if (value.model !== undefined && (typeof value.model !== 'string' || value.model.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value.model))) invalid('model must be a model identifier');
  return { ...value, mode: value.mode ?? 'plan' };
}
function validateId(args) {
  if (!object(args) || Object.keys(args).some(key => key !== 'id') || typeof args.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(args.id)) invalid('id must be a run identifier');
  return args.id;
}
function noArgs(args) { if (!object(args) || Object.keys(args).length) invalid('This tool takes no arguments'); }
const empty = { type: 'object', additionalProperties: false, properties: {} };
const idSchema = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', minLength: 1, maxLength: 128 } } };
const read = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const TOOLS = [
  { name: 'harness_doctor', description: 'Check local Codex availability, authentication method, workspace and execution policy. Does not expose credentials.', inputSchema: empty, annotations: read },
  { name: 'harness_skills', description: 'List portable skills from this ohmywork checkout.', inputSchema: empty, annotations: read },
  { name: 'harness_runs', description: 'List local harness run metadata.', inputSchema: empty, annotations: read },
  { name: 'harness_get_run', description: 'Read a run and its available in-memory result. Historical runs retain metadata only.', inputSchema: idSchema, annotations: read },
  { name: 'harness_run', description: 'Queue a bounded Codex planning or execution run in the startup workspace. Plan is read-only. Execute can edit files and requires --allow-execution at local startup. Poll harness_get_run for completion.', inputSchema: RUN_INPUT_SCHEMA, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } },
  { name: 'harness_cancel', description: 'Cancel a queued or running local run and stop its child process. Previously written files remain.', inputSchema: idSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
];

export function createMcpHandler(harness) {
  let initialized = false;
  return async function handle(message) {
    const hasId = object(message) && Object.hasOwn(message, 'id');
    const id = hasId && (message.id === null || typeof message.id === 'string' || typeof message.id === 'number') ? message.id : null;
    if (!object(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (hasId && id === null && message.id !== null)) {
      return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } };
    }
    if (!hasId) return undefined;
    try {
      let result;
      if (message.method === 'initialize') {
        const offered = message.params?.protocolVersion;
        if (!PROTOCOL_VERSIONS.includes(offered)) invalid(`Unsupported protocol version; supported: ${PROTOCOL_VERSIONS.join(', ')}`);
        initialized = true;
        result = { protocolVersion: offered, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'ohmywork-harness', version: '0.1.0' } };
      } else if (message.method === 'ping') {
        result = {};
      } else {
        if (!initialized) throw Object.assign(new Error('Initialize the MCP connection first'), { code: -32002 });
        if (message.method === 'tools/list') result = { tools: TOOLS };
        else if (message.method === 'tools/call') {
          const name = message.params?.name;
          const args = message.params?.arguments ?? {};
          if (!TOOLS.some(tool => tool.name === name)) invalid('Unknown tool');
          let value;
          try {
            if (['harness_doctor', 'harness_skills', 'harness_runs'].includes(name)) noArgs(args);
            if (name === 'harness_doctor') value = await harness.doctor();
            else if (name === 'harness_skills') value = await harness.listSkills();
            else if (name === 'harness_runs') value = await harness.listRuns();
            else if (name === 'harness_get_run') value = await harness.getRun(validateId(args));
            else if (name === 'harness_cancel') value = await harness.cancelRun(validateId(args));
            else value = await harness.createRun(validateRunInput(args));
            if (value === undefined || value === null) throw new Error('Run not found');
            result = { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: { result: value }, isError: false };
          } catch (error) {
            if (error.code === -32602) throw error;
            result = { content: [{ type: 'text', text: error.message || 'Harness operation failed' }], isError: true };
          }
        } else throw Object.assign(new Error('Method not found'), { code: -32601 });
      }
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      return { jsonrpc: '2.0', id, error: { code: Number.isInteger(error.code) ? error.code : -32603, message: error.message || 'Internal error' } };
    }
  };
}

export function startStdioServer({ harness, input = process.stdin, output = process.stdout, onClose = () => {} }) {
  const handle = createMcpHandler(harness);
  const decoder = new StringDecoder('utf8');
  let buffer = '', stopped = false, chain = Promise.resolve();
  const send = value => { if (!stopped && value !== undefined) output.write(`${JSON.stringify(value)}\n`); };
  const consume = line => {
    chain = chain.then(async () => {
      if (stopped || !line.trim()) return;
      let message;
      try { message = JSON.parse(line); }
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
      send(await handle(message));
    }).catch(() => send({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } }));
  };
  const data = chunk => {
    buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    let end;
    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (Buffer.byteLength(line) > 1024 * 1024) { close(); return; }
      consume(line);
    }
    if (Buffer.byteLength(buffer) > 1024 * 1024) close();
  };
  const end = () => { buffer += decoder.end(); if (buffer.trim()) consume(buffer); buffer = ''; chain.finally(close); };
  const close = () => {
    if (stopped) return;
    stopped = true;
    input.off('data', data); input.off('end', end); input.off('error', close); output.off('error', close);
    onClose();
  };
  input.on('data', data); input.on('end', end); input.on('error', close); output.on('error', close);
  return { close };
}
