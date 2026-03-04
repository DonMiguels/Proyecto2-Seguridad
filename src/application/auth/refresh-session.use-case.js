import { InvalidRefreshTokenError } from '../../domain/auth/auth-errors.js';

export class RefreshSessionUseCase {
  constructor(tokenService, refreshTokenRepository) {
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async execute(input) {
    const { refreshToken } = input;

    if (!refreshToken) {
      throw new InvalidRefreshTokenError('refreshToken is required');
    }

    let payload;

    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (_error) {
      throw new InvalidRefreshTokenError('Invalid or expired refresh token');
    }

    const isActiveToken = await this.refreshTokenRepository.isTokenActive(
      refreshToken
    );

    if (!isActiveToken) {
      throw new InvalidRefreshTokenError('Refresh token has been revoked');
    }

    await this.refreshTokenRepository.revokeToken(refreshToken);

    const identity = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    const accessToken = this.tokenService.generateAccessToken(identity);
    const rotatedRefreshToken = this.tokenService.generateRefreshToken(identity);

    await this.refreshTokenRepository.storeToken({
      token: rotatedRefreshToken,
      userId: identity.id,
      expiresAt: this.tokenService.getTokenExpirationDate(rotatedRefreshToken),
    });

    return {
      accessToken,
      refreshToken: rotatedRefreshToken,
      tokenType: 'Bearer',
      user: identity,
    };
  }
}
