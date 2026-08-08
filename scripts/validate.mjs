#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/;
const MATURITY = new Set(["experimental", "stable", "deprecated", "revoked"]);
const RISK_TIERS = new Set(["T0", "T1", "T2", "T3", "T4", "T5"]);
const HIGH_EFFECTS = new Set([
  "external-write",
  "destructive",
  "publish",
  "deploy",
  "memory-write",
  "privilege-change",
]);

function addError(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringSet(value) {
  return (
    Array.isArray(value) &&
    value.every(isNonEmptyString) &&
    new Set(value).size === value.length
  );
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(target, errors, label) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    addError(errors, label, `cannot read valid JSON (${error.message})`);
    return null;
  }
}

export function parseSkillFrontmatter(markdown, label = "SKILL.md") {
  const errors = [];
  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== "---") {
    return { data: {}, bodyStart: 0, errors: [`${label}: must start with YAML frontmatter`] };
  }

  const closing = lines.indexOf("---", 1);
  if (closing === -1) {
    return { data: {}, bodyStart: 0, errors: [`${label}: frontmatter is not closed`] };
  }

  const data = {};
  for (const [offset, rawLine] of lines.slice(1, closing).entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(line);
    if (!match) {
      errors.push(`${label}:${offset + 2}: strict-core frontmatter must use one-line scalar values`);
      continue;
    }
    const [, key, rawValue] = match;
    if (Object.hasOwn(data, key)) {
      errors.push(`${label}:${offset + 2}: duplicate frontmatter key '${key}'`);
      continue;
    }
    data[key] = rawValue.replace(/^("|')|("|')$/g, "").trim();
  }

  const keys = Object.keys(data);
  for (const required of ["name", "description"]) {
    if (!isNonEmptyString(data[required])) {
      errors.push(`${label}: missing non-empty '${required}' frontmatter`);
    }
  }
  for (const key of keys) {
    if (key !== "name" && key !== "description") {
      errors.push(`${label}: '${key}' is vendor-specific or optional; move it to a sidecar`);
    }
  }

  if (data.name && (!ID_PATTERN.test(data.name) || data.name.length > 64)) {
    errors.push(`${label}: name must be lowercase kebab-case and at most 64 characters`);
  }
  if (data.description && data.description.length > 1024) {
    errors.push(`${label}: description must be at most 1024 characters`);
  }

  return { data, bodyStart: closing + 1, errors };
}

function requireObject(value, errors, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addError(errors, location, "must be an object");
    return false;
  }
  return true;
}

function requireKeys(value, keys, errors, location) {
  if (!requireObject(value, errors, location)) return;
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) addError(errors, location, `missing '${key}'`);
  }
}

