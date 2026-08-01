import { describe, expect, it } from 'vitest';
import { keycloakConfigFromIssuer } from './keycloakAuth';

describe('keycloakConfigFromIssuer', () => {
  it('derives the Keycloak base URL and realm from the issuer', () => {
    expect(keycloakConfigFromIssuer(
      'https://identity.example.com/auth/realms/gh-clearing',
      'gh-clearing-web',
    )).toEqual({
      url: 'https://identity.example.com/auth',
      realm: 'gh-clearing',
      clientId: 'gh-clearing-web',
    });
  });

  it('rejects an issuer that does not identify a realm', () => {
    expect(() => keycloakConfigFromIssuer('https://identity.example.com', 'web'))
      .toThrow('must contain /realms/{realm}');
  });
});
