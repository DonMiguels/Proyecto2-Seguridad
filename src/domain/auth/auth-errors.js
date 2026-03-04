export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidCredentialsError extends AuthenticationError {}

export class IdentityProviderError extends AuthenticationError {}

export class InvalidRefreshTokenError extends AuthenticationError {}
