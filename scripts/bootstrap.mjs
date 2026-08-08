#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRepository } from "./validate.mjs";

export const AGENTS = Object.freeze({
  codex: { kind: "canonical", path: ".agents/skills" },
  cursor: { kind: "canonical", path: ".agents/skills" },
  opencode: { kind: "canonical", path: ".agents/skills" },
  "claude-code": { kind: "projection", path: ".claude/skills" },
  "hermes-agent": { kind: "projection", path: ".hermes/skills" },
});

async function maybeLstat(target) {
  try {
    return await lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function ensureWithinRoot(root, target, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, target);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label} escapes the project root: ${target}`);
  }
  return resolved;
}

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(root, absolute)));
    else files.push(path.relative(root, absolute));
  }
  return files;
}

export async function hashDirectory(root) {
  const hash = createHash("sha256");
  for (const relative of await walkFiles(root)) {
    const absolute = path.join(root, relative);
    const info = await lstat(absolute);
    hash.update(relative.replaceAll(path.sep, "/"));
    hash.update("\0");
    if (info.isSymbolicLink()) hash.update(await readlink(absolute));
    else hash.update(await readFile(absolute));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function loadState(root) {
  const target = path.join(root, ".ohmywork", "state.json");
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { schemaVersion: "1", source: ".agents/skills", managed: [] };
    }
    throw new Error(`Cannot read .ohmywork/state.json: ${error.message}`);
  }
}

async function writeState(root, state) {
  const directory = path.join(root, ".ohmywork");
  const target = path.join(directory, "state.json");
  const temporary = path.join(directory, "state.json.tmp");
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

function stateRecord(state, agent, skill, target) {
  return state.managed.find(
    (entry) => entry.agent === agent && entry.skill === skill && entry.target === target,
  );
}

async function inspectProjection({ root, source, target, record }) {
  const info = await maybeLstat(target);
  if (!info) return { status: "missing" };
  if (info.isSymbolicLink()) {
    const rawTarget = await readlink(target);
    const resolvedTarget = path.resolve(path.dirname(target), rawTarget);
    const expected = await realpath(source);
    let actual;
    try {
      actual = await realpath(resolvedTarget);
    } catch {
      return { status: "broken-link", detail: rawTarget };
    }
    return actual === expected
      ? { status: "healthy", mode: "symlink" }
      : { status: "collision", detail: `symlink points to ${rawTarget}` };
  }
  if (!info.isDirectory()) return { status: "collision", detail: "target is not a directory" };
  if (!record || record.mode !== "copy") {
    return { status: "collision", detail: "directory is not managed by ohmywork" };
  }
  const [sourceHash, targetHash] = await Promise.all([hashDirectory(source), hashDirectory(target)]);
  if (targetHash !== record.hash) return { status: "modified", mode: "copy", sourceHash, targetHash };
  if (sourceHash !== targetHash) return { status: "stale", mode: "copy", sourceHash, targetHash };
  return { status: "healthy", mode: "copy", sourceHash, targetHash };
}

function normalizeAgents(requested) {
  const values = requested.length === 0 || requested.includes("all") ? Object.keys(AGENTS) : requested;
  const unique = [...new Set(values)];
  for (const agent of unique) {
    if (!Object.hasOwn(AGENTS, agent)) {
      throw new Error(`Unknown agent '${agent}'. Choose: ${Object.keys(AGENTS).join(", ")}`);
    }
  }
  return unique;
}

export async function initializeProject({
  root = process.cwd(),
  agents = [],
  mode = "symlink",
} = {}) {
  const resolvedRoot = path.resolve(root);
  const selectedAgents = normalizeAgents(agents);
  if (mode !== "symlink" && mode !== "copy") throw new Error(`Unknown mode '${mode}'`);

  const validation = await validateRepository(resolvedRoot);
  if (validation.errors.length > 0) {
    throw new Error(`Repository validation failed:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const state = await loadState(resolvedRoot);
  const results = [];
  const pending = [];
  for (const agent of selectedAgents) {
    const adapter = AGENTS[agent];
    if (adapter.kind === "canonical") {
      results.push({ agent, status: "direct", target: adapter.path });
      continue;
    }
    for (const skill of validation.catalog.skills) {
      const sourceRelative = skill.path;
      const targetRelative = path.posix.join(adapter.path, skill.id);
      const source = ensureWithinRoot(resolvedRoot, sourceRelative, "source");
      const target = ensureWithinRoot(resolvedRoot, targetRelative, "target");
      const record = stateRecord(state, agent, skill.id, targetRelative);
      const inspection = await inspectProjection({ root: resolvedRoot, source, target, record });
      if (inspection.status === "collision" || inspection.status === "modified") {
        throw new Error(
          `Refusing to overwrite '${targetRelative}' (${inspection.detail ?? inspection.status}). ` +
            "Move it aside or choose another project before retrying.",
        );
      }
      if (inspection.status === "broken-link") {
        throw new Error(`Refusing to replace broken link '${targetRelative}' without explicit cleanup.`);
      }
      if (inspection.status === "stale") {
        throw new Error(
          `Managed copy '${targetRelative}' is stale. Preserve any edits, remove it explicitly, then rerun init.`,
        );
      }
      if (inspection.status === "healthy") {
        results.push({ agent, skill: skill.id, status: "unchanged", mode: inspection.mode, target: targetRelative });
      } else {
        pending.push({ agent, skill: skill.id, source, sourceRelative, target, targetRelative });
      }
    }
  }

  for (const item of pending) {
    await mkdir(path.dirname(item.target), { recursive: true });
    let actualMode = mode;
    if (mode === "symlink") {
      const linkTarget =
        process.platform === "win32"
          ? item.source
          : path.relative(path.dirname(item.target), item.source);
      try {
        await symlink(linkTarget, item.target, process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        if (!new Set(["EPERM", "EACCES", "UNKNOWN"]).has(error.code)) throw error;
        await cp(item.source, item.target, { recursive: true, errorOnExist: true, force: false });
        actualMode = "copy";
      }
    } else {
      await cp(item.source, item.target, { recursive: true, errorOnExist: true, force: false });
    }
    const hash = await hashDirectory(item.source);
    const nextRecord = {
      agent: item.agent,
      skill: item.skill,
      source: item.sourceRelative,
      target: item.targetRelative,
      mode: actualMode,
      hash,
    };
    const previousIndex = state.managed.findIndex(
      (entry) =>
        entry.agent === item.agent &&
        entry.skill === item.skill &&
        entry.target === item.targetRelative,
    );
    if (previousIndex === -1) state.managed.push(nextRecord);
    else state.managed[previousIndex] = nextRecord;
    results.push({
      agent: item.agent,
      skill: item.skill,
      status: actualMode === mode ? "created" : "created-with-copy-fallback",
      mode: actualMode,
      target: item.targetRelative,
    });
  }

  state.managed.sort((a, b) => `${a.agent}/${a.skill}`.localeCompare(`${b.agent}/${b.skill}`));
  if (pending.length > 0) await writeState(resolvedRoot, state);
  return { root: resolvedRoot, results };
}

export async function doctorProject({ root = process.cwd(), agents = [] } = {}) {
  const resolvedRoot = path.resolve(root);
  const selectedAgents = normalizeAgents(agents);
  const validation = await validateRepository(resolvedRoot);
  const issues = [...validation.errors];
  const results = [];
  if (!validation.catalog) return { root: resolvedRoot, healthy: false, results, issues };
  const state = await loadState(resolvedRoot);

  for (const agent of selectedAgents) {
    const adapter = AGENTS[agent];
    if (adapter.kind === "canonical") {
      results.push({ agent, status: validation.errors.length === 0 ? "healthy" : "invalid", target: adapter.path });
      continue;
    }
    for (const skill of validation.catalog.skills) {
      const source = ensureWithinRoot(resolvedRoot, skill.path, "source");
      const targetRelative = path.posix.join(adapter.path, skill.id);
      const target = ensureWithinRoot(resolvedRoot, targetRelative, "target");
      const record = stateRecord(state, agent, skill.id, targetRelative);
      const inspection = await inspectProjection({ root: resolvedRoot, source, target, record });
      results.push({ agent, skill: skill.id, status: inspection.status, mode: inspection.mode, target: targetRelative });
      if (inspection.status !== "healthy") issues.push(`${agent}/${skill.id}: ${inspection.status}`);
    }
  }
  return { root: resolvedRoot, healthy: issues.length === 0, results, issues };
}

function usage() {
  return `ohmywork bootstrap

Usage:
  node scripts/bootstrap.mjs init [--agent <id>]... [--copy] [--root <path>] [--json]
  node scripts/bootstrap.mjs doctor [--agent <id>]... [--root <path>] [--json]
  node scripts/bootstrap.mjs list [--root <path>] [--json]

Agents: ${Object.keys(AGENTS).join(", ")}, all`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command, root: process.cwd(), agents: [], mode: "symlink", json: false };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--agent") options.agents.push(rest[++index]);
    else if (argument === "--copy") options.mode = "copy";
    else if (argument === "--root") options.root = rest[++index];
    else if (argument === "--json") options.json = true;
    else if (argument === "--help" || argument === "-h") options.command = "help";
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function printResult(payload, json) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  for (const result of payload.results ?? []) {
    const subject = result.skill ? `${result.agent}/${result.skill}` : result.agent;
    console.log(`${subject}: ${result.status} (${result.target})`);
  }
  for (const issue of payload.issues ?? []) console.error(`issue: ${issue}`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    if (!options.command || options.command === "help") {
      console.log(usage());
      return;
    }
    if (options.command === "init") {
      printResult(
        await initializeProject({ root: options.root, agents: options.agents, mode: options.mode }),
        options.json,
      );
      return;
    }
    if (options.command === "doctor") {
      const result = await doctorProject({ root: options.root, agents: options.agents });
      printResult(result, options.json);
      if (!result.healthy) process.exitCode = 1;
      return;
    }
    if (options.command === "list") {
      const validation = await validateRepository(options.root);
      if (validation.errors.length > 0) throw new Error(validation.errors.join("\n"));
      const result = {
        root: validation.root,
        results: validation.catalog.skills.map((skill) => ({
          skill: skill.id,
          status: skill.maturity,
          target: skill.path,
        })),
      };
      printResult(result, options.json);
      return;
    }
    throw new Error(`Unknown command '${options.command}'`);
  } catch (error) {
    if (options?.json) console.log(JSON.stringify({ error: error.message }, null, 2));
    else console.error(error.message);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
