# Roadmap and review gates

The roadmap is outcome-driven. A round is complete only when its acceptance evidence passes and the maintainer approves the local diff. Security, privacy, accessibility, documentation, and observability start in Round 0 and deepen in later rounds.

## Delivery rule

For each round:

1. Implement one coherent feature set locally on `main`.
2. Run deterministic checks and the relevant skill evals.
3. Present the diff, known gaps, and verification evidence.
4. Wait for explicit maintainer approval.
5. Create one conventional commit and push it to `main`.

Never combine approval for one round with a later round, and never force-push `main`.

## R0 — Constitution, contracts, and portable bootstrap

Status: in progress; local candidate awaiting verification and review.

Scope:

- Agent Skills canonical layout and host projections.
- Role-first bundle discovery backed by a validated role registry and capability membership.
- Capability/catalog JSON Schema 2020-12 contracts.
- Risk tiers, permission declarations, assurance, observability, ownership, and licensing.
- Safe `init`, `doctor`, catalog validator, and collision/integrity tests.
- Four reference skills: `shape-idea`, `draft-brd`, `write-user-stories`, and `define-acceptance-criteria`.
- Open-source community and security baseline.

Acceptance:

- Every catalog entry, skill, sidecar, and local reference validates.
- Every role resolves to at least one real skill without duplicating canonical skill content.
- `init` is idempotent for Codex, Cursor, OpenCode, Claude Code, and Hermes.
- Symlink and copy modes pass; unmanaged paths are never overwritten.
- Each reference capability declares owner, license, effects, permissions, evals, threat model, telemetry, and support.
- Direct, indirect, incomplete, negative-trigger, unsupported-claim, and prompt-injection scenarios are forward-tested.

## R1 — One sentence to decision-ready spec and plan

Scope:

- Opportunity, stakeholder, assumption, research, feasibility, and risk skills.
- Requirements, quality attributes, acceptance criteria, data classification, UX flow, accessibility, architecture, ADR, API/event/data contracts, threat model, work breakdown, dependencies, ownership, estimates, release, migration, and rollback plans.
- Role toolboxes for business analysis, product ownership, and project management, including BRDs, user stories, project initiation, risk registers, and post-implementation reviews.
- Shared artifact skills for accessible DOCX documents, XLSX workbooks, and PPTX slide decks.
- Role profiles for sponsor, product, research, design, architecture, delivery, engineering, QA/eval, security/privacy, platform/SRE, data/ML, documentation/community, GRC/OSPO, and FinOps.

Acceptance:

- Three golden scenarios pass: web/service, agentic workflow, and data/knowledge workflow.
- Every requirement has an ID, source, owner, priority, and acceptance test.
- Every planned task traces to a requirement and definition-of-done evidence.
- The user confirms outcome, non-goals, major assumptions, and risk tier before build.

## R2 — Build and test locally

Scope:

- Repository bootstrap, implementation, refactoring, code review, migrations, IaC, feature flags, documentation-as-code, and local developer experience.
- Developer skills for framework-aware unit testing, code review, safe refactoring, and technical documentation.
- Sandboxed deterministic tests and agent evals: unit, property, integration, contract, end-to-end, accessibility, performance, fuzz, recovery, tool selection, trajectory, grounding, refusal, prompt injection, privilege, and memory-poisoning cases.

Acceptance:

- A clean isolated environment can build and verify all three golden scenarios.
- Undeclared filesystem or network access is denied.
- Typical, edge, held-out, and adversarial datasets are versioned and pass declared thresholds.
- No secret is committed, logged, placed in a prompt fixture, or written to memory.

## R3 — Secure supply chain and release

Scope:

- npm, PyPI, React, MCP, and optional Codex plugin artifacts.
- Single release train, reproducible build, SBOM/AIBOM, scans, provenance, signatures, trusted publishing, compatibility, deprecation, quarantine, revocation, and rollback.

Acceptance:

- npm tarballs, Python wheels/sdists, and the MCP package pass clean-install tests.
- SLSA Build L2 provenance verifies; tampered or revoked bundles are rejected.
- License, attribution, package contents, changelog, migration, and support evidence pass.
- MCP registry metadata is published only after its referenced package is verified.

## R4 — Gateway, identity, policy, and interoperability

Scope:

- MCP, A2A, and OpenAPI adapters; catalog and capability negotiation.
- User/workload identity, authorization, consent, quotas, budgets, secret broker, DLP, sandbox tiers, egress controls, audit, kill switch, and policy-as-code.

Acceptance:

- Conformance and cross-version compatibility suites pass.
- Every call is authenticated and authorized at each hop.
- Token passthrough, confused deputy, SSRF, privilege amplification, and cross-tenant attacks fail closed.
- Destructive tools require approval and revocation propagates to active work.

## R5 — Deploy and operate

Scope:

- Environment promotion, canary/blue-green rollout, migration safety, smoke/synthetic checks, auto-rollback, OpenTelemetry, SLO/error budgets, alerts, runbooks, incidents, capacity, backups, restore drills, DORA, and FinOps.

Acceptance:

- The same digest is promoted across environments without rebuilding.
- A failed canary aborts and rolls back automatically.
- Restore meets declared RTO/RPO in a drill.
- One trace connects outcome to gateway, policy, agent, tool, and memory decisions without leaking sensitive payloads.

## R6 — Memory and governed learning

Scope:

- Namespaced session, working, episodic, semantic, procedural, organizational, and audit memory.
- Consent, provenance, confidence, TTL, conflict, dedupe, export, delete, poison quarantine, feedback clustering, offline eval, shadow, canary, and rollback.

Acceptance:

- Cross-tenant leakage is zero in the adversarial suite.
- Every durable item has source, owner, namespace, consent, confidence, classification, and retention.
- Delete propagates through indexes and caches.
- No candidate can mutate production directly; every learning change becomes a reviewed, reversible version.

## R7 — Governance, documentation, community, and scale

Scope:

- AI/system inventory, impact assessments, exception lifecycle, independent audits, docs portal, examples, translations, contributor ladder, maintainership, lifecycle/deprecation policy, accessibility, sustainability, and ecosystem metrics.

Acceptance:

- NIST AI RMF mapping and appropriate ISO 42001/42005 readiness evidence exist.
- REUSE licensing, community health, security, support, governance, and documentation checks pass.
- Critical releases target SLSA Build L3 and independent evidence review.
- Runtime incidents trace backward to requirements; requirements trace forward to release and operational evidence.
