import { expect, test } from '../support/fixtures';
import { tituloUnico } from '../support/tarefas-api';

/**
 * Fluxos ponta a ponta. Arrange via API (rápido e determinístico),
 * Act via UI, Assert na UI e, quando relevante, na API (fonte da verdade).
 */
test.describe('Tela de tarefas', () => {
  test.beforeEach(async ({ tarefasPage }) => {
    await tarefasPage.abrir();
  });

  test('inclui uma tarefa e ela persiste após recarregar', async ({
    page,
    tarefasPage,
    api,
    limparDepois,
  }) => {
    const titulo = tituloUnico('ui');

    const id = await tarefasPage.adicionar(titulo, 'Criada pela UI');
    limparDepois(id);

    await expect(tarefasPage.item(titulo)).toBeVisible();
    await expect(tarefasPage.titulo).toHaveValue('');

    await page.reload();
    await expect(tarefasPage.item(titulo)).toContainText('Criada pela UI');
    expect((await api.buscar(id)).status()).toBe(200);
  });

  test('edita uma tarefa existente', async ({ page, tarefasPage, criarTarefa }) => {
    const tarefa = await criarTarefa();
    await page.reload();
    const novoTitulo = tituloUnico('edit');

    await tarefasPage.editar(tarefa.titulo);
    await expect(tarefasPage.titulo).toHaveValue(tarefa.titulo);
    await tarefasPage.preencher(novoTitulo, 'Editada pela UI');
    await tarefasPage.botaoSalvar.click();

    await expect(tarefasPage.item(novoTitulo)).toContainText('Editada pela UI');
    await expect(tarefasPage.item(tarefa.titulo)).toHaveCount(0);
  });

  test('cancelar edição restaura o modo de inclusão', async ({
    page,
    tarefasPage,
    criarTarefa,
  }) => {
    const tarefa = await criarTarefa();
    await page.reload();

    await tarefasPage.editar(tarefa.titulo);
    await tarefasPage.botaoCancelar.click();

    await expect(tarefasPage.botaoAdicionar).toBeVisible();
    await expect(tarefasPage.titulo).toHaveValue('');
  });

  test('exclui uma tarefa', async ({ page, tarefasPage, criarTarefa, api }) => {
    const tarefa = await criarTarefa();
    await page.reload();

    await tarefasPage.excluir(tarefa.titulo);

    await expect(tarefasPage.item(tarefa.titulo)).toHaveCount(0);
    expect((await api.buscar(tarefa.id)).status()).toBe(404);
  });

  test('valida campos obrigatórios sem chamar a API', async ({ page, tarefasPage }) => {
    let posts = 0;
    page.on('request', (r) => r.method() === 'POST' && posts++);

    await tarefasPage.botaoAdicionar.click();

    await expect(tarefasPage.erroTitulo).toHaveText('Campo obrigatório.');
    await expect(tarefasPage.erroDescricao).toHaveText('Campo obrigatório.');
    await expect(tarefasPage.titulo).toHaveAttribute('aria-invalid', 'true');
    expect(posts).toBe(0);
  });

  test('valida limite de 20 caracteres do título', async ({ tarefasPage }) => {
    await tarefasPage.preencher('a'.repeat(21), 'ok');
    await tarefasPage.botaoAdicionar.click();

    await expect(tarefasPage.erroTitulo).toHaveText('Máximo de 20 caracteres.');
  });

  test('exibe erro amigável quando a API falha', async ({ page, tarefasPage }) => {
    // Falha simulada por interceptação: cobre o caminho de erro sem derrubar a API real.
    await page.route('**/api/tarefas', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, json: { erro: 'Erro interno.' } })
        : route.continue(),
    );

    await tarefasPage.preencher(tituloUnico('falha'), 'x');
    await tarefasPage.botaoAdicionar.click();

    await expect(tarefasPage.alerta).toHaveText('Erro interno.');
  });
});
