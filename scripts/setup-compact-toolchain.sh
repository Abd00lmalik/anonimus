#!/usr/bin/env bash
# Anonimus — Compact toolchain setup for WSL/Linux.
# Run from inside WSL:  bash scripts/setup-compact-toolchain.sh
# Installs the official Compact CLI + latest compiler, then verifies the toolchain
# by compiling the repository's smoke-test contract for real.
set -euo pipefail

echo "== Anonimus Compact toolchain setup =="

if ! command -v curl >/dev/null 2>&1; then
  echo "Installing curl..."
  sudo apt-get update -qq && sudo apt-get install -y -qq curl
fi

echo "-- Installing Compact CLI (official installer) --"
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh

# Make sure the install location is on PATH for this session.
export PATH="$HOME/.compact/bin:$HOME/.local/bin:$PATH"

if ! command -v compact >/dev/null 2>&1; then
  echo "ERROR: compact CLI not found after install." >&2
  exit 1
fi

echo "-- Downloading latest compiler --"
compact update

echo "-- Toolchain versions --"
compact --version
compact compile --version
compact list --installed

echo "-- Compiling smoke-test contract (real compile) --"
cd "$(dirname "$0")/.."
mkdir -p out
# compactc syntax: compact compile <source> <target-directory>
compact compile contracts/smoke_test.compact out/smoke_test

echo ""
echo "SUCCESS: Compact toolchain installed and smoke-test contract compiled."
echo "Artifacts in out/smoke_test/ (zkas + TS bindings)."
