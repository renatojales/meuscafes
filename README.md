# Meus Cafés — Tarefas

Aplicação de referência de **Quality Engineering**: um CRUD de tarefas simples (Angular + API PHP)
cujo valor está na **estratégia de testes em camadas** e no **pipeline com quality gates**.

| Camada             | Stack                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| Frontend           | Angular 22 (standalone, zoneless, signals), Reactive Forms                            |
| API                | PHP 8.3 + Slim 4, PDO (MySQL 8.4 em produção/CI, SQLite local)                        |
| Contrato           | OpenAPI 3.1 — [`api/openapi.yaml`](api/openapi.yaml)                                  |
| Testes             | Vitest · PHPUnit 12 · Playwright 1.63 (API, contrato, E2E)                            |
| Qualidade estática | ESLint (angular-eslint) · Prettier · `tsc` nos testes E2E                             |
| CI                 | GitHub Actions (`.github/workflows/ci.yml`) · Azure Pipelines (`azure-pipelines.yml`) |

## Estratégia de testes

```
                ┌──────────────────────────┐
   7 testes     │  E2E UI (Playwright)     │  fluxos críticos; arrange via API, act via UI
                ├──────────────────────────┤
  16 testes     │  API + contrato (PW)     │  servidor real; toda resposta validada no OpenAPI
                ├──────────────────────────┤
  20 testes     │  Integração API (PHPUnit)│  app Slim in-process + SQLite em memória
  14 testes     │  Unit/componente (Vitest)│  service + componente com HttpTestingController
                └──────────────────────────┘
```

Decisões que valem ser copiadas para projetos reais:

- **Contrato como fonte única da verdade.** Os testes de API não reescrevem o formato das respostas;
  validam contra `api/openapi.yaml` com Ajv (`e2e/support/contrato.ts`). Se a API mudar o payload
  sem atualizar o contrato, o pipeline quebra.
- **Isolamento sem reset de banco.** Cada teste cria seus dados com título único (≤ 20 chars) e o
  fixture `criarTarefa`/`limparDepois` remove tudo no teardown. Resultado: paralelismo total
  (`fullyParallel`) e zero dependência de ordem — verificado com `--repeat-each=5` (115/115).
- **Arrange via API, Act via UI.** E2E só exercita na UI o que está sendo testado; o setup é feito
  pela API, mais rápido e determinístico.
- **Page Object com locators acessíveis** (`getByRole`/`getByLabel`); `data-testid` só onde não há
  semântica. Testes de UI viram também uma checagem barata de acessibilidade.
- **Falhas simuladas por interceptação** (`page.route`) para cobrir caminhos de erro sem derrubar a API.
- **Valor-limite e partição de equivalência** sobre as regras do schema (20/100 chars, multibyte).
- **Guardrails:** ESLint bloqueia `test.only`; `forbidOnly` no CI; retries só no CI com trace na
  primeira retentativa.

## Como rodar

Pré-requisitos: Node 22+, PHP 8.3+ (com `pdo_sqlite`/`pdo_mysql`), Composer.

```bash
npm ci
composer install -d api

# Desenvolvimento (SQLite local, sem Docker)
composer start -d api      # API em http://localhost:8080
npm start                  # Angular em http://localhost:4200 (proxy /api -> :8080)

# Com MySQL via Docker
docker compose up -d       # MySQL + API em :8080
npm start
```

### Testes

```bash
npx ng test --watch=false          # unit/componente (Vitest)
composer test -d api               # integração da API (PHPUnit)
npm run test:api                   # Playwright: API + contrato (sobe a API sozinho)
npm run test:e2e                   # Playwright: E2E UI (sobe API + Angular sozinho)
npm run test:pw                    # Playwright completo
npx playwright show-report         # relatório HTML
```

### Qualidade estática

```bash
npm run lint && npm run format:check && npm run typecheck:e2e
```

## API

| Método | Rota            | Sucesso                 | Erros         |
| ------ | --------------- | ----------------------- | ------------- |
| GET    | `/tarefas`      | 200 lista               |               |
| GET    | `/tarefas/{id}` | 200 tarefa              | 404           |
| POST   | `/tarefas`      | 201 tarefa + `Location` | 400, 422      |
| PUT    | `/tarefas/{id}` | 200 tarefa              | 400, 404, 422 |
| DELETE | `/tarefas/{id}` | 204                     | 404           |
| GET    | `/health`       | 200                     |               |

Erros seguem um único formato: `{"erro": "...", "detalhes": {"campo": "mensagem"}}`.

Variáveis de ambiente: `DB_DSN` (padrão SQLite em `api/var/`), `DB_USER`, `DB_PASSWORD`,
`CORS_ALLOWED_ORIGIN` (padrão `http://localhost:4200`), `APP_DEBUG` (padrão `false`),
`DB_AUTO_MIGRATE` (padrão `true`).

## Histórico

Até 2018 o repositório continha um scaffold Angular 6 sem uso e a API em Slim 3 versionada como
`tarefas.zip` (com `vendor/`). A migração corrigiu:

1. Banco inexistente (`tarefa` no script SQL vs. `tarefas` na conexão) — a API não conectava.
2. Ausência de rota `OPTIONS` — preflight CORS falhava, quebrando POST a partir do Angular.
3. Exclusão via `GET /excluirTarefa/{id}` — substituída por `DELETE /tarefas/{id}` (teste de regressão incluso).
4. `displayErrorDetails` ligado — agora controlado por `APP_DEBUG`, desligado por padrão.
5. Sem validação de entrada — agora 422 com mensagens por campo.
6. Credencial hardcoded em comentário — removida (permanece no histórico do Git: **rotacione-a** se ainda estiver em uso).
