# Architecture

Status: Round 0 candidate. This document records the intended boundaries; only the repository validation, bootstrap projections, and `shape-idea` skill exist today.

## Design principles

1. **Contract before adapter.** Define capability behavior, risk, permissions, evidence, and telemetry once. Generate or implement thin bindings for hosts and package ecosystems.
2. **Evidence before completion.** A workflow gate passes because inspectable artifacts and checks exist, not because an agent reports success.
3. **Least authority.** Default-deny permissions, capability negotiation, explicit side effects, and approval proportional to risk.
4. **Progressive disclosure.** Advertise concise skill metadata, load the workflow only when selected, and load supporting files only when needed.
5. **Portable core, optional enhancements.** Canonical behavior must not require a vendor extension. Vendor sidecars can improve one host without changing the strict core.
6. **Human ownership.** The user owns goals, consequential choices, external writes, releases, deployments, and durable procedural learning.

## Vocabulary

- **Capability:** a promised outcome with an input/output/error contract and trust metadata.
- **Skill:** a focused Agent Skills implementation containing instructions and optional scripts, references, or assets.
- **Tool or connector:** a controlled execution primitive, usually exposed by MCP or a host.
- **Role:** a policy-limited composition of capabilities; it is not a duplicated prompt persona.
- **Workflow:** a state machine that moves immutable artifacts through evidence gates.
- **Gateway:** the identity, authorization, policy, routing, quota, consent, and audit plane.
- **Memory:** scoped factual or procedural data with provenance, consent, retention, conflict, and deletion semantics.

## Evidence graph

The target lifecycle is:

```text
Idea
  -> opportunity brief
  -> requirements and risk
  -> architecture and contracts
  -> delivery plan
  -> change set
  -> test, eval, and security evidence
  -> release bundle
  -> deployment record
  -> runtime and incident evidence
  -> governed learning proposal
  -> next version
```

Every artifact version is immutable. New evidence or a changed decision creates a successor and trace links; it does not rewrite history silently.

## Source layout

```text
.agents/skills/                 Canonical Agent Skills
  <skill>/
    SKILL.md                    Strict portable workflow
    capability.json             Trust and behavior contract
    agents/                     Optional vendor sidecars
    assets/                     Output templates
    references/                 On-demand knowledge
    scripts/                    Deterministic helpers
contracts/                      JSON Schema 2020-12 contracts
catalog.json                    Versioned role and skill discovery catalog
scripts/validate.mjs            Strict validation and policy invariants
scripts/bootstrap.mjs           Safe project projections and doctor
```

