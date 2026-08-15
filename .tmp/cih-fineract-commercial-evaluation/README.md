# OhMyWork CIH + Fineract evaluation bundle

This bundle explains exactly what was run on 2026-08-14, what the experiment proved, and how to turn the result into a sellable OhMyWork offering without reselling third-party code accidentally.

## Start here

1. Read [`run-manifest.json`](run-manifest.json) for immutable inputs, environment, results, side effects, and cleanup status.
2. Read [`RUNBOOK.md`](RUNBOOK.md) for the executed command sequence and a reproducible workflow.
3. Read [`COMMERCIALIZATION.md`](COMMERCIALIZATION.md) for the product boundary, pilot offer, enterprise architecture, and commercial gates.
4. Inspect [`evidence/`](evidence/) for concise transcripts of the successful checks and both analysis runs.
5. Use [`scripts/reproduce.sh`](scripts/reproduce.sh) only for an authorized non-commercial evaluation or after obtaining an appropriate CIH commercial license.

## What this bundle contains

- pinned repository commits;
- the local execution environment and prerequisites;
- quality-gate and analysis results;
- known graph-integrity and false-positive findings;
- a provider-neutral impact-evidence architecture;
- a commercial packaging proposal;
- an idempotent reproduction script that writes only under a designated case-study root.

## What it deliberately excludes

- CIH source or binaries;
- Apache Fineract source;
- the 10 GB Rust build cache;
- raw graph artifacts containing source-level identifiers beyond the small examples in the evidence transcripts;
- secrets, credentials, production data, customer code, or customer test output;
- legal approval to use CIH commercially.

The source repositories remain available as clean temporary clones at:

- `/tmp/ohmywork-yummy-cih`
- `/tmp/ohmywork-fineract-case-study`

Those paths are machine-local conveniences, not part of this portable bundle.

## Bottom line

CIH successfully produced useful candidate relationships from a substantial Java/Spring module, but unresolved references, a missing endpoint, and a likely SQL false positive mean it must remain one evidence provider behind an OhMyWork adapter. It must not be the sole authority for selecting or skipping tests.

The commercially defensible product is the OhMyWork test control plane: stable test identity, catalog governance, provider normalization, conservative selection policy, JUnit execution, versioned evidence, security controls, and onboarding services.
