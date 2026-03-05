import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendJsonArray } from '../../../simulation-cli/lib/store.js';
import {
  handleOption,
  obtenerMetricas,
  verActividadReciente,
} from '../../../simulation-cli/hosts/admin.cli.js';
import {
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Admin CLI', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('debe calcular métricas globales', async () => {
    await appendJsonArray(`${tempDir}/shipments.json`, { estado: 'LIBERADO' });
    await appendJsonArray(`${tempDir}/shipments.json`, {
      estado: 'REGISTRADO',
    });
    await appendJsonArray(`${tempDir}/sales.json`, { precio: 100 });
    await appendJsonArray(`${tempDir}/sales.json`, { precio: 50 });
    await appendJsonArray(`${tempDir}/tickets.json`, { estado: 'ABIERTO' });

    const metricas = await obtenerMetricas();

    expect(metricas.enviosTotales).toBe(2);
    expect(metricas.enviosLiberados).toBe(1);
    expect(metricas.ventasTotales).toBe(2);
    expect(metricas.facturacion).toBe(150);
    expect(metricas.incidenciasAbiertas).toBe(1);
  });

  it('debe mostrar actividad reciente', async () => {
    await appendJsonArray(`${tempDir}/events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'mostrador',
      type: 'sale.created',
    });

    const logSpy = mockConsoleLog();

    await verActividadReciente();

    expect(getLogOutput(logSpy)).toContain('Actividad Reciente');
    expect(getLogOutput(logSpy)).toContain('sale.created');
  });

  it('debe informar opción inválida', async () => {
    const logSpy = mockConsoleLog();

    await handleOption('xyz');

    expect(getLogOutput(logSpy)).toContain('Opción inválida');
  });
});
