import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,       // process, console, Buffer, setTimeout, setInterval, etc.
        ...globals.browser,    // fetch, URL, URLSearchParams, AbortController, Blob, FormData, performance
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],  // allows empty catch blocks
      'no-console': 'off',
      'no-useless-assignment': 'warn',
    },
  },
];