import jwt from 'jsonwebtoken';

const AUTH_HEADER = 'Authorization';

const readBearerToken = (headerValue) => {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const createJwtAuthMiddleware = (options) => {
  const { key, algorithms, issuer, audience, accessTokenBlacklistStore } =
    options;

  return async (req, res, next) => {
    const authorizationHeader = req.get(AUTH_HEADER);
    const token = readBearerToken(authorizationHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
      });
    }

    try {
      const payload = jwt.verify(token, key, {
        algorithms,
        issuer,
        audience,
      });

      if (payload.tokenType !== 'access') {
        return res.status(401).json({
          error: 'Invalid token type for this endpoint',
        });
      }

      if (accessTokenBlacklistStore) {
        const revoked = await accessTokenBlacklistStore.isBlacklisted(
          payload.jti
        );
        if (revoked) {
          return res.status(401).json({
            error: 'Token has been revoked',
          });
        }
      }

      req.user = {
        id: payload.sub,
        role: payload.role,
        username: payload.username,
      };

      return next();
    } catch (_error) {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }
  };
};
