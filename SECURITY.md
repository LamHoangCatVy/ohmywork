# Security policy

ohmywork treats skills, scripts, references, model/tool configuration, eval data, MCP servers, and memory as supply-chain inputs. A signed artifact is attributable; it is not automatically safe.

## Supported versions

The project is experimental. Until the first stable release, only the latest commit on `main` receives best-effort security fixes. No `0.x` compatibility or response-time guarantee is made.

## Report a vulnerability

Use GitHub's **Report a vulnerability** flow in the repository Security tab. Do not open a public issue for a suspected vulnerability, leaked credential, cross-tenant exposure, unsafe deployment path, prompt/tool/memory poisoning, or supply-chain compromise.

Include, when safe:

- affected commit, package, skill, or capability;
- impact and required permissions;
- minimal reproduction without real secrets or personal data;
- whether exploitation causes external writes, publication, deployment, memory persistence, privilege change, or tenant crossing;
- any suggested mitigation.

The maintainer will acknowledge reports as capacity permits, validate the finding, coordinate a fix and advisory, and credit reporters who want attribution. If GitHub private vulnerability reporting is unavailable, contact the repository owner through their GitHub profile without publishing exploit details.

## Security boundaries

- Skill text and tool descriptions are untrusted input.
- Host sandbox and approval policy remain authoritative.
- MCP roots, skill allowlists, metadata, and signatures do not replace operating-system access control.
- Secrets must be represented by scoped handles and never placed in prompts, traces, manifests, fixtures, or memory.
- Durable memory and procedural learning require explicit promotion and a reversible release.
- Production, publish, destructive, external-write, and privilege actions require an approval boundary declared by the capability.
