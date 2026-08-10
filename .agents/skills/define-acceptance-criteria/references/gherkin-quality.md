# Gherkin and business-rule quality

Use this guide to choose scenario coverage and express examples without inventing business decisions.

## Keep the layers separate

- **Business rule:** a durable constraint or decision, such as “A reset link can be used once.”
- **Acceptance criterion:** an observable condition for accepting the story, such as “A used reset link cannot change the password again.”
- **Scenario:** a concrete example showing how the criterion behaves from a defined starting state.
- **Test case:** an execution procedure, dataset, environment, and expected result. Leave this to a later test-design workflow.

## Write useful Gherkin

Prefer domain language and observable outcomes:

```gherkin
Scenario: Reject a previously used reset link
  Given a password-reset link has already been used successfully
  When the same link is submitted again
  Then the account password remains unchanged
  And the requester is informed that the link is no longer valid
```

Avoid clicks, selectors, endpoints, database rows, mocks, or internal method calls unless they are the behavior being accepted.

Keep one primary event in `When`. Split a scenario when multiple events create independent behavior or failure causes.

## Choose proportional coverage

Consider a scenario when it represents supplied or materially relevant behavior:

1. primary success path;
2. alternate valid path;
3. boundary value or state transition;
4. business-rule rejection or failure;
5. authorization or actor distinction;
6. recovery or retry behavior;
7. accessibility, privacy, security, or misuse outcome.

Do not add every category automatically. Record an open question when the source does not establish the expected behavior.

## Handle examples and unknown values

Use `Scenario Outline` when several examples exercise the same rule. Give each row business meaning; avoid random test data.

When a value such as a limit, duration, tolerance, role, or message is undecided:

- do not select a plausible value;
- name it in the rule and open questions;
- use a descriptive token only when the scenario remains understandable;
- mark affected criteria `needs-refinement` or `blocked`;
- name the decision owner or verification action when known.

## Review common failure modes

- A criterion repeats the story without making behavior observable.
- A scenario asserts implementation rather than outcome.
- The `Then` clause introduces a new action instead of a result.
- `And` joins unrelated behaviors that should be separate scenarios.
- A rule appears only in prose and is not covered by criteria.
- A scenario is treated as proof of stakeholder approval.
- Exact policy values are fabricated to make Gherkin look executable.
