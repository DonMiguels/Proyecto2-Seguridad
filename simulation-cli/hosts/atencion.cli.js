import {
  buildIdempotencyKey,
  getShipmentByTracking,
  updateShipmentStatus,
} from '../lib/store.js';
import { createCli } from '../lib/cli.js';
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
    await actualizarEstado(cliInstance, session, 'ENTREGADO');
  } else if (option === '3') {
    await actualizarEstado(cliInstance, session, 'CANCELADO');
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
