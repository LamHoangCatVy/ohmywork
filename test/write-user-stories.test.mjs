import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateUserStories } from "../.agents/skills/write-user-stories/scripts/validate-user-stories.mjs";

const templatePath = new URL(
  "../.agents/skills/write-user-stories/assets/user-stories-template.md",
  import.meta.url,
);

async function validStorySet() {
  const template = await readFile(templatePath, "utf8");
  return template
    .replace(
      "| US-001 | As a <actor>, I want <capability>, so that <outcome>. |  | Unknown | Must | None known |  | needs-refinement |",
      "| US-001 | As a support lead, I want to review recurring contact reasons weekly, so that I can prioritize service improvements. | Evidence-based prioritization | Provided — support lead request | Must | Tagged conversations | The weekly view distinguishes new and recurring reasons. | ready |",
    )
    .replace(/<[^>\n]+>/g, "Provided source")
    .replace("- Status: not ready", "- Status: ready with assumptions");
}

test("user-story validator accepts a complete traceable story set", async () => {
  const result = validateUserStories(await validStorySet());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.storyCount, 1);
  assert.deepEqual(result.errors, []);
});

test("user-story validator rejects missing sections, duplicate IDs, and unsupported sources", async () => {
  const base = await validStorySet();
  const duplicate = "| US-001 | Display a dashboard. | Value | Claimed | Must | None | Visible result | ready |";
  const invalid = base
    .replace("## Dependencies and sequencing", "## Sequencing")
    .replace("## User stories\n", `## User stories\n\n${duplicate}\n`);
  const result = validateUserStories(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing section '## Dependencies and sequencing'/);
  assert.match(result.errors.join("\n"), /duplicate story id 'US-001'/);
  assert.match(result.errors.join("\n"), /must use 'As a/);
  assert.match(result.errors.join("\n"), /source must include/);
});

test("write-user-stories metadata names direct triggers and negative boundaries", async () => {
  const markdown = await readFile(
    new URL("../.agents/skills/write-user-stories/SKILL.md", import.meta.url),
    "utf8",
  );
  assert.match(markdown, /Product Owner asks to write, split, structure, improve, or review user stories/);
  assert.match(markdown, /Do not use when the user only wants detailed acceptance criteria/);
  assert.match(markdown, /vertical slices/);
});
