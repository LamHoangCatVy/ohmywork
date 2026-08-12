#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/;
const SYSTEM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEST_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const TYPES = new Set(["unit", "component", "integration", "contract", "system", "e2e"]);
const STATUSES = new Set(["active", "quarantined", "deprecated", "retired"]);
const RISKS = new Set(["low", "medium", "high", "critical"]);
const SIDE_EFFECTS = new Set(["none", "workspace-write", "network-read", "external-write"]);

function uniqueStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0) && new Set(value).size === value.length;
}

function safeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).includes("..");
}

export function validateTestCatalog(catalog, { now = new Date() } = {}) {
  const errors = [];
  const warnings = [];

  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return { valid: false, errors: ["catalog must be a JSON object"], warnings, testCount: 0 };
  }
  if (!SEMVER.test(catalog.schemaVersion ?? "")) errors.push("schemaVersion must use semantic version syntax");
  if (!SYSTEM_ID.test(catalog.systemId ?? "")) errors.push("systemId must be lower-case kebab syntax");
  if (!SEMVER.test(catalog.packVersion ?? "")) errors.push("packVersion must use semantic version syntax");
  if (!catalog.framework || typeof catalog.framework !== "object") errors.push("framework is required");
  else {
    if (!/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+$/.test(catalog.framework.coordinates ?? "")) {
      errors.push("framework.coordinates must use Maven group:artifact syntax");
    }
    if (!SEMVER.test(catalog.framework.version ?? "")) errors.push("framework.version must use semantic version syntax");
  }
  if (catalog.policies?.productionExecution !== "forbidden") {
    errors.push("policies.productionExecution must be 'forbidden'");
  }
  if (!Array.isArray(catalog.tests) || catalog.tests.length === 0) {
    errors.push("tests must contain at least one managed test");
  }

  const ids = new Set();
  for (const [index, test] of (catalog.tests ?? []).entries()) {
    const label = test?.id || `tests[${index}]`;
    if (!test || typeof test !== "object" || Array.isArray(test)) {
      errors.push(`${label}: test entry must be an object`);
      continue;
    }
    if (!TEST_ID.test(test.id ?? "")) errors.push(`${label}: id must be stable upper-case segments such as FLOW-001`);
    if (ids.has(test.id)) errors.push(`${label}: duplicate test id`);
    ids.add(test.id);
    if (typeof test.title !== "string" || test.title.trim().length === 0) errors.push(`${label}: title is required`);
    if (!TYPES.has(test.type)) errors.push(`${label}: unsupported test type '${test.type ?? "missing"}'`);
    if (!STATUSES.has(test.status)) errors.push(`${label}: unsupported lifecycle status '${test.status ?? "missing"}'`);
    if (!RISKS.has(test.risk)) errors.push(`${label}: unsupported risk '${test.risk ?? "missing"}'`);
    if (typeof test.owner !== "string" || test.owner.trim().length === 0 || test.owner === "Unknown") errors.push(`${label}: accountable owner is required`);
    for (const field of ["requirements", "capabilities", "interfaces", "tags", "sideEffects"]) {
      if (!uniqueStrings(test[field])) errors.push(`${label}: ${field} must be a unique non-empty string array`);
    }
    if ((test.requirements?.length ?? 0) === 0 && (test.capabilities?.length ?? 0) === 0) {
      errors.push(`${label}: link at least one requirement or capability`);
    }
    if (!safeRelativePath(test.source) || !test.source.startsWith("packs/")) {
      errors.push(`${label}: source must be a safe relative path under packs/`);
    }
    if (!Number.isInteger(test.timeoutSeconds) || test.timeoutSeconds < 1 || test.timeoutSeconds > 86400) {
      errors.push(`${label}: timeoutSeconds must be an integer from 1 to 86400`);
    }
    for (const effect of test.sideEffects ?? []) {
      if (!SIDE_EFFECTS.has(effect)) errors.push(`${label}: unsupported side effect '${effect}'`);
    }
    if (test.sideEffects?.includes("external-write") && (!test.cleanup || test.cleanup === "none")) {
      errors.push(`${label}: external-write tests require an explicit cleanup plan`);
    }
    if (test.risk === "critical" && !test.tags?.includes("critical")) errors.push(`${label}: critical risk requires the 'critical' tag`);
    if (test.risk === "critical" && !test.tags?.includes("regression")) warnings.push(`${label}: critical test is not in the regression suite`);
    if (test.status === "quarantined") {
      const quarantine = test.quarantine;
      if (!quarantine || typeof quarantine !== "object") errors.push(`${label}: quarantined test requires quarantine metadata`);
      else {
        if (!quarantine.reason || !quarantine.owner) errors.push(`${label}: quarantine requires reason and owner`);
        const expiry = new Date(quarantine.expiresOn ?? "invalid");
        if (Number.isNaN(expiry.valueOf())) errors.push(`${label}: quarantine.expiresOn must be an ISO date`);
        else if (expiry < now) errors.push(`${label}: quarantine expired on ${quarantine.expiresOn}`);
      }
    }
    if (test.status === "deprecated" && !test.deprecation?.rationale) {
      errors.push(`${label}: deprecated test requires deprecation rationale`);
    }
    if (test.status === "retired") warnings.push(`${label}: retired tests should remain only as catalog tombstones`);
  }

  return { valid: errors.length === 0, errors, warnings, testCount: ids.size };
}

async function main() {
  const [file, ...rest] = process.argv.slice(2);
  const json = rest.includes("--json");
  if (!file || rest.some((argument) => argument !== "--json")) {
    console.error("Usage: validate-test-catalog.mjs <catalog.json> [--json]");
    process.exitCode = 2;
    return;
  }
  try {
    const result = validateTestCatalog(JSON.parse(await readFile(file, "utf8")));
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${result.valid ? "Test catalog is valid" : "Test catalog is invalid"}; ${result.testCount} managed test(s)`);
      for (const error of result.errors) console.error(`error: ${error}`);
      for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    }
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
