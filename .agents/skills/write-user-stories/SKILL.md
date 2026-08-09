---
name: write-user-stories
description: Turn a product outcome, BRD, requirement set, discovery notes, feature request, or existing backlog item into a traceable set of refinement-ready user stories. Use when a Product Owner asks to write, split, structure, improve, or review user stories or turn requirements into backlog-ready slices. Do not use when the user only wants detailed acceptance criteria, a BRD, technical tasks, test cases, or implementation.
---

# Write user stories

Turn product intent into small, valuable slices without inventing users, priorities, evidence, or implementation decisions.

## Guardrails

- Preserve the user's outcome and terminology. Do not invent personas, research findings, priorities, estimates, approvals, dates, or business rules.
- Prefer vertical slices that deliver observable user or stakeholder value. Do not split primarily by UI, API, database, team, or technical layer.
- Keep solution detail out unless it is an explicit constraint from a supplied source.
- Distinguish supplied facts, inspected evidence, inference, and unknowns.
- Keep detailed acceptance-criteria design out of scope. Record only concise acceptance intent and hand suitable stories to `define-acceptance-criteria` when requested.
- Do not silently turn stories into epics, technical tasks, test cases, a delivery plan, or an estimate.
- Write to the workspace only when the user requests an artifact path. Never overwrite an existing file without confirmation.

## Workflow

1. Inspect the request, supplied artifacts, relevant workspace context, and any existing backlog convention.
2. State the product outcome, affected actor, evidence base, constraints, and boundary in plain language.
3. Ask at most three concise questions only when their answers could materially change the actor, outcome, scope, sequencing, or readiness. Otherwise continue with explicit `Unknown` entries.
4. Start from [`assets/user-stories-template.md`](assets/user-stories-template.md). Preserve its section order unless the user supplies an authoritative template.
5. Map the outcome before writing stories:
   - name the actor or stakeholder using evidence-backed language;
   - identify the user's meaningful steps or decisions;
   - identify the smallest useful end-to-end result;
   - preserve non-goals and mandated constraints.
6. Split the work into vertical slices. Use [`references/story-quality.md`](references/story-quality.md) when a story is broad, dependent, or difficult to verify.
7. Give every story a stable ID such as `US-001` and use this form: `As a <actor>, I want <capability>, so that <outcome>.`
8. For each story, record value or outcome, source, priority, dependencies, acceptance intent, and readiness.
9. Use the user's priority scheme when supplied. Otherwise use `Must`, `Should`, `Could`, or `Deferred`, and label the prioritization as proposed.
10. Trace each story to an inspected source, business requirement, objective, or explicit user statement. Never cite or imply a source that was not supplied or inspected.
11. Apply the quality gate below. If a Markdown story set was created, run [`scripts/validate-user-stories.mjs`](scripts/validate-user-stories.mjs), fix structural errors, and report remaining warnings.

## Evidence labels

Use exactly these labels in the Source column:

- `Provided`: explicitly stated by the user or a supplied artifact.
- `Observed`: supported by an inspected source; name the source.
- `Inferred`: reasoned from evidence; state the reasoning and confidence.
- `Unknown`: important but unsupported; name a verification action when known.

Do not promote `Inferred` or `Unknown` to `Observed` without new evidence.

## Story quality gate

Confirm that each story:

- names an evidence-backed actor rather than a fabricated persona;
- expresses one user-visible capability and its outcome;
- is a vertical slice that can be discussed and validated independently;
- avoids hidden dependencies and unnecessary implementation detail;
- has concise acceptance intent without pretending detailed criteria are complete;
- traces to evidence, an objective, or a requirement;
- carries a readiness status supported by the visible unknowns.

Use exactly one readiness value per story:

- `ready`: outcome, actor, scope, source, and acceptance intent are sufficient for refinement;
- `needs-refinement`: the story is useful but a named question or split remains;
- `blocked`: missing evidence, conflict, or dependency makes refinement misleading.

## Set readiness

Set exactly one final status:

- `ready`: the story set is coherent, traceable, vertically sliced, and ready for the next workflow;
- `ready with assumptions`: refinement can begin only if named assumptions remain visible;
- `not ready`: unresolved actor, outcome, scope, source, or dependency would make the backlog misleading.

## Handoff

Return:

1. the story set and story map;
2. the highest-impact split or sequencing decision;
3. stories and fields still marked `Unknown`;
4. validation errors or warnings, if a file was created;
5. the set-readiness gate and recommended next workflow.

Stop after the story set. Continue into detailed acceptance criteria, task breakdown, estimation, design, or implementation only when the user explicitly requests that workflow.
