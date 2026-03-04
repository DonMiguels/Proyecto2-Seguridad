import { describe, expect, it, vi } from 'vitest';
import { RefreshSessionUseCase } from '../../../src/application/auth/refresh-session.use-case.js';
import { InvalidRefreshTokenError } from '../../../src/domain/auth/auth-errors.js';

describe('RefreshSessionUseCase', () => {
  it('should fail when refresh token is missing', async () => {
    const tokenService = {
      verifyRefreshToken: vi.fn(),
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      getTokenExpirationDate: vi.fn(),
    };
    const refreshTokenRepository = {
      isTokenActive: vi.fn(),
      revokeToken: vi.fn(),
      storeToken: vi.fn(),
    };

    const useCase = new RefreshSessionUseCase(tokenService, refreshTokenRepository);

    await expect(useCase.execute({ refreshToken: '' })).rejects.toThrow(
      InvalidRefreshTokenError
    );
  });

  it('should rotate refresh token when refresh token is valid and active', async () => {
    const tokenService = {
      verifyRefreshToken: vi.fn().mockReturnValue({
        sub: 'user-1',
        role: 'MOSTRADOR',
        username: 'john',
        tokenType: 'refresh',
      }),
      generateAccessToken: vi.fn().mockReturnValue('new-access'),
      generateRefreshToken: vi.fn().mockReturnValue('new-refresh'),
      getTokenExpirationDate: vi.fn().mockReturnValue(new Date()),
    };
    const refreshTokenRepository = {
      isTokenActive: vi.fn().mockResolvedValue(true),
      revokeToken: vi.fn().mockResolvedValue({}),
      storeToken: vi.fn().mockResolvedValue({}),
    };

    const useCase = new RefreshSessionUseCase(tokenService, refreshTokenRepository);

    const result = await useCase.execute({ refreshToken: 'old-refresh' });

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith('old-refresh');
    expect(refreshTokenRepository.storeToken).toHaveBeenCalled();
  });

  it('should fail when refresh token is revoked', async () => {
    const tokenService = {
      verifyRefreshToken: vi.fn().mockReturnValue({
        sub: 'user-1',
        role: 'MOSTRADOR',
        username: 'john',
        tokenType: 'refresh',
      }),
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      getTokenExpirationDate: vi.fn(),
    };
    const refreshTokenRepository = {
      isTokenActive: vi.fn().mockResolvedValue(false),
      revokeToken: vi.fn(),
      storeToken: vi.fn(),
    };

    const useCase = new RefreshSessionUseCase(tokenService, refreshTokenRepository);

    await expect(
      useCase.execute({ refreshToken: 'revoked-refresh' })
    ).rejects.toThrow(InvalidRefreshTokenError);
  });
});
