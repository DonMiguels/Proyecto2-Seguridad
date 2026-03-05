import { appendJsonArray, dataFile, readJson, writeJson } from '../lib/store.js';
import { createCli, nowIso, randomCode } from '../lib/cli.js';
import { pathToFileURL } from 'node:url';

const ticketsFile = () => dataFile('tickets.json');
const eventsFile = () => dataFile('events.json');

function createDefaultCli() {
  return createCli('Host Atención al Cliente');
}

export async function registrarIncidencia(cliInstance) {
  const cliente = await cliInstance.ask('Cliente: ');
  const detalle = await cliInstance.ask('Detalle de la incidencia: ');

  const ticket = {
    id: randomCode('TCK'),
    cliente,
    detalle,
    estado: 'ABIERTO',
    at: nowIso(),
  };

  await appendJsonArray(ticketsFile(), ticket);
  await appendJsonArray(eventsFile(), {
    type: 'ticket.created',
    source: 'atencion-cliente',
    ticketId: ticket.id,
    at: nowIso(),
  });

  console.log(`\n✔ Incidencia registrada: ${ticket.id}\n`);
}

export async function listarAbiertas() {
  const tickets = await readJson(ticketsFile(), []);
  const abiertas = tickets.filter((t) => t.estado === 'ABIERTO');

  console.log('\n--- Incidencias abiertas ---');
  if (abiertas.length === 0) {
    console.log('No hay incidencias abiertas.\n');
    return;
  }

  abiertas.forEach((t) => {
    console.log(`${t.id} | ${t.cliente} | ${t.detalle}`);
  });
  console.log();
}

export async function cerrarIncidencia(cliInstance) {
  const ticketId = await cliInstance.ask('ID de incidencia a cerrar: ');
  const tickets = await readJson(ticketsFile(), []);
  const index = tickets.findIndex((t) => t.id === ticketId);

  if (index < 0) {
    console.log('\n✖ Ticket no encontrado.\n');
    return;
  }

  tickets[index].estado = 'CERRADO';
  tickets[index].closedAt = nowIso();

  await writeJson(ticketsFile(), tickets);
  await appendJsonArray(eventsFile(), {
    type: 'ticket.closed',
    source: 'atencion-cliente',
    ticketId,
    at: nowIso(),
  });

  console.log(`\n✔ Incidencia ${ticketId} cerrada.\n`);
}

export async function handleOption(option, cliInstance) {
  if (option === '1') await registrarIncidencia(cliInstance);
  else if (option === '2') await listarAbiertas();
  else if (option === '3') await cerrarIncidencia(cliInstance);
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
    console.log('1) Registrar incidencia');
    console.log('2) Listar incidencias abiertas');
    console.log('3) Cerrar incidencia');
    console.log('0) Mantener host activo (no salir)\n');

    const option = await cliInstance.ask('Opción: ');
    await handleOption(option, cliInstance);

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
    console.error('Error en host atención al cliente:', error);
    process.exit(1);
  });
}
