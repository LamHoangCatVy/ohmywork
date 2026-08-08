import assert from "node:assert/strict";
import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { doctorProject, initializeProject } from "../scripts/bootstrap.mjs";

async function fixtureRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ohmywork-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await Promise.all([
    cp(path.resolve(".agents"), path.join(root, ".agents"), { recursive: true }),
    cp(path.resolve("contracts"), path.join(root, "contracts"), { recursive: true }),
    cp(path.resolve("catalog.json"), path.join(root, "catalog.json")),
  ]);
  return root;
}

test("init creates idempotent Claude and Hermes projections", async (t) => {
  const root = await fixtureRoot(t);
  const first = await initializeProject({ root });
  assert.equal(first.results.filter((result) => result.status === "created").length, 2);
  assert.equal((await lstat(path.join(root, ".claude/skills/shape-idea"))).isSymbolicLink(), true);
  assert.equal((await lstat(path.join(root, ".hermes/skills/shape-idea"))).isSymbolicLink(), true);

  const second = await initializeProject({ root });
  assert.equal(second.results.filter((result) => result.status === "unchanged").length, 2);
  const doctor = await doctorProject({ root });
  assert.equal(doctor.healthy, true, doctor.issues.join("\n"));
});

test("copy mode records integrity and remains idempotent", async (t) => {
  const root = await fixtureRoot(t);
  await initializeProject({ root, agents: ["claude-code"], mode: "copy" });
  assert.equal((await lstat(path.join(root, ".claude/skills/shape-idea"))).isDirectory(), true);
  const state = JSON.parse(await readFile(path.join(root, ".ohmywork/state.json"), "utf8"));
  assert.equal(state.managed[0].mode, "copy");

  const second = await initializeProject({ root, agents: ["claude-code"], mode: "copy" });
  assert.equal(second.results[0].status, "unchanged");
});

test("init refuses to overwrite an unmanaged skill", async (t) => {
  const root = await fixtureRoot(t);
  const target = path.join(root, ".claude/skills/shape-idea");
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "SKILL.md"), "user-owned\n");

  await assert.rejects(
    initializeProject({ root, agents: ["claude-code"] }),
    /Refusing to overwrite/,
  );
  assert.equal(await readFile(path.join(target, "SKILL.md"), "utf8"), "user-owned\n");
});
