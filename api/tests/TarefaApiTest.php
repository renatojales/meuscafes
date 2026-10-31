<?php

declare(strict_types=1);

namespace Tests;

use App\AppFactory;
use App\Database;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Slim\App;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

/**
 * Testes de integração in-process: app Slim real + SQLite em memória.
 * Isolamento total por teste (banco recriado no setUp), sem rede nem servidor.
 */
final class TarefaApiTest extends TestCase
{
    private App $app;

    protected function setUp(): void
    {
        $pdo = Database::conectar('sqlite::memory:');
        Database::migrar($pdo);
        $this->app = AppFactory::criar($pdo, ['corsOrigin' => 'http://localhost:4200']);
    }

    private function req(string $metodo, string $uri, mixed $corpo = null, ?string $corpoBruto = null): ResponseInterface
    {
        $request = (new ServerRequestFactory())->createServerRequest($metodo, $uri)
            ->withHeader('Accept', 'application/json');
        $bruto = $corpoBruto ?? ($corpo === null ? null : json_encode($corpo));
        if ($bruto !== null) {
            $request = $request->withHeader('Content-Type', 'application/json')
                ->withBody((new StreamFactory())->createStream($bruto));
        }

        return $this->app->handle($request);
    }

    private static function json(ResponseInterface $res): mixed
    {
        return json_decode((string) $res->getBody(), true);
    }

    private function criar(string $titulo = 'Café', string $descricao = 'Comprar grãos'): array
    {
        return self::json($this->req('POST', '/tarefas', ['titulo' => $titulo, 'descricao' => $descricao]));
    }

    public function testListaVaziaRetorna200ComArray(): void
    {
        $res = $this->req('GET', '/tarefas');

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('application/json', $res->getHeaderLine('Content-Type'));
        self::assertSame([], self::json($res));
    }

    public function testIncluirRetorna201LocationEIdInteiro(): void
    {
        $res = $this->req('POST', '/tarefas', ['titulo' => '  Café  ', 'descricao' => 'Comprar grãos']);
        $corpo = self::json($res);

        self::assertSame(201, $res->getStatusCode());
        self::assertIsInt($corpo['id']);
        self::assertSame('Café', $corpo['titulo'], 'deve aplicar trim');
        self::assertSame('/tarefas/' . $corpo['id'], $res->getHeaderLine('Location'));
    }

    public function testBuscarPorId(): void
    {
        $criada = $this->criar();
        $res = $this->req('GET', '/tarefas/' . $criada['id']);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame($criada, self::json($res));
    }

    public function testAlterarAtualizaEPersiste(): void
    {
        $criada = $this->criar();
        $res = $this->req('PUT', '/tarefas/' . $criada['id'], ['titulo' => 'Novo', 'descricao' => 'Nova desc']);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['id' => $criada['id'], 'titulo' => 'Novo', 'descricao' => 'Nova desc'], self::json($res));
        self::assertSame('Novo', self::json($this->req('GET', '/tarefas/' . $criada['id']))['titulo']);
    }

    public function testExcluirRetorna204ERemove(): void
    {
        $criada = $this->criar();

        self::assertSame(204, $this->req('DELETE', '/tarefas/' . $criada['id'])->getStatusCode());
        self::assertSame(404, $this->req('GET', '/tarefas/' . $criada['id'])->getStatusCode());
    }

    /** @return iterable<string,array{string,string}> */
    public static function recursoInexistente(): iterable
    {
        yield 'GET' => ['GET', '/tarefas/999'];
        yield 'PUT' => ['PUT', '/tarefas/999'];
        yield 'DELETE' => ['DELETE', '/tarefas/999'];
    }

    #[DataProvider('recursoInexistente')]
    public function testRecursoInexistenteRetorna404(string $metodo, string $uri): void
    {
        $res = $this->req($metodo, $uri, ['titulo' => 'x', 'descricao' => 'y']);

        self::assertSame(404, $res->getStatusCode());
        self::assertSame('Tarefa não encontrada.', self::json($res)['erro']);
    }

    /** @return iterable<string,array{mixed,list<string>}> */
    public static function payloadsInvalidos(): iterable
    {
        yield 'vazio' => [[], ['titulo', 'descricao']];
        yield 'só espaços' => [['titulo' => '   ', 'descricao' => '  '], ['titulo', 'descricao']];
        yield 'tipos errados' => [['titulo' => 123, 'descricao' => ['a']], ['titulo', 'descricao']];
        yield 'titulo 21 chars' => [['titulo' => str_repeat('a', 21), 'descricao' => 'ok'], ['titulo']];
        yield 'descricao 101 chars' => [['titulo' => 'ok', 'descricao' => str_repeat('a', 101)], ['descricao']];
    }

    #[DataProvider('payloadsInvalidos')]
    public function testValidacaoRetorna422ComDetalhesPorCampo(mixed $payload, array $camposComErro): void
    {
        $res = $this->req('POST', '/tarefas', $payload);
        $corpo = self::json($res);

        self::assertSame(422, $res->getStatusCode());
        self::assertSame('Dados inválidos.', $corpo['erro']);
        self::assertEqualsCanonicalizing($camposComErro, array_keys($corpo['detalhes']));
    }

    public function testLimitesExatosSaoAceitos(): void
    {
        // Valor-limite: 20 e 100 caracteres multibyte devem passar.
        $res = $this->req('POST', '/tarefas', ['titulo' => str_repeat('é', 20), 'descricao' => str_repeat('ã', 100)]);

        self::assertSame(201, $res->getStatusCode());
    }

    public function testJsonMalformadoRetorna400(): void
    {
        $res = $this->req('POST', '/tarefas', corpoBruto: '{"titulo": ');

        self::assertSame(400, $res->getStatusCode());
        self::assertArrayHasKey('erro', self::json($res));
    }

    public function testPreflightRetorna204ComCabecalhosCors(): void
    {
        $res = $this->req('OPTIONS', '/tarefas/1');

        self::assertSame(204, $res->getStatusCode());
        self::assertSame('http://localhost:4200', $res->getHeaderLine('Access-Control-Allow-Origin'));
        self::assertStringContainsString('DELETE', $res->getHeaderLine('Access-Control-Allow-Methods'));
    }

    public function testRespostaDeErroTambemTemCors(): void
    {
        $res = $this->req('GET', '/tarefas/999');

        self::assertSame('http://localhost:4200', $res->getHeaderLine('Access-Control-Allow-Origin'));
    }

    public function testExclusaoViaGetNaoExisteMais(): void
    {
        // Regressão: a API legada excluía via GET /excluirTarefa/{id}.
        $this->criar();

        self::assertSame(404, $this->req('GET', '/excluirTarefa/1')->getStatusCode());
        self::assertCount(1, self::json($this->req('GET', '/tarefas')));
    }

    public function testMetodoNaoPermitidoRetorna405ComAllow(): void
    {
        $res = $this->req('PATCH', '/tarefas/1');

        self::assertSame(405, $res->getStatusCode());
        self::assertStringContainsString('PUT', $res->getHeaderLine('Allow'));
    }

    public function testHealth(): void
    {
        self::assertSame(['status' => 'ok'], self::json($this->req('GET', '/health')));
    }
}
