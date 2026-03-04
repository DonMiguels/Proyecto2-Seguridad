import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_KEYS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeMultilinePem = (value) => {
  if (!value) {
    return value;
  }

  return value.replace(/\\n/g, '\n');
};

const validateRequiredEnv = (env) => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}`
    );
  }
};

export const getEnvironmentConfig = () => {
  const env = process.env;

  validateRequiredEnv(env);

  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development',
    port: toInteger(env.PORT, 3000),
    auth: {
      jwtAlgorithm: env.JWT_ALGORITHM || 'HS256',
      jwtSecret: env.JWT_SECRET || 'dev-insecure-secret-change-me',
      jwtPrivateKey: normalizeMultilinePem(env.JWT_PRIVATE_KEY),
      jwtPublicKey: normalizeMultilinePem(env.JWT_PUBLIC_KEY),
      jwtIssuer: env.JWT_ISSUER || 'deliveries-api',
      jwtAudience: env.JWT_AUDIENCE || 'deliveries-clients',
      jwtExpiresIn: env.JWT_EXPIRES_IN || '1h',
      jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',
      ldapUrl: env.LDAP_URL || 'ldaps://localhost:636',
      ldapBaseDn: env.LDAP_BASE_DN || 'dc=example,dc=org',
      ldapUserSearchAttribute: env.LDAP_USER_ATTRIBUTE || 'uid',
      ldapServiceAccountDn: env.LDAP_BIND_DN,
      ldapServiceAccountPassword: env.LDAP_BIND_PASSWORD,
      ldapRoleMapping: env.LDAP_ROLE_MAPPING || '{}',
    },
    db: {
      host: env.DB_HOST,
      port: toInteger(env.DB_PORT, 5432),
      name: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },
    redis: {
      url: env.REDIS_URL || 'redis://localhost:6379',
      accessTokenBlacklistTtlSeconds: toInteger(
        env.ACCESS_TOKEN_BLACKLIST_TTL_SECONDS,
        3600
      ),
    },
  });
};
