import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateBrd } from "../.agents/skills/draft-brd/scripts/validate-brd.mjs";

const templatePath = new URL("../.agents/skills/draft-brd/assets/brd-template.md", import.meta.url);

async function validBrd() {
  const template = await readFile(templatePath, "utf8");
  return template
    .replace(/<[^>\n]+>/g, "Provided source")
    .replace(
      "| BR-001 |  |  | Unknown | Must |  | Unknown |",
      "| BR-001 | The business must identify recurring support topics weekly. | Enables evidence-based prioritization. | Provided — support lead notes | Must | A weekly report groups all tagged conversations by topic. | Support lead |",
    )
    .replace("- Status: not ready", "- Status: ready with assumptions");
}

test("BRD validator accepts a complete traceable structure", async () => {
  const result = validateBrd(await validBrd());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.requirementCount, 1);
  assert.deepEqual(result.errors, []);
});

test("BRD validator rejects missing sections, duplicate IDs, and unsupported evidence", async () => {
  const base = await validBrd();
  const requirement = "| BR-001 | A second requirement. | Another rationale. | Claimed | Must | Observable result. | Owner |";
  const invalid = base
    .replace("## Data and reporting", "## Reporting")
    .replace("## Data and reporting", "## Reporting")
    .replace("## Business requirements\n", `## Business requirements\n\n${requirement}\n`);
  const result = validateBrd(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing section '## Data and reporting'/);
  assert.match(result.errors.join("\n"), /duplicate requirement id 'BR-001'/);
  assert.match(result.errors.join("\n"), /evidence must include/);
});

test("draft-brd metadata names direct triggers and negative boundaries", async () => {
  const markdown = await readFile(new URL("../.agents/skills/draft-brd/SKILL.md", import.meta.url), "utf8");
  assert.match(markdown, /business requirements document \(BRD\)/);
  assert.match(markdown, /draft, write, structure, improve, or complete a BRD/);
  assert.match(markdown, /Do not use for a PRD, technical specification, architecture design/);
});
