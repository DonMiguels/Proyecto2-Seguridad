import fs from 'node:fs/promises';
import path from 'node:path';

export function getDataDir() {
  return process.env.SIM_DATA_DIR || '/sim-data';
}

async function ensureDir() {
  await fs.mkdir(getDataDir(), { recursive: true });
}

export function dataFile(name) {
  return path.join(getDataDir(), name);
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
