import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object da tela de tarefas.
 * Locators priorizam papéis/labels acessíveis; data-testid só onde não há semântica.
 */
export class TarefasPage {
  readonly titulo: Locator;
  readonly descricao: Locator;
  readonly botaoAdicionar: Locator;
  readonly botaoSalvar: Locator;
  readonly botaoCancelar: Locator;
  readonly itens: Locator;
  readonly alerta: Locator;
  readonly erroTitulo: Locator;
  readonly erroDescricao: Locator;

  constructor(private readonly page: Page) {
    this.titulo = page.getByLabel('Título');
    this.descricao = page.getByLabel('Descrição');
    this.botaoAdicionar = page.getByRole('button', { name: 'Adicionar' });
    this.botaoSalvar = page.getByRole('button', { name: 'Salvar' });
    this.botaoCancelar = page.getByRole('button', { name: 'Cancelar' });
    this.itens = page.getByTestId('item-tarefa');
    this.alerta = page.getByRole('alert');
    this.erroTitulo = page.getByTestId('erro-titulo');
    this.erroDescricao = page.getByTestId('erro-descricao');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByTestId('lista-tarefas')).toBeVisible();
  }

  item(titulo: string): Locator {
    return this.itens.filter({
      has: this.page.getByTestId('item-titulo').getByText(titulo, { exact: true }),
    });
  }

  async preencher(titulo: string, descricao: string): Promise<void> {
    await this.titulo.fill(titulo);
    await this.descricao.fill(descricao);
  }

  /** Inclui pela UI e devolve o id gerado (capturado da resposta HTTP real). */
  async adicionar(titulo: string, descricao: string): Promise<number> {
    await this.preencher(titulo, descricao);
    const resposta = this.page.waitForResponse(
      (r) => r.url().endsWith('/api/tarefas') && r.request().method() === 'POST',
    );
    await this.botaoAdicionar.click();
    const res = await resposta;
    expect(res.status()).toBe(201);
    return ((await res.json()) as { id: number }).id;
  }

  async editar(tituloAtual: string): Promise<void> {
    await this.page.getByRole('button', { name: `Editar ${tituloAtual}` }).click();
  }

  async excluir(titulo: string): Promise<void> {
    await this.page.getByRole('button', { name: `Excluir ${titulo}` }).click();
  }
}
