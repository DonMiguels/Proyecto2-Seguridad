import { createHash } from 'crypto';

const hashToken = (token) => {
  return createHash('sha256').update(token).digest('hex');
};

const QUERIES = {
  STORE: `
    INSERT INTO auth_refresh_tokens (token_hash, usuario_id, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `,
  FIND_ACTIVE: `
    SELECT * FROM auth_refresh_tokens
    WHERE token_hash = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    LIMIT 1
  `,
  REVOKE: `
    UPDATE auth_refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = $1
      AND revoked_at IS NULL
    RETURNING *
  `,
};

export class PostgresRefreshTokenRepository {
  constructor(databasePool) {
    this.databasePool = databasePool;
  }

  async storeToken(data, queryExecutor = this.databasePool) {
    const values = [hashToken(data.token), data.userId, data.expiresAt || null];
    const result = await queryExecutor.query(QUERIES.STORE, values);
    return result.rows[0];
  }

  async isTokenActive(token, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(QUERIES.FIND_ACTIVE, [
      hashToken(token),
    ]);

    return Boolean(result.rows[0]);
  }

  async revokeToken(token, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(QUERIES.REVOKE, [hashToken(token)]);
    return result.rows[0] || null;
  }
}
