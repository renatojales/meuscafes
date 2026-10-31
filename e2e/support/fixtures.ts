import { test as base, expect } from '@playwright/test';
import { violacoesDoContrato, SchemaNome } from './contrato';
import { TarefasApi, Tarefa, tituloUnico } from './tarefas-api';
import { TarefasPage } from '../pages/tarefas.page';

const API_URL = process.env['API_URL'] ?? 'http://127.0.0.1:8080';

interface Fixtures {
  /** Client da API (sempre aponta para a API, mesmo em testes de UI). */
  api: TarefasApi;
  /** Cria tarefas via API (arrange rápido) e remove tudo que criou no teardown. */
  criarTarefa: (parcial?: Partial<Omit<Tarefa, 'id'>>) => Promise<Tarefa>;
  /** Registra ids criados por outros caminhos (ex.: UI) para limpeza. */
  limparDepois: (id: number) => void;
  tarefasPage: TarefasPage;
}

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL });
    await use(new TarefasApi(ctx));
    await ctx.dispose();
  },

  limparDepois: async ({ api }, use) => {
    const ids = new Set<number>();
    await use((id) => ids.add(id));
    // Teardown tolerante: 404 significa que o próprio teste já excluiu.
    await Promise.all([...ids].map((id) => api.excluir(id)));
  },

  criarTarefa: async ({ api, limparDepois }, use) => {
    await use(async (parcial = {}) => {
      const res = await api.incluir({
        titulo: tituloUnico(),
        descricao: 'Criada pelo teste',
        ...parcial,
      });
      expect(res.status(), await res.text()).toBe(201);
      const tarefa = (await res.json()) as Tarefa;
      limparDepois(tarefa.id);
      return tarefa;
    });
  },

  tarefasPage: async ({ page }, use) => {
    await use(new TarefasPage(page));
  },
});

export { expect };

/** Asserção de contrato com mensagem legível listando cada violação. */
export function expectContrato(nome: SchemaNome, dados: unknown): void {
  const violacoes = violacoesDoContrato(nome, dados);
  expect(
    violacoes,
    `Resposta viola o contrato "${String(nome)}":\n${violacoes.join('\n')}`,
  ).toEqual([]);
}
