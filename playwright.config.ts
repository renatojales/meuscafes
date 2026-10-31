import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const CI = !!process.env['CI'];
const API_URL = process.env['API_URL'] ?? 'http://127.0.0.1:8080';
const WEB_URL = process.env['WEB_URL'] ?? 'http://localhost:4200';

/**
 * Projetos:
 *  - api: testes funcionais + contrato (OpenAPI) direto na API, sem browser.
 *  - e2e-chromium: fluxos de UI ponta a ponta (Angular -> proxy -> API -> banco).
 *
 * Banco: SQLite local por padrão; no CI, DB_DSN aponta para MySQL (service container).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './e2e/api',
      use: { baseURL: API_URL, extraHTTPHeaders: { Accept: 'application/json' } },
    },
    {
      name: 'e2e-chromium',
      testDir: './e2e/ui',
      use: { ...devices['Desktop Chrome'], baseURL: WEB_URL },
    },
  ],
  webServer: [
    {
      command: 'php -S 127.0.0.1:8080 -t api/public',
      stderr: 'ignore', // log de acesso do servidor embutido do PHP é muito verboso
      url: `${API_URL}/health`,
      reuseExistingServer: !CI,
      env: {
        DB_DSN: process.env['DB_DSN'] ?? `sqlite:${join(__dirname, 'api/var/e2e.sqlite')}`,
        DB_USER: process.env['DB_USER'] ?? '',
        DB_PASSWORD: process.env['DB_PASSWORD'] ?? '',
        CORS_ALLOWED_ORIGIN: WEB_URL,
      },
    },
    {
      command: 'npx ng serve --port 4200',
      url: WEB_URL,
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
  ],
});
