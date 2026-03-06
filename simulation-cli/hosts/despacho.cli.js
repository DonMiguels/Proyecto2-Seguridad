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

function createDefaultCli() {
  return createCli('Host Despacho');
}

const DESPACHO_OPTIONS = [
  '1) Marcar en tránsito',
  '2) Marcar en reparto',
  '3) Consultar tracking',
  '0) Mantener host activo (no salir)',
];

export async function cambiarEstado(cliInstance, session, status) {
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

export async function consultarTracking(cliInstance, session) {
  const trackingCode = await cliInstance.ask('Código tracking: ');
  const result = await getShipmentByTracking({
    trackingCode,
    token: session.accessToken,
  });

  const envio = result.envio;
  console.log('\n--- Envío ---');
  console.log(`${envio.codigo_tracking} | ${envio.estado}`);
  console.log(`${envio.remitente} -> ${envio.destinatario}`);
  console.log();
}

export async function handleOption(option, cliInstance, session = null) {
  const canOperate = await ensureCliRole(session, {
    allowedRoles: ['DESPACHO', 'ADMIN'],
    actionLabel: 'operar en Host Despacho',
    hostName: 'despacho',
  });

  if (!canOperate && option !== '0') {
    return;
  }

  if (option === '1') {
    await cambiarEstado(cliInstance, session, 'EN_TRANSITO');
  } else if (option === '2') {
    await cambiarEstado(cliInstance, session, 'EN_REPARTO');
  } else if (option === '3') {
    await consultarTracking(cliInstance, session);
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
    printOptionsList(DESPACHO_OPTIONS);

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
    hostName: 'Host Despacho',
    allowedRoles: ['DESPACHO', 'ADMIN'],
  });

  await runLoop(cliInstance, { session });
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error en host despacho:', error);
    process.exit(1);
  });
}
