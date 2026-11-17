#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const options = { command: argv[0] ?? 'serve', workspaceRoot: process.cwd(), port: 4318, allowExecution: false };
  if (['--help', '-h', 'help'].includes(options.command)) return { help: true };
  if (!['serve', 'mcp', 'doctor'].includes(options.command)) throw new Error('Use serve, mcp, or doctor');
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--workspace') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('--workspace requires a directory');
      options.workspaceRoot = path.resolve(argv[++i]);
    } else if (arg === '--port') {
      const value = argv[++i];
      if (!/^\d+$/.test(value ?? '') || Number(value) < 1 || Number(value) > 65535) throw new Error('--port must be 1–65535');
      options.port = Number(value);
    } else if (arg === '--allow-execution') options.allowExecution = true;
    else if (arg === '--help' || arg === '-h') return { help: true };
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}
export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write('OhMyWork local agent harness\n\nnode packages/harness/cli.mjs serve|mcp|doctor [--workspace DIRECTORY] [--port 4318] [--allow-execution]\n\nDefault: read-only planning. Execution requires --allow-execution.\n');
    return;
  }
  if (process.env.OHMYWORK_HARNESS_CHILD) throw new Error('Nested harness execution is disabled');
  const { createHarness } = await import('./core.mjs');
  const harness = await createHarness({ workspaceRoot: options.workspaceRoot, allowExecution: options.allowExecution });
  let surface, closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    if (surface) await surface.close();
    await harness.close();
  };
  try {
    if (options.command === 'doctor') { process.stdout.write(`${JSON.stringify(await harness.doctor(), null, 2)}\n`); await close(); return; }
    if (options.command === 'serve') {
      const { createLocalServer } = await import('./server.mjs');
      surface = await createLocalServer({ harness, port: options.port });
      process.stdout.write(`OhMyWork Harness: ${surface.url}\nPairing token: ${surface.token}\nWorkspace: ${options.workspaceRoot}\nExecution: ${options.allowExecution ? 'enabled (workspace-write)' : 'disabled (read-only planning)'}\n`);
    } else {
      const { startStdioServer } = await import('./mcp.mjs');
      surface = startStdioServer({ harness, onClose: () => { void close(); } });
    }
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void close().then(() => { process.exitCode = 0; }, () => { process.exitCode = 1; }); });
  } catch (error) { await close(); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { process.stderr.write(`Harness: ${error.message}\n`); process.exitCode = 1; });
}
