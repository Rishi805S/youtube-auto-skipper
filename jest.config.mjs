export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.ts', '**/src/engine/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverage: false,
};
