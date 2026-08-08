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
- Explain what the skill does and when it should trigger in `description`.
- Keep canonical frontmatter to `name` and `description`.
- Keep `SKILL.md` focused and under 500 lines.
- Reference supporting files with relative paths and keep references one level deep.
- Add or update `capability.json`, catalog metadata, tests, eval thresholds, permissions, and threat model.
- Never add an executable script when instructions or an existing trusted tool are sufficient.

## Changes to contracts

- Add valid and invalid tests for every invariant.
- Treat breaking authoring-schema changes separately from package SemVer and protocol versions.
- Do not hand-edit generated artifacts once code generation exists.

## Commit and review

Use a concise conventional commit such as `feat(round-1): add requirements traceability`. Do not combine unrelated features. The maintainer currently reviews each round before it is pushed to `main`.

Contributions use the [Developer Certificate of Origin 1.1](https://developercertificate.org/). Add a sign-off with `git commit -s` to certify that you have the right to submit the work under this repository's license.

AI-assisted contributions are welcome, but the contributor remains responsible for accuracy, provenance, licensing, security, tests, and review. Do not contribute private prompts, credentials, personal data, or generated material whose rights are unclear.
