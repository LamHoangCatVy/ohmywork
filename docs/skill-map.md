# OhMyWork skill map

Status: product map for the GitHub-first bundle. A skill appears in `catalog.json` only after its workflow, capability contract, permissions, tests, and evals exist.

## The human view

```text
OhMyWork
├── I'm a Business Analyst
│   ├── Shape an idea                         available · experimental
│   ├── Draft a BRD                           planned
│   ├── Analyze requirements                  planned
│   ├── Map a business process                planned
│   └── Trace requirements                    planned
├── I'm a Product Owner
│   ├── Shape an idea                         available · experimental
│   ├── Write user stories                    planned
│   ├── Define acceptance criteria            planned
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
    assets/story-template.md
    references/story-quality.md

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

The role tree is derived from `catalog.json` role metadata plus each `capability.json` membership. It never copies skill content into role folders.

## Framework-aware unit testing

`write-unit-tests` should remain one outcome-focused skill rather than one top-level skill per framework. Its workflow will:

1. inspect the repository to identify language, framework, test runner, and local conventions;
2. load only the matching reference, such as `references/pytest.md` or `references/vitest.md`;
3. identify behavior and edge cases before writing tests;
4. preserve the project's existing test style and dependency choices;
5. run the smallest relevant test command;
6. report coverage gaps without claiming unsupported coverage improvements.

Create a separate skill only when a testing family has a materially different outcome—for example browser end-to-end testing, performance testing, or contract testing.

Initial unit-test references should cover:

- JavaScript and TypeScript: Vitest, Jest, Node test runner;
- Python: pytest and unittest;
- Java and Kotlin: JUnit;
- .NET: xUnit and NUnit;
- Go: the standard `testing` package;
- Ruby: RSpec;
- PHP: PHPUnit.

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

1. `draft-brd` — proves one role-specific artifact workflow.
2. `write-user-stories` — proves reuse across business analysis and product ownership.
3. `initiate-project` and `run-pir` — completes the first project-management loop.
4. `write-unit-tests` with Vitest, Jest, and pytest references — proves framework routing.
5. `create-docx`, `build-xlsx`, and `create-pptx` — proves binary artifact generation and visual verification.
6. Expand framework references and role packs only after the first workflows pass their declared evals.
