import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/atencion.cli.js';
import {
  createMockCli,
  getLogOutput,
  mockConsoleLog,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Atención CLI', () => {
  const session = {
    accessToken: 'access-token',
    role: 'ATENCION',
    username: 'atencion',
  };

  beforeEach(async () => {});

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('debe consultar tracking con opción 1', async () => {
    const cli = createMockCli(['TRK-AT-1']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'getShipmentByTracking').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-AT-1',
        estado: 'EN_TRANSITO',
        direccion_destino: 'Street 123',
      },
    });

    await handleOption('1', cli, session);

    expect(getLogOutput(logSpy)).toContain('TRK-AT-1');
    expect(getLogOutput(logSpy)).toContain('EN_TRANSITO');
  });

  it('debe marcar entregado con opción 2', async () => {
    const cli = createMockCli(['TRK-AT-2']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'updateShipmentStatus').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-AT-2',
        estado: 'ENTREGADO',
      },
    });

    await handleOption('2', cli, session);

    expect(store.updateShipmentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'access-token',
        trackingCode: 'TRK-AT-2',
        status: 'ENTREGADO',
      })
    );
    expect(getLogOutput(logSpy)).toContain('Estado actualizado');
  });

  it('debe cancelar envío con opción 3', async () => {
    const cli = createMockCli(['TRK-AT-3']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'updateShipmentStatus').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-AT-3',
        estado: 'CANCELADO',
      },
    });

    await handleOption('3', cli, session);

    expect(getLogOutput(logSpy)).toContain('CANCELADO');
  });

  it('debe rechazar operación sin sesión', async () => {
    const cli = createMockCli();
    const logSpy = mockConsoleLog();

    await handleOption('1', cli, null);

    expect(getLogOutput(logSpy)).toContain('Debe autenticarse');
  });
});
