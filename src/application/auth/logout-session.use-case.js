import { InvalidRefreshTokenError } from '../../domain/auth/auth-errors.js';

export class LogoutSessionUseCase {
  constructor(refreshTokenRepository, tokenService, accessTokenBlacklistStore) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.tokenService = tokenService;
    this.accessTokenBlacklistStore = accessTokenBlacklistStore;
  }

  async execute(input) {
    const { refreshToken, accessToken } = input;

    if (!refreshToken) {
      throw new InvalidRefreshTokenError('refreshToken is required');
    }

    await this.refreshTokenRepository.revokeToken(refreshToken);

    const decodedAccessToken =
      accessToken && this.tokenService
        ? this.tokenService.decodeToken(accessToken)
        : null;
    if (
      decodedAccessToken?.jti &&
      decodedAccessToken?.exp &&
      this.accessTokenBlacklistStore
    ) {
      const ttlSeconds = Math.max(
        1,
        Math.floor(decodedAccessToken.exp - Date.now() / 1000)
      );

      await this.accessTokenBlacklistStore.blacklist(
        decodedAccessToken.jti,
        ttlSeconds
      );
    }

    return {
      message: 'Session closed successfully',
    };
  }
}
