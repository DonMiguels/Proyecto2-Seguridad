import { generateKeyPairSync } from 'crypto';
import { describe, expect, it } from 'vitest';
import { JwtKeysetService } from '../../../src/shared/security/jwt-keyset.service.js';

describe('JwtKeysetService', () => {
  it('should build HS256 signing and verification config', () => {
    const keyset = new JwtKeysetService({
      algorithm: 'HS256',
      secret: 'test-secret',
    });

    expect(keyset.getSigningConfig().algorithm).toBe('HS256');
    expect(keyset.getVerificationConfig().algorithms).toEqual(['HS256']);
    expect(keyset.hasPublicJwks()).toBe(false);
  });

  it('should build RS256 JWKS from RSA key pair', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const keyset = new JwtKeysetService({
      algorithm: 'RS256',
      privateKey,
      publicKey,
    });

    const signing = keyset.getSigningConfig();
    const jwks = keyset.getJwks();

    expect(signing.algorithm).toBe('RS256');
    expect(signing.keyid).toBeDefined();
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].alg).toBe('RS256');
  });
});
