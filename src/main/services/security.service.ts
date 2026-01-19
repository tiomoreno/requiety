import { safeStorage } from 'electron';

export class SecurityService {
  /**
   * Encrypts a string using Electron's safeStorage.
   * @param text The plain text string to encrypt.
   * @returns The encrypted buffer converted to a Base64 string.
   */
  public static encrypt(text: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      // In a real app, you might want to handle this more gracefully,
      // maybe by preventing the feature or warning the user.
      // For now, we'll throw an error if encryption is not supported.
      throw new Error('Encryption is not available on this system.');
    }
    const buffer = safeStorage.encryptString(text);
    return buffer.toString('base64');
  }

  /**
   * Decrypts a Base64 encoded string using Electron's safeStorage.
   * @param encryptedBase64 The Base64 encoded encrypted string.
   * @returns The original plain text string.
   */
  public static decrypt(encryptedBase64: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system.');
    }
    if (!encryptedBase64) {
      return '';
    }
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  }
}
