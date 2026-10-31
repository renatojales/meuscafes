import { APIRequestContext, APIResponse } from '@playwright/test';

export interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
}

/** Client fino sobre APIRequestContext: centraliza rotas e evita string mágica nos testes. */
export class TarefasApi {
  constructor(private readonly request: APIRequestContext) {}

  listar(): Promise<APIResponse> {
    return this.request.get('/tarefas');
  }

  buscar(id: number): Promise<APIResponse> {
    return this.request.get(`/tarefas/${id}`);
  }

  incluir(dados: unknown): Promise<APIResponse> {
    return this.request.post('/tarefas', { data: dados });
  }

  incluirBruto(corpo: string): Promise<APIResponse> {
    return this.request.post('/tarefas', {
      data: corpo,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  alterar(id: number, dados: unknown): Promise<APIResponse> {
    return this.request.put(`/tarefas/${id}`, { data: dados });
  }

  excluir(id: number): Promise<APIResponse> {
    return this.request.delete(`/tarefas/${id}`);
  }
}

/** Título único ≤ 20 chars (limite do schema), seguro para execução paralela. */
export function tituloUnico(prefixo = 't'): string {
  const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefixo}-${sufixo}`.slice(0, 20);
}
