// eslint.config.mjs

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import("eslint").FlatConfig[]} */
export default [
  // Ignore the legacy folder entirely
  {
    ignores: ['legacy/**'],
  },

  // Base config for all TypeScript source files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Add Screeps-specific globals if you want, e.g.:
        Game: 'readonly',
        Memory: 'readonly',
        Creep: 'readonly',
        Room: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
];
