<?php

declare(strict_types=1);

namespace App\Tarefa;

/**
 * Regras derivadas do schema: titulo VARCHAR(20), descricao VARCHAR(100), ambos NOT NULL.
 */
final class TarefaValidator
{
    public const TITULO_MAX = 20;
    public const DESCRICAO_MAX = 100;

    /**
     * @param mixed $dados corpo JSON já decodificado
     * @return array<string,string> campo => mensagem; vazio quando válido
     */
    public static function validar(mixed $dados): array
    {
        if (!is_array($dados)) {
            return ['corpo' => 'O corpo da requisição deve ser um objeto JSON.'];
        }

        $erros = [];
        foreach (['titulo' => self::TITULO_MAX, 'descricao' => self::DESCRICAO_MAX] as $campo => $max) {
            $valor = $dados[$campo] ?? null;
            if (!is_string($valor) || trim($valor) === '') {
                $erros[$campo] = 'Campo obrigatório.';
            } elseif (mb_strlen(trim($valor)) > $max) {
                $erros[$campo] = sprintf('Máximo de %d caracteres.', $max);
            }
        }

        return $erros;
    }
}
