#!/bin/bash
# Runs a throwaway MariaDB for the tests. Its data lives in a temp folder and is
# deleted when it stops, so it never touches another database on this machine.
# It accepts local connections as root, with no password.
set -euo pipefail

PORT="${TEST_DB_PORT:-33306}"
DATA_DIR="$(mktemp -d)"
trap 'rm -rf "$DATA_DIR"' EXIT

mariadb-install-db --no-defaults --datadir="$DATA_DIR" --auth-root-authentication-method=normal --skip-test-db >/dev/null
mariadbd --no-defaults --datadir="$DATA_DIR" --port="$PORT" --bind-address=127.0.0.1 \
  --socket="$DATA_DIR/mariadb.sock" --character-set-server=utf8mb4
