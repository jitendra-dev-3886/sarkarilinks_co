FROM node:24-bookworm-slim AS extraction
WORKDIR /opt/advertisements
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts/extract-advertisement.mjs scripts/advertisement-fields.mjs ./scripts/

FROM extraction AS frontend
WORKDIR /opt/advertisements
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend/ ./frontend/
COPY scripts/setup-browser-tools.mjs ./scripts/
RUN node scripts/setup-browser-tools.mjs && npm run build --prefix frontend

FROM nginxinc/nginx-unprivileged:1.28-alpine AS web
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend /opt/advertisements/frontend/dist /usr/share/nginx/html
EXPOSE 8080

FROM php:8.4-fpm-bookworm AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev libzip-dev unzip python3 python3-venv ffmpeg \
    && docker-php-ext-install pdo_mysql intl zip opcache \
    && pecl install redis-6.2.0 && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2.9 /usr/bin/composer /usr/local/bin/composer
COPY --from=extraction /usr/local/bin/node /usr/local/bin/node
COPY --from=extraction /opt/advertisements /opt/advertisements
ENV ADVERTISEMENT_SCRIPT=/opt/advertisements/scripts/extract-advertisement.mjs
COPY scripts/requirements-media.txt scripts/download-media.py /opt/media/
RUN python3 -m venv /opt/media/venv && /opt/media/venv/bin/pip install --no-cache-dir -r /opt/media/requirements-media.txt
ENV MEDIA_PYTHON=/opt/media/venv/bin/python MEDIA_FFMPEG=/usr/bin MEDIA_SCRIPT=/opt/media/download-media.py PORTAL_HTML_SHELL=/var/www/frontend/index.html
COPY --from=frontend /opt/advertisements/frontend/dist/index.html /var/www/frontend/index.html
WORKDIR /var/www/html
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY --chown=www-data:www-data backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache
COPY docker/php/php.ini /usr/local/etc/php/conf.d/portal.ini
USER www-data
RUN php artisan package:discover --ansi
EXPOSE 9000
CMD ["php-fpm", "-F"]
