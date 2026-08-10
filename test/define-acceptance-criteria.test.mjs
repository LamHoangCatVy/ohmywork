import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAcceptanceCriteria } from "../.agents/skills/define-acceptance-criteria/scripts/validate-acceptance-criteria.mjs";

function validCriteriaSet() {
  return `# Acceptance Criteria Set: Password reset

## Source stories

| Story ID | User story | Intended outcome | Source | Status |
| --- | --- | --- | --- | --- |
| US-014 | As a customer, I want to reset a forgotten password, so that I can regain account access. | Regain account access | Provided — approved backlog story | supplied |

## Business rules

| ID | Rule | Applies to | Source | Owner | Readiness |
| --- | --- | --- | --- | --- | --- |
| RULE-001 | A password-reset link can be used only once. | US-014 | Provided — security policy | Security owner | ready |

## Acceptance criteria

| ID | Story ID | Observable criterion | Source | Business rules | Readiness |
| --- | --- | --- | --- | --- | --- |
| AC-US-014-01 | US-014 | A used reset link cannot change the account password again. | Provided — security policy | RULE-001 | ready |

## Given-When-Then scenarios

### SC-US-014-01 — Reject a used link

- Covers: AC-US-014-01
- Business rules: RULE-001

\`\`\`gherkin
Scenario: Reject a previously used password-reset link
  Given a password-reset link has already been used successfully
  When the same link is submitted again
  Then the account password remains unchanged
\`\`\`

## Coverage matrix

| Story ID | Criterion ID | Business rules | Scenarios | Coverage |
| --- | --- | --- | --- | --- |
| US-014 | AC-US-014-01 | RULE-001 | SC-US-014-01 | covered |

## Assumptions and edge cases

| ID | Type | Statement | Source | Impact | Verification or owner |
| --- | --- | --- | --- | --- | --- |
| AE-001 | Boundary | Link reuse after success | Provided — security policy | AC-US-014-01 | Security owner |

## Open questions

| ID | Question or conflict | Affected IDs | Why it matters | Owner or evidence needed |
| --- | --- | --- | --- | --- |
| OQ-001 | None material | US-014 | No effect | Product owner |

## Readiness gate

- Status: ready
- Reason: The supplied story and policy support the criterion and scenario.
- Highest-impact unresolved rule or example: None.
- Blocked criteria or scenarios: None.
- Recommended next workflow: Design executable test cases.
`;
}

test("acceptance-criteria validator accepts traceable rules and Gherkin", () => {
  const result = validateAcceptanceCriteria(validCriteriaSet());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.deepEqual(
    [result.storyCount, result.ruleCount, result.criterionCount, result.scenarioCount],
    [1, 1, 1, 1],
  );
});

test("acceptance-criteria validator rejects broken traceability and incomplete scenarios", () => {
  const duplicate = "| AC-US-999-01 | US-999 | Unsupported behavior. | Claimed | RULE-999 | ready |";
  const invalid = validCriteriaSet()
    .replace("## Acceptance criteria\n", `## Acceptance criteria\n\n${duplicate}\n`)
    .replace("  Then the account password remains unchanged\n", "");
  const result = validateAcceptanceCriteria(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /references unknown story 'US-999'/);
  assert.match(result.errors.join("\n"), /source must include/);
  assert.match(result.errors.join("\n"), /references unknown business rule 'RULE-999'/);
  assert.match(result.errors.join("\n"), /missing Then step/);
  assert.match(result.errors.join("\n"), /is not covered by a scenario/);
});

test("define-acceptance-criteria metadata names direct triggers and negative boundaries", async () => {
  const markdown = await readFile(
    new URL("../.agents/skills/define-acceptance-criteria/SKILL.md", import.meta.url),
    "utf8",
  );
  assert.match(markdown, /US-001/);
  assert.match(markdown, /acceptance criteria, Gherkin, BDD scenarios, business rules/);
  assert.match(markdown, /Do not use to create or rewrite user stories/);
  assert.match(markdown, /Do not invent thresholds, policy values/);
});
