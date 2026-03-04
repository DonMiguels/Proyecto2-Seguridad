import {
  IdentityProviderError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../../domain/auth/auth-errors.js';
import logger from '../../../utils/logger.js';

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

const mapErrorToHttpResponse = (error) => {
  if (error instanceof InvalidCredentialsError) {
    return { statusCode: 401, payload: { error: error.message } };
  }

  if (error instanceof IdentityProviderError) {
    return { statusCode: 503, payload: { error: 'Identity provider unavailable' } };
  }

  if (error instanceof InvalidRefreshTokenError) {
    return { statusCode: 401, payload: { error: error.message } };
  }

  return {
    statusCode: 500,
    payload: { error: 'Internal server error' },
  };
};

export class AuthController {
  constructor({
    authenticateUserUseCase,
    refreshSessionUseCase,
    logoutSessionUseCase,
  }) {
    this.authenticateUserUseCase = authenticateUserUseCase;
    this.refreshSessionUseCase = refreshSessionUseCase;
    this.logoutSessionUseCase = logoutSessionUseCase;
  }

  login = async (req, res) => {
    try {
      const authResult = await this.authenticateUserUseCase.execute({
        username: req.body.username,
        password: req.body.password,
      });

      return res.status(200).json(authResult);
    } catch (error) {
      logger.error('Error authenticating user:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };

  refresh = async (req, res) => {
    try {
      const refreshResult = await this.refreshSessionUseCase.execute({
        refreshToken: req.body.refreshToken,
      });

      return res.status(200).json(refreshResult);
    } catch (error) {
      logger.error('Error refreshing session:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };

  logout = async (req, res) => {
    try {
      const accessToken = readBearerToken(req.get('Authorization'));

      const logoutResult = await this.logoutSessionUseCase.execute({
        refreshToken: req.body.refreshToken,
        accessToken,
      });

      return res.status(200).json(logoutResult);
    } catch (error) {
      logger.error('Error closing session:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };
}
