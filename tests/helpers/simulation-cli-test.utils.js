import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

export async function createSimulationTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sim-cli-'));
  process.env.SIM_DATA_DIR = dir;
  return dir;
}

export async function removeSimulationTempDir(dir) {
  if (!dir) return;
  await fs.rm(dir, { recursive: true, force: true });
}

export function createMockCli(answers = []) {
  const queue = [...answers];

  return {
    printHeader: vi.fn(),
    ask: vi.fn(async () => queue.shift() ?? ''),
  };
}

export function mockConsoleLog() {
  return vi.spyOn(console, 'log').mockImplementation(() => {});
}

export function getLogOutput(logSpy) {
  return logSpy.mock.calls.flat().join('\n');
}
