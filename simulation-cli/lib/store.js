import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE_URL =
  process.env.SIM_API_BASE_URL || 'http://backend:3000/api/v1';

const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.SIM_API_TIMEOUT_MS || '10000',
  10
);

const withTimeout = async (promise, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const timeoutPromise = new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout to backend API'));
    }, timeoutMs);

    promise.finally(() => clearTimeout(timeoutId));
  });

  return Promise.race([promise, timeoutPromise]);
};

const buildHeaders = ({ token, idempotencyKey, withJsonBody = false } = {}) => {
  const headers = {
    Accept: 'application/json',
  };

  if (withJsonBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return headers;
};

const parseResponseBody = async (response) => {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return { error: raw };
  }
};

const requestJson = async (path, options = {}) => {
  const response = await withTimeout(
    fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: buildHeaders({
        token: options.token,
        idempotencyKey: options.idempotencyKey,
        withJsonBody: options.body !== undefined,
      }),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  );

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(data.error || `Backend API error (${response.status})`);
  }

  return data;
};

export const buildIdempotencyKey = () => randomUUID();

export async function loginEmployee({ username, password }) {
  return requestJson('/auth/login', {
    method: 'POST',
    body: {
      username,
      password,
    },
  });
}

export async function createShipment({ token, payload, idempotencyKey }) {
  return requestJson('/shipments', {
    method: 'POST',
    token,
    idempotencyKey,
    body: payload,
  });
}

export async function getShipmentByTracking({ trackingCode, token }) {
  return requestJson(`/shipments/${encodeURIComponent(trackingCode)}`, {
    method: 'GET',
    token,
  });
}

export async function updateShipmentStatus({
  token,
  trackingCode,
  status,
  idempotencyKey,
}) {
  return requestJson(`/shipments/${encodeURIComponent(trackingCode)}/status`, {
    method: 'PATCH',
    token,
    idempotencyKey,
    body: {
      estado: status,
    },
  });
}

export async function getAdminMetrics({ token }) {
  return requestJson('/admin/metrics', {
    method: 'GET',
    token,
  });
}

export async function getAdminActivity({ token, limit = 20 }) {
  return requestJson(`/admin/activity?limit=${Math.max(1, Number(limit) || 20)}`, {
    method: 'GET',
    token,
  });
}

// Legacy helpers (tests/backward compatibility). Runtime CLI no longer uses local JSON storage.
export function getDataDir() {
  return process.env.SIM_DATA_DIR || '/sim-data';
}

export function dataFile(name) {
  return path.join(getDataDir(), name);
}

async function ensureDir() {
  await fs.mkdir(getDataDir(), { recursive: true });
}

export async function readJson(filePath, fallback) {
  await ensureDir();

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

export async function writeJson(filePath, value) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

export async function appendJsonArray(filePath, item) {
  const current = await readJson(filePath, []);
  current.push(item);
  await writeJson(filePath, current);
}

export async function updateJsonArray(filePath, updater) {
  const current = await readJson(filePath, []);
  const updated = updater(current);
  await writeJson(filePath, updated);
}
