FROM composer:2 AS deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.3-cli-alpine
RUN docker-php-ext-install pdo_mysql
WORKDIR /var/www
COPY --from=deps /app/vendor ./vendor
COPY public ./public
COPY src ./src
COPY database ./database
RUN mkdir -p var && chown -R www-data:www-data var
USER www-data
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
