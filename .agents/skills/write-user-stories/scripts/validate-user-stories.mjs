#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REQUIRED_SECTIONS = [
  "Product context",
  "Story map",
  "User stories",
  "Dependencies and sequencing",
  "Risks and assumptions",
  "Open questions",
  "Readiness gate",
];

const EVIDENCE_LABELS = new Set(["Provided", "Observed", "Inferred", "Unknown"]);
const PRIORITIES = new Set(["Must", "Should", "Could", "Deferred"]);
const STORY_READINESS = new Set(["ready", "needs-refinement", "blocked"]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableCells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

export function validateUserStories(markdown) {
  const errors = [];
  const warnings = [];

  if (!/^# User Story Set:\s*\S+/m.test(markdown)) {
    errors.push("missing titled '# User Story Set: ...' heading");
  }

  for (const section of REQUIRED_SECTIONS) {
    const pattern = new RegExp(`^## ${escapeRegExp(section)}\\s*$`, "m");
    if (!pattern.test(markdown)) errors.push(`missing section '## ${section}'`);
  }

  const storySection = markdown.match(/## User stories\s+([\s\S]*?)(?=\n## |$)/)?.[1] ?? "";
  const storyLines = storySection
    .split(/\r?\n/)
    .filter((line) => /^\|\s*US-[0-9]{3,}\s*\|/.test(line));
  if (storyLines.length === 0) errors.push("no user story rows with IDs such as US-001");

  const seen = new Set();
  for (const line of storyLines) {
    const cells = tableCells(line);
    const [id, story, value, source, priority, dependencies, acceptanceIntent, readiness] = cells;
    if (seen.has(id)) errors.push(`duplicate story id '${id}'`);
    seen.add(id);
    if (cells.length < 8) errors.push(`${id}: expected eight story columns`);
    if (!/^As an? .+, I want .+, so that .+\.?$/i.test(story ?? "")) {
      errors.push(`${id}: story must use 'As a ..., I want ..., so that ...'`);
    }
    if (!value) warnings.push(`${id}: value or outcome is empty`);
    if (![...EVIDENCE_LABELS].some((label) => source?.includes(label))) {
      errors.push(`${id}: source must include Provided, Observed, Inferred, or Unknown`);
    }
    if (!PRIORITIES.has(priority)) {
      warnings.push(`${id}: priority '${priority || "empty"}' is not Must, Should, Could, or Deferred`);
    }
    if (!dependencies) warnings.push(`${id}: dependencies are unresolved`);
    if (!acceptanceIntent) warnings.push(`${id}: acceptance intent is unresolved`);
    if (!STORY_READINESS.has(readiness)) {
      errors.push(`${id}: readiness must be ready, needs-refinement, or blocked`);
    }
  }

  const gateMatch = markdown.match(/## Readiness gate\s+([\s\S]*?)(?=\n## |$)/);
  if (gateMatch && !/- Status:\s*(ready|ready with assumptions|not ready)\s*$/m.test(gateMatch[1])) {
    errors.push("readiness gate status must be ready, ready with assumptions, or not ready");
  }

  const placeholders = markdown.match(/<[^>\n]+>|\b(?:TBD|TODO)\b/g) ?? [];
  if (placeholders.length > 0) warnings.push(`${placeholders.length} template placeholder(s) remain`);

  return { valid: errors.length === 0, errors, warnings, storyCount: storyLines.length };
}

function parseArgs(argv) {
  const options = { file: null, json: false };
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (!options.file) options.file = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.file) throw new Error("Usage: validate-user-stories.mjs <stories.md> [--json]");
  return options;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = validateUserStories(await readFile(options.file, "utf8"));
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`${result.valid ? "User story structure is valid" : "User story structure is invalid"}; ${result.storyCount} story/stories`);
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
