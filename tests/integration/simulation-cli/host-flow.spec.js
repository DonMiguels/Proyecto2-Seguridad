import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleOption as mostradorHandleOption } from '../../../simulation-cli/hosts/mostrador.cli.js';
import { handleOption as despachoHandleOption } from '../../../simulation-cli/hosts/despacho.cli.js';
import { handleOption as atencionHandleOption } from '../../../simulation-cli/hosts/atencion.cli.js';
import {
  obtenerMetricas,
  verActividadReciente,
} from '../../../simulation-cli/hosts/admin.cli.js';
import {
  createMockCli,
  createSimulationTempDir,
  getLogOutput,
  mockConsoleLog,
  removeSimulationTempDir,
} from '../../helpers/simulation-cli-test.utils.js';

describe('Integración de hosts simulados', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createSimulationTempDir();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeSimulationTempDir(tempDir);
    delete process.env.SIM_DATA_DIR;
  });

  it('Mostrador registra venta y Admin la refleja en métricas', async () => {
    const mostradorCli = createMockCli(['caja_mediana', '180']);

    await mostradorHandleOption('1', mostradorCli);

    const metricas = await obtenerMetricas();

    expect(metricas.ventasTotales).toBe(1);
    expect(metricas.facturacion).toBe(180);
  });

  it('Eventos de distintos hosts aparecen en actividad de Admin', async () => {
    await despachoHandleOption(
      '1',
      createMockCli(['Remitente QA', 'Destino QA'])
    );
    await atencionHandleOption(
      '1',
      createMockCli(['Cliente QA', 'Consulta de estado'])
    );

    const logSpy = mockConsoleLog();

    await verActividadReciente();

    const output = getLogOutput(logSpy);
    expect(output).toContain('shipment.created');
    expect(output).toContain('ticket.created');
  });
});
