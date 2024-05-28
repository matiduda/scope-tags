module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/__temporaryTestData__/'],
  roots: ["<rootDir>/test/", "<rootDir>/src/"],
  collectCoverage: false,
  collectCoverageFrom: ["src/**", "!**/node_modules/**"],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcovonly', 'text', 'clover'],
  testPathIgnorePatterns: ['/_utils/'],
  globalSetup: '<rootDir>/test/setup.js',
  globalTeardown: '<rootDir>/test/teardown.js',
	setupFilesAfterEnv: ["./jest.setup.js"],
};