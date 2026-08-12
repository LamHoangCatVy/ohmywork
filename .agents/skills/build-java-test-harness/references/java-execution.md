# Java execution and evidence

Use this reference when implementing JUnit Platform orchestration, build adapters, code coverage, test data, or concurrency.

## Use JUnit Platform as the kernel

Use the Launcher API to discover and execute a `TestPlan`. Register listeners for catalog identity, timing, selection reasons, results, evidence, and unique IDs. Use tags to compose suites without duplicating tests.

Keep the framework compatible with the repository's supported JUnit line. Do not force a major JUnit, Java, Maven, or Gradle upgrade while onboarding tests.

Official references:

- JUnit Platform and listeners: https://docs.junit.org/current/user-guide/
- JUnit tags: https://docs.junit.org/current/writing-tests/tagging-and-filtering.html

## Adapt to the build

For Maven, use Surefire for unit tests and Failsafe for integration or system-test lifecycle and verification. For Gradle, isolate suites with dedicated source sets/tasks or the JVM Test Suite API only when compatible with the deployed Gradle version. Keep JUnit Platform as the framework boundary so build-tool APIs remain adapters.

Official references:

- Maven Failsafe: https://maven.apache.org/surefire/maven-failsafe-plugin/
- Gradle JVM testing: https://docs.gradle.org/current/userguide/java_testing.html

## Collect coverage carefully

Use functional coverage—requirements, rules, flows, states, contracts, risks, and incidents—as the primary system-test measure. Use JaCoCo only in an authorized test environment. Per-test Java coverage requires isolated sessions or careful dump/reset boundaries and can be expensive; collect it for critical tests or scheduled graph refreshes rather than every test on every change.

Do not expose JaCoCo TCP or JMX control to untrusted networks; its remote-control paths do not authenticate clients. Never enable instrumentation in production merely to improve a dashboard.

Official reference: https://www.jacoco.org/jacoco/trunk/doc/agent.html

Use mutation testing only for targeted critical unit-level logic. Do not mutation-test an entire large system on every change.

## Control data and time

- Generate synthetic identities and domain data.
- Lease data to one run and record the lease ID.
- Inject clocks where the test surface permits; otherwise record authoritative business time and tolerance.
- Poll asynchronous state with bounded deadlines instead of fixed sleeps.
- Make cleanup idempotent and report partial cleanup as a failed or blocked outcome.

## Preserve evidence

Record `passed`, `failed`, `blocked`, `skipped`, and `not-executed` distinctly. A retry must preserve the first attempt. Capture correlation IDs, normalized assertions, redacted diagnostics, cleanup status, and tests omitted by policy. Do not store credentials, raw personal data, or unrestricted payloads.
