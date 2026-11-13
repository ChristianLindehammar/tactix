#!/bin/bash
# Daily database backup, for cron: 0 2 * * * /path/to/backend/scripts/backup_db.sh
# Reads the database settings from backend/.env or, when there's none, from the environment
# variables set for this app in CloudLinux's Python app panel. Keeps BACKUP_RETENTION_DAYS days (default 30).
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SELECTOR_FILE="$HOME/.cl.selector/python-selector.json"

if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; source "$BACKEND_DIR/.env"; set +a
elif [ -f "$SELECTOR_FILE" ]; then
  # The panel keeps each app's variables under its app root. Its SetEnv lines in .htaccess can be
  # out of date, so they aren't used. Only the settings this script needs are taken, and nothing
  # is evaluated, so a password with shell characters in it is read as it is.
  settings=$(python3 - "$SELECTOR_FILE" "$BACKEND_DIR" <<'EOF'
import json, os, sys
path, root = sys.argv[1], os.path.realpath(sys.argv[2])
wanted = {'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'BACKUP_DIR', 'BACKUP_RETENTION_DAYS'}
with open(path) as file:
    apps = json.load(file)
for app_root, app in apps.items():
    if os.path.realpath(os.path.join(os.path.expanduser('~'), app_root)) == root:
        for name, value in (app.get('env_vars') or {}).items():
            if name in wanted and '\n' not in str(value):
                print(f'{name}={value}')
        sys.exit(0)
sys.exit(f'backup_db.sh: no app with the root {root} in {path}. It has: {", ".join(apps)}')
EOF
  )
  while IFS= read -r line; do
    [ -n "$line" ] && export "${line%%=*}=${line#*=}"
  done <<< "$settings"
fi

for name in DB_NAME DB_USER DB_PASS; do
  if [ -z "${!name:-}" ]; then
    echo "backup_db.sh: $name isn't set. Put it in $BACKEND_DIR/.env or in the app's environment variables." >&2
    exit 1
  fi
done

BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/../coachmate-backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
FILE="$BACKUP_DIR/$DB_NAME-$(date +%Y%m%d_%H%M%S).sql.gz"

# The password goes through the environment, so it never appears in the process list.
# A failed dump would leave a truncated file that looks like a backup, so it's removed.
# Newer MariaDB warns on every run when it's called by the old name.
DUMP=$(command -v mariadb-dump || echo mysqldump)
if ! MYSQL_PWD="$DB_PASS" "$DUMP" --single-transaction -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" \
  -u "$DB_USER" "$DB_NAME" | gzip > "$FILE"; then
  rm -f "$FILE"
  exit 1
fi
chmod 600 "$FILE"

find "$BACKUP_DIR" -name "$DB_NAME-*.sql.gz" -mtime "+${BACKUP_RETENTION_DAYS:-30}" -delete
