## Standalone equivalent of docker/php/Dockerfile's web target.
## Compose uses the shared stages in docker/php/Dockerfile.
FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend/ ./frontend/
COPY scripts/setup-browser-tools.mjs ./scripts/
RUN node scripts/setup-browser-tools.mjs && npm run build --prefix frontend
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