export function validateCapabilityDocument(capability, expectedId = undefined) {
  const errors = [];
  const required = [
    "$schema",
    "schemaVersion",
    "id",
    "version",
    "title",
    "summary",
    "owner",
    "maturity",
    "roles",
    "lifecycleStages",
    "contract",
    "execution",
    "risk",
    "permissions",
    "assurance",
    "observability",
    "supplyChain",
    "compatibility",
    "support",
  ];
  requireKeys(capability, required, errors, "capability");
  if (errors.length > 0 && !capability) return errors;

  if (!ID_PATTERN.test(capability.id ?? "")) addError(errors, "capability.id", "must be lowercase kebab-case");
  if (expectedId && capability.id !== expectedId) {
    addError(errors, "capability.id", `must match '${expectedId}'`);
  }
  for (const field of ["schemaVersion", "version"]) {
    if (!SEMVER_PATTERN.test(capability[field] ?? "")) {
      addError(errors, `capability.${field}`, "must be semantic version syntax");
    }
  }
  if (!MATURITY.has(capability.maturity)) addError(errors, "capability.maturity", "has an unknown value");
  if (!isStringSet(capability.roles) || capability.roles.length === 0) {
    addError(errors, "capability.roles", "must be a non-empty unique string array");
  }
  if (!isStringSet(capability.lifecycleStages) || capability.lifecycleStages.length === 0) {
    addError(errors, "capability.lifecycleStages", "must be a non-empty unique string array");
  }

  requireKeys(capability.owner, ["name", "contact"], errors, "capability.owner");
  requireKeys(
    capability.contract,
    ["inputs", "outputs", "errors", "preconditions", "postconditions"],
    errors,
    "capability.contract",
  );
  if (!Array.isArray(capability.contract?.inputs) || capability.contract.inputs.length === 0) {
    addError(errors, "capability.contract.inputs", "must not be empty");
  }
  if (!Array.isArray(capability.contract?.outputs) || capability.contract.outputs.length === 0) {
    addError(errors, "capability.contract.outputs", "must not be empty");
  }

  requireKeys(
    capability.execution,
    ["kind", "idempotent", "timeoutSeconds", "retry", "rollback"],
    errors,
    "capability.execution",
  );
  requireKeys(capability.risk, ["tier", "sideEffects", "approval"], errors, "capability.risk");
  if (!RISK_TIERS.has(capability.risk?.tier)) addError(errors, "capability.risk.tier", "has an unknown value");
  if (!isStringSet(capability.risk?.sideEffects)) {
    addError(errors, "capability.risk.sideEffects", "must be a unique string array");
  }
  if (capability.risk?.tier === "T5" && capability.risk?.approval !== "forbidden") {
    addError(errors, "capability.risk.approval", "T5 capabilities must be forbidden");
  }
  const effects = new Set(capability.risk?.sideEffects ?? []);
  if (effects.has("none") && effects.size > 1) {
    addError(errors, "capability.risk.sideEffects", "'none' cannot be combined with another effect");
  }
  if ([...effects].some((effect) => HIGH_EFFECTS.has(effect))) {
    if (!new Set(["T3", "T4", "T5"]).has(capability.risk?.tier)) {
      addError(errors, "capability.risk.tier", "high-impact effects require T3 or higher");
    }
    if (!new Set(["explicit-user", "two-person", "forbidden"]).has(capability.risk?.approval)) {
      addError(errors, "capability.risk.approval", "high-impact effects require explicit approval");
    }
  }

  requireKeys(
    capability.permissions,
    ["filesystem", "network", "tools", "secrets", "memory"],
    errors,
    "capability.permissions",
  );
  requireKeys(capability.permissions?.filesystem, ["read", "write"], errors, "capability.permissions.filesystem");
  requireKeys(capability.permissions?.network, ["mode", "allowlist"], errors, "capability.permissions.network");
  requireKeys(capability.permissions?.memory, ["read", "write"], errors, "capability.permissions.memory");
  for (const [name, value] of [
    ["filesystem.read", capability.permissions?.filesystem?.read],
    ["filesystem.write", capability.permissions?.filesystem?.write],
    ["network.allowlist", capability.permissions?.network?.allowlist],
    ["tools", capability.permissions?.tools],
    ["secrets", capability.permissions?.secrets],
  ]) {
    if (!isStringSet(value)) addError(errors, `capability.permissions.${name}`, "must be a unique string array");
  }
  if (capability.permissions?.network?.mode === "none" && effects.has("network-read")) {
    addError(errors, "capability.permissions.network", "network-read is declared but network mode is none");
  }
  if (capability.permissions?.network?.mode !== "none" && !effects.has("network-read") && !effects.has("external-write")) {
    addError(errors, "capability.risk.sideEffects", "network permission requires a declared network effect");
  }
  if ((capability.permissions?.filesystem?.write?.length ?? 0) > 0 && !effects.has("workspace-write")) {
    addError(errors, "capability.risk.sideEffects", "filesystem write permission requires workspace-write");
  }
  if (capability.permissions?.memory?.write && !effects.has("memory-write")) {
    addError(errors, "capability.risk.sideEffects", "memory write permission requires memory-write");
  }

  requireKeys(capability.assurance, ["tests", "evals", "threatModel"], errors, "capability.assurance");
  if (!isStringSet(capability.assurance?.tests) || capability.assurance.tests.length === 0) {
    addError(errors, "capability.assurance.tests", "must be a non-empty unique string array");
  }
  if (!Array.isArray(capability.assurance?.evals) || capability.assurance.evals.length === 0) {
    addError(errors, "capability.assurance.evals", "must declare at least one eval");
  } else {
    for (const [index, evaluation] of capability.assurance.evals.entries()) {
      requireKeys(evaluation, ["id", "metric", "threshold"], errors, `capability.assurance.evals[${index}]`);
      if (typeof evaluation?.threshold !== "number" || evaluation.threshold < 0 || evaluation.threshold > 1) {
        addError(errors, `capability.assurance.evals[${index}].threshold`, "must be between 0 and 1");
      }
    }
  }

  requireKeys(
    capability.observability,
    ["traceFields", "metrics", "capture", "sensitiveData"],
    errors,
    "capability.observability",
  );
  if (!isStringSet(capability.observability?.traceFields) || capability.observability.traceFields.length === 0) {
    addError(errors, "capability.observability.traceFields", "must not be empty");
  }
  if (!isStringSet(capability.observability?.metrics) || capability.observability.metrics.length === 0) {
    addError(errors, "capability.observability.metrics", "must not be empty");
  }

  requireKeys(capability.supplyChain, ["license", "source", "dependencies"], errors, "capability.supplyChain");
  if (!isStringSet(capability.supplyChain?.dependencies)) {
    addError(errors, "capability.supplyChain.dependencies", "must be a unique string array");
  }
  requireKeys(capability.compatibility, ["agentSkillsSpec", "hosts"], errors, "capability.compatibility");
  if (!isStringSet(capability.compatibility?.hosts) || capability.compatibility.hosts.length === 0) {
    addError(errors, "capability.compatibility.hosts", "must not be empty");
  }
  requireKeys(capability.support, ["level", "security"], errors, "capability.support");

  return errors;
}

