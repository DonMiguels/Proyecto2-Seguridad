import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/despacho.cli.js';
import { SHIPMENT_STATUS } from '../../../src/shared/config/shipment-status.config.js';
import {
  createMockCli,
  getLogOutput,
  mockConsoleLog,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Despacho CLI', () => {
  const session = {
    accessToken: 'access-token',
    role: 'DESPACHO',
    username: 'despacho',
  };

  beforeEach(async () => {});

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('debe marcar en tránsito con opción 1', async () => {
    const cli = createMockCli(['TRK-001']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'updateShipmentStatus').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-001',
        estado: SHIPMENT_STATUS.IN_TRANSIT,
      },
    });

    await handleOption('1', cli, session);

    expect(store.updateShipmentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'access-token',
        trackingCode: 'TRK-001',
        status: SHIPMENT_STATUS.IN_TRANSIT,
      })
    );
    expect(getLogOutput(logSpy)).toContain('Estado actualizado');
  });

  it('debe consultar tracking con opción 3', async () => {
    const cli = createMockCli(['TRK-123']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'getShipmentByTracking').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-123',
        estado: SHIPMENT_STATUS.OUT_FOR_DELIVERY,
        remitente: 'Alice',
        destinatario: 'Bob',
      },
    });

    await handleOption('3', cli, session);

    expect(getLogOutput(logSpy)).toContain('TRK-123');
    expect(getLogOutput(logSpy)).toContain(SHIPMENT_STATUS.OUT_FOR_DELIVERY);
  });

  it('debe informar opción inválida', async () => {
    const cli = createMockCli();
    const logSpy = mockConsoleLog();

    await handleOption('999', cli, session);

    expect(getLogOutput(logSpy)).toContain('Opción inválida');
  });

  it('debe rechazar operación sin sesión', async () => {
    const cli = createMockCli();
    const logSpy = mockConsoleLog();

    await handleOption('1', cli, null);

    expect(getLogOutput(logSpy)).toContain('Debe autenticarse');
  });
});
