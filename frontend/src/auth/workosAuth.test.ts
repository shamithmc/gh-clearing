import { describe, expect, it } from 'vitest';
import { normalizeApiHostname } from './workosAuth';

describe('normalizeApiHostname', () => {
  it('accepts the default and custom WorkOS authentication hosts', () => {
    expect(normalizeApiHostname('api.workos.com')).toBe('api.workos.com');
    expect(normalizeApiHostname('https://auth.example.com')).toBe('auth.example.com');
  });

  it('rejects values containing URL paths', () => {
    expect(() => normalizeApiHostname('https://api.workos.com/oauth')).toThrow('must not contain a path');
  });
});
