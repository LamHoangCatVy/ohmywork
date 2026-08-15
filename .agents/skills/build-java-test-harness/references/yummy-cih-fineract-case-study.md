# Case study: CIH as an impact-evidence adapter for Apache Fineract

Use this case study when deciding whether a static code-intelligence engine can support test impact selection in a large Java system. It records a reproducible experiment; it is not a recommendation to bundle either repository.

## Question

Can CIH provide useful Java, Spring, route, data-access, and test relationships to an external test control plane without becoming the test catalog, execution engine, or source of truth?

## Fixed inputs

| Input | Snapshot | Purpose |
| --- | --- | --- |
| `phuchoang92/yummy-cih` | `b91f109388e8d58c1e875a92a6d83c786820a500` | Code-intelligence engine under evaluation |
| `apache/fineract` | `106a694eb4f1bb76f380214f68dc14f6c2ad315a` | Public Java/Gradle/Spring banking codebase |
| CIH Spring XML fixture | same CIH snapshot | Small calibration input before the larger run |

The experiment ran locally on macOS arm64 on 2026-08-14. No production system, bank environment, database, or external test environment was contacted. Analysis used `--no-load`, so no FalkorDB write was attempted.

## Reproduction

CIH pins Rust `1.97.1`. Its macOS native Ladybug build also required OpenSSL 3 in this environment. The commands below assume a built `cih-engine` binary and omit machine-specific toolchain paths.

```bash
python3 scripts/check_layering.py
python3 scripts/validate-retrieval-production.py --self-test
python3 scripts/validate-retrieval-production-soak.py --self-test
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

cih-engine scan crates/cih-engine/tests/corpus/java-spring-xml-di
cih-engine analyze crates/cih-engine/tests/corpus/java-spring-xml-di --all --no-load

cih-engine scan /path/to/fineract
cih-engine analyze /path/to/fineract \
  --module fineract-loan \
  --language java \
  --no-load
```

All CIH repository quality gates above passed locally. The native macOS link emitted duplicate Zstandard-symbol warnings because Ladybug and Rust dependencies both contributed Zstandard symbols; CIH's own CI instead uses a pinned shared Ladybug Linux runtime. Treat platform packaging as a separate qualification concern.

## Observed output

### Calibration fixture

CIH scanned 7 Java files and 133 lines, then emitted 50 nodes and 62 edges. The output included:

- `HandlesRoute` for `POST /api/passwords/change`;
- `ListensTo` for a Spring event listener;
- `MethodImplements` links;
- `ExecutesQuery` and `WritesTable` links for `AUDIT_LOG`;
- 3 unresolved dynamic references.

The fixture deliberately contains malformed XML. CIH preserved the parsed prefix and warned rather than silently treating the document as complete. It also warned about a duplicate node ID and omitted graph reporting metadata because uniqueness was not proven.

### Apache Fineract scan

The repository scan identified Gradle, 6,576 Java files, and approximately 867,000 lines of source. The bounded `fineract-loan` analysis completed successfully with these artifacts:

| Observation | Count |
| --- | ---: |
| Parsed Java files | 690 |
| Graph nodes | 9,542 |
| Graph edges | 19,218 |
| Resolve edges | 9,543 |
| Unresolved references | 14,390 |
| Unique files represented under `src/test` | 30 |
| `Tests` edges | 69 |
| `HandlesRoute` edges | 26 |
| `ExecutesQuery` edges | 68 |
| `ReadsTable` edges | 49 |
| `WritesTable` edges | 54 |

The graph found JAX-RS routes such as `POST /v1/delinquency/buckets`, method call and inheritance relationships, test methods, mocked collaborators, queries, and table relationships. These are useful candidate edges for change-impact expansion.

The output is evidence, not truth. The bounded module left 2,781 internal, 4,720 external, and 6,889 dynamic references unresolved. One `Tests` edge pointed to a missing endpoint, so CIH again withheld uniqueness-based graph metadata. A permission-related constant was also classified as a query that writes `LOAN`, indicating that SQL and table edges require validation before they can drive a narrow test selection.

## Architectural fit

```text
Git diff / contract diff
          |
          v
  CIH adapter (optional)
  nodes + edges + unresolved evidence
          |
          v
OhMyWork evidence graph
  normalize IDs, provenance, confidence, age
          |
          +---- requirements / contracts / incidents
          +---- runtime coverage / build dependencies
          +---- governed test catalog
          |
          v
Conservative selection policy
  impacted tests + mandatory smoke + unknown fallback
          |
          v
Gradle/Maven + JUnit Platform
          |
          v
Versioned, redacted execution evidence
```

CIH should be one replaceable provider behind an adapter. It must not own stable test IDs, expected behavior, test lifecycle, suite policy, approvals, execution, cleanup, or evidence retention.

## Adapter contract

Normalize third-party graph output before it enters selection policy:

```text
EvidenceEdge
  sourceRef       stable repo-relative artifact or symbol reference
  targetRef       stable artifact, symbol, interface, data object, or test ID
  relation        calls | implements | exposes | reads | writes | tests | unknown
  provider        yummy-cih
  providerVersion commit or immutable release
  repository      repository ID and analyzed commit
  scope           modules, includes, excludes, and languages
  confidence      provider confidence mapped to OhMyWork policy
  observedAt      analysis timestamp
  provenance      source artifact path plus original edge reason
  integrity       valid | missing-endpoint | duplicate-id | unresolved
```

Reject or downgrade edges with missing endpoints, duplicate IDs, ambiguous repository-relative identities, or unsupported relation mappings. Store unresolved-reference summaries alongside selected tests; do not discard them after normalization.

## Selection policy

Use CIH edges to add candidates, not to prove safety by absence.

1. Start from the changed file, symbol, route, schema, configuration, or contract.
2. Traverse only allowed relation kinds and bounded depths. Record the complete path and original CIH reasons.
3. Join graph candidates to stable test IDs in the governed catalog. A CIH class or method name is not a test identity.
4. Combine static evidence with explicit requirement trace, build dependencies, recent isolated runtime coverage, and incident mappings.
5. Run direct/high-confidence candidates plus the policy smoke suite.
6. Expand to capability regression or broader regression when endpoints are missing, evidence conflicts, a dynamic boundary is crossed, or the graph has no trustworthy path.
7. Never update an expected result because CIH reports a different implementation relationship.

## Decision

**Status: ready for a narrow adapter spike, not ready as the sole impact selector.**

The experiment proves that CIH can emit potentially valuable Java/Spring/test graph evidence quickly on a substantial module. It also proves why the external test manager needs provider-independent identity, confidence, provenance, integrity checks, and conservative fallbacks.

Before any organizational or commercial adoption:

- validate CIH against a licensed internal representative repository and known historical changes;
- measure selection recall against tests that actually failed or covered changed code;
- qualify Linux and macOS packaging separately;
- set acceptable unresolved, missing-endpoint, and false-positive thresholds;
- compare static selections with Gradle/JUnit discovery and authorized runtime coverage;
- review CIH's `PolyForm-Noncommercial-1.0.0` license before redistribution, bundling, or commercial use.

Apache Fineract is Apache-2.0, but this experiment copied no source into the skill. Only snapshot identifiers, aggregate observations, commands, and small symbolic examples are recorded.
