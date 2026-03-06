import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '../../../simulation-cli/lib/store.js';
import { handleOption as mostradorHandleOption } from '../../../simulation-cli/hosts/mostrador.cli.js';
import { handleOption as despachoHandleOption } from '../../../simulation-cli/hosts/despacho.cli.js';
import { handleOption as atencionHandleOption } from '../../../simulation-cli/hosts/atencion.cli.js';
import {
  obtenerMetricas,
  verActividadReciente,
} from '../../../simulation-cli/hosts/admin.cli.js';
import { SHIPMENT_STATUS } from '../../../src/shared/config/shipment-status.config.js';
import {
  createMockCli,
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Integración de hosts simulados', () => {
  let tempDir;
  const mostradorSession = {
    accessToken: 'token-mostrador',
    role: 'MOSTRADOR',
    username: 'mostrador',
  };
  const despachoSession = {
    accessToken: 'token-despacho',
    role: 'DESPACHO',
    username: 'despacho',
  };
  const atencionSession = {
    accessToken: 'token-atencion',
    role: 'ATENCION',
    username: 'atencion',
  };
  const adminSession = {
    accessToken: 'token-admin',
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

  it('Mostrador registra envío y Admin consulta métricas', async () => {
    const mostradorCli = createMockCli(['Alice', 'Bob', 'Street 1', '2']);
    vi.spyOn(store, 'createShipment').mockResolvedValue({
      envio: { codigo_tracking: 'TRK-1001' },
    });
    vi.spyOn(store, 'getAdminMetrics').mockResolvedValue({
      metricas: {
        total: 1,
        registrado: 1,
        enTransito: 0,
        enReparto: 0,
        entregado: 0,
        cancelado: 0,
      },
    });

    await mostradorHandleOption('1', mostradorCli, mostradorSession);

    const metricas = await obtenerMetricas(adminSession);

    expect(metricas.metricas.total).toBe(1);
  });

  it('Operaciones de distintos hosts aparecen en actividad de Admin', async () => {
    vi.spyOn(store, 'updateShipmentStatus').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-2001',
        estado: SHIPMENT_STATUS.IN_TRANSIT,
      },
    });
    vi.spyOn(store, 'getShipmentByTracking').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-2001',
        estado: SHIPMENT_STATUS.IN_TRANSIT,
        direccion_destino: 'Street 2',
      },
    });
    vi.spyOn(store, 'getAdminActivity').mockResolvedValue({
      actividad: [
        {
          fecha_creacion: '2026-01-01T00:00:00.000Z',
          usuario_id: 'despacho',
          accion: 'UPDATE_SHIPMENT_STATUS',
          entidad_id: 'TRK-2001',
        },
        {
          fecha_creacion: '2026-01-01T00:00:10.000Z',
          usuario_id: 'atencion',
          accion: 'GET_SHIPMENT_BY_TRACKING',
          entidad_id: 'TRK-2001',
        },
      ],
    });

    await despachoHandleOption(
      '1',
      createMockCli(['TRK-2001']),
      despachoSession
    );
    await atencionHandleOption(
      '1',
      createMockCli(['TRK-2001']),
      atencionSession
    );

    const logSpy = mockConsoleLog();

    await verActividadReciente(adminSession);

    const output = getLogOutput(logSpy);
    expect(output).toContain('UPDATE_SHIPMENT_STATUS');
    expect(output).toContain('GET_SHIPMENT_BY_TRACKING');
  });
});
