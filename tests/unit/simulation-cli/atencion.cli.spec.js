import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendJsonArray,
  readJson,
} from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/atencion.cli.js';
import {
  createMockCli,
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Atención CLI', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('debe registrar incidencia con opción 1', async () => {
    const cli = createMockCli(['Cliente QA', 'Paquete no recibido']);
    const logSpy = mockConsoleLog();

    await handleOption('1', cli);

    const tickets = await readJson(`${tempDir}/tickets.json`, []);
    const events = await readJson(`${tempDir}/events.json`, []);

    expect(tickets).toHaveLength(1);
    expect(tickets[0].cliente).toBe('Cliente QA');
    expect(tickets[0].estado).toBe('ABIERTO');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('ticket.created');

    expect(getLogOutput(logSpy)).toContain('Incidencia registrada');
  });

  it('debe cerrar incidencia existente con opción 3', async () => {
    await appendJsonArray(`${tempDir}/tickets.json`, {
      id: 'TCK-001',
      cliente: 'Cliente A',
      detalle: 'Retraso',
      estado: 'ABIERTO',
    });

    const cli = createMockCli(['TCK-001']);
    const logSpy = mockConsoleLog();

    await handleOption('3', cli);

    const tickets = await readJson(`${tempDir}/tickets.json`, []);

    expect(tickets[0].estado).toBe('CERRADO');
    expect(getLogOutput(logSpy)).toContain('cerrada');
  });

  it('debe informar cuando ticket no existe', async () => {
    const cli = createMockCli(['TCK-404']);
    const logSpy = mockConsoleLog();

    await handleOption('3', cli);

    expect(getLogOutput(logSpy)).toContain('Ticket no encontrado');
  });
});
