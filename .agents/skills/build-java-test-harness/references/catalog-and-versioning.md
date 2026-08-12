# Catalog and versioning

Use this reference when defining test metadata, releases, ownership, quarantine, or audit evidence.

## Stable identity

Give each canonical test a permanent, readable ID such as `TXN-APPROVAL-0042`. Renaming or moving a file must not change the ID. Never reuse a retired ID for a different behavior.

Require:

- title and test type;
- owner and risk;
- requirement or capability trace;
- source kind, safe relative path, and executable selector;
- suite tags;
- timeout;
- side effects and cleanup;
- lifecycle status.

Generate a content digest and last-change commit during catalog assembly. Do not ask authors to increment a version field on every test edit.

For a `managed-pack` test, resolve the source under `packs/`. For an `application-bound` test, resolve the registered repository ID, checked-out application commit, relative path, and JUnit selector. Do not duplicate the test body in the external manager merely to catalog it.

## Version three release units

| Unit | Version source |
| --- | --- |
| Reusable framework | Semantic version and immutable Maven coordinates |
| System test pack | Git tag or release version |
| Individual test | Stable ID plus content digest and Git commit |

Every run manifest must record application commit, test-pack commit, framework version, Java version, environment fingerprint, contract-baseline digest, selection policy, selected test IDs, and timestamps.

## Lifecycle

- `active`: participates in selection normally.
- `quarantined`: still visible; requires reason, owner, expiry, and replacement plan. A retry does not erase the first failure.
- `deprecated`: requires rationale and replacement or explicit no-replacement decision.
- `retired`: retained as a tombstone in release history; the ID is never reused.

Never silently delete a failing or obsolete-looking test. Require evidence that the behavior changed or no longer exists.

## Catalog generation

Generate the catalog from annotations and descriptors. Fail validation on duplicate IDs, missing owners, unresolved source paths, invalid references, undeclared side effects, unsafe cleanup, or expired quarantine.

Do not commit generated run reports or transient logs. Commit reviewed contract baselines and human-authored scenario sources. Store immutable execution evidence in the approved evidence system with retention and access controls.

## Ownership and review

Use CODEOWNERS or an equivalent policy for test packs and critical baselines. Require a behavior owner to approve changed expectations and a test-platform owner to approve framework or execution-policy changes.
