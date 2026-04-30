/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@forge/api$': '<rootDir>/tests/__mocks__/@forge/api.ts',
    '^@forge/resolver$': '<rootDir>/tests/__mocks__/@forge/resolver.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
};
