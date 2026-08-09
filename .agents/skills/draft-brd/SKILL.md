---
name: draft-brd
description: Create or complete a traceable business requirements document (BRD) from a business problem, opportunity, idea brief, notes, source artifacts, or an existing draft. Use when the user asks to draft, write, structure, improve, or complete a BRD or business requirements document. Do not use for a PRD, technical specification, architecture design, implementation plan, or isolated user stories unless a BRD is also requested.
---

# Draft a business requirements document

Create a decision-ready BRD without turning unsupported assumptions into requirements or prematurely choosing an implementation.

## Guardrails

- Keep the BRD business-facing and solution-neutral. Record a mandated solution as a constraint with its source.
- Distinguish supplied facts, inspected evidence, inference, and unknowns.
- Do not invent stakeholders, approvals, baselines, targets, budgets, dates, legal conclusions, or regulatory requirements.
- Preserve conflicts between sources. Name the decision owner if known; otherwise mark the owner `Unknown`.
- Do not silently expand into a PRD, system design, delivery plan, user-story set, or implementation.
- Write to the workspace only when the user requests an artifact path. Never overwrite an existing file without confirmation.

## Workflow

1. Inspect the user's request, supplied artifacts, and relevant workspace context.
2. State the business problem, intended decision, audience, and BRD boundary in plain language.
3. Ask at most three concise questions only when their answers could materially change the objective, scope, requirement set, risk, or decision gate. Otherwise continue with explicit `Unknown` entries.
4. Start from [`assets/brd-template.md`](assets/brd-template.md). Preserve its section order unless the user supplies an authoritative template.
5. Separate business needs from proposed solutions:
   - record the outcome the business needs;
   - record why it matters;
   - record observable evidence that would demonstrate satisfaction;
   - move design choices to constraints or open questions unless they are explicitly mandated.
6. Give each business requirement a stable ID such as `BR-001`. For every requirement, include rationale, evidence, priority, acceptance signal, and owner.
7. Use the user's priority scheme when supplied. Otherwise use `Must`, `Should`, `Could`, or `Deferred`, and label the prioritization as proposed.
8. Build traceability from source to objective to requirement to acceptance evidence. Never cite a source that was not supplied or inspected.
9. Record data needs, quality attributes, assumptions, dependencies, risks, and unresolved decisions without disguising them as confirmed requirements.
10. Read [`references/brd-quality.md`](references/brd-quality.md) and run its quality gate before handoff.
11. If a Markdown BRD file was created, run [`scripts/validate-brd.mjs`](scripts/validate-brd.mjs) against it. Fix structural errors and report any remaining warnings.

## Evidence labels

Use exactly these labels in requirement and traceability evidence:

- `Provided`: explicitly stated by the user or a supplied artifact.
- `Observed`: supported by an inspected source; name the source.
- `Inferred`: reasoned from evidence; state the reasoning and confidence.
- `Unknown`: important but not yet supported; name the owner or verification action if known.

Do not promote `Inferred` or `Unknown` to `Observed` without new evidence.

## Requirement quality

Write each requirement as one necessary business capability, rule, outcome, or constraint. Make it:

- necessary for a stated objective;
- singular rather than a bundle of unrelated needs;
- understandable without implementation detail;
- observable through an acceptance signal;
- traceable to evidence;
- explicit about unresolved ownership or uncertainty.

Avoid vague language such as “user-friendly”, “fast”, “seamless”, or “robust” unless the BRD defines an observable measure.

## Decision gate

Set exactly one final status:

- `ready`: material scope, requirements, evidence, ownership, and acceptance signals are sufficient for the next workflow;
- `ready with assumptions`: the next workflow can begin only if named assumptions remain visible and owned;
- `not ready`: unresolved evidence, conflict, scope, or ownership would make the next workflow misleading.

Do not use an approval signature or stakeholder name as a proxy for this evidence gate.

## Handoff

Return:

1. the completed BRD;
2. the highest-impact unresolved decision;
3. requirements or sections still marked `Unknown`;
4. validation errors or warnings, if a file was created;
5. the decision gate and recommended next workflow.

Stop after the BRD. Continue into a PRD, stories, architecture, or delivery plan only when the user explicitly requests that next workflow.
