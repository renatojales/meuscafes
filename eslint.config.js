// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  { ignores: ['dist/', 'api/vendor/', 'playwright-report/', 'test-results/', '.angular/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  {
    // Testes Playwright: sem regras Angular; proíbe foco/skip esquecido.
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'test', property: 'only', message: 'Remova test.only antes do commit.' },
        { object: 'describe', property: 'only', message: 'Remova describe.only antes do commit.' },
      ],
    },
  },
]);
