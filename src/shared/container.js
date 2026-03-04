import pool from '../config/database.js';
import { CreateShipmentUseCase } from '../application/shipment/create-shipment.use-case.js';
import { GetShipmentByTrackingUseCase } from '../application/shipment/get-shipment-by-tracking.use-case.js';
import { UpdateShipmentStatusUseCase } from '../application/shipment/update-shipment-status.use-case.js';
import { AuthenticateUserUseCase } from '../application/auth/authenticate-user.use-case.js';
import { RefreshSessionUseCase } from '../application/auth/refresh-session.use-case.js';
import { LogoutSessionUseCase } from '../application/auth/logout-session.use-case.js';
import { InMemoryAccessTokenBlacklistStore } from '../infrastructure/cache/in-memory/access-token-blacklist.store.js';
import { InMemoryIdempotencyKeyStore } from '../infrastructure/cache/in-memory/idempotency-key.store.js';
import { RedisAccessTokenBlacklistStore } from '../infrastructure/cache/redis/access-token-blacklist.store.js';
import { PostgresAuditRepository } from '../infrastructure/database/postgres/audit.repository.js';
import { PostgresRefreshTokenRepository } from '../infrastructure/database/postgres/refresh-token.repository.js';
import { PostgresShipmentRepository } from '../infrastructure/database/postgres/shipment.repository.js';
import { LdapAuthRepository } from '../infrastructure/identity/ldap/ldap-auth.repository.js';
import { getEnvironmentConfig } from './config/env.js';
import { createIdempotencyMiddleware } from '../presentation/http/middlewares/idempotency.middleware.js';
import { createJwtAuthMiddleware } from '../presentation/http/middlewares/auth.middleware.js';
import { createRoleMiddleware } from '../presentation/http/middlewares/role.middleware.js';
import { AuthController } from '../presentation/http/controllers/auth.controller.js';
import { JwksController } from '../presentation/http/controllers/jwks.controller.js';
import { JwtKeysetService } from './security/jwt-keyset.service.js';
import { ShipmentController } from '../presentation/http/controllers/shipment.controller.js';
import { JwtTokenService } from './security/jwt-token.service.js';

const parseRoleMapping = (mapping) => {
  try {
    return JSON.parse(mapping);
  } catch (_error) {
    return {};
  }
};

export const createContainer = () => {
  const env = getEnvironmentConfig();
  const shipmentRepository = new PostgresShipmentRepository(pool);
  const auditRepository = new PostgresAuditRepository(pool);
  const refreshTokenRepository = new PostgresRefreshTokenRepository(pool);
  const jwtKeysetService = new JwtKeysetService({
    algorithm: env.auth.jwtAlgorithm,
    secret: env.auth.jwtSecret,
    privateKey: env.auth.jwtPrivateKey,
    publicKey: env.auth.jwtPublicKey,
  });
  const ldapAuthRepository = new LdapAuthRepository({
    url: env.auth.ldapUrl,
    baseDn: env.auth.ldapBaseDn,
    userSearchAttribute: env.auth.ldapUserSearchAttribute,
    serviceAccountDn: env.auth.ldapServiceAccountDn,
    serviceAccountPassword: env.auth.ldapServiceAccountPassword,
    roleMapping: parseRoleMapping(env.auth.ldapRoleMapping),
  });
  const jwtTokenService = new JwtTokenService({
    jwtKeysetService,
    issuer: env.auth.jwtIssuer,
    audience: env.auth.jwtAudience,
    accessTokenExpiresIn: env.auth.jwtExpiresIn,
    refreshTokenExpiresIn: env.auth.jwtRefreshExpiresIn,
  });
  const idempotencyStore = new InMemoryIdempotencyKeyStore();
  const accessTokenBlacklistStore = env.redis?.url
    ? new RedisAccessTokenBlacklistStore({
        redisUrl: env.redis.url,
        defaultTtlSeconds: env.redis.accessTokenBlacklistTtlSeconds,
      })
    : new InMemoryAccessTokenBlacklistStore();

  const authenticateUserUseCase = new AuthenticateUserUseCase(
    ldapAuthRepository,
    jwtTokenService,
    refreshTokenRepository
  );
  const refreshSessionUseCase = new RefreshSessionUseCase(
    jwtTokenService,
    refreshTokenRepository
  );
  const logoutSessionUseCase = new LogoutSessionUseCase(
    refreshTokenRepository,
    jwtTokenService,
    accessTokenBlacklistStore
  );
  const createShipmentUseCase = new CreateShipmentUseCase(shipmentRepository);
  const getShipmentByTrackingUseCase = new GetShipmentByTrackingUseCase(
    shipmentRepository
  );
  const updateShipmentStatusUseCase = new UpdateShipmentStatusUseCase(
    shipmentRepository,
    auditRepository
  );

  const authController = new AuthController({
    authenticateUserUseCase,
    refreshSessionUseCase,
    logoutSessionUseCase,
  });
  const jwksController = new JwksController({
    jwtKeysetService,
  });

  const shipmentController = new ShipmentController({
    createShipmentUseCase,
    getShipmentByTrackingUseCase,
    updateShipmentStatusUseCase,
  });

  const idempotencyMiddleware = createIdempotencyMiddleware(idempotencyStore);
  const verificationConfig = jwtKeysetService.getVerificationConfig();
  const authMiddleware = createJwtAuthMiddleware({
    key: verificationConfig.key,
    algorithms: verificationConfig.algorithms,
    issuer: env.auth.jwtIssuer,
    audience: env.auth.jwtAudience,
    accessTokenBlacklistStore,
  });
  const createShipmentRoleMiddleware = createRoleMiddleware([
    'MOSTRADOR',
    'ADMIN',
  ]);
  const updateShipmentRoleMiddleware = createRoleMiddleware([
    'DESPACHO',
    'ADMIN',
  ]);

  return {
    authController,
    jwksController,
    authMiddleware,
    createShipmentRoleMiddleware,
    updateShipmentRoleMiddleware,
    idempotencyMiddleware,
    shipmentController,
  };
};
