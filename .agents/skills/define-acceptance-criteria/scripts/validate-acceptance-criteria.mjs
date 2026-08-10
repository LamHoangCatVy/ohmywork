#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REQUIRED_SECTIONS = [
  "Source stories",
  "Business rules",
  "Acceptance criteria",
  "Given-When-Then scenarios",
  "Coverage matrix",
  "Assumptions and edge cases",
  "Open questions",
  "Readiness gate",
];

const EVIDENCE_LABELS = new Set(["Provided", "Observed", "Inferred", "Unknown"]);
const READINESS = new Set(["ready", "needs-refinement", "blocked"]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableCells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function section(markdown, title) {
  return markdown.match(new RegExp(`^## ${escapeRegExp(title)}\\s+([\\s\\S]*?)(?=\\n## |$)`, "m"))?.[1] ?? "";
}

function hasEvidence(value) {
  return [...EVIDENCE_LABELS].some((label) => value?.includes(label));
}

export function validateAcceptanceCriteria(markdown) {
  const errors = [];
  const warnings = [];

  if (!/^# Acceptance Criteria Set:\s*\S+/m.test(markdown)) {
    errors.push("missing titled '# Acceptance Criteria Set: ...' heading");
  }

  for (const title of REQUIRED_SECTIONS) {
    if (!new RegExp(`^## ${escapeRegExp(title)}\\s*$`, "m").test(markdown)) {
      errors.push(`missing section '## ${title}'`);
    }
  }

  const sourceLines = section(markdown, "Source stories")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*US-[0-9]{3,}\s*\|/.test(line));
  if (sourceLines.length === 0) errors.push("no source story rows with IDs such as US-001");

  const storyIds = new Set();
  for (const line of sourceLines) {
    const [id, story, outcome, source] = tableCells(line);
    if (storyIds.has(id)) errors.push(`duplicate source story id '${id}'`);
    storyIds.add(id);
    if (!/^As an? .+, I want .+, so that .+\.?$/i.test(story ?? "")) {
      warnings.push(`${id}: source story does not use 'As a ..., I want ..., so that ...'`);
    }
    if (!outcome) warnings.push(`${id}: intended outcome is empty`);
    if (!hasEvidence(source)) errors.push(`${id}: source must include Provided, Observed, Inferred, or Unknown`);
  }

  const ruleLines = section(markdown, "Business rules")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*RULE-[0-9]{3,}\s*\|/.test(line));
  if (ruleLines.length === 0) errors.push("no business rule rows with IDs such as RULE-001");
  const ruleIds = new Set();
  for (const line of ruleLines) {
    const [id, rule, appliesTo, source, owner, readiness] = tableCells(line);
    if (ruleIds.has(id)) errors.push(`duplicate business rule id '${id}'`);
    ruleIds.add(id);
    if (!rule) errors.push(`${id}: rule is empty`);
    for (const storyId of appliesTo?.match(/US-[0-9]{3,}/g) ?? []) {
      if (!storyIds.has(storyId)) errors.push(`${id}: references unknown story '${storyId}'`);
    }
    if (!hasEvidence(source)) errors.push(`${id}: source must include Provided, Observed, Inferred, or Unknown`);
    if (!owner || owner === "Unknown") warnings.push(`${id}: owner is unresolved`);
    if (!READINESS.has(readiness)) errors.push(`${id}: readiness must be ready, needs-refinement, or blocked`);
  }

  const criterionLines = section(markdown, "Acceptance criteria")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*AC-US-[0-9]{3,}-[0-9]{2,}\s*\|/.test(line));
  if (criterionLines.length === 0) errors.push("no acceptance criterion rows with IDs such as AC-US-001-01");
  const criterionIds = new Set();
  for (const line of criterionLines) {
    const [id, storyId, criterion, source, rules, readiness] = tableCells(line);
    if (criterionIds.has(id)) errors.push(`duplicate acceptance criterion id '${id}'`);
    criterionIds.add(id);
    if (!storyIds.has(storyId)) errors.push(`${id}: references unknown story '${storyId}'`);
    if (!id.startsWith(`AC-${storyId}-`)) errors.push(`${id}: id must be scoped to story '${storyId}'`);
    if (!criterion) errors.push(`${id}: observable criterion is empty`);
    if (!hasEvidence(source)) errors.push(`${id}: source must include Provided, Observed, Inferred, or Unknown`);
    for (const ruleId of rules?.match(/RULE-[0-9]{3,}/g) ?? []) {
      if (!ruleIds.has(ruleId)) errors.push(`${id}: references unknown business rule '${ruleId}'`);
    }
    if (!READINESS.has(readiness)) errors.push(`${id}: readiness must be ready, needs-refinement, or blocked`);
  }

  const scenarioSection = section(markdown, "Given-When-Then scenarios");
  const scenarioPattern = /^###\s+(SC-(US-[0-9]{3,})-[0-9]{2,})\s+[^\n]*\n([\s\S]*?)(?=^###\s+SC-|\n## |$)/gm;
  const scenarioIds = new Set();
  const coveredCriteria = new Set();
  let match;
  while ((match = scenarioPattern.exec(scenarioSection)) !== null) {
    const [, scenarioId, storyId, body] = match;
    if (scenarioIds.has(scenarioId)) errors.push(`duplicate scenario id '${scenarioId}'`);
    scenarioIds.add(scenarioId);
    if (!storyIds.has(storyId)) errors.push(`${scenarioId}: references unknown story '${storyId}'`);
    const covers = body.match(/^- Covers:\s*(.+)$/m)?.[1] ?? "";
    const ids = covers.match(/AC-US-[0-9]{3,}-[0-9]{2,}/g) ?? [];
    if (ids.length === 0) errors.push(`${scenarioId}: must name at least one covered acceptance criterion`);
    for (const criterionId of ids) {
      coveredCriteria.add(criterionId);
      if (!criterionIds.has(criterionId)) errors.push(`${scenarioId}: covers unknown criterion '${criterionId}'`);
      if (!criterionId.startsWith(`AC-${storyId}-`)) errors.push(`${scenarioId}: criterion '${criterionId}' belongs to another story`);
    }
    if (!/^\s*Scenario(?: Outline)?:\s*\S+/m.test(body)) errors.push(`${scenarioId}: missing Scenario or Scenario Outline`);
    if (!/^\s*Given\s+\S+/m.test(body)) errors.push(`${scenarioId}: missing Given step`);
    if (!/^\s*When\s+\S+/m.test(body)) errors.push(`${scenarioId}: missing When step`);
    if (!/^\s*Then\s+\S+/m.test(body)) errors.push(`${scenarioId}: missing Then step`);
  }
  if (scenarioIds.size === 0) errors.push("no scenarios with IDs such as SC-US-001-01");
  for (const criterionId of criterionIds) {
    if (!coveredCriteria.has(criterionId)) errors.push(`${criterionId}: is not covered by a scenario`);
  }

  const gate = section(markdown, "Readiness gate");
  if (gate && !/- Status:\s*(ready|ready with assumptions|not ready)\s*$/m.test(gate)) {
    errors.push("readiness gate status must be ready, ready with assumptions, or not ready");
  }

  const placeholders = markdown.match(/<[^>\n]+>|\b(?:TBD|TODO)\b/g) ?? [];
  if (placeholders.length > 0) warnings.push(`${placeholders.length} template placeholder(s) remain`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    storyCount: storyIds.size,
    ruleCount: ruleIds.size,
    criterionCount: criterionIds.size,
    scenarioCount: scenarioIds.size,
  };
}

function parseArgs(argv) {
  const options = { file: null, json: false };
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (!options.file) options.file = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.file) throw new Error("Usage: validate-acceptance-criteria.mjs <criteria.md> [--json]");
  return options;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = validateAcceptanceCriteria(await readFile(options.file, "utf8"));
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(
        `${result.valid ? "Acceptance criteria structure is valid" : "Acceptance criteria structure is invalid"}; ` +
        `${result.storyCount} story/stories, ${result.criterionCount} criterion/criteria, ${result.scenarioCount} scenario(s)`,
      );
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
