module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  wrap: jest.fn((component) => component),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
};
