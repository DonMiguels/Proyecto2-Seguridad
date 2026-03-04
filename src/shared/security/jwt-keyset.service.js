import { createHash, createPublicKey } from 'crypto';

const normalizeAlgorithm = (algorithm) => {
  return (algorithm || 'HS256').toUpperCase();
};

const isAsymmetricAlgorithm = (algorithm) => {
  return algorithm.startsWith('RS');
};

const buildKeyId = (publicKeyPem) => {
  return createHash('sha256').update(publicKeyPem).digest('base64url').slice(0, 24);
};

export class JwtKeysetService {
  constructor(options) {
    this.algorithm = normalizeAlgorithm(options.algorithm);
    this.secret = options.secret;
    this.privateKey = options.privateKey;
    this.publicKey = options.publicKey;

    this.validate();
    this.initializeJwks();
  }

  validate() {
    if (isAsymmetricAlgorithm(this.algorithm)) {
      if (!this.privateKey || !this.publicKey) {
        throw new Error(
          `Algorithm ${this.algorithm} requires JWT_PRIVATE_KEY and JWT_PUBLIC_KEY`
        );
      }

      return;
    }

    if (!this.secret) {
      throw new Error('JWT secret is required for symmetric algorithms');
    }
  }

  initializeJwks() {
    if (!isAsymmetricAlgorithm(this.algorithm)) {
      this.kid = null;
      this.jwks = { keys: [] };
      return;
    }

    this.kid = buildKeyId(this.publicKey);
    const publicKeyObject = createPublicKey(this.publicKey);
    const jwk = publicKeyObject.export({ format: 'jwk' });

    this.jwks = {
      keys: [
        {
          ...jwk,
          use: 'sig',
          alg: this.algorithm,
          kid: this.kid,
        },
      ],
    };
  }

  getSigningConfig() {
    if (isAsymmetricAlgorithm(this.algorithm)) {
      return {
        algorithm: this.algorithm,
        key: this.privateKey,
        keyid: this.kid,
      };
    }

    return {
      algorithm: this.algorithm,
      key: this.secret,
    };
  }

  getVerificationConfig() {
    if (isAsymmetricAlgorithm(this.algorithm)) {
      return {
        algorithms: [this.algorithm],
        key: this.publicKey,
      };
    }

    return {
      algorithms: [this.algorithm],
      key: this.secret,
    };
  }

  getJwks() {
    return this.jwks;
  }

  hasPublicJwks() {
    return this.jwks.keys.length > 0;
  }
}
