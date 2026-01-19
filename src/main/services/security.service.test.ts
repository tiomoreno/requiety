import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityService } from './security.service';
import { safeStorage } from 'electron';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

describe('SecurityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt string and return base64', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      const fakeBuffer = Buffer.from('encrypted_data');
      vi.mocked(safeStorage.encryptString).mockReturnValue(fakeBuffer);

      const result = SecurityService.encrypt('secret');

      expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(safeStorage.encryptString).toHaveBeenCalledWith('secret');
      expect(result).toBe(fakeBuffer.toString('base64'));
    });

    it('should throw error if encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      expect(() => SecurityService.encrypt('secret')).toThrow('Encryption is not available');
    });
  });

  describe('decrypt', () => {
    it('should decrypt base64 string', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      vi.mocked(safeStorage.decryptString).mockReturnValue('secret');
      const encryptedBase64 = Buffer.from('encrypted_data').toString('base64');

      const result = SecurityService.decrypt(encryptedBase64);

      expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
      // Verify called with buffer corresponding to base64
      expect(safeStorage.decryptString).toHaveBeenCalledWith(expect.any(Buffer));
      expect(result).toBe('secret');
    });

    it('should return empty string if input is empty', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);

      const result = SecurityService.decrypt('');

      expect(result).toBe('');
      expect(safeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should throw error if encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      expect(() => SecurityService.decrypt('some_base64')).toThrow('Encryption is not available');
    });
  });
});
