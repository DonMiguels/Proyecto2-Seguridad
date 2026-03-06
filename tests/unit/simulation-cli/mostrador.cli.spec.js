import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '../../../simulation-cli/lib/store.js';
import { handleOption } from '../../../simulation-cli/hosts/mostrador.cli.js';
import {
  createMockCli,
  getLogOutput,
  mockConsoleLog,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Host Mostrador CLI', () => {
  const session = {
    accessToken: 'access-token',
    role: 'MOSTRADOR',
    username: 'mostrador',
  };

  beforeEach(async () => {});

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('debe registrar envío con opción 1', async () => {
    const cli = createMockCli(['Alice', 'Bob', 'Street 1', '2.5']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'createShipment').mockResolvedValue({
      envio: { codigo_tracking: 'TRK-001' },
    });

    await handleOption('1', cli, session);

    expect(store.createShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'access-token',
        payload: expect.objectContaining({
          remitente: 'Alice',
          destinatario: 'Bob',
          direccion_destino: 'Street 1',
          peso: '2.5',
        }),
      })
    );
    expect(getLogOutput(logSpy)).toContain('Envío registrado');
  });

  it('debe consultar tracking con opción 2', async () => {
    const cli = createMockCli(['TRK-XYZ']);
    const logSpy = mockConsoleLog();
    vi.spyOn(store, 'getShipmentByTracking').mockResolvedValue({
      envio: {
        codigo_tracking: 'TRK-XYZ',
        estado: 'REGISTRADO',
        remitente: 'Alice',
        destinatario: 'Bob',
      },
    });

    await handleOption('2', cli, session);

    expect(getLogOutput(logSpy)).toContain('TRK-XYZ');
    expect(getLogOutput(logSpy)).toContain('REGISTRADO');
  });

  it('debe responder opción inválida', async () => {
    const cli = createMockCli();
    const logSpy = mockConsoleLog();

    await handleOption('999', cli, session);

    expect(getLogOutput(logSpy)).toContain('Opción inválida');
  });
});
