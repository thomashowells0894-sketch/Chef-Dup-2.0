module.exports = {
  extends: ['expo'],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
