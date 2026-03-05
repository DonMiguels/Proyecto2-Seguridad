import { dataFile, readJson } from '../lib/store.js';
import { createCli } from '../lib/cli.js';
import { pathToFileURL } from 'node:url';

const shipmentsFile = () => dataFile('shipments.json');
const salesFile = () => dataFile('sales.json');
const ticketsFile = () => dataFile('tickets.json');
const eventsFile = () => dataFile('events.json');

function createDefaultCli() {
  return createCli('Host Admin Dashboard');
}

export async function obtenerMetricas() {
  const [shipments, sales, tickets] = await Promise.all([
    readJson(shipmentsFile(), []),
    readJson(salesFile(), []),
    readJson(ticketsFile(), []),
  ]);

  const abiertas = tickets.filter((t) => t.estado === 'ABIERTO').length;
  const liberados = shipments.filter((s) => s.estado === 'LIBERADO').length;
  const facturacion = sales.reduce(
    (acc, sale) => acc + Number(sale.precio || 0),
    0
  );

  return {
    enviosTotales: shipments.length,
    enviosLiberados: liberados,
    ventasTotales: sales.length,
    facturacion,
    incidenciasAbiertas: abiertas,
  };
}

export async function verMetricas() {
  const metricas = await obtenerMetricas();

  console.log('\n=== Métricas Globales ===');
  console.log(`Envíos totales: ${metricas.enviosTotales}`);
  console.log(`Envíos liberados: ${metricas.enviosLiberados}`);
  console.log(`Ventas totales: ${metricas.ventasTotales}`);
  console.log(`Facturación simulada: $${metricas.facturacion}`);
  console.log(`Incidencias abiertas: ${metricas.incidenciasAbiertas}\n`);
}

export async function verActividadReciente() {
  const events = await readJson(eventsFile(), []);

  console.log('\n=== Actividad Reciente ===');
  if (events.length === 0) {
    console.log('Sin actividad registrada aún.\n');
    return;
  }

  events.slice(-20).forEach((event) => {
    console.log(`${event.at} | ${event.source} | ${event.type}`);
  });
  console.log();
}

export async function handleOption(option) {
  if (option === '1') await verMetricas();
  else if (option === '2') await verActividadReciente();
  else if (option === '0') {
    console.log('\nHost en espera. Use Ctrl+p, Ctrl+q para desacoplarse.\n');
  } else {
    console.log('\nOpción inválida.\n');
  }
}

export async function runLoop(
  cliInstance = createDefaultCli(),
  { iterations = Infinity } = {}
) {
  let executed = 0;

  while (executed < iterations) {
    cliInstance.printHeader();
    console.log('1) Ver métricas globales');
    console.log('2) Ver actividad reciente');
    console.log('0) Mantener host activo (no salir)\n');

    const option = await cliInstance.ask('Opción: ');
    await handleOption(option);

    await cliInstance.ask('Presione Enter para continuar...');
    executed += 1;
  }
}

async function main() {
  process.on('SIGINT', () => {
    console.log('\nUse Ctrl+p, Ctrl+q para desacoplarse sin detener el host.');
  });

  await runLoop();
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error en host admin:', error);
    process.exit(1);
  });
}
