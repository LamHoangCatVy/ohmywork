# ohmywork agent instructions

## Mission

Build a vendor-neutral, open-source capability system whose skills can be used by Codex, Claude Code, OpenCode, Cursor, Hermes, and other Agent Skills clients.

## Sources of truth

- Author canonical skills only in `.agents/skills/<skill-name>`.
- Keep `SKILL.md` frontmatter to `name` and `description` unless an accepted compatibility decision changes the strict core.
- Put vendor-specific metadata in sidecars such as `agents/openai.yaml`; never fork the canonical workflow for a vendor.
- Define machine-readable behavior and trust metadata in the adjacent `capability.json` and the schemas under `contracts/`.
- Treat generated npm, Python, React, MCP, marketplace, and vendor projections as outputs, not authoring formats.

## Change rules

- Keep each skill focused on one user outcome and under 500 lines.
- Put detailed guidance in one-level-deep `references/`, reusable output material in `assets/`, and deterministic helpers in `scripts/`.
- Declare every side effect and required permission. Undeclared access is a validation error, not an implicit capability.
- Preserve user data. Bootstrap commands must be idempotent and must refuse unmanaged path collisions.
- Do not store secrets, raw sensitive prompts, or unredacted tool payloads in skills, manifests, fixtures, traces, or memory.
- Treat memory proposals, deployment, publication, destructive actions, and external writes as explicit approval boundaries.
- Keep protocol and host adapters capability-negotiated. Do not couple core behavior to an experimental protocol feature.

## Verification

Run before handing off a change:

```bash
npm run check
npm test
node scripts/bootstrap.mjs doctor
```

For a changed skill, also run the skill validator and forward-test direct, indirect, incomplete, negative-trigger, and adversarial prompts.

## Delivery protocol

- Work on `main` as requested by the maintainer.
- Keep one coherent feature round per commit.
- Present the local diff and verification evidence before committing or pushing.
- Push to `main` only after the maintainer explicitly approves the current round.
- Never force-push `main`.
