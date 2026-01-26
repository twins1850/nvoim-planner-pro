// ESLint v9 flat config
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/web-build/**',
      '**/.next/**',
      '**/coverage/**'
    ]
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      // 기본 규칙 - 너무 엄격하지 않게 설정
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  }
];
