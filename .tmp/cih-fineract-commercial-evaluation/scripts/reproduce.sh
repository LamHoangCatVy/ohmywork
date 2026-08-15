#!/usr/bin/env bash
set -euo pipefail

if [[ "${ALLOW_NONCOMMERCIAL_CIH_EVALUATION:-}" != "1" ]]; then
  echo "Refusing to run without ALLOW_NONCOMMERCIAL_CIH_EVALUATION=1." >&2
  echo "CIH declares PolyForm-Noncommercial-1.0.0. Obtain commercial rights for paid use." >&2
  exit 2
fi

rust_toolchain_root="${CIH_RUST_ROOT:-/tmp/ohmywork-rust}"
if ! command -v cargo >/dev/null 2>&1 && \
   [[ -x "$rust_toolchain_root/cargo/bin/cargo" ]] && \
   [[ -d "$rust_toolchain_root/rustup" ]]; then
  export CARGO_HOME="$rust_toolchain_root/cargo"
  export RUSTUP_HOME="$rust_toolchain_root/rustup"
  export PATH="$CARGO_HOME/bin:$PATH"
fi

for required_command in git cargo rustc python3 tee uname; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Missing prerequisite: $required_command" >&2
    if [[ "$required_command" == "cargo" || "$required_command" == "rustc" ]]; then
      echo "Install the Rust 1.97.1 toolchain or set CIH_RUST_ROOT to an isolated Rust root." >&2
    fi
    exit 3
  fi
done

if [[ "${CIH_PREFLIGHT_ONLY:-}" == "1" ]]; then
  cargo --version
  rustc --version
  echo "CIH evaluation prerequisites are available."
  exit 0
fi

cih_commit="b91f109388e8d58c1e875a92a6d83c786820a500"
fineract_commit="106a694eb4f1bb76f380214f68dc14f6c2ad315a"
case_root="${CIH_CASE_ROOT:-$PWD/.tmp/cih-fineract-commercial-evaluation/work}"
cih_root="$case_root/yummy-cih"
fineract_root="$case_root/fineract"
target_root="$case_root/cargo-target"
evidence_root="$case_root/evidence"

mkdir -p "$case_root" "$target_root" "$evidence_root"

clone_if_missing() {
  local repository_url="$1"
  local destination="$2"
  if [[ ! -d "$destination/.git" ]]; then
    git clone "$repository_url" "$destination"
  fi

  local actual_origin
  actual_origin="$(git -C "$destination" remote get-url origin)"
  if [[ "$actual_origin" != "$repository_url" ]]; then
    echo "Refusing unexpected repository at $destination" >&2
    echo "Expected origin: $repository_url" >&2
    echo "Actual origin:   $actual_origin" >&2
    exit 4
  fi

  if [[ -n "$(git -C "$destination" status --porcelain)" ]]; then
    echo "Refusing to change a dirty evaluation clone: $destination" >&2
    exit 5
  fi
}

clone_if_missing "https://github.com/phuchoang92/yummy-cih.git" "$cih_root"
clone_if_missing "https://github.com/apache/fineract.git" "$fineract_root"

git -C "$cih_root" fetch origin "$cih_commit"
git -C "$cih_root" checkout --detach "$cih_commit"
git -C "$fineract_root" fetch origin "$fineract_commit"
git -C "$fineract_root" checkout --detach "$fineract_commit"

export CARGO_TARGET_DIR="$target_root"

if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
  openssl_root="$(brew --prefix openssl@3)"
  export OPENSSL_DIR="$openssl_root"
  export OPENSSL_LIB_DIR="$openssl_root/lib"
  export OPENSSL_INCLUDE_DIR="$openssl_root/include"
  export LIBRARY_PATH="$openssl_root/lib${LIBRARY_PATH:+:$LIBRARY_PATH}"
fi

(
  cd "$cih_root"
  python3 scripts/check_layering.py
  python3 scripts/validate-retrieval-production.py --self-test
  python3 scripts/validate-retrieval-production-soak.py --self-test
  cargo fmt --all --check
  cargo clippy --workspace --all-targets -- -D warnings
  cargo test --workspace
) 2>&1 | tee "$evidence_root/quality-gates.log"

cih_engine="$target_root/debug/cih-engine"

"$cih_engine" scan \
  "$cih_root/crates/cih-engine/tests/corpus/java-spring-xml-di" \
  2>&1 | tee "$evidence_root/fixture-scan.log"

(
  cd "$cih_root/crates/cih-engine/tests/corpus/java-spring-xml-di"
  "$cih_engine" analyze . --all --no-load
) 2>&1 | tee "$evidence_root/fixture-analyze.log"

"$cih_engine" scan "$fineract_root" \
  2>&1 | tee "$evidence_root/fineract-scan.log"

"$cih_engine" analyze "$fineract_root" \
  --module fineract-loan \
  --language java \
  --no-load \
  2>&1 | tee "$evidence_root/fineract-analyze.log"

echo "Evaluation complete. Evidence: $evidence_root"
echo "Generated CIH artifacts remain under each analyzed repository's .cih directory."
