import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base configuration recommended by ESLint
  {
    rules: {
      // Your global rules can go here
    }
  },
  
  // TypeScript specific configurations
  ...tseslint.configs.recommended,

  // Prettier integration
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules, // Turns off ESLint rules that conflict with Prettier
      'prettier/prettier': 'error', // Displays Prettier errors as ESLint errors
    },
  },

  // Configuration for your source files
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
  }
];