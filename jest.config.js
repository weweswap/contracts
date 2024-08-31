module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    testMatch: ['**/test/**/*.test.ts'],
  };
  