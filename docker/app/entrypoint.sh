#!/bin/sh
# Boot: stable secrets, init Postgres cluster on first boot, then supervisord.
set -e

# Database password is generated once and persisted with the data volume so
# reboots never orphan the role. DB stays on 127.0.0.1 inside this container.
PWF=/var/lib/postgresql/.dbpass
if [ -z "$DB_PASSWORD" ]; then
  if [ -f "$PWF" ]; then
    DB_PASSWORD=$(cat "$PWF")
  else
    DB_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
    printf '%s' "$DB_PASSWORD" > "$PWF"
  fi
  export DB_PASSWORD
fi

# APP_KEY may be provided by the platform; otherwise derive one that stays
# stable for this container's lifetime (sessions reset per redeploy).
if [ -z "$APP_KEY" ]; then
  if [ -f /var/www/html/storage/.app_key ]; then
    export APP_KEY=$(cat /var/www/html/storage/.app_key)
  else
    export APP_KEY=$(php /var/www/html/artisan key:generate --show --no-ansi)
    printf '%s' "$APP_KEY" > /var/www/html/storage/.app_key
  fi
fi

PGDATA=/var/lib/postgresql/15/main
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown -R postgres:postgres /var/lib/postgresql
  su postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8"
fi

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
