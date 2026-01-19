import { describe, it, expect } from 'vitest';
import { mergeAutoHeaders, AUTO_HEADERS } from './header-utils';
import { RequestHeader } from '@shared/types';

describe('header-utils', () => {
  describe('mergeAutoHeaders', () => {
    it('should add auto headers to empty list', () => {
      const result = mergeAutoHeaders([]);

      const autoHeaderNames = AUTO_HEADERS.map((h) => h.name);

      // Check that all auto headers are present
      expect(result.length).toBe(AUTO_HEADERS.length);
      result.forEach((h) => {
        expect(autoHeaderNames).toContain(h.name);
        expect(h.isAuto).toBe(true);
      });
    });

    it('should preserve existing manual details', () => {
      const manualHeaders: RequestHeader[] = [
        { name: 'Content-Type', value: 'application/json', enabled: true },
      ];
      const result = mergeAutoHeaders(manualHeaders);

      const contentType = result.find((h) => h.name === 'Content-Type');
      expect(contentType).toBeDefined();
      expect(contentType?.value).toBe('application/json');
      expect(result.length).toBe(manualHeaders.length + AUTO_HEADERS.length);
    });

    it('should preserve enabled state of existing auto headers (except Cache-Control)', () => {
      const existingHeaders: RequestHeader[] = [
        { name: 'User-Agent', value: 'Requiety/1.0.0', enabled: false, isAuto: true }, // User disabled it
      ];

      const result = mergeAutoHeaders(existingHeaders);
      const userAgent = result.find((h) => h.name === 'User-Agent');

      expect(userAgent?.enabled).toBe(false);
    });

    it('should enforce Cache-Control enabled state', () => {
      const existingHeaders: RequestHeader[] = [
        { name: 'Cache-Control', value: 'no-cache', enabled: false, isAuto: true }, // User tried to disable it
      ];

      const result = mergeAutoHeaders(existingHeaders);
      const cacheControl = result.find((h) => h.name === 'Cache-Control');

      expect(cacheControl?.enabled).toBe(true);
    });

    it('should preserve user descriptions', () => {
      const existingHeaders: RequestHeader[] = [
        {
          name: 'User-Agent',
          value: 'Requiety/1.0.0',
          enabled: true,
          isAuto: true,
          description: 'My Description',
        },
      ];

      const result = mergeAutoHeaders(existingHeaders);
      const userAgent = result.find((h) => h.name === 'User-Agent');

      expect(userAgent?.description).toBe('My Description');
    });
  });
});
