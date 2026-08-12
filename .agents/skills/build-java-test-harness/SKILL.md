---
name: build-java-test-harness
description: Design, create, or evolve an external Java test-management framework that centrally catalogs versioned tests, selects impacted coverage from source or contract changes, runs governed smoke and regression suites, and records reproducible evidence. Use when a developer or test-platform team asks for a Java test manager, centralized system-test harness, test control plane, external test repository, test catalog, test versioning, change-impact analysis, or managed end-to-end regression framework. Do not use for isolated unit tests, a one-off test class, production implementation, manual QA instructions, or silently changing expected behavior to make failing tests pass.
---

# Build a Java test harness

Build a governed test control plane outside the implementation under test. Keep reusable framework code, system-specific test content, generated catalog data, and execution evidence separate.

## Guardrails

- Treat the target system as a black box unless the user explicitly supplies and authorizes source analysis.
- Organize tests by stable behavior or business capability, not by mirroring implementation directories.
- Keep Git as the version history. Give each test a stable ID and derive its revision from content and commit evidence; do not require manual per-test version bumps.
- Never delete, disable, quarantine, or rewrite a test solely because a new implementation makes it fail.
- Require an authoritative requirement, acceptance criterion, defect, contract, or approved decision before changing expected behavior.
- Keep the impact selector explainable and conservative. Unknown impact expands the safety net; it never means no tests.
- Default to synthetic data, non-production environments, least privilege, bounded execution, redacted evidence, and idempotent cleanup.
- Obtain explicit approval before creating an external repository, writing outside the current workspace, installing dependencies, contacting a test environment, or executing tests with external side effects.

## Workflow

1. Inspect the request, repository descriptors, build files, contracts, requirements, existing tests, and environment constraints. Preserve unknowns rather than inventing architecture.
2. Classify the task:
   - **bootstrap**: create the test control plane and first managed pack;
   - **onboard**: register existing tests without rewriting their behavior;
   - **change impact**: map a source, configuration, contract, or requirement change to existing tests;
   - **evolve**: update or add tests after an approved behavior change or defect;
   - **audit**: validate catalog integrity, versions, coverage, quarantine, and evidence.
3. Confirm the test-manager root, target environment, permitted interfaces, write boundary, execution authority, and source of expected behavior. Ask at most three questions only when an answer materially changes risk or architecture.
4. For bootstrap or major restructuring, read [`references/platform-architecture.md`](references/platform-architecture.md). Separate the reusable Java framework from centrally governed test packs and generated evidence.
5. Start repository integration from [`assets/project-descriptor.template.json`](assets/project-descriptor.template.json). Keep only this small descriptor in an application repository when the test manager is external.
6. Register tests with stable IDs using [`assets/test-catalog.template.json`](assets/test-catalog.template.json). Read [`references/catalog-and-versioning.md`](references/catalog-and-versioning.md) before designing metadata, lifecycle, ownership, quarantine, or release rules.
7. For a change:
   - identify the application commit and diff base;
   - classify changed source, configuration, contracts, data, or requirements;
   - expand an evidence graph from changed artifacts to capabilities, criteria, interfaces, and test IDs;
   - assign each selected test a reason and confidence;
   - select direct impacts plus the policy safety net;
   - distinguish still-valid tests, tests needing evidence-backed updates, new tests, potentially obsolete tests, and unknown impact.
8. Read [`references/impact-analysis.md`](references/impact-analysis.md) when implementing or reviewing selection logic. Never use an opaque model judgment as the only reason to skip a test.
9. Read [`references/java-execution.md`](references/java-execution.md) when creating JUnit Platform integration, Maven or Gradle adapters, coverage collection, test data, concurrency, or execution listeners.
10. Keep one canonical test and compose suites through tags such as `smoke`, `regression`, `critical`, `contract`, and `resilience`. Do not duplicate a test into suite-specific directories.
11. Validate the catalog with [`scripts/validate-test-catalog.mjs`](scripts/validate-test-catalog.mjs). Fix errors and preserve warnings with owners or follow-up actions.
12. When authorized, run the smallest impacted suite plus the required smoke safety net. Full regression remains a scheduled or release gate; impact selection does not replace it.
13. Record results with [`assets/impact-report-template.md`](assets/impact-report-template.md), including application commit, test-pack commit, framework version, environment fingerprint, selection policy, reasons, coverage, failures, blocked work, and unknown risk.

## Change policy

- **Behavior unchanged:** existing tests must continue to pass; investigate implementation, environment, data, and flakiness before modifying expectations.
- **Approved behavior change:** update affected tests, add new boundaries, preserve traceability, and release a new test-pack version.
- **Defect fix:** add a regression test and demonstrate fail-before/pass-after when safe and practical.
- **Contract change:** diff the contract baseline and add compatibility coverage before accepting it.
- **Unclear intent:** stop behavior edits and request evidence; do not encode a guess as a golden result.

## Handoff

Return:

1. the architecture or implemented test-manager changes;
2. catalog and version changes;
3. impact graph and selected tests with reasons and confidence;
4. execution and coverage evidence, including tests not run;
5. unresolved risk, external side effects, cleanup status, and approval boundaries.

Do not publish framework artifacts, push repositories, update protected baselines, or run against production without separate explicit approval.
