export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/src/engine/__tests__/normalizeSegments.test.ts',
    '**/src/engine/__tests__/tieredFetcher.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverage: false,
};