The strict `SKILL.md` frontmatter contains only `name` and `description`. The [Agent Skills specification](https://agentskills.io/specification) permits more optional fields, but keeping them out of the canonical file avoids inconsistent host semantics. Extensions belong in sidecars.

## Role-first bundle model

OhMyWork is authored as one portable skill bundle with two views:

- people browse role toolboxes such as “I'm a Business Analyst”;
- agents discover independent skills such as `shape-idea` from the flat canonical skill directory.

Role display metadata lives in `catalog.json`. Membership lives once in each adjacent capability's `roles` field. A role view is derived by joining those sources; it never owns or copies a `SKILL.md`. This preserves many-to-many reuse because one skill can support several roles and one role can collect several skills.

The current GitHub repository is the bundle source. Bootstrap projections adapt that source for hosts with different project directories. A future packaged installer may install the whole bundle or a role-selected subset, but it must consume the same catalog and canonical skills rather than introduce a second authoring tree.

Do not use role containers such as `.agents/skills/im-a-business-analyst/`. Host discovery and validation operate on `.agents/skills/<skill-id>`, and role wording is presentation that may later be localized.

## Host compatibility

| Host | Project discovery | ohmywork behavior |
| --- | --- | --- |
| Codex | `.agents/skills` | Reads canonical skills directly; optional `agents/openai.yaml` enhances UI metadata. |
| Cursor | `.agents/skills` | Reads canonical skills directly. |
| OpenCode | `.agents/skills` | Reads canonical skills directly; avoid version-specific frontmatter extensions. |
| Claude Code | `.claude/skills` | Bootstrap creates one safe projection per canonical skill. `CLAUDE.md` imports `AGENTS.md`. |
| Hermes | `.hermes/skills` or configured external directories | Bootstrap creates a project projection; canonical content remains read-only by convention. |

The open-source [`skills` CLI](https://github.com/vercel-labs/skills) is useful for remote discovery and installation across many agents. ohmywork does not treat its current lockfile as an integrity guarantee and keeps a thin wrapper for collision handling, local projections, and future policy checks.

## Capability trust contract

Every capability declares:

- identity, owner, maturity, version, roles, and lifecycle stages;
- inputs, outputs, errors, preconditions, and postconditions;
- execution kind, timeout, retry, idempotency, and rollback;
- side effects, permission scope, approval, and risk tier;
- deterministic tests, statistical evals, thresholds, and threat model;
- trace fields, metrics, capture policy, and sensitive-data handling;
- license, source, dependencies, compatibility, and support route.

Risk tiers are cumulative:

| Tier | Meaning | Typical gate |
| --- | --- | --- |
| T0 | Analysis with no external effect | No approval beyond the task request |
| T1 | Reversible workspace changes | Host sandbox and project scope |
| T2 | Network reads or external data | Host policy, consent, and source controls |
| T3 | Reversible external writes | Explicit user approval and audit |
| T4 | Destructive, production, publish, deploy, privilege, or durable procedural memory | Step-up approval; separation of duties where warranted |
| T5 | Prohibited behavior | Deny |

Delegation can only preserve or reduce authority. A child agent must never gain a permission that its parent did not hold.

## Distribution architecture

The planned dependency direction is:

```text
contracts -> generated types and validators -> portable core -> CLI | React | MCP | Python binding
```

Planned packages share one release train while the project is young:

- `@ohmywork/core`: browser-neutral catalog, contracts, policy, and client logic;
- `@ohmywork/react`: React hooks and accessible UI, with React as a peer dependency;
- `@ohmywork/mcp`: one Node server, stdio by default and Streamable HTTP when explicitly configured;
- `ohmywork` on PyPI: a native Python CLI and packaged catalog, with the same golden contract fixtures.

TypeScript is the initial engine candidate because React, npm, and the MCP server share that ecosystem. Python must not spawn Node as the permanent architecture. If offline business logic becomes substantial across JavaScript and Python, the project will evaluate a Rust core with Wasm and PyO3 bindings. Until then, shared schemas plus differential golden tests are cheaper and easier to audit.

Generated outputs will be checked in, reproducible, and verified by a clean-codegen diff. `server.json` will be generated only for the package that actually runs an MCP server.

## Protocol boundaries

- **Agent Skills:** reusable procedural knowledge.
- **MCP:** agent-to-tool context and controlled actions. Target the dated stable protocol, negotiate capabilities, and isolate optional extensions. The current reference is [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28).
- **A2A:** optional agent-to-agent delegation and discovery; never required by a single-agent skill.
- **OpenAPI and events:** application-facing service contracts, independent of MCP bindings.

Core durable execution must not depend on an experimental MCP extension. MCP is an adapter over the workflow engine, not the workflow engine itself.

## Gateway

The future gateway must provide:

- user and workload identity, audience-bound short-lived credentials, and no token passthrough;
- default-deny policy-as-code, permission diffs, step-up approvals, and revocation;
- schema validation, rate and cost budgets, timeouts, retries, idempotency, circuit breaking, and compensation;
- secret handles rather than secret values in prompts or memory;
- egress allowlists, SSRF defenses, sandbox profiles, DLP, tenant boundaries, and immutable audit decisions;
- one correlation chain across goal, workflow, agent, model, policy, tool, memory, approval, and outcome.

## Memory and governed learning

Separate session, working, episodic, semantic, procedural, organizational, and audit memory. Raw evidence is immutable; summaries and embeddings are derived artifacts linked to the source.

Every durable item must have owner, namespace, source, confidence, consent, classification, retention/TTL, and deletion behavior. Apply access-control filters before retrieval and ranking. Durable procedural memory is T4: an agent may propose it, but promotion requires review, evals, a new version, and rollback. Memory never replaces checked-in rules such as `AGENTS.md`.

## Supply chain and release

Release artifacts will be built once from a clean checkout, tested as packed artifacts, and promoted without rebuilding. Planned controls include:

- immutable versions and digests;
- SBOM plus AI/data provenance where applicable;
- signed tags, GitHub artifact attestations, npm and PyPI trusted publishing;
- pinned CI actions, least-privilege workflow permissions, isolated publishing environments;
- tamper, revocation, rollback, compatibility, package-content, and clean-install tests;
- MCP registry publication only after the underlying npm or PyPI artifact is verified.

The project starts with [SLSA Build L2](https://slsa.dev/spec/v1.2/build-track-basics) as the first release target and uses the [OpenSSF OSPS Baseline](https://baseline.openssf.org/) as a control checklist.

## Non-goals

- One mega-skill that claims to perform the full lifecycle.
- Silent production deployment or self-modification.
- A hidden, vendor-owned memory format as the source of truth.
- Two independent MCP servers without market evidence that both are needed.
- Reimplementing a general skill marketplace or every host installer.
