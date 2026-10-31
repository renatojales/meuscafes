export interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
}

export type TarefaInput = Omit<Tarefa, 'id'>;

/** Espelha as regras da API (VARCHAR(20) / VARCHAR(100)). */
export const LIMITES = { titulo: 20, descricao: 100 } as const;

/** Contrato de erro da API: {"erro": string, "detalhes"?: {campo: mensagem}}. */
export interface ErroApi {
  erro: string;
  detalhes?: Partial<Record<keyof TarefaInput, string>>;
}
