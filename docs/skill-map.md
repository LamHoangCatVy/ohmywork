# OhMyWork skill map

Status: product map for the GitHub-first bundle. A skill appears in `catalog.json` only after its workflow, capability contract, permissions, tests, and evals exist.

## The human view

```text
OhMyWork
├── I'm a Business Analyst
│   ├── Shape an idea                         available · experimental
│   ├── Draft a BRD                           available · experimental
│   ├── Analyze requirements                  planned
│   ├── Map a business process                planned
│   └── Trace requirements                    planned
├── I'm a Product Owner
│   ├── Shape an idea                         available · experimental
│   ├── Write user stories                    available · experimental
│   ├── Define acceptance criteria            available · experimental
│   ├── Prioritize a backlog                  planned
│   └── Plan a product review                 planned
├── I'm a Project Manager
│   ├── Shape an idea                         available · experimental
│   ├── Initiate a project                    planned
│   ├── Build a project plan                  planned
│   ├── Manage risks and dependencies         planned
│   ├── Prepare a status report               planned
│   └── Run a post-implementation review      planned
├── I'm a Developer
│   ├── Build a Java test harness             available · experimental
│   ├── Write unit tests                      planned
│   ├── Review code                           planned
│   ├── Refactor code safely                  planned
│   ├── Diagnose a defect                     planned
│   └── Write technical documentation         planned
└── I need a work artifact
    ├── Create an accessible DOCX document    planned
    ├── Build a verified XLSX workbook        planned
    └── Create an accessible PPTX slide deck  planned
```

Users browse this tree. Agents still discover independent skills from `.agents/skills/<skill-id>`.

## The canonical view

```text
.agents/skills/
  shape-idea/
    SKILL.md
    capability.json
    assets/

  draft-brd/
    SKILL.md
    capability.json
    assets/brd-template.md
    references/brd-quality.md

  write-user-stories/
    SKILL.md
    capability.json
    assets/user-stories-template.md
    references/story-quality.md
    scripts/validate-user-stories.mjs

  define-acceptance-criteria/
    SKILL.md
    capability.json
    assets/acceptance-criteria-template.md
    references/gherkin-quality.md
    scripts/validate-acceptance-criteria.mjs

  build-java-test-harness/
    SKILL.md
    capability.json
    assets/project-descriptor.template.json
    assets/test-catalog.template.json
    assets/impact-report-template.md
    references/platform-architecture.md
    references/catalog-and-versioning.md
    references/impact-analysis.md
    references/java-execution.md
    scripts/validate-test-catalog.mjs

  initiate-project/
    SKILL.md
    capability.json
    assets/project-charter.md

  run-pir/
    SKILL.md
    capability.json
    assets/pir-template.md

  write-unit-tests/
    SKILL.md
    capability.json
    references/vitest.md
    references/jest.md
    references/pytest.md
    references/junit.md
    references/dotnet-xunit.md
    references/go-testing.md
    references/rspec.md

  create-docx/
    SKILL.md
    capability.json
    assets/
    scripts/

  build-xlsx/
    SKILL.md
    capability.json
    assets/
    scripts/

  create-pptx/
    SKILL.md
    capability.json
    assets/
    scripts/
```

These paths illustrate the intended packages. Planned directories are not checked in until the corresponding skill is implemented and validated.

## How shared skills work

Role membership is many-to-many. For example:

| Skill | Business Analyst | Product Owner | Project Manager | Developer |
| --- | --- | --- | --- | --- |
| `shape-idea` | yes | yes | yes | — |
| `create-docx` | yes | yes | yes | yes |
| `build-xlsx` | yes | yes | yes | yes |
| `create-pptx` | yes | yes | yes | yes |
| `write-unit-tests` | — | — | — | yes |
| `build-java-test-harness` | — | — | — | yes |

The role tree is derived from `catalog.json` role metadata plus each `capability.json` membership. It never copies skill content into role folders.

## Centralized Java system testing

`build-java-test-harness` manages an external, versioned test control plane rather than adding tests beside every implementation area. Its workflow:

1. separates reusable Java framework code from system-specific test packs and generated evidence;
2. gives every test a stable ID, owner, risk, traceability, lifecycle, effects, timeout, and cleanup plan;
3. maps source, configuration, contract, data, and requirement changes through an evidence graph;
4. selects explainable impacted tests plus a conservative smoke or regression safety net;
5. versions the framework, test-pack release, individual test digest, and execution manifest independently;
6. refuses to rewrite expected behavior without an approved requirement, criterion, defect, contract, or decision.

The catalog is generated from annotations and descriptors, then validated deterministically. Tests are organized by stable behavior and customer journey rather than mirroring source packages or deployment structure.

`write-unit-tests` remains a separate planned skill for isolated code-level behavior. Browser end-to-end, performance, security, and exploratory testing remain separate outcomes even when their results are governed by the same test manager.

The first external harness is Java-first and uses JUnit Platform as the execution boundary, with Maven and Gradle as adapters rather than hard-coded ownership models.

## Document, workbook, and slide skills

DOCX, XLSX, and PPTX are separate skills because they have different artifact contracts, validation methods, accessibility checks, and deterministic tooling.

| Skill | Output | Minimum evidence before completion |
| --- | --- | --- |
| `create-docx` | `.docx` | successful open/render, heading and table structure, no clipped content |
| `build-xlsx` | `.xlsx` | formula validation, range checks, readable formatting, no spreadsheet errors |
| `create-pptx` | `.pptx` | successful render, readable slide layout, no overflow or hidden content |

The portable skill describes the workflow and quality gate. Host-specific integrations stay in sidecars or tools; they do not fork the canonical workflow.

## Naming rules

- Role display: “I'm a Business Analyst”.
- Stable role ID: `business-analyst`.
- Skill display: “Draft a BRD”.
- Stable skill ID: `draft-brd`.
- Prefer verb–object IDs; avoid gerunds such as `drafting-brd` and role prefixes such as `im-a-business-analyst-draft-brd`.
- Use `capability.json` for behavior and trust metadata, `references/` for on-demand guidance, `assets/` for reusable output material, and `scripts/` for deterministic helpers.

## Recommended build order

1. `draft-brd` — available experimentally; validate it on real Business Analyst scenarios.
2. `write-user-stories` — available experimentally; validate vertical slicing and Product Owner handoff.
3. `define-acceptance-criteria` — available experimentally; validate business rules, Gherkin, and story coverage.
4. `build-java-test-harness` — available experimentally; validate catalog, impact selection, versioning, execution, and evidence on a real change set.
5. `initiate-project` and `run-pir` — complete the first project-management loop.
6. `write-unit-tests` — add isolated language-aware code testing only after the central governance boundary is proven.
7. `create-docx`, `build-xlsx`, and `create-pptx` — prove binary artifact generation and visual verification.
8. Expand framework references and role packs only after the first workflows pass their declared evals.
