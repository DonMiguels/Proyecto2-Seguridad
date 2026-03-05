import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson } from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/despacho.cli.js';
import {
  createMockCli,
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Despacho CLI', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('debe registrar un envío con opción 1', async () => {
    const cli = createMockCli(['Alice', 'Bob']);
    const logSpy = mockConsoleLog();

    await handleOption('1', cli);

    const shipments = await readJson(`${tempDir}/shipments.json`, []);
    const events = await readJson(`${tempDir}/events.json`, []);

    expect(shipments).toHaveLength(1);
    expect(shipments[0].remitente).toBe('Alice');
    expect(shipments[0].destinatario).toBe('Bob');
    expect(shipments[0].estado).toBe('REGISTRADO');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('shipment.created');

    expect(getLogOutput(logSpy)).toContain('Envío registrado');
  });

  it('debe informar error al liberar tracking inexistente', async () => {
    const cli = createMockCli(['TRK-NO-EXISTE']);
    const logSpy = mockConsoleLog();

    await handleOption('2', cli);

    expect(getLogOutput(logSpy)).toContain('No existe ese tracking');
  });

  it('debe informar opción inválida', async () => {
    const cli = createMockCli();
    const logSpy = mockConsoleLog();

    await handleOption('999', cli);

    expect(getLogOutput(logSpy)).toContain('Opción inválida');
  });
});
