# User-story quality and splitting guide

Use this guide when a candidate story is too broad, too technical, dependent, or difficult to validate.

## Start with value

A story describes a user or stakeholder capability and why it matters. Prefer:

`As a support lead, I want to review recurring contact reasons each week, so that I can prioritize the next service improvement.`

Avoid technical work disguised as a story:

`As a developer, I want a new database table, so that the data is stored.`

Keep legitimate enabling work visible as a dependency or technical task outside the user-story set unless it independently delivers stakeholder value.

## Split vertically

Try these seams, in order:

1. distinct user outcome or decision;
2. happy path before exceptions;
3. one business rule before additional rules;
4. one workflow step that still produces usable value;
5. one data variation or channel before all variations;
6. manual or limited-volume outcome before automation or scale.

Do not split solely into frontend, backend, database, integration, or team-owned layers.

## Apply INVEST with evidence

- **Independent:** dependencies are minimized and visible.
- **Negotiable:** the story states the need, not an unapproved design.
- **Valuable:** the `so that` clause describes an observable outcome.
- **Estimable:** material unknowns are named; never fabricate an estimate.
- **Small:** the slice has one coherent outcome and can be refined independently.
- **Testable:** the acceptance intent names observable evidence without prematurely writing exhaustive criteria.

INVEST is a diagnostic, not proof of readiness. A well-written sentence remains blocked when its actor, business rule, or source is unsupported.

## Traceability

For every story, link the strongest available source:

- a requirement ID such as `BR-003`;
- an objective ID such as `OBJ-001`;
- a named supplied artifact;
- an explicit user statement;
- `Inferred` or `Unknown` when none of the above supports the claim.

Never create a requirement ID or research source merely to fill the table.

## Boundary with acceptance criteria

Acceptance intent describes what must become observable, for example: “The weekly view distinguishes new and recurring contact reasons.”

Detailed acceptance criteria define scenarios, business rules, examples, edge cases, and Given–When–Then behavior. Create those in a separate workflow after the story boundary and evidence are stable.
