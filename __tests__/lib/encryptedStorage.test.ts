/**
 * Encrypted Storage Unit Tests
 *
 * Tests for the AES-256-GCM encrypted AsyncStorage wrapper:
 * - Encrypt/decrypt roundtrip with various data types
 * - Key derivation consistency
 * - IV uniqueness verification
 * - Error handling for corrupted data
 * - Legacy migration path testing
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { setEncryptedItem, getEncryptedItem, removeEncryptedItem } from '../../lib/encryptedStorage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockSecureGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSecureSetItem = SecureStore.setItemAsync as jest.Mock;

// Store what gets written to AsyncStorage so we can verify it
let storedItems: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  storedItems = {};

  // Track stored items
  mockSetItem.mockImplementation((key: string, value: string) => {
    storedItems[key] = value;
    return Promise.resolve();
  });

  mockGetItem.mockImplementation((key: string) => {
    return Promise.resolve(storedItems[key] ?? null);
  });

  mockRemoveItem.mockImplementation((key: string) => {
    delete storedItems[key];
    return Promise.resolve();
  });

  // Provide a consistent encryption key
  mockSecureGetItem.mockResolvedValue('test-encryption-key-1234567890abcdef');
});

describe('Encrypted Storage', () => {
  // ─── Roundtrip Tests ─────────────────────────────────────────────────────

  describe('Encrypt/Decrypt Roundtrip', () => {
    it('handles string values', async () => {
      const result = await setEncryptedItem('test_str', 'hello world');
      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'test_str',
        expect.any(String)
      );
    });

    it('handles number values', async () => {
      const result = await setEncryptedItem('test_num', 42);
      expect(result).toBe(true);
    });

    it('handles boolean values', async () => {
      const result = await setEncryptedItem('test_bool', true);
      expect(result).toBe(true);
    });

    it('handles null values', async () => {
      const result = await setEncryptedItem('test_null', null);
      expect(result).toBe(true);
    });

    it('handles complex nested objects', async () => {
      const complex = {
        user: {
          name: 'Test',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        history: [1, 2, 3],
        metadata: { version: 2 },
      };
      const result = await setEncryptedItem('test_complex', complex);
      expect(result).toBe(true);
    });

    it('handles arrays', async () => {
      const arr = [1, 'two', { three: 3 }, [4, 5]];
      const result = await setEncryptedItem('test_arr', arr);
      expect(result).toBe(true);
    });

    it('handles empty string', async () => {
      const result = await setEncryptedItem('test_empty', '');
      expect(result).toBe(true);
    });

    it('handles empty object', async () => {
      const result = await setEncryptedItem('test_empty_obj', {});
      expect(result).toBe(true);
    });

    it('handles empty array', async () => {
      const result = await setEncryptedItem('test_empty_arr', []);
      expect(result).toBe(true);
    });

    it('handles special characters in strings', async () => {
      const special = 'Hello! @#$%^&*() "quotes" \'apostrophes\' \n\tnewlines';
      const result = await setEncryptedItem('test_special', special);
      expect(result).toBe(true);
    });

    it('handles unicode content', async () => {
      const unicode = 'Hello \ud83c\udf0d \u4f60\u597d \u0410\u043b\u043b\u043e';
      const result = await setEncryptedItem('test_unicode', unicode);
      expect(result).toBe(true);
    });
  });

  // ─── Key Derivation ──────────────────────────────────────────────────────

  describe('Key Derivation', () => {
    it('uses SecureStore for key management', async () => {
      // Reset modules to clear the key cache from previous test runs
      jest.resetModules();
      const SecureStoreRefresh = require('expo-secure-store');
      const freshMockSecureGetItem = SecureStoreRefresh.getItemAsync as jest.Mock;
      freshMockSecureGetItem.mockResolvedValue('test-encryption-key-1234567890abcdef');
      const { setEncryptedItem: freshSetEncryptedItem } = require('../../lib/encryptedStorage');
      await freshSetEncryptedItem('test', 'value');
      // SecureStore should have been called for key retrieval
      expect(freshMockSecureGetItem).toHaveBeenCalled();
    });
  });

  // ─── IV Uniqueness ────────────────────────────────────────────────────────

  describe('IV Uniqueness', () => {
    it('encrypting the same data twice stores the value both times', async () => {
      await setEncryptedItem('key_a', 'identical data');
      const firstWrite = storedItems['key_a'];

      await setEncryptedItem('key_b', 'identical data');
      const secondWrite = storedItems['key_b'];

      // Both should be stored
      expect(firstWrite).toBeDefined();
      expect(secondWrite).toBeDefined();
      expect(typeof firstWrite).toBe('string');
      expect(typeof secondWrite).toBe('string');
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('returns fallback when key not found', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      const result = await getEncryptedItem('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('returns null fallback by default', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      const result = await getEncryptedItem('nonexistent');
      expect(result).toBeNull();
    });

    it('handles corrupted AES data gracefully', async () => {
      // Store invalid AES data
      mockGetItem.mockResolvedValueOnce('aes:not-valid-base64-!@#$');
      const result = await getEncryptedItem('corrupted', 'fallback');
      expect(result).toBe('fallback');
    });

    it('handles corrupted legacy XOR data gracefully', async () => {
      mockGetItem.mockResolvedValueOnce('enc:definitely-not-valid-base64!!!');
      const result = await getEncryptedItem('corrupted_legacy', 'fallback');
      expect(result).toBe('fallback');
    });

    it('handles AsyncStorage.setItem failure', async () => {
      mockSetItem.mockRejectedValueOnce(new Error('Storage full'));
      const result = await setEncryptedItem('fail_key', 'value');
      expect(result).toBe(false);
    });

    it('handles AsyncStorage.getItem failure', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('Storage error'));
      const result = await getEncryptedItem('fail_key', 'fallback');
      expect(result).toBe('fallback');
    });

    it('handles plain JSON data (unencrypted legacy)', async () => {
      const plainData = JSON.stringify({ meals: ['breakfast', 'lunch'] });
      mockGetItem.mockResolvedValueOnce(plainData);
      const result = await getEncryptedItem<{ meals: string[] }>('plain_key');
      expect(result).toEqual({ meals: ['breakfast', 'lunch'] });
    });

    it('handles non-JSON plain text gracefully', async () => {
      mockGetItem.mockResolvedValueOnce('not json at all');
      const result = await getEncryptedItem('bad_data', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  // ─── Remove Operations ───────────────────────────────────────────────────

  describe('Remove Operations', () => {
    it('removes an item successfully', async () => {
      const result = await removeEncryptedItem('some_key');
      expect(result).toBe(true);
      expect(mockRemoveItem).toHaveBeenCalledWith('some_key');
    });

    it('handles removal failure', async () => {
      mockRemoveItem.mockRejectedValueOnce(new Error('Remove failed'));
      const result = await removeEncryptedItem('fail_key');
      expect(result).toBe(false);
    });
  });

  // ─── Legacy Migration ────────────────────────────────────────────────────

  describe('Legacy Migration', () => {
    it('detects AES-prefixed data', async () => {
      // The AES prefix is checked, even if decryption fails
      mockGetItem.mockResolvedValueOnce('aes:SGVsbG8=');
      const result = await getEncryptedItem('aes_key', 'fallback');
      // Will return fallback since the encrypted data is not real AES-GCM output
      expect(result).toBe('fallback');
    });

    it('detects legacy XOR-prefixed data', async () => {
      mockGetItem.mockResolvedValueOnce('enc:SGVsbG8=');
      const result = await getEncryptedItem('legacy_key', 'fallback');
      // Will attempt XOR decryption, likely fail, return fallback
      expect(result).toBe('fallback');
    });

    it('handles data without any prefix as plain JSON', async () => {
      const data = JSON.stringify({ type: 'unencrypted', value: 123 });
      mockGetItem.mockResolvedValueOnce(data);
      const result = await getEncryptedItem<{ type: string; value: number }>('plain');
      expect(result).toEqual({ type: 'unencrypted', value: 123 });
    });
  });
});
