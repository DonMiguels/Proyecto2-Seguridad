import {
  appendJsonArray,
  buildIdempotencyKey,
  dataFile,
  getShipmentByTracking,
  readJson,
  updateShipmentStatus,
  writeJson,
} from '../lib/store.js';
import { createCli, nowIso, randomCode } from '../lib/cli.js';
import {
  authenticateCliUser,
  ensureCliRole,
  printOptionsList,
} from '../lib/auth.js';
import { pathToFileURL } from 'node:url';

const ATENCION_OPTIONS = [
  '1) Consultar tracking',
  '2) Marcar entregado',
  '3) Cancelar envío',
  '0) Mantener host activo (no salir)',
];

function createDefaultCli() {
  return createCli('Host Atención al Cliente');
}

export async function consultarTracking(cliInstance, session) {
  if (!session?.accessToken) {
    const cliente = await cliInstance.ask('Cliente: ');
    const detalle = await cliInstance.ask('Detalle de la incidencia: ');
    const ticket = {
      id: randomCode('TCK'),
      cliente,
      detalle,
      estado: 'ABIERTO',
      at: nowIso(),
    };

    await appendJsonArray(dataFile('tickets.json'), ticket);
    await appendJsonArray(dataFile('events.json'), {
      type: 'ticket.created',
      source: 'atencion-cliente',
      ticketId: ticket.id,
      at: nowIso(),
    });

    console.log(`\n✔ Incidencia registrada: ${ticket.id}\n`);
    return;
  }

  const trackingCode = await cliInstance.ask('Código tracking: ');
  const result = await getShipmentByTracking({
    trackingCode,
    token: session.accessToken,
  });

  const envio = result.envio;
  console.log('\n--- Envío ---');
  console.log(`Tracking: ${envio.codigo_tracking}`);
  console.log(`Estado: ${envio.estado}`);
  console.log(`Destino: ${envio.direccion_destino}`);
  console.log();
}

export async function actualizarEstado(cliInstance, session, status) {
  if (!session?.accessToken) {
    const ticketId = await cliInstance.ask('ID de incidencia a cerrar: ');
    const ticketsPath = dataFile('tickets.json');
    const tickets = await readJson(ticketsPath, []);
    const index = tickets.findIndex((item) => item.id === ticketId);

    if (index < 0) {
      console.log('\n✖ Ticket no encontrado.\n');
      return;
    }

    tickets[index].estado = 'CERRADO';
    tickets[index].closedAt = nowIso();
    await writeJson(ticketsPath, tickets);
    await appendJsonArray(dataFile('events.json'), {
      type: 'ticket.closed',
      source: 'atencion-cliente',
      ticketId,
      at: nowIso(),
    });

    console.log(`\n✔ Incidencia ${ticketId} cerrada.\n`);
    return;
  }

  const trackingCode = await cliInstance.ask('Tracking: ');
  const result = await updateShipmentStatus({
    token: session.accessToken,
    trackingCode,
    status,
    idempotencyKey: buildIdempotencyKey(),
  });

  console.log(
    `\n✔ Estado actualizado: ${result.envio.codigo_tracking} -> ${result.envio.estado}\n`
  );
}

export async function handleOption(option, cliInstance, session = null) {
  const canOperate = await ensureCliRole(session, {
    allowedRoles: ['ATENCION', 'ADMIN'],
    actionLabel: 'operar en Host Atención',
    hostName: 'atencion',
  });

  if (!canOperate && option !== '0') {
    return;
  }

  if (option === '1') {
    await consultarTracking(cliInstance, session);
  } else if (option === '2') {
    if (!session?.accessToken) {
      const tickets = await readJson(dataFile('tickets.json'), []);

      console.log('\n--- Incidencias abiertas ---');
      const abiertas = tickets.filter((item) => item.estado === 'ABIERTO');
      if (abiertas.length === 0) {
        console.log('No hay incidencias abiertas.\n');
        return;
      }

      abiertas.forEach((ticket) => {
        console.log(`${ticket.id} | ${ticket.cliente} | ${ticket.detalle}`);
      });
      console.log();
    } else {
      await actualizarEstado(cliInstance, session, 'ENTREGADO');
    }
  } else if (option === '3') {
    if (!session?.accessToken) {
      await actualizarEstado(cliInstance, session, 'CERRADO');
    } else {
      await actualizarEstado(cliInstance, session, 'CANCELADO');
    }
  } else if (option === '0') {
    console.log('\nHost en espera. Use Ctrl+p, Ctrl+q para desacoplarse.\n');
  } else {
    console.log('\nOpción inválida.\n');
  }
}

export async function runLoop(
  cliInstance = createDefaultCli(),
  { iterations = Infinity, session = null } = {}
) {
  let executed = 0;

  while (executed < iterations) {
    cliInstance.printHeader();
    if (session) {
      console.log(`Usuario autenticado: ${session.username} (${session.role})`);
    }
    printOptionsList(ATENCION_OPTIONS);

    const option = await cliInstance.ask('Opción: ');
    try {
      await handleOption(option, cliInstance, session);
    } catch (error) {
      console.log(`\n✖ Error de operación: ${error.message}\n`);
    }

    await cliInstance.ask('Presione Enter para continuar...');
    executed += 1;
  }
}

async function main() {
  process.on('SIGINT', () => {
    console.log('\nUse Ctrl+p, Ctrl+q para desacoplarse sin detener el host.');
  });

  const cliInstance = createDefaultCli();
  const session = await authenticateCliUser(cliInstance, {
    hostName: 'Host Atención al Cliente',
    allowedRoles: ['ATENCION', 'ADMIN'],
  });

  await runLoop(cliInstance, { session });
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
