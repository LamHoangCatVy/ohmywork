import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

async function runCli(...args) {
  return execFileAsync(process.execPath, ["scripts/bootstrap.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

test("global help describes the repository as a skill bundle", async () => {
  const { stdout, stderr } = await runCli("--help");
  assert.equal(stderr, "");
  assert.match(stdout, /OhMyWork skill bundle/);
  assert.match(stdout, /Roles are discovery views/);
});

test("list renders role-first discovery without an undefined agent prefix", async () => {
  const { stdout, stderr } = await runCli("list", "--role", "business-analyst");
  assert.equal(stderr, "");
  assert.match(stdout, /I'm a Business Analyst/);
  assert.match(stdout, /shape-idea \[experimental\]/);
  assert.doesNotMatch(stdout, /undefined\//);
});

test("list JSON exposes role and skill metadata", async () => {
  const { stdout } = await runCli("list", "--role", "product-owner", "--json");
  const payload = JSON.parse(stdout);
  assert.deepEqual(payload.roles.map((role) => role.id), ["product-owner"]);
  assert.deepEqual(payload.skills.map((skill) => skill.id), ["shape-idea", "write-user-stories"]);
});
