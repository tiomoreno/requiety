// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { generateId, getCurrentTimestamp } from './id-generator';
import { ID_PREFIXES } from '@shared/constants';

vi.mock('uuid', () => ({
  v4: () => '1234',
}));

describe('ID Generator', () => {
  it('should generate workspace id', () => {
    expect(generateId('Workspace')).toBe(`${ID_PREFIXES.WORKSPACE}1234`);
  });

  it('should generate folder id', () => {
    expect(generateId('Folder')).toBe(`${ID_PREFIXES.FOLDER}1234`);
  });

  it('should generate request id', () => {
    expect(generateId('Request')).toBe(`${ID_PREFIXES.REQUEST}1234`);
  });

  it('should generate response id', () => {
    expect(generateId('Response')).toBe(`${ID_PREFIXES.RESPONSE}1234`);
  });

  it('should generate environment id', () => {
    expect(generateId('Environment')).toBe(`${ID_PREFIXES.ENVIRONMENT}1234`);
  });

  it('should generate variable id', () => {
    expect(generateId('Variable')).toBe(`${ID_PREFIXES.VARIABLE}1234`);
  });

  it('should return fixed settings id', () => {
    expect(generateId('Settings')).toBe('settings');
  });

  it('should throw on unknown type', () => {
    expect(() => generateId('Unknown' as any)).toThrow('Unknown document type: Unknown');
  });

  it('getCurrentTimestamp should return number', () => {
    expect(typeof getCurrentTimestamp()).toBe('number');
  });
});
