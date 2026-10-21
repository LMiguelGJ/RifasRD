# syntax=docker/dockerfile:1
# Rifas Luxury RD — static Angular demo for Dokploy.
# Build: docker build -t rifasrd .   ->   Run: docker run -p 8080:8080 rifasrd

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist/rifas-luxury-demo/browser /usr/share/nginx/html

# SPA fallback inlined on purpose (no separate nginx.conf): /verificar and the
# personal order links are client-side routes and must resolve to index.html.
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  # 8080 is what Dokploy's domain routes to (its "Port" field = container port);
  # 80 stays open as a fallback for generic port-80 routing.
  listen 8080;
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml font/woff2;
  gzip_min_length 1024;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
EOF

EXPOSE 8080 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1
