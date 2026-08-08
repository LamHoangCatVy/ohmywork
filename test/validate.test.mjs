import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSkillFrontmatter,
  validateCapabilityDocument,
  validateRepository,
} from "../scripts/validate.mjs";

test("the repository satisfies the strict Round 0 contract", async () => {
  const result = await validateRepository();
  assert.deepEqual(result.errors, []);
  assert.equal(result.catalog.skills.length, 1);
});

test("strict-core skill frontmatter rejects vendor extensions", () => {
  const result = parseSkillFrontmatter(`---
name: sample-skill
description: Use this sample for tests.
allowed-tools: Bash
---

# Sample
`);
  assert.equal(result.data.name, "sample-skill");
  assert.match(result.errors.join("\n"), /move it to a sidecar/);
});

test("high-impact capability effects require an approval boundary", () => {
  const invalid = {
    $schema: "schema.json",
    schemaVersion: "0.1.0",
    id: "unsafe-publish",
    version: "0.1.0",
    title: "Unsafe publish",
    summary: "Fixture",
    owner: { name: "test", contact: "https://example.com" },
    maturity: "experimental",
    roles: ["engineer"],
    lifecycleStages: ["release"],
    contract: {
      inputs: [{ name: "artifact", mediaType: "text/plain", required: true }],
      outputs: [{ name: "release", mediaType: "text/plain", required: true }],
      errors: [],
      preconditions: [],
      postconditions: ["Published"],
    },
    execution: {
      kind: "model-guided",
      idempotent: false,
      timeoutSeconds: 60,
      retry: "none",
      rollback: "none",
    },
    risk: { tier: "T1", sideEffects: ["publish"], approval: "none" },
    permissions: {
      filesystem: { read: [], write: [] },
      network: { mode: "scoped-write", allowlist: ["registry.example"] },
      tools: [],
      secrets: [],
      memory: { read: false, write: false },
    },
    assurance: {
      tests: ["fixture"],
      evals: [{ id: "fixture", metric: "pass", threshold: 1 }],
      threatModel: "fixture",
    },
    observability: {
      traceFields: ["outcome"],
      metrics: ["success-rate"],
      capture: "metadata-only",
      sensitiveData: "exclude",
    },
    supplyChain: { license: "Apache-2.0", source: "fixture", dependencies: [] },
    compatibility: { agentSkillsSpec: "1", hosts: ["test-host"] },
    support: { level: "community", security: "https://example.com/security" },
  };
  const errors = validateCapabilityDocument(invalid, "unsafe-publish");
  assert.match(errors.join("\n"), /high-impact effects require T3 or higher/);
  assert.match(errors.join("\n"), /high-impact effects require explicit approval/);
});
