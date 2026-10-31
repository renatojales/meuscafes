import { expect, expectContrato, test } from '../support/fixtures';
import { APIResponse } from '@playwright/test';
import { TarefasApi, tituloUnico } from '../support/tarefas-api';

/**
 * Testes de API + contrato. Cada resposta 2xx/4xx é validada contra api/openapi.yaml.
 * Isolamento: cada teste cria seus próprios dados e o fixture limpa no teardown.
 */
test.describe('API /tarefas', () => {
  test('GET /tarefas responde 200 conforme contrato', async ({ api, criarTarefa }) => {
    const criada = await criarTarefa();

    const res = await api.listar();
    expect(res.status()).toBe(200);
    const lista = await res.json();
    expectContrato('ListaTarefas', lista);
    expect(lista).toContainEqual(criada);
  });

  test('POST /tarefas cria, devolve 201 + Location e persiste', async ({ api, limparDepois }) => {
    const entrada = { titulo: tituloUnico('post'), descricao: 'Moer grãos — acentuação ok' };

    const res = await api.incluir(entrada);
    expect(res.status()).toBe(201);
    const criada = await res.json();
    limparDepois(criada.id);

    expectContrato('Tarefa', criada);
    expect(criada).toMatchObject(entrada);
    expect(res.headers()['location']).toBe(`/tarefas/${criada.id}`);
    expect(await (await api.buscar(criada.id)).json()).toEqual(criada);
  });

  test('PUT /tarefas/{id} altera e persiste', async ({ api, criarTarefa }) => {
    const { id } = await criarTarefa();
    const novo = { titulo: tituloUnico('put'), descricao: 'Alterada' };

    const res = await api.alterar(id, novo);
    expect(res.status()).toBe(200);
    expectContrato('Tarefa', await res.json());
    expect(await (await api.buscar(id)).json()).toEqual({ id, ...novo });
  });

  test('DELETE /tarefas/{id} devolve 204 e remove', async ({ api, criarTarefa }) => {
    const { id } = await criarTarefa();

    expect((await api.excluir(id)).status()).toBe(204);
    expect((await api.buscar(id)).status()).toBe(404);
  });

  test.describe('erros', () => {
    const chamadasPorId: [string, (api: TarefasApi, id: number) => Promise<APIResponse>][] = [
      ['GET', (api, id) => api.buscar(id)],
      ['PUT', (api, id) => api.alterar(id, { titulo: 'x', descricao: 'y' })],
      ['DELETE', (api, id) => api.excluir(id)],
    ];
    for (const [metodo, chamar] of chamadasPorId) {
      test(`${metodo} em id inexistente → 404 conforme contrato`, async ({ api }) => {
        const res = await chamar(api, 2_000_000_000);
        expect(res.status()).toBe(404);
        expectContrato('Erro', await res.json());
      });
    }

    // Partição de equivalência + valor-limite sobre as regras do schema.
    const invalidos: [string, unknown, string[]][] = [
      ['corpo vazio', {}, ['titulo', 'descricao']],
      ['só espaços', { titulo: '  ', descricao: ' ' }, ['titulo', 'descricao']],
      ['tipos errados', { titulo: 1, descricao: false }, ['titulo', 'descricao']],
      ['título com 21 caracteres', { titulo: 'a'.repeat(21), descricao: 'ok' }, ['titulo']],
      ['descrição com 101 caracteres', { titulo: 'ok', descricao: 'a'.repeat(101) }, ['descricao']],
    ];
    for (const [caso, payload, campos] of invalidos) {
      test(`POST inválido (${caso}) → 422 com detalhes por campo`, async ({ api }) => {
        const res = await api.incluir(payload);
        expect(res.status()).toBe(422);
        const corpo = await res.json();
        expectContrato('ErroValidacao', corpo);
        expect(Object.keys(corpo.detalhes).sort()).toEqual([...campos].sort());
      });
    }

    test('limites exatos (20/100, multibyte) são aceitos', async ({ api, limparDepois }) => {
      const res = await api.incluir({ titulo: 'é'.repeat(20), descricao: 'ã'.repeat(100) });
      expect(res.status()).toBe(201);
      limparDepois((await res.json()).id);
    });

    test('JSON malformado → 400', async ({ api }) => {
      const res = await api.incluirBruto('{"titulo": ');
      expect(res.status()).toBe(400);
      expectContrato('Erro', await res.json());
    });
  });

  test('preflight CORS (OPTIONS) → 204 com cabeçalhos', async ({ request }) => {
    const res = await request.fetch('/tarefas', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:4200', 'Access-Control-Request-Method': 'PUT' },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-methods']).toContain('PUT');
    expect(res.headers()['access-control-allow-origin']).toBeTruthy();
  });

  test('regressão: exclusão via GET da API legada não existe mais', async ({
    api,
    criarTarefa,
    request,
  }) => {
    const { id } = await criarTarefa();

    expect((await request.get(`/excluirTarefa/${id}`)).status()).toBe(404);
    expect((await api.buscar(id)).status()).toBe(200);
  });
});
