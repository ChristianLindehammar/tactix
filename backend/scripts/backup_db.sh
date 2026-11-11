#!/bin/bash
# Daily database backup, for cron: 0 2 * * * /path/to/backend/scripts/backup_db.sh
# Reads the settings from backend/.env. Keeps BACKUP_RETENTION_DAYS days (default 30).
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
set -a; source "$BACKEND_DIR/.env"; set +a

BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/../coachmate-backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
FILE="$BACKUP_DIR/$DB_NAME-$(date +%Y%m%d_%H%M%S).sql.gz"

# The password goes through the environment, so it never appears in the process list
MYSQL_PWD="$DB_PASS" mysqldump --single-transaction -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" \
  -u "$DB_USER" "$DB_NAME" | gzip > "$FILE"
chmod 600 "$FILE"

find "$BACKUP_DIR" -name "$DB_NAME-*.sql.gz" -mtime "+${BACKUP_RETENTION_DAYS:-30}" -delete
