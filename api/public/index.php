<?php

declare(strict_types=1);

use App\AppFactory;
use App\Database;

if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

require __DIR__ . '/../vendor/autoload.php';

$pdo = Database::doAmbiente();
if (filter_var(getenv('DB_AUTO_MIGRATE') ?: 'true', FILTER_VALIDATE_BOOL)) {
    Database::migrar($pdo);
}

AppFactory::criar($pdo, [
    'debug' => filter_var(getenv('APP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOL),
    'corsOrigin' => getenv('CORS_ALLOWED_ORIGIN') ?: 'http://localhost:4200',
])->run();
