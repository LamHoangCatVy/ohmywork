import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseSkillFrontmatter, validateCapabilityDocument } from "../scripts/validate.mjs";
import { TOOLS, validateRunInput } from "../packages/harness/mcp.mjs";

const root = new URL("../", import.meta.url);
const skillIds = ["run-agent-harness", "connect-harness"];
const read = (relative) => readFile(new URL(relative, root), "utf8");

for (const id of skillIds) {
  test(`${id} is portable, cataloged, and declares its local effects`, async () => {
    const base = `.agents/skills/${id}`;
    const [markdown, manifestText, catalogText, sidecar] = await Promise.all([
      read(`${base}/SKILL.md`), read(`${base}/capability.json`), read("catalog.json"),
      read(`${base}/agents/openai.yaml`),
    ]);
    const frontmatter = parseSkillFrontmatter(markdown);
    const manifest = JSON.parse(manifestText);
    const entry = JSON.parse(catalogText).skills.find((skill) => skill.id === id);
    assert.deepEqual(frontmatter.errors, []);
    assert.equal(frontmatter.data.name, id);
    assert.deepEqual(Object.keys(frontmatter.data).sort(), ["description", "name"]);
    assert.ok(markdown.split("\n").length < 500);
    assert.deepEqual(validateCapabilityDocument(manifest, id), []);
    assert.equal(entry?.path, base);
    assert.equal(entry?.manifest, `${base}/capability.json`);
    assert.ok(sidecar.includes(`$${id}`));
    assert.ok(manifest.risk.sideEffects.includes("workspace-read"));
    assert.ok(manifest.risk.sideEffects.includes("workspace-write"));
    assert.equal(manifest.permissions.memory.write, false);
    for (const effect of ["external-write", "publish", "deploy", "privilege-change", "destructive"]) {
      assert.ok(!manifest.risk.sideEffects.includes(effect), `unsolicited effect: ${effect}`);
    }
  });

  test(`${id} evaluation cases cover activation and trust boundaries with resolvable rubrics`, async () => {
    const base = `.agents/skills/${id}`;
    const fixture = JSON.parse(await read(`${base}/references/evaluation-cases.json`));
    const manifest = JSON.parse(await read(`${base}/capability.json`));
    const categories = new Set(fixture.cases.map((item) => item.category));
    for (const category of ["direct", "indirect", "incomplete", "negative-trigger", "adversarial"]) {
      assert.ok(categories.has(category), `missing ${category}`);
    }
    assert.equal(new Set(fixture.cases.map((item) => item.id)).size, fixture.cases.length);
    assert.match(fixture.rubric, /^[a-z-]+\.md$/);
    assert.ok((await read(`${base}/references/${fixture.rubric}`)).length > 100);
    for (const item of fixture.cases) {
      assert.ok(manifest.assurance.tests.includes(item.id), `undeclared evaluation ${item.id}`);
      assert.ok(item.prompt.trim() && item.environment.trim());
      assert.ok(item.expected.length > 0 && item.forbidden.length > 0);
      assert.ok([...item.expected, ...item.forbidden].every((text) => typeof text === "string" && text.trim()));
    }
  });
}

test("the skill's plan request template conforms to the actual MCP request contract", async () => {
  const request = JSON.parse(await read(".agents/skills/run-agent-harness/assets/run-request.template.json"));
  assert.deepEqual(validateRunInput(request), request);
  assert.equal(request.mode, "plan");
  assert.equal(Object.hasOwn(request, "model"), false, "default template must inherit the user's model");
  assert.throws(() => validateRunInput({ ...request, maxIterations: 9 }), /maxIterations/);
  assert.throws(() => validateRunInput({ ...request, timeoutSeconds: 3601 }), /timeoutSeconds/);
});

test("connection guidance lists the actual MCP tools and prepares an absolute-path plan-only config", async () => {
  const markdown = await read(".agents/skills/connect-harness/SKILL.md");
  const documented = [...markdown.matchAll(/^- `(harness_[a-z_]+)`:/gm)].map((match) => match[1]);
  assert.deepEqual(documented.sort(), TOOLS.map((tool) => tool.name).sort());
  const template = await read(".agents/skills/connect-harness/assets/codex-mcp.template.toml");
  const configLines = template.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
  assert.match(configLines, /\[mcp_servers\.ohmywork_harness\]/);
  assert.match(configLines, /command = "\/[^"\n]+"/);
  assert.match(configLines, /"\/[^"\n]+\/cli\.mjs", "mcp", "--workspace", "\/[^"\n]+"/);
  assert.doesNotMatch(configLines, /--allow-execution|token|cookie|auth\.json|bypass/i);
});
