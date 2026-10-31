<?php

declare(strict_types=1);

namespace App;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpException;
use Throwable;

/**
 * Contrato único de erro: {"erro": string, "detalhes"?: object}.
 * Detalhes técnicos de exceções não tratadas só são expostos com APP_DEBUG=true.
 */
final class ErrorHandler
{
    public function __construct(private readonly ResponseFactoryInterface $responseFactory)
    {
    }

    public function __invoke(
        ServerRequestInterface $request,
        Throwable $e,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails,
    ): ResponseInterface {
        if ($e instanceof HttpException) {
            $status = $e->getCode();
            $corpo = ['erro' => $e->getMessage()];
            if ($e instanceof ValidationException) {
                $corpo['detalhes'] = $e->detalhes;
            }
        } else {
            $status = 500;
            $corpo = ['erro' => 'Erro interno.'];
            if ($displayErrorDetails) {
                $corpo['detalhes'] = ['excecao' => $e::class, 'mensagem' => $e->getMessage()];
            }
            if ($logErrors) {
                error_log((string) $e);
            }
        }

        $response = $this->responseFactory->createResponse($status)->withHeader('Content-Type', 'application/json');
        if ($e instanceof \Slim\Exception\HttpMethodNotAllowedException) {
            $response = $response->withHeader('Allow', implode(', ', $e->getAllowedMethods()));
        }
        $response->getBody()->write(json_encode($corpo, JSON_UNESCAPED_UNICODE));

        return $response;
    }
}
