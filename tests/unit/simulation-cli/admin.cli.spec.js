import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { appendJsonArray } from '../../../simulation-cli/lib/store.js';
import {
  exportarEventosSeguridadCsv,
  handleOption,
  obtenerMetricas,
  verActividadReciente,
  verAutenticacionesFallidas,
  verDenegacionesPorRol,
  verEventosSeguridad,
  verEventosSeguridadPorUsuario,
} from '../../../simulation-cli/hosts/admin.cli.js';
import {
  createMockCli,
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

  it('debe mostrar eventos de seguridad', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authz.denied',
      username: 'john',
      role: 'MOSTRADOR',
      reason: 'forbidden_role',
    });

    const logSpy = mockConsoleLog();

    await verEventosSeguridad();

    expect(getLogOutput(logSpy)).toContain('Eventos de Seguridad');
    expect(getLogOutput(logSpy)).toContain('authz.denied');
    expect(getLogOutput(logSpy)).toContain('john');
  });

  it('debe mostrar solo autenticaciones fallidas', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'john',
      reason: 'invalid_credentials',
    });
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:01.000Z',
      source: 'admin',
      type: 'authn.succeeded',
      username: 'john',
    });

    const logSpy = mockConsoleLog();

    await verAutenticacionesFallidas();

    const output = getLogOutput(logSpy);
    expect(output).toContain('Autenticaciones Fallidas');
    expect(output).toContain('authn.failed');
    expect(output).not.toContain('authn.succeeded');
  });

  it('debe mostrar solo denegaciones por rol', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authz.denied',
      username: 'john',
      role: 'MOSTRADOR',
    });
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:01.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'john',
    });

    const logSpy = mockConsoleLog();

    await verDenegacionesPorRol();

    const output = getLogOutput(logSpy);
    expect(output).toContain('Denegaciones por Rol');
    expect(output).toContain('authz.denied');
    expect(output).not.toContain('authn.failed');
  });

  it('debe filtrar eventos por usuario', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authz.denied',
      username: 'john',
    });
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:01.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'alice',
    });

    const logSpy = mockConsoleLog();

    await verEventosSeguridadPorUsuario('john');

    const output = getLogOutput(logSpy);
    expect(output).toContain('usuario: john');
    expect(output).toContain('john');
    expect(output).not.toContain('alice');
  });

  it('debe manejar opción 6 con input de usuario', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'john',
    });

    const cli = createMockCli(['john']);
    const logSpy = mockConsoleLog();

    await handleOption('6', null, cli);

    expect(getLogOutput(logSpy)).toContain('usuario: john');
  });

  it('debe informar opción inválida', async () => {
    const logSpy = mockConsoleLog();

    await handleOption('xyz');

    expect(getLogOutput(logSpy)).toContain('Opción inválida');
  });

  it('debe exportar eventos de seguridad a CSV (todos)', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'john',
    });

    const result = await exportarEventosSeguridadCsv('todos');

    expect(result.count).toBe(1);
    expect(result.path).toContain('security-events-export-todos-');
    const csv = await fs.readFile(result.path, 'utf-8');
    expect(csv).toContain('at,source,type,username,role,reason,action');
    expect(csv).toContain('authn.failed');
    expect(csv).toContain('john');
  });

  it('debe manejar opción 7 y exportar por filtro fallidos', async () => {
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:00.000Z',
      source: 'admin',
      type: 'authn.failed',
      username: 'john',
    });
    await appendJsonArray(`${tempDir}/security-events.json`, {
      at: '2026-01-01T00:00:01.000Z',
      source: 'admin',
      type: 'authz.denied',
      username: 'alice',
    });

    const cli = createMockCli(['fallidos']);
    const logSpy = mockConsoleLog();

    await handleOption('7', null, cli);

    const output = getLogOutput(logSpy);
    expect(output).toContain('Exportación CSV');
    expect(output).toContain('Registros exportados: 1');
  });
});
