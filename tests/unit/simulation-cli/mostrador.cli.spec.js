import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson } from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/mostrador.cli.js';
import {
  createMockCli,
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Mostrador CLI', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('debe registrar una venta con opción 1', async () => {
    const cli = createMockCli(['sobre', '120']);
    const logSpy = mockConsoleLog();

    await handleOption('1', cli);

    const sales = await readJson(`${tempDir}/sales.json`, []);
    const events = await readJson(`${tempDir}/events.json`, []);

    expect(sales).toHaveLength(1);
    expect(sales[0].producto).toBe('sobre');
    expect(sales[0].precio).toBe(120);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('sale.created');

    expect(getLogOutput(logSpy)).toContain('Venta registrada');
  });

  it('debe rechazar precio inválido', async () => {
    const cli = createMockCli(['sobre', 'abc']);
    const logSpy = mockConsoleLog();

    await handleOption('1', cli);

    expect(getLogOutput(logSpy)).toContain('Precio inválido');
  });

  it('debe responder cuando el artículo no existe', async () => {
    const cli = createMockCli(['producto_que_no_existe']);
    const logSpy = mockConsoleLog();

    await handleOption('2', cli);

    expect(getLogOutput(logSpy)).toContain('Artículo no encontrado');
  });
});
