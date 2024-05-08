/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  roots: ["<rootDir>/test/", "<rootDir>/src/"],
  collectCoverage: true,
  collectCoverageFrom: ["**/src/**", "!**/node_modules/**"],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcovonly', 'text', 'clover'],
  testPathIgnorePatterns: ['/_utils/'],
  globalSetup: '<rootDir>/test/setup.js',
  globalTeardown: '<rootDir>/test/teardown.js',
  setupTestFrameworkScriptFile: './jest.setup.js',
};