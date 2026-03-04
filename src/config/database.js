import pg from 'pg';
import { getEnvironmentConfig } from '../shared/config/env.js';

const { Pool } = pg;
const env = getEnvironmentConfig();

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
});

export default pool;
