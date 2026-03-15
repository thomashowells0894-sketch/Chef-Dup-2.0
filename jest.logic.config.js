module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/__tests__'],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/e2e/',
    '/__tests__/mocks/',
    '/__tests__/context/mealReducer.test.ts',
    '/__tests__/hooks/',
    '/__tests__/context/SubscriptionContext.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/mocks/asyncStorage.js',
    '^@sentry/react-native$': '<rootDir>/__tests__/mocks/sentryReactNative.js',
    '^expo-crypto$': '<rootDir>/__tests__/mocks/crypto.js',
    '^expo-secure-store$': '<rootDir>/__tests__/mocks/secureStore.js',
    '^expo-local-authentication$': '<rootDir>/__tests__/mocks/localAuthentication.js',
    '^expo-haptics$': '<rootDir>/__tests__/mocks/haptics.js',
    '^react-native$': '<rootDir>/__tests__/mocks/reactNative.js',
    '^react-native-reanimated$': '<rootDir>/__tests__/mocks/reanimated.js',
  },
  setupFiles: ['<rootDir>/jest.logic.globals.js'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.jest.js' }],
  },
};
