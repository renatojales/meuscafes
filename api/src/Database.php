<?php

declare(strict_types=1);

namespace App;

use PDO;

final class Database
{
    public static function conectar(string $dsn, ?string $usuario = null, ?string $senha = null): PDO
    {
        $opcoes = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        return new PDO($dsn, $usuario, $senha, $opcoes);
    }

    public static function doAmbiente(): PDO
    {
        $dsn = getenv('DB_DSN') ?: 'sqlite:' . dirname(__DIR__) . '/var/tarefas.sqlite';
        if (str_starts_with($dsn, 'mysql:') && !str_contains($dsn, 'charset=')) {
            $dsn .= ';charset=utf8mb4';
        }

        return self::conectar($dsn, getenv('DB_USER') ?: null, getenv('DB_PASSWORD') ?: null);
    }

    /** Cria a tabela se não existir. Idempotente; usado em dev, testes e CI. */
    public static function migrar(PDO $pdo): void
    {
        $sql = match ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)) {
            'sqlite' => 'CREATE TABLE IF NOT EXISTS tarefa (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo VARCHAR(20) NOT NULL,
                descricao VARCHAR(100) NOT NULL
            )',
            'mysql' => file_get_contents(dirname(__DIR__) . '/database/schema.mysql.sql'),
            default => throw new \RuntimeException('Driver não suportado.'),
        };
        $pdo->exec($sql);
    }
}
