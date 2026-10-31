<?php

declare(strict_types=1);

namespace App;

use App\Middleware\CorsMiddleware;
use App\Tarefa\TarefaRepository;
use App\Tarefa\TarefaValidator;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Exception\HttpBadRequestException;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory as SlimAppFactory;
use Slim\Routing\RouteCollectorProxy;

final class AppFactory
{
    /**
     * @param array{debug?:bool, corsOrigin?:string} $config
     */
    public static function criar(PDO $pdo, array $config = []): App
    {
        $app = SlimAppFactory::create();
        $repo = new TarefaRepository($pdo);

        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();
        $erros = $app->addErrorMiddleware($config['debug'] ?? false, true, true);
        $erros->setDefaultErrorHandler(new ErrorHandler($app->getResponseFactory()));
        // Adicionado por último = executa primeiro: cobre preflight e respostas de erro.
        $app->add(new CorsMiddleware($app->getResponseFactory(), $config['corsOrigin'] ?? 'http://localhost:4200'));

        $app->get('/health', fn (Request $req, Response $res) => self::json($res, ['status' => 'ok']));

        $app->group('/tarefas', function (RouteCollectorProxy $g) use ($repo) {
            $g->get('', fn (Request $req, Response $res) => self::json($res, $repo->listar()));

            $g->get('/{id:[0-9]+}', function (Request $req, Response $res, array $args) use ($repo) {
                $tarefa = $repo->buscar((int) $args['id']) ?? throw new HttpNotFoundException($req, 'Tarefa não encontrada.');

                return self::json($res, $tarefa);
            });

            $g->post('', function (Request $req, Response $res) use ($repo) {
                [$titulo, $descricao] = self::entradaValida($req);
                $tarefa = $repo->incluir($titulo, $descricao);

                return self::json($res, $tarefa, 201)->withHeader('Location', '/tarefas/' . $tarefa['id']);
            });

            $g->put('/{id:[0-9]+}', function (Request $req, Response $res, array $args) use ($repo) {
                [$titulo, $descricao] = self::entradaValida($req);
                $tarefa = $repo->alterar((int) $args['id'], $titulo, $descricao)
                    ?? throw new HttpNotFoundException($req, 'Tarefa não encontrada.');

                return self::json($res, $tarefa);
            });

            $g->delete('/{id:[0-9]+}', function (Request $req, Response $res, array $args) use ($repo) {
                if (!$repo->excluir((int) $args['id'])) {
                    throw new HttpNotFoundException($req, 'Tarefa não encontrada.');
                }

                return $res->withStatus(204);
            });
        });

        return $app;
    }

    /** @return array{0:string,1:string} */
    private static function entradaValida(Request $req): array
    {
        $dados = $req->getParsedBody();
        if ($dados === null && (string) $req->getBody() !== '') {
            throw new HttpBadRequestException($req, 'JSON inválido.');
        }

        $erros = TarefaValidator::validar($dados);
        if ($erros !== []) {
            throw new ValidationException($req, $erros);
        }

        return [trim($dados['titulo']), trim($dados['descricao'])];
    }

    private static function json(Response $res, mixed $dados, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
