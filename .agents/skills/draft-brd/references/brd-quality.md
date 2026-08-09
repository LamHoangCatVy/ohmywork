# BRD quality gate

Use this checklist before handing off a business requirements document.

## Boundary

- The document names the business decision it must enable.
- Objectives, scope, requirements, constraints, and non-goals are distinguishable.
- Proposed implementation is not presented as a business requirement unless an authoritative source mandates it.
- The BRD does not silently expand into a PRD, design, story set, or project plan.

## Evidence and traceability

- Every consequential claim uses `Provided`, `Observed`, `Inferred`, or `Unknown`.
- Every `Observed` claim names an inspected source.
- Every `Inferred` claim states reasoning and confidence.
- Every business requirement traces to a source and objective.
- Conflicting sources remain visible with a decision owner or verification action.

## Requirements

- IDs are unique and stable.
- Each requirement expresses one business capability, rule, outcome, or constraint.
- Requirements avoid unnecessary implementation detail.
- Each requirement has a rationale, priority, acceptance signal, and owner or explicit `Unknown`.
- Measures replace vague qualities such as “fast”, “easy”, “scalable”, or “secure”.
- Proposed priorities are identified as proposals rather than stakeholder decisions.

## Scope and responsibility

- In-scope and out-of-scope items do not contradict each other.
- Stakeholder, data, privacy, accessibility, security, legal, operational, and misuse concerns are considered where relevant.
- Legal or regulatory conclusions are sourced or marked `Unknown`; the BRD does not impersonate professional advice.
- Sensitive source content is summarized only to the degree needed and is not copied unnecessarily.

## Decision readiness

- Baselines and targets are sourced or explicitly unknown.
- Assumptions, dependencies, risks, and open questions have owners or verification actions when known.
- The final status is exactly `ready`, `ready with assumptions`, or `not ready`.
- The gate explains what evidence supports the status and what must happen next.
