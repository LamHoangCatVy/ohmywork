---
name: shape-idea
description: Turn a rough or one-sentence product, service, campaign, process, or software idea into an evidence-aware brief with target users, outcomes, assumptions, risks, success signals, and the smallest validation step. Use before specification, design, implementation, or delivery planning when the idea is still ambiguous.
---

# Shape an idea

Turn an early idea into a decision-ready brief without pretending that unknowns are facts or prematurely choosing an implementation.

## Guardrails

- Stay domain-, stack-, model-, cloud-, and vendor-neutral unless the user supplies a constraint.
- Separate supplied information, observed evidence, inference, and unknowns.
- Do not invent users, research, market numbers, legal conclusions, costs, deadlines, or success metrics.
- Verify unstable external claims with current sources when browsing is available; otherwise mark them unknown.
- Do not write durable memory, contact people, create external records, start implementation, or deploy anything.
- Treat the brief as a proposal that the user owns and can revise.

## Workflow

1. Inspect the user's statement and any relevant files or context they supplied.
2. Restate the idea as a provisional outcome for a specific audience. Preserve uncertainty instead of filling gaps silently.
3. Identify only questions whose answers could materially change the audience, outcome, risk, or next validation step. Ask at most three concise questions when they block progress; otherwise continue with explicit assumptions.
4. Examine four dimensions:
   - Desirability: user, problem, current alternative, urgency.
   - Viability: value, adoption, economics or organizational fit.
   - Feasibility: capabilities, dependencies, constraints, operations.
   - Responsibility: security, privacy, safety, accessibility, inclusion, compliance, and misuse.
5. Convert important assumptions into falsifiable hypotheses. Give each hypothesis a practical test and an observable pass/fail signal.
6. Choose the smallest validation step that can disprove the riskiest assumption without building the full solution.
7. Fill [`assets/idea-brief.md`](assets/idea-brief.md). Keep every claim traceable to a source or evidence class.
8. Run the quality gate and present the brief for user confirmation.

## Evidence classes

Use exactly these labels in the evidence ledger:

- `Provided`: explicitly stated by the user or supplied artifact.
- `Observed`: supported by inspected evidence with a source reference.
- `Inferred`: reasoned from evidence; include the reasoning and confidence.
- `Unknown`: important but not yet supported.

Never upgrade `Inferred` or `Unknown` to `Observed` without evidence.

## Quality gate

Confirm all of the following before calling the brief ready:

- The audience, problem, desired outcome, constraints, and non-goals are distinguishable.
- Every consequential claim has an evidence class and source or verification plan.
- The success signals are observable and do not rely on invented baselines.
- Risks cover desirability, viability, feasibility, and responsibility.
- The validation step tests the riskiest assumption and has a stop, pivot, or proceed rule.
- Open questions are prioritized by decision impact.
- The final gate states `ready`, `not ready`, or `ready with assumptions` and explains why.

## Handoff

End with:

1. The completed idea brief.
2. The highest-risk assumption.
3. The next validation action and its owner, if known.
4. The decision gate and evidence still missing.

Do not continue into a PRD, architecture, build plan, code, or deployment unless the user explicitly asks for the next workflow.
