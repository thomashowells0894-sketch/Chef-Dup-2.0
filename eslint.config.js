const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  ...expoConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'import/first': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['e2e/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['supabase/functions/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: [
      'context/SubscriptionContext.tsx',
      'lib/sentry.ts',
      'lib/securityHeaders.ts',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
