import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export class JwtTokenService {
  constructor(options) {
    this.jwtKeysetService = options.jwtKeysetService;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.accessTokenExpiresIn = options.accessTokenExpiresIn || '1h';
    this.refreshTokenExpiresIn = options.refreshTokenExpiresIn || '7d';
  }

  generateAccessToken(user) {
    const signingConfig = this.jwtKeysetService.getSigningConfig();

    return jwt.sign(
      {
        tokenType: 'access',
        jti: randomUUID(),
        role: user.role,
        username: user.username,
      },
      signingConfig.key,
      {
        algorithm: signingConfig.algorithm,
        keyid: signingConfig.keyid,
        issuer: this.issuer,
        audience: this.audience,
        subject: user.id,
        expiresIn: this.accessTokenExpiresIn,
      }
    );
  }

  generateRefreshToken(user) {
    const signingConfig = this.jwtKeysetService.getSigningConfig();

    return jwt.sign(
      {
        tokenType: 'refresh',
        jti: randomUUID(),
        role: user.role,
        username: user.username,
      },
      signingConfig.key,
      {
        algorithm: signingConfig.algorithm,
        keyid: signingConfig.keyid,
        issuer: this.issuer,
        audience: this.audience,
        subject: user.id,
        expiresIn: this.refreshTokenExpiresIn,
      }
    );
  }

  verifyRefreshToken(token) {
    const verificationConfig = this.jwtKeysetService.getVerificationConfig();

    const payload = jwt.verify(token, verificationConfig.key, {
      algorithms: verificationConfig.algorithms,
      issuer: this.issuer,
      audience: this.audience,
    });

    if (payload.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  getTokenExpirationDate(token) {
    const decoded = this.decodeToken(token);

    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  decodeToken(token) {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    return decoded;
  }
}
