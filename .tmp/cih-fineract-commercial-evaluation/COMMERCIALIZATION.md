# Commercialization proposal

This is a product and delivery proposal, not legal advice. Have counsel review licenses, customer contracts, data handling, warranties, export rules, and sector-specific obligations before sale.

## Product boundary

Sell **OhMyWork Test Control Plane**, not a repackaged copy of CIH.

OhMyWork owns and delivers:

- a stable, versioned test catalog;
- test ownership, risk, lifecycle, quarantine, and approval policy;
- change-impact orchestration across multiple evidence providers;
- provider normalization with provenance, confidence, age, and integrity states;
- conservative fallback suites when evidence is missing or conflicting;
- Maven/Gradle and JUnit Platform execution adapters;
- immutable, redacted run manifests and audit evidence;
- on-premises deployment, onboarding, support, and governance services.

A graph engine supplies optional evidence only. CIH, GitNexus, a customer-owned analyzer, runtime coverage, build graphs, and a future OhMyWork-native analyzer should all implement the same provider interface.

## License-safe routes

CIH declares `PolyForm-Noncommercial-1.0.0`. That license permits use, changes, and distribution only for permitted non-commercial purposes. Selling a product or service that uses CIH is therefore not a safe default under that license.

Choose one route before a paid customer pilot:

1. **Bring your own engine:** ship no CIH code. The customer supplies a separately licensed analyzer and OhMyWork consumes normalized artifacts.
2. **Commercial agreement:** negotiate explicit commercial/OEM/reseller rights with the CIH copyright holder. Define redistribution, hosted use, support, indemnity, updates, and termination.
3. **Provider replacement:** implement the same evidence contract using components whose licenses fit the intended commercial model or an OhMyWork-owned analyzer.

Do not call CIH an OhMyWork dependency in sales material until one of these routes is complete. Apache Fineract is a useful Apache-2.0 public benchmark, but preserve its notices and trademark boundaries if redistributing any source or derivative artifact.

## Reference architecture

```text
Customer Git / contracts / requirements
                  |
                  v
       Evidence-provider adapters
  static graph | build graph | runtime coverage
                  |
                  v
       OhMyWork normalized evidence graph
  provider + commit + scope + reason + confidence
  integrity + timestamp + unresolved evidence
                  |
                  v
        Governed test catalog and policy
  stable IDs + owners + risk + tags + lifecycle
                  |
                  v
       Impacted tests + mandatory safety net
                  |
                  v
          JUnit Platform execution plane
                  |
                  v
       Signed/redacted evidence and audit API
```

Deploy the platform inside the customer's network by default. Source code and raw graph artifacts should not leave the approved boundary. Production execution remains forbidden unless a separately reviewed use case genuinely requires it.

## Sellable offers

### 1. Readiness assessment

Fixed-scope discovery that inventories repositories, build systems, current tests, critical journeys, regulatory evidence, environments, and license constraints.

Deliverables:

- architecture and security boundary;
- catalog completeness baseline;
- representative change set and ground-truth test set;
- provider qualification report;
- pilot scope, risks, acceptance metrics, and commercial estimate.

### 2. Controlled pilot

Start with one bounded capability or Java module, not the whole estate.

Deliverables:

- 50-200 governed test IDs;
- one source or contract change feed;
- one optional static-evidence adapter;
- impacted-plus-smoke selection policy;
- JUnit/Gradle execution in an isolated environment;
- audit manifest, dashboard export, and rollback procedure;
- measured recall, precision, runtime reduction, unknown-impact rate, and cleanup reliability.

The pilot is successful only if safety and traceability improve. A lower test count by itself is not success.

### 3. Enterprise platform subscription

Annual license or subscription for the OhMyWork control plane, private artifacts, supported adapters, security updates, release policy, and defined SLA. Keep customer-specific test packs and environment profiles in separate private release units.

### 4. Engineering and managed assurance

Professional services for onboarding legacy tests, creating governed test packs, mapping critical business flows, incident-to-regression traceability, and operating scheduled assurance runs.

## Evidence required before claiming value

Do not promise “high coverage” or “AI finds every impacted test.” Measure:

- selection recall against tests known to cover or fail on representative changes;
- precision and execution-time reduction relative to the current suite;
- percentage of selected and skipped tests with explainable evidence paths;
- critical-flow and requirement coverage retained after selection;
- unknown-impact and fallback frequency;
- catalog integrity, stale mappings, quarantine age, and cleanup failures;
- false-negative incidents during shadow mode.

Run in shadow mode first: calculate a selection but continue running the existing broader suite. Compare results until the customer-approved threshold is met.

## Enterprise gates

Before general availability, complete:

- third-party license inventory, SBOM, signed releases, provenance, and vulnerability policy;
- offline/on-prem deployment and customer-managed secrets;
- role-based access, approval workflow, immutable audit log, and retention controls;
- source and evidence redaction, tenant isolation, backup, restore, and disaster recovery;
- supported Java, JUnit, Maven, Gradle, and operating-system matrix;
- adapter contract tests, graph-integrity gates, and fallback behavior;
- data-processing agreement, support terms, limitation of liability, and security schedule;
- independent security review appropriate to the customer's risk tier.

## Pricing drivers

Price the work by governed scope rather than raw LOC alone:

- number of applications, repositories, build variants, and environments;
- existing test count and catalog quality;
- critical business capabilities and regulatory evidence requirements;
- integration count and source-control/CI platform;
- on-premises or air-gapped deployment;
- custom adapters and test-pack engineering;
- support hours, incident response, upgrade cadence, and SLA.

Use a fixed-price assessment, a milestone-based pilot, then a platform subscription plus separately scoped implementation services. Avoid outcome guarantees until a shadow-mode baseline exists.

## Recommended next build

Implement a provider-neutral `EvidenceEdge` schema and a file-based CIH adapter spike that consumes exported JSONL without invoking or distributing CIH. Add integrity validation, an unresolved-evidence threshold, a catalog join, and an impacted-plus-smoke dry run. This creates sellable OhMyWork IP while keeping the third-party engine replaceable.
