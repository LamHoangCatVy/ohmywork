# Reproduction runbook

## Immutable inputs

| Repository | Commit | Local evaluation path |
| --- | --- | --- |
| `phuchoang92/yummy-cih` | `b91f109388e8d58c1e875a92a6d83c786820a500` | `/tmp/ohmywork-yummy-cih` |
| `apache/fineract` | `106a694eb4f1bb76f380214f68dc14f6c2ad315a` | `/tmp/ohmywork-fineract-case-study` |

## Local environment

- macOS 15.5, arm64;
- Rust and Cargo 1.97.1 in isolated roots under `/tmp/ohmywork-rust`;
- Cargo build target under `/tmp/ohmywork-yummy-cih-target`;
- Homebrew OpenSSL 3.6.3;
- no FalkorDB, PostgreSQL, production environment, or customer system.

## Commands that were executed

The Rust environment was isolated for the experiment:

```bash
export CARGO_HOME=/tmp/ohmywork-rust/cargo
export RUSTUP_HOME=/tmp/ohmywork-rust/rustup
export PATH=/tmp/ohmywork-rust/cargo/bin:$PATH
export CARGO_TARGET_DIR=/tmp/ohmywork-yummy-cih-target
export OPENSSL_DIR=/opt/homebrew/opt/openssl@3
export OPENSSL_LIB_DIR=/opt/homebrew/opt/openssl@3/lib
export OPENSSL_INCLUDE_DIR=/opt/homebrew/opt/openssl@3/include
export LIBRARY_PATH=/opt/homebrew/opt/openssl@3/lib
```

CIH quality gates:

```bash
cd /tmp/ohmywork-yummy-cih
python3 scripts/check_layering.py
python3 scripts/validate-retrieval-production.py --self-test
python3 scripts/validate-retrieval-production-soak.py --self-test
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Small Java/Spring calibration:

```bash
cd /tmp/ohmywork-yummy-cih
/tmp/ohmywork-yummy-cih-target/debug/cih-engine \
  scan crates/cih-engine/tests/corpus/java-spring-xml-di

cd crates/cih-engine/tests/corpus/java-spring-xml-di
/tmp/ohmywork-yummy-cih-target/debug/cih-engine \
  analyze . --all --no-load
```

Larger Java banking case:

```bash
/tmp/ohmywork-yummy-cih-target/debug/cih-engine \
  scan /tmp/ohmywork-fineract-case-study

/tmp/ohmywork-yummy-cih-target/debug/cih-engine \
  analyze /tmp/ohmywork-fineract-case-study \
  --module fineract-loan \
  --language java \
  --no-load
```

OhMyWork validation after documenting the case:

```bash
npm run check
npm test
node scripts/bootstrap.mjs doctor
python3 /Users/vylhc/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/build-java-test-harness
git diff --check
```

## Results

- all CIH repository quality gates passed;
- the fixture run produced 50 nodes and 62 edges from 7 Java files;
- the Fineract module run produced 9,542 nodes and 19,218 edges from 690 Java files;
- CIH found 69 `Tests` edges and useful route, call, inheritance, query, and table candidates;
- CIH also reported 14,390 unresolved references, one `Tests` edge with a missing endpoint, and a likely SQL/table false positive;
- all 26 OhMyWork tests passed and the changed skill validated;
- OhMyWork doctor found canonical Codex, Cursor, and OpenCode locations healthy; Claude and Hermes projections had not been bootstrapped in this checkout.

## Side effects and cleanup

- repository and dependency downloads used the network;
- OpenSSL 3 was installed through Homebrew;
- temporary Rust toolchain and build cache remain under `/tmp` to make a follow-up run cheaper;
- generated `.cih` graphs, GitNexus index, and Python cache were removed after extracting the aggregate evidence;
- both third-party clones were clean at handoff;
- no commit, push, artifact publication, test-environment write, or production contact occurred.

## Repeat it

The bundled script recreates the clones and artifacts under a chosen directory. It does not install Rust, OpenSSL, Ladybug, Docker, or a database. Review the third-party licenses and prerequisites first.

On the original evaluation machine, the script automatically discovers the isolated Rust installation at `/tmp/ohmywork-rust`. For another location, set `CIH_RUST_ROOT` to a directory containing `cargo/` and `rustup/`.

Check prerequisites without cloning or building:

```bash
ALLOW_NONCOMMERCIAL_CIH_EVALUATION=1 \
CIH_PREFLIGHT_ONLY=1 \
bash scripts/reproduce.sh
```

```bash
ALLOW_NONCOMMERCIAL_CIH_EVALUATION=1 \
CIH_CASE_ROOT=/absolute/scratch/path \
bash scripts/reproduce.sh
```

For commercial evaluation or delivery, do not set the non-commercial acknowledgement as a workaround. Obtain appropriate rights from the CIH licensor or replace the provider.
