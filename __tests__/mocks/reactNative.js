module.exports = {
  Platform: {
    OS: 'ios',
    select: (options) => options?.ios ?? options?.default ?? options,
  },
  Alert: {
    alert: jest.fn(),
  },
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles) => styles,
  },
};