async function validateSkill(root, catalogEntry, errors) {
  const skillRoot = path.resolve(root, catalogEntry.path);
  const canonicalRoot = path.resolve(root, ".agents", "skills");
  if (!skillRoot.startsWith(`${canonicalRoot}${path.sep}`)) {
    addError(errors, catalogEntry.id, "skill path escapes .agents/skills");
    return null;
  }
  if (!(await exists(skillRoot))) {
    addError(errors, catalogEntry.id, `missing skill directory '${catalogEntry.path}'`);
    return null;
  }

  const skillFile = path.join(skillRoot, "SKILL.md");
  if (!(await exists(skillFile))) {
    addError(errors, catalogEntry.id, "missing SKILL.md");
    return null;
  }
  const markdown = await readFile(skillFile, "utf8");
  const parsed = parseSkillFrontmatter(markdown, `${catalogEntry.path}/SKILL.md`);
  errors.push(...parsed.errors);
  if (parsed.data.name !== catalogEntry.id) {
    addError(errors, catalogEntry.id, "directory, catalog id, and SKILL.md name must match");
  }
  if (markdown.split(/\r?\n/).length > 500) {
    addError(errors, catalogEntry.id, "SKILL.md must stay under 500 lines");
  }

  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    const reference = match[1].trim().split(/\s+/)[0].replace(/^<|>$/g, "");
    if (!reference || /^(?:https?:|mailto:|#)/.test(reference)) continue;
    const resolved = path.resolve(skillRoot, reference);
    if (!resolved.startsWith(`${skillRoot}${path.sep}`) || !(await exists(resolved))) {
      addError(errors, catalogEntry.id, `broken or escaping reference '${reference}'`);
    }
  }

  const manifestPath = path.resolve(root, catalogEntry.manifest);
  if (!manifestPath.startsWith(`${skillRoot}${path.sep}`)) {
    addError(errors, catalogEntry.id, "capability manifest must live inside its skill directory");
    return null;
  }
  const capability = await loadJson(manifestPath, errors, `${catalogEntry.id}/capability.json`);
  if (!capability) return null;
  for (const message of validateCapabilityDocument(capability, catalogEntry.id)) {
    addError(errors, catalogEntry.id, message);
  }
  if (capability.maturity !== catalogEntry.maturity) {
    addError(errors, catalogEntry.id, "catalog and capability maturity must match");
  }
  if (capability.supplyChain?.source !== catalogEntry.path) {
    addError(errors, catalogEntry.id, "supplyChain.source must match the catalog skill path");
  }
  for (const output of capability.contract?.outputs ?? []) {
    if (!output.template) continue;
    const template = path.resolve(skillRoot, output.template);
    if (!template.startsWith(`${skillRoot}${path.sep}`) || !(await exists(template))) {
      addError(errors, catalogEntry.id, `missing or escaping output template '${output.template}'`);
    }
  }

  const openAiMetadata = path.join(skillRoot, "agents", "openai.yaml");
  if (await exists(openAiMetadata)) {
    const metadata = await readFile(openAiMetadata, "utf8");
    if (!metadata.includes(`$${catalogEntry.id}`)) {
      addError(errors, catalogEntry.id, "agents/openai.yaml default_prompt must mention the skill with '$'");
    }
  }
  return capability;
}

export async function validateRepository(root = process.cwd()) {
  const errors = [];
  const warnings = [];
  const capabilities = {};
  const resolvedRoot = path.resolve(root);

  const catalogPath = path.join(resolvedRoot, "catalog.json");
  const catalog = await loadJson(catalogPath, errors, "catalog.json");
  for (const schemaName of ["catalog.schema.json", "capability.schema.json"]) {
    const schemaPath = path.join(resolvedRoot, "contracts", schemaName);
    const schema = await loadJson(schemaPath, errors, `contracts/${schemaName}`);
    if (schema && schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      addError(errors, `contracts/${schemaName}`, "must use JSON Schema draft 2020-12");
    }
  }

  if (!catalog) return { root: resolvedRoot, catalog: null, capabilities, errors, warnings };
  for (const field of ["schemaVersion", "name", "version", "description", "roles", "skills"]) {
    if (!Object.hasOwn(catalog, field)) addError(errors, "catalog.json", `missing '${field}'`);
  }
  if (!SEMVER_PATTERN.test(catalog.schemaVersion ?? "")) addError(errors, "catalog.schemaVersion", "must be semantic version syntax");
  if (!SEMVER_PATTERN.test(catalog.version ?? "")) addError(errors, "catalog.version", "must be semantic version syntax");
  if (!Array.isArray(catalog.roles)) addError(errors, "catalog.roles", "must be an array");
  if (!Array.isArray(catalog.skills)) addError(errors, "catalog.skills", "must be an array");

  const roleIds = new Set();
  const catalogRoles = Array.isArray(catalog.roles) ? catalog.roles : [];
  for (const [index, role] of catalogRoles.entries()) {
    const location = `catalog.roles[${index}]`;
    if (!role || typeof role !== "object" || Array.isArray(role)) {
      addError(errors, location, "must be an object");
      continue;
    }
    for (const field of ["id", "title", "summary"]) {
      if (!Object.hasOwn(role, field)) addError(errors, location, `missing '${field}'`);
    }
    for (const field of Object.keys(role)) {
      if (!new Set(["id", "title", "summary"]).has(field)) {
        addError(errors, location, `unknown field '${field}'`);
      }
    }
    if (!ID_PATTERN.test(role.id ?? "")) {
      addError(errors, `${location}.id`, "must be lowercase kebab-case");
    } else {
      if (roleIds.has(role.id)) addError(errors, "catalog.roles", `duplicate id '${role.id}'`);
      roleIds.add(role.id);
    }
    if (!isNonEmptyString(role.title) || role.title.length > 80) {
      addError(errors, `${location}.title`, "must be a non-empty string of at most 80 characters");
    }
    if (!isNonEmptyString(role.summary) || role.summary.length > 300) {
      addError(errors, `${location}.summary`, "must be a non-empty string of at most 300 characters");
    }
  }

  const seen = new Set();
  const referencedRoles = new Set();
  for (const entry of catalog.skills ?? []) {
    if (!entry || typeof entry !== "object") {
      addError(errors, "catalog.skills", "every entry must be an object");
      continue;
    }
    if (!ID_PATTERN.test(entry.id ?? "")) addError(errors, "catalog.skills", "entry id must be lowercase kebab-case");
    if (seen.has(entry.id)) addError(errors, "catalog.skills", `duplicate id '${entry.id}'`);
    seen.add(entry.id);
    if (!MATURITY.has(entry.maturity)) addError(errors, entry.id ?? "catalog.skills", "unknown maturity");
    const capability = await validateSkill(resolvedRoot, entry, errors);
    if (capability) {
      capabilities[entry.id] = capability;
      for (const roleId of capability.roles ?? []) {
        if (!roleIds.has(roleId)) {
          addError(errors, `${entry.id}.roles`, `unknown catalog role '${roleId}'`);
        } else {
          referencedRoles.add(roleId);
        }
      }
    }
  }

  for (const roleId of roleIds) {
    if (!referencedRoles.has(roleId)) addError(errors, "catalog.roles", `role '${roleId}' has no skills`);
  }

  const skillsRoot = path.join(resolvedRoot, ".agents", "skills");
  if (await exists(skillsRoot)) {
    for (const dirent of await readdir(skillsRoot, { withFileTypes: true })) {
      if (dirent.isDirectory() && !seen.has(dirent.name)) {
        addError(errors, dirent.name, "skill directory is missing from catalog.json");
      }
    }
  } else {
    addError(errors, ".agents/skills", "canonical skill directory is missing");
  }

  if ((catalog.skills?.length ?? 0) > 50) {
    warnings.push("catalog: more than 50 skills may crowd host discovery; prefer installable profiles");
  }
  return { root: resolvedRoot, catalog, capabilities, errors, warnings };
}

function parseCliArgs(argv) {
  let root = process.cwd();
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") json = true;
    else if (argument === "--root") root = argv[++index];
    else throw new Error(`Unknown option: ${argument}`);
  }
  return { root, json };
}

async function main() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  const result = await validateRepository(options.root);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.errors.length === 0) {
    console.log(`Validated ${result.catalog.skills.length} skill(s) in ${result.root}`);
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  } else {
    console.error(`Validation failed with ${result.errors.length} error(s):`);
    for (const error of result.errors) console.error(`- ${error}`);
  }
  if (result.errors.length > 0) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
