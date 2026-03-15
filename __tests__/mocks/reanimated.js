module.exports = {
  __esModule: true,
  default: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    createAnimatedComponent: (component) => component,
  },
  FadeInUp: {},
  FadeOutUp: {},
  FadeInDown: {},
  FadeIn: {},
  FadeOut: {},
  useSharedValue: jest.fn((value) => ({ value })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withSequence: jest.fn((...values) => values[0]),
  withRepeat: jest.fn((value) => value),
};
