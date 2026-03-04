import { beforeEach, describe, expect, it } from 'vitest';
import { getEnvironmentConfig } from '../../../src/shared/config/env.js';

const BASE_ENV = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'deliveries',
  DB_USER: 'postgres',
  DB_PASSWORD: 'secret',
  PORT: '3001',
  NODE_ENV: 'test',
};

describe('Environment config', () => {
  beforeEach(() => {
    process.env.DB_HOST = BASE_ENV.DB_HOST;
    process.env.DB_PORT = BASE_ENV.DB_PORT;
    process.env.DB_NAME = BASE_ENV.DB_NAME;
    process.env.DB_USER = BASE_ENV.DB_USER;
    process.env.DB_PASSWORD = BASE_ENV.DB_PASSWORD;
    process.env.PORT = BASE_ENV.PORT;
    process.env.NODE_ENV = BASE_ENV.NODE_ENV;
  });

  it('should parse and return normalized environment config', () => {
    const config = getEnvironmentConfig();

    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('test');
    expect(config.db.port).toBe(5432);
    expect(config.db.host).toBe('localhost');
  });

  it('should fail when a required env variable is missing', () => {
    delete process.env.DB_HOST;

    expect(() => getEnvironmentConfig()).toThrow(
      'Missing required environment variables: DB_HOST'
    );
  });
});
