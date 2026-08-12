# Evidence-backed change-impact analysis

Use this reference when selecting tests or proposing updates after a source, configuration, contract, data, or requirement change.

## Build an evidence graph

Model nodes for repositories, files, classes, methods, configuration keys, contracts, operations, events, migrations, capabilities, acceptance criteria, tests, datasets, environments, and known incidents.

Model explicit edges such as `implements`, `calls`, `exposes`, `consumes`, `configures`, `verifies`, `covers`, `uses-data`, `depends-on`, and `regresses`.

Derive edges from:

1. explicit requirement and capability links;
2. Git diff and build dependency graphs;
3. contract, schema, configuration, and migration diffs;
4. static dependency analysis;
5. isolated runtime coverage;
6. prior failures and incident mappings;
7. historical co-change as low-confidence supporting evidence.

Reflection, dependency injection, runtime configuration, remote calls, and generated code make static graphs incomplete. Preserve uncertainty.

## Assign confidence

- `certain`: explicit requirement, contract, or manually approved trace.
- `high`: direct dependency or recent runtime coverage.
- `medium`: transitive dependency or same capability.
- `low`: historical correlation without a stronger edge.
- `unknown`: insufficient graph evidence.

For every selected test, emit the path from changed artifact to test and the supporting evidence. Do not allow a model-only judgment to be the sole skip reason.

## Select conservatively

Run direct impacts, then expand by policy:

- pull request: direct and high-confidence impacts plus critical smoke;
- main: impacted tests plus capability regression and smoke;
- nightly: broad regression, contracts, and reconciliation;
- release: full critical, regression, resilience, performance, and security gates.

Unknown impact expands to a capability or broader regression suite. It never selects zero tests.

## Classify outcomes

- `still-valid`: expected behavior is unchanged.
- `update-required`: authoritative evidence changes an existing expectation.
- `new-test-required`: new behavior or defect lacks coverage.
- `possibly-obsolete`: evidence suggests retirement, but approval is required.
- `unknown-impact`: missing trace or ambiguous behavior blocks a confident decision.

Never update a baseline merely to match observed output. First establish whether the output is intended.

## Refresh evidence

Runtime coverage and historical mappings age. Record collection time and application/test revisions, lower confidence when stale, and refresh mappings during scheduled runs. Keep a full-regression safety net because any impact graph can miss an edge.
