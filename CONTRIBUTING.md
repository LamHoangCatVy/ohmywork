# Contributing

Thank you for helping make portable agent workflows safer and more useful.

## Before opening a change

- Use an issue for a new capability, a behavior change, or a contract change so the outcome and acceptance evidence can be agreed first.
- Report security issues privately as described in [SECURITY.md](SECURITY.md).
- Keep a pull request focused on one capability or one infrastructure feature.

## Local checks

Use Node.js 20 or newer:

```bash
npm run check
npm test
```

For skill changes, test at least:

1. a direct request that should activate the skill;
2. an indirect request with the same intent;
3. incomplete input;
4. a request that must not activate it;
5. an adversarial or unsafe request;
6. behavior on every declared host before marking the skill stable.

## Skill requirements

- Use lowercase kebab-case and match the directory name to `name`.
- Keep every canonical skill directly under `.agents/skills/<skill-name>`; roles are catalog views, not parent directories.
- Explain what the skill does and when it should trigger in `description`.
- Keep canonical frontmatter to `name` and `description`.
- Keep `SKILL.md` focused and under 500 lines.
- Reference supporting files with relative paths and keep references one level deep.
- Add or update `capability.json`, catalog metadata, tests, eval thresholds, permissions, and threat model.
- Never add an executable script when instructions or an existing trusted tool are sufficient.

## Roles and discovery

- Reuse an existing role ID from `catalog.json` whenever it describes the audience accurately.
- Add role metadata only with at least one real skill that references it; planned skills belong in the roadmap or README, not the install catalog.
- Keep role membership in `capability.json`. Do not maintain a second list of skill IDs inside a role entry.
- Use human-facing copy such as “I'm a Product Owner” in discovery. Stable IDs remain concise nouns such as `product-owner`.
- Use verb–object skill IDs such as `draft-brd` or `write-user-stories`; do not prefix skill IDs with a role.

## Changes to contracts

- Add valid and invalid tests for every invariant.
- Treat breaking authoring-schema changes separately from package SemVer and protocol versions.
- Do not hand-edit generated artifacts once code generation exists.

## Commit and review

Use a concise conventional commit such as `feat(round-1): add requirements traceability`. Do not combine unrelated features. The maintainer currently reviews each round before it is pushed to `main`.

Contributions use the [Developer Certificate of Origin 1.1](https://developercertificate.org/). Add a sign-off with `git commit -s` to certify that you have the right to submit the work under this repository's license.

AI-assisted contributions are welcome, but the contributor remains responsible for accuracy, provenance, licensing, security, tests, and review. Do not contribute private prompts, credentials, personal data, or generated material whose rights are unclear.
