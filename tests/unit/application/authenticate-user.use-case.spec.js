import { describe, expect, it, vi } from 'vitest';
import { AuthenticateUserUseCase } from '../../../src/application/auth/authenticate-user.use-case.js';
import {
  IdentityProviderError,
  InvalidCredentialsError,
} from '../../../src/domain/auth/auth-errors.js';

describe('AuthenticateUserUseCase', () => {
  it('should fail when username or password is missing', async () => {
    const authRepository = { authenticate: vi.fn() };
    const tokenService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      getTokenExpirationDate: vi.fn(),
    };
    const refreshTokenRepository = { storeToken: vi.fn() };
    const useCase = new AuthenticateUserUseCase(
      authRepository,
      tokenService,
      refreshTokenRepository
    );

    await expect(
      useCase.execute({ username: '', password: '' })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('should generate token for valid credentials', async () => {
    const authRepository = {
      authenticate: vi.fn().mockResolvedValue({
        id: 'uid=user,dc=example,dc=org',
        username: 'user',
        role: 'MOSTRADOR',
      }),
    };
    const tokenService = {
      generateAccessToken: vi.fn().mockReturnValue('jwt-token'),
      generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
      getTokenExpirationDate: vi.fn().mockReturnValue(new Date()),
    };
    const refreshTokenRepository = {
      storeToken: vi.fn(),
    };
    const useCase = new AuthenticateUserUseCase(
      authRepository,
      tokenService,
      refreshTokenRepository
    );

    const result = await useCase.execute({
      username: 'user',
      password: 'password',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.role).toBe('MOSTRADOR');
    expect(refreshTokenRepository.storeToken).toHaveBeenCalled();
  });

  it('should map infrastructure failures to identity provider error', async () => {
    const authRepository = {
      authenticate: vi.fn().mockRejectedValue(new Error('ldap unavailable')),
    };
    const tokenService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      getTokenExpirationDate: vi.fn(),
    };
    const refreshTokenRepository = { storeToken: vi.fn() };
    const useCase = new AuthenticateUserUseCase(
      authRepository,
      tokenService,
      refreshTokenRepository
    );

    await expect(
      useCase.execute({ username: 'user', password: 'password' })
    ).rejects.toThrow(IdentityProviderError);
  });
});
