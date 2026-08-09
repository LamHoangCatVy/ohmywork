# OhMyWork

Open work skills for the AI agent you already use.

**Choose your role. Pick a job. Plug in the skills you need.**

> [!IMPORTANT]
> OhMyWork is experimental (`0.x`) and GitHub-first. The repository is the skill-bundle source today; it is not yet published as an `ohmywork` registry package. Only skills marked available are implemented; planned skills describe the direction, not shipped capability.

## Find your toolbox

```text
OhMyWork
├── I'm a Business Analyst
│   ├── Shape an idea                  available · experimental
│   └── Draft a BRD                    available · experimental
├── I'm a Product Owner
│   ├── Shape an idea                  available · experimental
│   ├── Write user stories             available · experimental
│   └── Define acceptance criteria     planned
├── I'm a Project Manager
│   ├── Shape an idea                  available · experimental
│   ├── Initiate a project             planned
│   └── Run a PIR                      planned
├── I'm a Developer
│   ├── Write unit tests               planned
│   ├── Review code                    planned
│   ├── Refactor code                  planned
│   └── Write technical documentation  planned
└── I need a work artifact
    ├── Create a DOCX document          planned
    ├── Build an XLSX workbook          planned
    └── Create a PPTX slide deck        planned
```

A role is a toolbox, not a separate copy of the skills. One portable skill can appear in several toolboxes, and every skill remains usable by name.

See the [skill map](docs/skill-map.md) for the full role, engineering-framework, and artifact roadmap.

Explore the live catalog:

```bash
node scripts/bootstrap.mjs list
node scripts/bootstrap.mjs list roles
node scripts/bootstrap.mjs list --role business-analyst
```

## Try the first workflows

`shape-idea` turns a rough sentence into an evidence-aware idea brief before anyone commits to a specification or build.

```text
Input
  "A shared inbox that helps a support team spot recurring customer problems."

shape-idea
  → labels evidence and unknowns
  → identifies the riskiest assumption
  → proposes the smallest falsifiable test

Output
  A decision-ready idea brief with a clear proceed, pivot, or stop gate.
```

Invoke it naturally or by name:

- Codex: `$shape-idea`
- Claude Code, Cursor, OpenCode, or Hermes: `/shape-idea` or ask for `shape-idea`
- Natural language: “Turn this idea into a decision-ready brief.”

The first Business Analyst workflow is also available:

```text
business context or an approved idea brief
  → draft-brd
  → traceable business requirements document
  → structural validation and a decision gate
```

- Codex: `$draft-brd`
- Other supported hosts: `/draft-brd` or ask to “Draft a BRD from this context.”
- Output template: requirement IDs, evidence, priority, acceptance signals, traceability, risks, open questions, and decision readiness.

The first Product Owner workflow turns an outcome or BRD into small, traceable vertical slices:

```text
product context, BRD, or requirement set
  → write-user-stories
  → refinement-ready story map and user-story set
  → define-acceptance-criteria (planned next)
```

- Codex: `$write-user-stories`
- Other supported hosts: `/write-user-stories` or ask to “Turn these requirements into user stories.”
- Output template: stable story IDs, value, source evidence, proposed priority, dependencies, acceptance intent, and readiness.

## Plug in the bundle

### Work from the source repository

```bash
git clone https://github.com/lamhoangcatvy/ohmywork.git
cd ohmywork
node scripts/bootstrap.mjs list
node scripts/bootstrap.mjs init
node scripts/bootstrap.mjs doctor
```

Codex, Cursor, and OpenCode read the canonical `.agents/skills` directory directly. The bootstrap creates safe project projections for Claude Code and Hermes. Symlinks keep those projections in sync; use `--copy` where symlinks are unavailable.

```bash
node scripts/bootstrap.mjs init --agent codex --agent cursor --agent opencode
node scripts/bootstrap.mjs init --agent claude-code --agent hermes-agent
node scripts/bootstrap.mjs init --copy
```

### Add every skill to an existing project

The community [`skills` CLI](https://github.com/vercel-labs/skills) can install the GitHub repository as a bundle without OhMyWork being published to npm:

```bash
cd your-project
npx skills add lamhoangcatvy/ohmywork --skill '*' \
  --agent codex --agent claude-code --agent cursor \
  --agent opencode --agent hermes-agent
```

The repository bootstrap remains the reference implementation for local collision checks, projections, and future role-pack installation.

## How the bundle is organized

The friendly role tree is a catalog view. Canonical Agent Skills stay flat so every supported host can discover the same source without duplicated instructions.

```text
catalog.json                         Role and skill discovery
contracts/                           Machine-readable trust schemas
.agents/skills/                      Canonical portable skills
  shape-idea/
    SKILL.md                         Focused workflow
    capability.json                  Inputs, outputs, risk, permissions, evidence
    agents/openai.yaml               Optional host-specific UI metadata
    assets/idea-brief.md             Reusable output template
  write-user-stories/
    SKILL.md                         Product Owner story-slicing workflow
    capability.json                  Inputs, outputs, permissions, and evals
    assets/user-stories-template.md  Reusable story-set template
    references/story-quality.md      Vertical-slicing and INVEST guidance
    scripts/validate-user-stories.mjs
scripts/
  bootstrap.mjs                      Bundle discovery, projections, and doctor
  validate.mjs                       Catalog, skill, and trust validation
```

Each future skill follows the same shape:

```text
.agents/skills/draft-brd/
  SKILL.md
  capability.json
  assets/
  references/
  scripts/
```

Use verb–object skill IDs such as `draft-brd`, `write-user-stories`, `initiate-project`, and `run-pir`. Role labels such as “I'm a Business Analyst” belong in discovery, not in skill directory names.

## Why the extra contract?

OhMyWork is more than a prompt collection. Every capability declares:

- what it accepts and produces;
- what it may read, write, or call;
- its risk and approval boundary;
- how completion is verified;
- which hosts it supports;
- who owns and supports it.

That lets a future installer treat a role pack as a curated set without silently increasing authority or hiding side effects.

## Architecture

| Layer | Responsibility | Source of truth |
| --- | --- | --- |
| Role catalog | Human-friendly “I'm a…” discovery | `catalog.json` role metadata plus each capability's `roles` |
| Skills | Focused, progressively loaded workflows | `.agents/skills/*/SKILL.md` |
| Capability contracts | Inputs, outputs, effects, permissions, risk, evals, telemetry | `contracts/*.schema.json` and each `capability.json` |
| Bootstrap | Host projections and health checks | `scripts/bootstrap.mjs` |
| Future distribution | One-command bundle or role-pack installation | Generated from the same catalog and canonical skills |

Read [the architecture](docs/architecture.md) and [roadmap](docs/roadmap.md) for the deeper trust and delivery model.

## Build a skill with us

Start from one user outcome, not an entire job title. A contribution adds one canonical skill, its capability contract, supporting material, and verification evidence. See [Contributing](CONTRIBUTING.md) for the complete checklist.

Requirements: Node.js 20 or newer. The current round has no runtime dependencies.

```bash
npm run check
npm test
node scripts/bootstrap.mjs doctor
```

## Project policies

- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

Apache License 2.0. See [LICENSE](LICENSE).
