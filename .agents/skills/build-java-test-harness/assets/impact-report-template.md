# Test Impact Report: <change title>

## Execution identity

- Application commit: <commit>
- Diff base: <commit>
- Test-pack commit: <commit>
- Framework version: <version>
- Java version: <version>
- Environment: <non-production environment>
- Environment fingerprint: <digest>
- Contract baseline: <version or digest>
- Selection policy: <policy>

## Change classification

| Changed artifact | Change type | Capability or contract | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| <path or identifier> | <source/config/contract/data/requirement> | <capability> | <evidence> | <certain/high/medium/low/unknown> |

## Impacted tests

| Test ID | Classification | Selection reason | Evidence path | Confidence | Action |
| --- | --- | --- | --- | --- | --- |
| <TEST-ID> | <still-valid/update-required/new-test-required/possibly-obsolete/unknown-impact> | <reason> | <change to test trace> | <confidence> | <run/update/add/review> |

## Execution results

| Test ID | Suite | Result | Duration | Attempt | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- |
| <TEST-ID> | <tags> | <passed/failed/blocked/skipped/not-executed> | <duration> | <attempt> | <redacted evidence> | <status> |

## Coverage

- Requirement coverage:
- Business-rule coverage:
- Flow and state-transition coverage:
- Contract coverage:
- Risk and incident coverage:
- Java coverage, if authorized:
- Coverage delta:

## Unknowns and safety net

- Unknown impact:
- Tests not executed:
- Fallback suites selected:
- External side effects:
- Remaining test data or cleanup:

## Decision gate

- Status: <ready/ready with assumptions/not ready>
- Reason:
- Required approval or evidence:
- Recommended next action:
