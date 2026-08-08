# ohmywork

Vendor-neutral skills and capability contracts for taking work from a rough idea to a verified, deployable, observable outcome.

> [!IMPORTANT]
> ohmywork is experimental (`0.x`). The first round establishes the portable skill format, trust model, installer projections, and one reference skill. Build, deploy, gateway, and durable-memory capabilities are roadmap items, not production claims yet.

## Why this exists

Agent workflows are usually trapped in one vendor, mixed into one large prompt, and trusted because an agent says it finished. ohmywork takes a different approach:

- Store reusable workflows as [Agent Skills](https://agentskills.io/specification), not vendor-specific prompts.
- Keep live data, authentication, and controlled actions in MCP tools rather than in skill text.
- Model every capability with machine-readable inputs, outputs, permissions, risk, assurance, and telemetry.
- Require evidence for completion: artifacts, tests, evals, security checks, release provenance, deployment records, and operational signals.
- Treat memory as scoped, consented, attributable data—not as an invisible source of policy.

## What works today

The canonical skills live in [`.agents/skills`](.agents/skills). Codex, Cursor, and OpenCode can discover that directory directly. The bootstrap command creates safe projections for Claude Code and Hermes without duplicating the source of truth.

```bash
git clone https://github.com/lamhoangcatvy/ohmywork.git
cd ohmywork
node scripts/bootstrap.mjs init
node scripts/bootstrap.mjs doctor
```

Install selected project adapters:

```bash
node scripts/bootstrap.mjs init --agent codex --agent cursor --agent opencode
node scripts/bootstrap.mjs init --agent claude-code --agent hermes-agent
```

Symlinks are the default so updates remain in sync. Use `--copy` where symlinks are unavailable:

```bash
node scripts/bootstrap.mjs init --copy
```

You can also install from GitHub with the community [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add lamhoangcatvy/ohmywork --skill '*' \
  --agent opencode --agent claude-code --agent codex \
  --agent cursor --agent hermes-agent
```

The repository wrapper remains the source of truth for local bootstrap behavior because third-party installer locks are not integrity or release locks.

## First skill

`shape-idea` turns one rough sentence into an evidence-aware idea brief before anyone commits to a specification or build.

- Codex: invoke `$shape-idea`.
- Claude Code, Cursor, OpenCode, or Hermes: invoke `/shape-idea` or ask for it by name.
- Natural language: “Turn this idea into a decision-ready brief.”

## Architecture

| Layer | Responsibility | Source of truth |
| --- | --- | --- |
| Skills | Focused, progressively loaded workflows | `.agents/skills/*/SKILL.md` |
| Capability contracts | Inputs, outputs, effects, permissions, risk, evals, telemetry | `contracts/*.schema.json` and each `capability.json` |
| Catalog | Discovery and lifecycle metadata | `catalog.json` |
| Bootstrap | Project projections and health checks | `scripts/bootstrap.mjs` |
| Future bindings | npm core/React, PyPI CLI, MCP server | Generated from the same contracts |
| Future control plane | Gateway, identity, policy, audit, memory | Provider-neutral interfaces |

Read [the architecture](docs/architecture.md) and [round roadmap](docs/roadmap.md) for the design and acceptance gates.

## Development

Requirements: Node.js 20 or newer. Round 0 has no runtime dependencies.

```bash
npm run check
npm test
```

Changes are delivered one feature round at a time. Each round is reviewed before its commit is pushed to `main`; force-pushes are not part of the workflow.

## Project policies

- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

Apache License 2.0. See [LICENSE](LICENSE).
