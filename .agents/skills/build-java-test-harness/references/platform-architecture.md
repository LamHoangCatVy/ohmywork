# Java test-control-plane architecture

Use this reference when bootstrapping or materially restructuring a centralized Java test manager.

## Separate four concerns

1. **Framework:** reusable Java libraries for discovery, execution, connectors, data lifecycle, impact analysis, and evidence.
2. **Test packs:** system-specific executable tests, scenario definitions, datasets, and contract baselines.
3. **Catalog:** a generated, validated index of stable test identities and traceability metadata.
4. **Evidence:** immutable run manifests, reports, coverage, logs, and redacted artifacts.

Avoid one giant module. A practical framework layout is:

```text
java-test-framework/
  test-platform-bom/
  test-manager-core/
  test-manager-junit/
  test-manager-catalog/
  test-manager-impact/
  test-manager-data/
  test-manager-evidence/
  test-manager-connectors/
  test-manager-build/
```

Keep system-specific content in a separate repository or release unit:

```text
enterprise-test-manager/
  test-catalog/
  policies/
  packs/
    identity-access/
    customer-lifecycle/
    transaction-processing/
    approval-workflows/
    reconciliation/
    operational-resilience/
  shared-fixtures/
  contract-baselines/
  environment-profiles/
```

Organize packs by stable behavior and customer journey. Do not mirror source packages, deployment units, or team ownership boundaries.

## Onboard without duplicating tests

Support two catalog source kinds:

- `managed-pack`: the canonical test lives under the external manager's `packs/` tree;
- `application-bound`: an existing test remains canonical in an approved application repository and the manager stores a repository ID, relative path, and JUnit selector.

Start legacy onboarding with `application-bound` entries. The runner checks out the recorded application commit and invokes the existing selector through its compatible build adapter. If a test is later migrated into a managed pack, retire the binding in the same reviewed change so only one canonical implementation remains active.

## Use a control plane

The control plane owns:

- catalog generation and validation;
- test discovery and suite selection;
- change-impact reasoning;
- execution policy and approvals;
- environment and synthetic-data leases;
- cleanup and recovery;
- structured evidence and coverage;
- quarantine, deprecation, and ownership policy.

Protocol connectors own transport only. Keep business assertions outside HTTP, OData, SOAP, messaging, file, browser, and database clients.

## Prefer declarative metadata

Put complex behavior in Java tests. Put identity, ownership, risk, requirements, capabilities, interfaces, tags, timeouts, side effects, and cleanup metadata in annotations or scenario descriptors. Generate the catalog from those sources rather than maintaining a second manual inventory.

## Preserve safety boundaries

- Keep production execution forbidden by default.
- Use synthetic data and dedicated test identities.
- Lease mutable data to one run and release it idempotently.
- Propagate a correlation ID through every permitted interface.
- Redact credentials, personal data, tokens, and full payloads from evidence.
- Treat dependency installation, environment contact, external writes, and artifact publication as separate approval boundaries.

## Scale by policy

Use impacted-plus-smoke for pull requests, capability regression for main, broad regression nightly, and full critical/resilience/performance/security gates for release. Central governance does not require every test to run on every change.
