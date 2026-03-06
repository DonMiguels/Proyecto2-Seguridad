import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

const REQUIRED_ENV_KEYS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'LDAP_URL',
  'LDAP_BASE_DN',
  'LDAP_BIND_DN',
  'LDAP_ROLE_MAPPING',
];

const REQUIRED_SECRET_KEYS = [
  'DB_PASSWORD',
  'JWT_SECRET',
  'LDAP_BIND_PASSWORD',
];

const readSecretFile = (secretFilePath) => {
  try {
    return fs.readFileSync(secretFilePath, 'utf-8').trim();
  } catch (error) {
    throw new Error(
      `Unable to read secret file (${secretFilePath}): ${error.message}`
    );
  }
};

const resolveSecretValue = (env, key) => {
  if (env[key]) {
    return env[key];
  }

  const fileKey = `${key}_FILE`;
  if (env[fileKey]) {
    return readSecretFile(env[fileKey]);
  }

  return undefined;
};

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

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const validateRequiredEnv = (env) => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  const missingSecrets = REQUIRED_SECRET_KEYS.filter(
    (key) => !resolveSecretValue(env, key)
  );

  if (missingKeys.length > 0 || missingSecrets.length > 0) {
    throw new Error(
      `Missing required environment variables/secrets: ${[
        ...missingKeys,
        ...missingSecrets,
      ].join(', ')}`
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
      jwtSecret: resolveSecretValue(env, 'JWT_SECRET'),
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
      ldapServiceAccountPassword: resolveSecretValue(env, 'LDAP_BIND_PASSWORD'),
      ldapRoleMapping: env.LDAP_ROLE_MAPPING || '{}',
      ldapTlsRejectUnauthorized: toBoolean(
        env.LDAP_TLS_REJECT_UNAUTHORIZED,
        true
      ),
    },
    db: {
      host: env.DB_HOST,
      port: toInteger(env.DB_PORT, 5432),
      name: env.DB_NAME,
      user: env.DB_USER,
      password: resolveSecretValue(env, 'DB_PASSWORD'),
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
