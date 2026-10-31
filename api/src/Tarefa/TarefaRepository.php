<?php

declare(strict_types=1);

namespace App\Tarefa;

use PDO;

final class TarefaRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return list<array{id:int,titulo:string,descricao:string}> */
    public function listar(): array
    {
        $stmt = $this->pdo->query('SELECT id, titulo, descricao FROM tarefa ORDER BY id');

        return array_map(self::hidratar(...), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @return array{id:int,titulo:string,descricao:string}|null */
    public function buscar(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, titulo, descricao FROM tarefa WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $linha = $stmt->fetch(PDO::FETCH_ASSOC);

        return $linha === false ? null : self::hidratar($linha);
    }

    /** @return array{id:int,titulo:string,descricao:string} */
    public function incluir(string $titulo, string $descricao): array
    {
        $stmt = $this->pdo->prepare('INSERT INTO tarefa (titulo, descricao) VALUES (:titulo, :descricao)');
        $stmt->execute(['titulo' => $titulo, 'descricao' => $descricao]);

        return ['id' => (int) $this->pdo->lastInsertId(), 'titulo' => $titulo, 'descricao' => $descricao];
    }

    /** @return array{id:int,titulo:string,descricao:string}|null */
    public function alterar(int $id, string $titulo, string $descricao): ?array
    {
        if ($this->buscar($id) === null) {
            return null;
        }

        $stmt = $this->pdo->prepare('UPDATE tarefa SET titulo = :titulo, descricao = :descricao WHERE id = :id');
        $stmt->execute(['id' => $id, 'titulo' => $titulo, 'descricao' => $descricao]);

        return ['id' => $id, 'titulo' => $titulo, 'descricao' => $descricao];
    }

    public function excluir(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM tarefa WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Normaliza tipos: o driver MySQL devolve colunas INT como string.
     *
     * @param array<string,mixed> $linha
     * @return array{id:int,titulo:string,descricao:string}
     */
    private static function hidratar(array $linha): array
    {
        return [
            'id' => (int) $linha['id'],
            'titulo' => (string) $linha['titulo'],
            'descricao' => (string) $linha['descricao'],
        ];
    }
}
