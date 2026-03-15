let counter = 0;

module.exports = {
  randomUUID: jest.fn(() => `mock-uuid-${++counter}-${Date.now()}`),
  digestStringAsync: jest.fn(async (_algorithm, data) => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA512: 'SHA-512',
  },
};
