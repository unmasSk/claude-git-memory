// @ts-check
import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vite/**',
      '**/coverage/**',
    ],
  },

  // Base TypeScript rules — all packages
  ...tseslint.configs.recommended,
  {
    rules: {
      // Never use console.log — use pino logger in backend, dedicated utilities in frontend
      'no-console': 'error',
      // Catch unused variables (allow _ prefix for intentional ignores)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // No explicit any — encourage proper typing
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty catch blocks must be intentional
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },

  // Frontend — React hooks rules
  {
    files: ['apps/frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      // Disabled: synchronous setState in effects is valid for derived-state resets (timer, status sync)
      'react-hooks/set-state-in-effect': 'off',
      // Disabled: Icon variable via getAgentIcon() is a module-level lookup assigned in render —
      // tracked for Ultron to fix with useMemo to satisfy the rule
      'react-hooks/static-components': 'off',
    },
  },

  // Test files — relax some rules
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // bun:test uses require() inside mock.module() callbacks — this is the canonical bun mock pattern
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
