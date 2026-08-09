#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REQUIRED_SECTIONS = [
  "Document control",
  "Executive summary",
  "Business context",
  "Objectives and success measures",
  "Scope",
  "Stakeholders",
  "Current state",
  "Future state",
  "Business requirements",
  "Data and reporting",
  "Quality and constraints",
  "Assumptions and dependencies",
  "Risks",
  "Traceability",
  "Open questions",
  "Decision gate",
];

const EVIDENCE_LABELS = new Set(["Provided", "Observed", "Inferred", "Unknown"]);
const PRIORITIES = new Set(["Must", "Should", "Could", "Deferred"]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableCells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

export function validateBrd(markdown) {
  const errors = [];
  const warnings = [];

  if (!/^# Business Requirements Document:\s*\S+/m.test(markdown)) {
    errors.push("missing titled '# Business Requirements Document: ...' heading");
  }

  for (const section of REQUIRED_SECTIONS) {
    const pattern = new RegExp(`^## ${escapeRegExp(section)}\\s*$`, "m");
    if (!pattern.test(markdown)) errors.push(`missing section '## ${section}'`);
  }

  const requirementLines = markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*BR-[0-9]{3,}\s*\|/.test(line));
  if (requirementLines.length === 0) errors.push("no business requirement rows with IDs such as BR-001");

  const seen = new Set();
  for (const line of requirementLines) {
    const cells = tableCells(line);
    const [id, requirement, rationale, evidence, priority, acceptance, owner] = cells;
    if (seen.has(id)) errors.push(`duplicate requirement id '${id}'`);
    seen.add(id);
    if (cells.length < 7) errors.push(`${id}: expected seven requirement columns`);
    if (!requirement) errors.push(`${id}: requirement is empty`);
    if (!rationale) errors.push(`${id}: rationale is empty`);
    if (![...EVIDENCE_LABELS].some((label) => evidence?.includes(label))) {
      errors.push(`${id}: evidence must include Provided, Observed, Inferred, or Unknown`);
    }
    if (!PRIORITIES.has(priority)) warnings.push(`${id}: priority '${priority || "empty"}' is not Must, Should, Could, or Deferred`);
    if (!acceptance || acceptance === "Unknown") warnings.push(`${id}: acceptance signal is unresolved`);
    if (!owner || owner === "Unknown") warnings.push(`${id}: owner is unresolved`);
  }

  const gateMatch = markdown.match(/## Decision gate\s+([\s\S]*?)(?=\n## |$)/);
  if (gateMatch && !/- Status:\s*(ready|ready with assumptions|not ready)\s*$/m.test(gateMatch[1])) {
    errors.push("decision gate status must be ready, ready with assumptions, or not ready");
  }

  const placeholders = markdown.match(/<[^>\n]+>|\b(?:TBD|TODO)\b/g) ?? [];
  if (placeholders.length > 0) warnings.push(`${placeholders.length} template placeholder(s) remain`);

  return { valid: errors.length === 0, errors, warnings, requirementCount: requirementLines.length };
}

function parseArgs(argv) {
  const options = { file: null, json: false };
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (!options.file) options.file = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.file) throw new Error("Usage: validate-brd.mjs <brd.md> [--json]");
  return options;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = validateBrd(await readFile(options.file, "utf8"));
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`${result.valid ? "BRD structure is valid" : "BRD structure is invalid"}; ${result.requirementCount} requirement(s)`);
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
