# syntax=docker/dockerfile:1
# Rifas Luxury RD — SINGLE-CONTAINER monorepo image.
# One image holds everything: Angular SPA + Laravel API + Filament panel + Postgres,
# supervised by supervisord. Build: docker build -t rifasrd .  Run: docker run -p 8080:8080 rifasrd

# ---------- Stage 1: Angular ----------
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Stage 2: everything ----------
FROM php:8.3-fpm
RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor postgresql postgresql-contrib \
      libpq-dev libzip-dev libicu-dev util-linux unzip git curl \
    && docker-php-ext-install pdo_pgsql zip opcache intl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY backend/composer.json backend/composer.lock* ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --no-progress

COPY backend/ .
COPY --from=frontend /app/dist/rifas-luxury-demo/browser/ ./public/

RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
      storage/logs storage/app/vouchers \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 770 storage bootstrap/cache \
    && mkdir -p /var/lib/postgresql/data \
    && chown -R postgres:postgres /var/lib/postgresql

# Single-container defaults: Postgres listens on 127.0.0.1 inside this container.
ENV DB_CONNECTION=pgsql \
    DB_HOST=127.0.0.1 \
    DB_PORT=5432 \
    DB_DATABASE=rifasrd \
    DB_USERNAME=rifasrd \
    QUEUE_CONNECTION=database

# SPA + PHP routing, inlined on purpose (no separate nginx.conf artifact).
COPY <<'EOF' /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;
events { worker_connections 1024; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml font/woff2;
  gzip_min_length 1024;

  server {
    listen 8080;
    server_name _;
    root /var/www/html/public;
    index index.html;

    # Laravel (API, Filament panel, livewire, storage) -> index.php
    location ~ ^/(api|admin|login|livewire|storage|healthz|up)(/|$) {
      try_files $uri /index.php?$query_string;
    }

    # Angular SPA fallback for client-side routes (/verificar, /:slug/:token).
    location / {
      try_files $uri $uri/ /index.html;
    }

    location = /index.html { add_header Cache-Control "no-cache"; }
    location = /index.php {
      include fastcgi_params;
      fastcgi_param SCRIPT_FILENAME $document_root/index.php;
      fastcgi_pass 127.0.0.1:9000;
    }
  }
}
EOF

# One supervisor for the four processes: postgres, php-fpm, nginx, queue worker.
COPY <<'EOF' /etc/supervisor/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:postgres]
command=/bin/sh -c 'exec "$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)/postgres" -D /var/lib/postgresql/data -c listen_addresses=127.0.0.1'
user=postgres
autorestart=true
priority=1

[program:migrate]
command=/migrate.sh
autorestart=false
startsecs=0
priority=2

[program:php-fpm]
command=php-fpm
autorestart=true
priority=10

[program:nginx]
command=nginx -g "daemon off;"
autorestart=true
priority=10

[program:queue]
; Waits for /migrate.sh to finish: before that the role/tables do not exist.
command=/bin/sh -c 'until [ -f /tmp/.migrated ]; do sleep 2; done; exec php /var/www/html/artisan queue:work --sleep=3 --tries=3'
user=www-data
directory=/var/www/html
autostart=true
autorestart=true
startsecs=5
startretries=20
priority=20
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# First-boot DB bootstrap + migrate + seed (idempotent).
COPY <<'EOF' /migrate.sh
#!/bin/sh
set -ex
rm -f /tmp/.migrated
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)
until su postgres -c "$PGBIN/pg_isready -q" 2>/dev/null; do sleep 1; done
DBU="${DB_USERNAME:-rifasrd}"
DBP="${DB_PASSWORD:-rifasrd}"
DBD="${DB_DATABASE:-rifasrd}"
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DBU}'\"" | grep -q 1 || \
  su postgres -c "psql -qc \"CREATE ROLE \\\"${DBU}\\\" LOGIN PASSWORD '${DBP}'\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DBD}'\"" | grep -q 1 || \
  su postgres -c "createdb -O \"${DBU}\" \"${DBD}\""
php artisan package:discover --ansi || true
php artisan migrate --force
php artisan db:seed --force || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
touch /tmp/.migrated
echo "migrate: done"
EOF

# Entrypoint: stable secrets, init Postgres cluster on first boot, then supervisord.
COPY <<'EOF' /entrypoint.sh
#!/bin/sh
set -ex

# Postgres binary dir is version-agnostic (bookworm=15, trixie=17, ...).
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)
PGDATA=/var/lib/postgresql/data

# Database password is generated once and persisted beside the data volume so
# reboots never orphan the role. Postgres only listens on 127.0.0.1 in-container.
PWF=/var/lib/postgresql/.dbpass
if [ -z "$DB_PASSWORD" ]; then
  if [ -f "$PWF" ]; then
    DB_PASSWORD=$(cat "$PWF")
  else
    DB_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
    ( umask 077; printf '%s' "$DB_PASSWORD" > "$PWF" )
  fi
  export DB_PASSWORD
fi

# APP_KEY may be provided by the platform; otherwise derive one persisted in
# storage (sessions reset only if the storage volume is wiped).
if [ -z "$APP_KEY" ]; then
  if [ -f /var/www/html/storage/.app_key ]; then
    export APP_KEY=$(cat /var/www/html/storage/.app_key)
  else
    export APP_KEY=$(php /var/www/html/artisan key:generate --show --no-ansi)
    ( umask 077; printf '%s' "$APP_KEY" > /var/www/html/storage/.app_key )
  fi
fi

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown -R postgres:postgres /var/lib/postgresql
  su postgres -c "$PGBIN/initdb -D $PGDATA --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8"
fi
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
EOF

RUN chmod +x /entrypoint.sh /migrate.sh

EXPOSE 8080
# start-period matters: Postgres init + migrate + seed happen before /healthz
# can go 200; without it Swarm rolls back to the old task while booting.
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=6 CMD curl -fsS http://127.0.0.1:8080/healthz >/dev/null || exit 1
ENTRYPOINT ["/entrypoint.sh"]
