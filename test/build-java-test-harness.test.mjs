import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateTestCatalog } from "../.agents/skills/build-java-test-harness/scripts/validate-test-catalog.mjs";

const catalogUrl = new URL(
  "../.agents/skills/build-java-test-harness/assets/test-catalog.template.json",
  import.meta.url,
);

async function validCatalog() {
  return JSON.parse(await readFile(catalogUrl, "utf8"));
}

test("test-manager catalog validator accepts a governed external-write test", async () => {
  const result = validateTestCatalog(await validCatalog());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.testCount, 1);
  assert.deepEqual(result.warnings, []);
});

test("test-manager catalog validator rejects unsafe identity, paths, cleanup, and quarantine", async () => {
  const catalog = await validCatalog();
  const original = catalog.tests[0];
  catalog.policies.productionExecution = "allowed";
  catalog.tests.push({
    ...original,
    title: "Unsafe duplicate",
    source: "../outside/Test.java",
    cleanup: "none",
    status: "quarantined",
    quarantine: {
      reason: "Flaky",
      owner: "quality-platform",
      expiresOn: "2020-01-01"
    }
  });

  const result = validateTestCatalog(catalog, { now: new Date("2026-08-10T00:00:00Z") });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /productionExecution must be 'forbidden'/);
  assert.match(result.errors.join("\n"), /duplicate test id/);
  assert.match(result.errors.join("\n"), /source must be a safe relative path under packs/);
  assert.match(result.errors.join("\n"), /external-write tests require an explicit cleanup plan/);
  assert.match(result.errors.join("\n"), /quarantine expired/);
});

test("build-java-test-harness metadata names direct triggers and negative boundaries", async () => {
  const markdown = await readFile(
    new URL("../.agents/skills/build-java-test-harness/SKILL.md", import.meta.url),
    "utf8",
  );
  assert.match(markdown, /centralized system-test harness/);
  assert.match(markdown, /change-impact analysis/);
  assert.match(markdown, /Do not use for isolated unit tests/);
  assert.match(markdown, /Never delete, disable, quarantine, or rewrite a test solely because/);
  assert.match(markdown, /Unknown impact expands the safety net/);
});
