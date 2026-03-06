import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { appendJsonArray } from '../../../simulation-cli/lib/store.js';
import * as store from '../../../simulation-cli/lib/store.js';
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
  const session = {
    accessToken: 'access-token',
    role: 'ADMIN',
    username: 'admin',
  };

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('debe calcular métricas globales', async () => {
    vi.spyOn(store, 'getAdminMetrics').mockResolvedValue({
      metricas: {
        total: 2,
        registrado: 1,
        enTransito: 1,
        enReparto: 0,
        entregado: 0,
        cancelado: 0,
      },
    });

    const metricas = await obtenerMetricas(session);

    expect(metricas.metricas.total).toBe(2);
    expect(store.getAdminMetrics).toHaveBeenCalledWith({
      token: 'access-token',
    });
  });

  it('debe mostrar actividad reciente', async () => {
    vi.spyOn(store, 'getAdminActivity').mockResolvedValue({
      actividad: [
        {
          fecha_creacion: '2026-01-01T00:00:00.000Z',
          usuario_id: 'admin',
          accion: 'UPDATE_SHIPMENT_STATUS',
          entidad_id: 'TRK-001',
        },
      ],
    });

    const logSpy = mockConsoleLog();

    await verActividadReciente(session);

    expect(getLogOutput(logSpy)).toContain('Actividad Reciente');
    expect(getLogOutput(logSpy)).toContain('UPDATE_SHIPMENT_STATUS');
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

    await handleOption('6', session, cli);

    expect(getLogOutput(logSpy)).toContain('usuario: john');
  });

  it('debe informar opción inválida', async () => {
    const logSpy = mockConsoleLog();

    await handleOption('xyz', session);

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

    await handleOption('7', session, cli);

    const output = getLogOutput(logSpy);
    expect(output).toContain('Exportación CSV');
    expect(output).toContain('Registros exportados: 1');
  });

  it('debe rechazar operación sin sesión', async () => {
    const logSpy = mockConsoleLog();

    await handleOption('1', null, createMockCli());

    expect(getLogOutput(logSpy)).toContain('Debe autenticarse');
  });
});
