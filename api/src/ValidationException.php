<?php

declare(strict_types=1);

namespace App;

use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpSpecializedException;

final class ValidationException extends HttpSpecializedException
{
    protected $code = 422;
    protected $message = 'Dados inválidos.';
    protected string $title = '422 Unprocessable Content';

    /** @param array<string,string> $detalhes */
    public function __construct(ServerRequestInterface $request, public readonly array $detalhes)
    {
        parent::__construct($request);
    }
}
