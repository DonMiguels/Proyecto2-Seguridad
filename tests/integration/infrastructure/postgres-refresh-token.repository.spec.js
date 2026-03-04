import { beforeEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresRefreshTokenRepository } from '../../../src/infrastructure/database/postgres/refresh-token.repository.js';

describe('PostgresRefreshTokenRepository integration', () => {
  let repository;

  beforeEach(async () => {
    const db = newDb();
    db.public.none(`
      CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
        id SERIAL PRIMARY KEY,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        usuario_id VARCHAR(100) NOT NULL,
        revoked_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    repository = new PostgresRefreshTokenRepository(pool);
  });

  it('should store, validate and revoke a refresh token', async () => {
    await repository.storeToken({
      token: 'refresh-token-value',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const isActiveBefore = await repository.isTokenActive('refresh-token-value');
    expect(isActiveBefore).toBe(true);

    await repository.revokeToken('refresh-token-value');

    const isActiveAfter = await repository.isTokenActive('refresh-token-value');
    expect(isActiveAfter).toBe(false);
  });
});
