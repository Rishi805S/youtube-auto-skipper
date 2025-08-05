module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',                   // turns off ESLint rules that conflict with Prettier
    'plugin:prettier/recommended' // displays Prettier errors as ESLint errors
  ],
  rules: {
    // Enforce Prettier formatting
    'prettier/prettier': 'error',

    // Your custom rules can go here
    // e.g., '@typescript-eslint/no-unused-vars': ['warn']
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
};