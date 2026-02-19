/**
 * Encrypted AsyncStorage wrapper for sensitive health data.
 *
 * Uses AES-256-GCM via Web Crypto API with a device-specific key
 * stored in SecureStore (Keychain/Keystore). Provides authenticated
 * encryption ensuring both confidentiality and integrity.
 *
 * Migrates legacy XOR-encrypted data to AES transparently on read.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

declare const __DEV__: boolean;

const ENCRYPTION_KEY_ID: string = 'vibefit_storage_enc_key';
const KEY_LENGTH: number = 64;
const IV_LENGTH: number = 12; // 96 bits — recommended for AES-GCM
const AES_PREFIX: string = 'aes:';
const AES2_PREFIX: string = 'aes2:';
const LEGACY_XOR_PREFIX: string = 'enc:';

let _cachedKey: string | null = null;
let _cachedCryptoKey: CryptoKey | null = null;

// ─── Key management ───────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random key using Web Crypto.
 */
function generateKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}

/**
 * Get or create the device-specific encryption key.
 * Stored in SecureStore (hardware-backed Keychain / Keystore).
 */
async function getEncryptionKey(): Promise<string | null> {
  if (_cachedKey) return _cachedKey;

  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    if (!key) {
      key = generateKey(KEY_LENGTH);
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    _cachedKey = key;
    return key;
  } catch (error: unknown) {
    if (__DEV__) console.error('[EncryptedStorage] Key error:', (error as Error).message);
    return null;
  }
}

/**
 * Derive an AES-256-GCM CryptoKey from the raw key string via PBKDF2.
 * Falls back to legacy SHA-256 derivation if PBKDF2 is not available.
 */
async function getAESKey(): Promise<CryptoKey | null> {
  if (_cachedCryptoKey) return _cachedCryptoKey;

  const rawKey = await getEncryptionKey();
  if (!rawKey) return null;

  try {
    const encoder = new TextEncoder();

    // Import raw key material for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(rawKey),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    // Use a fixed salt derived from app identifier (not secret, just uniqueness)
    const salt = encoder.encode('vibefit-storage-v2-salt');

    // Derive AES-256-GCM key using PBKDF2 with 100,000 iterations
    const cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    _cachedCryptoKey = cryptoKey;
    return cryptoKey;
  } catch (error: unknown) {
    // Fallback to legacy SHA-256 derivation if PBKDF2 not available
    try {
      const encoder = new TextEncoder();
      const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyHash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt'],
      );
      _cachedCryptoKey = cryptoKey;
      return cryptoKey;
    } catch (fallbackError: unknown) {
      if (__DEV__) console.error('[EncryptedStorage] Key derivation error:', (fallbackError as Error).message);
      return null;
    }
  }
}

/**
 * Derive the legacy AES key using single SHA-256 pass (for decrypting old 'aes:' data).
 */
async function getLegacyAESKey(): Promise<CryptoKey | null> {
  const rawKey = await getEncryptionKey();
  if (!rawKey) return null;

  try {
    const encoder = new TextEncoder();
    const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    return await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

// ─── AES-256-GCM encrypt / decrypt ───────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64 of: IV (12 bytes) || ciphertext || auth-tag (16 bytes).
 */
async function aesEncrypt(plaintext: string): Promise<string | null> {
  const key = await getAESKey();
  if (!key) return null;

  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext),
    );

    // Combine IV + ciphertext+tag into one buffer
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error: unknown) {
    if (__DEV__) console.error('[EncryptedStorage] Encrypt error:', (error as Error).message);
    return null;
  }
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input is base64 of: IV (12 bytes) || ciphertext || auth-tag (16 bytes).
 */
async function aesDecrypt(encoded: string): Promise<string | null> {
  const key = await getAESKey();
  if (!key) return null;

  try {
    const binary = atob(encoded);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error: unknown) {
    if (__DEV__) console.error('[EncryptedStorage] Decrypt error:', (error as Error).message);
    return null;
  }
}

// ─── Legacy XOR helpers (read-only, kept for migration) ──────────────────────

function xorCipher(text: string, key: string): string {
  if (!key) return text;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

function legacyFromBase64(b64: string): string {
  try {
    return decodeURIComponent(
      atob(b64).split('').map((c: string) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''),
    );
  } catch {
    return decodeURIComponent(escape(atob(b64)));
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypt and store data in AsyncStorage.
 * Uses AES2 prefix (PBKDF2-derived key) for new encryptions.
 */
async function setEncryptedItem(key: string, value: unknown): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(value);
    const encrypted = await aesEncrypt(jsonStr);

    if (encrypted) {
      await AsyncStorage.setItem(key, AES2_PREFIX + encrypted);
    } else {
      // Fallback to plain storage if Web Crypto unavailable
      await AsyncStorage.setItem(key, jsonStr);
    }
    return true;
  } catch (error: unknown) {
    if (__DEV__) console.error('[EncryptedStorage] Set error:', (error as Error).message);
    return false;
  }
}

/**
 * Decrypt AES-256-GCM ciphertext using a specific CryptoKey.
 * Input is base64 of: IV (12 bytes) || ciphertext || auth-tag (16 bytes).
 */
async function aesDecryptWithKey(encoded: string, key: CryptoKey): Promise<string | null> {
  try {
    const binary = atob(encoded);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * Retrieve and decrypt data from AsyncStorage.
 * Handles AES2 (PBKDF2, current), AES (legacy SHA-256), legacy XOR, and plaintext formats.
 */
async function getEncryptedItem<T>(key: string, fallback: T = null as T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;

    // Current format: AES-256-GCM with PBKDF2-derived key
    if (raw.startsWith(AES2_PREFIX)) {
      const decrypted = await aesDecrypt(raw.slice(AES2_PREFIX.length));
      if (!decrypted) return fallback;
      return JSON.parse(decrypted) as T;
    }

    // Legacy format: AES-256-GCM with SHA-256-derived key
    if (raw.startsWith(AES_PREFIX)) {
      const legacyKey = await getLegacyAESKey();
      if (!legacyKey) return fallback;

      const decrypted = await aesDecryptWithKey(raw.slice(AES_PREFIX.length), legacyKey);
      if (!decrypted) return fallback;
      const parsed = JSON.parse(decrypted) as T;

      // Background migration: re-encrypt with PBKDF2-derived key (aes2: prefix)
      setEncryptedItem(key, parsed).catch(() => {});
      return parsed;
    }

    // Legacy format: XOR cipher — decrypt then silently re-encrypt with AES2
    if (raw.startsWith(LEGACY_XOR_PREFIX)) {
      const encKey = await getEncryptionKey();
      if (!encKey) return fallback;

      const encrypted = raw.slice(LEGACY_XOR_PREFIX.length);
      const decrypted = xorCipher(legacyFromBase64(encrypted), encKey);
      const parsed = JSON.parse(decrypted) as T;

      // Background migration: re-encrypt with PBKDF2-derived key
      setEncryptedItem(key, parsed).catch(() => {});
      return parsed;
    }

    // Plaintext fallback (unencrypted legacy data)
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  } catch (error: unknown) {
    if (__DEV__) console.error('[EncryptedStorage] Get error:', (error as Error).message);
    return fallback;
  }
}

/**
 * Remove an encrypted item from AsyncStorage.
 */
async function removeEncryptedItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export { setEncryptedItem, getEncryptedItem, removeEncryptedItem };
