import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
