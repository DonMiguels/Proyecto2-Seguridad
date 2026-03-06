import { createHash } from 'crypto';
import { REFRESH_TOKEN_QUERIES } from './queries/refresh-token.queries.js';

const hashToken = (token) => {
  return createHash('sha256').update(token).digest('hex');
};

export class PostgresRefreshTokenRepository {
  constructor(databasePool) {
    this.databasePool = databasePool;
  }

  async storeToken(data, queryExecutor = this.databasePool) {
    const values = [hashToken(data.token), data.userId, data.expiresAt || null];
    const result = await queryExecutor.query(
      REFRESH_TOKEN_QUERIES.STORE,
      values
    );
    return result.rows[0];
  }

  async isTokenActive(token, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(
      REFRESH_TOKEN_QUERIES.FIND_ACTIVE,
      [hashToken(token)]
    );

    return Boolean(result.rows[0]);
  }

  async revokeToken(token, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(REFRESH_TOKEN_QUERIES.REVOKE, [
      hashToken(token),
    ]);
    return result.rows[0] || null;
  }
}
