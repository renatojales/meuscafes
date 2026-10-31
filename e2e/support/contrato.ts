import Ajv2020, { ValidateFunction } from 'ajv/dist/2020';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/**
 * Validação de contrato orientada a spec: os testes de API não duplicam o formato
 * das respostas — validam contra `api/openapi.yaml`, a fonte única da verdade.
 * Se a API divergir do contrato (campo novo, tipo errado, campo faltando), o teste quebra.
 */
const spec = parse(readFileSync(join(__dirname, '../../api/openapi.yaml'), 'utf8'));

// strict:false porque o documento OpenAPI tem chaves que não são JSON Schema (openapi, info, paths...).
const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema({ $id: 'openapi', components: spec.components });

const cache = new Map<string, ValidateFunction>();

export type SchemaNome = keyof typeof spec.components.schemas | 'ListaTarefas' | 'ErroValidacao';

function validador(nome: string): ValidateFunction {
  let fn = cache.get(nome);
  if (!fn) {
    const ref = (s: string) => ({ $ref: `openapi#/components/schemas/${s}` });
    const schema =
      nome === 'ListaTarefas'
        ? { type: 'array', items: ref('Tarefa') }
        : nome === 'ErroValidacao'
          ? { allOf: [ref('Erro'), { required: ['detalhes'] }] }
          : ref(nome);
    fn = ajv.compile(schema);
    cache.set(nome, fn);
  }
  return fn;
}

/** Retorna lista de violações (vazia = conforme). */
export function violacoesDoContrato(nome: SchemaNome, dados: unknown): string[] {
  const fn = validador(nome as string);
  return fn(dados) ? [] : (fn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`);
}
