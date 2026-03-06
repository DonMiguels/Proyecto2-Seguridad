export const REFRESH_TOKEN_QUERIES = {
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
