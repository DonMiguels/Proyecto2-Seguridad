import {
  InvalidCredentialsError,
  IdentityProviderError,
} from '../../domain/auth/auth-errors.js';

export class AuthenticateUserUseCase {
  constructor(authRepository, tokenService, refreshTokenRepository) {
    this.authRepository = authRepository;
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async execute(input) {
    const { username, password } = input;

    if (!username || !password) {
      throw new InvalidCredentialsError('username and password are required');
    }

    let identity;

    try {
      identity = await this.authRepository.authenticate({ username, password });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw error;
      }

      throw new IdentityProviderError(
        `Identity provider authentication failed: ${error.message}`
      );
    }

    const accessToken = this.tokenService.generateAccessToken(identity);
    const refreshToken = this.tokenService.generateRefreshToken(identity);

    await this.refreshTokenRepository.storeToken({
      token: refreshToken,
      userId: identity.id,
      expiresAt: this.tokenService.getTokenExpirationDate(refreshToken),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: identity.id,
        username: identity.username,
        role: identity.role,
      },
    };
  }
}
