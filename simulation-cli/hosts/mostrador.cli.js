import {
  buildIdempotencyKey,
  createShipment,
  getShipmentByTracking,
} from '../lib/store.js';
import { createCli } from '../lib/cli.js';
import {
  authenticateCliUser,
  ensureCliRole,
  printOptionsList,
} from '../lib/auth.js';
import { pathToFileURL } from 'node:url';

const MOSTRADOR_OPTIONS = [
  '1) Registrar envío',
  '2) Consultar tracking',
  '0) Mantener host activo (no salir)',
];

function createDefaultCli() {
  return createCli('Host Mostrador');
}

export async function registrarEnvio(cliInstance, session) {
  const remitente = await cliInstance.ask('Remitente: ');
  const destinatario = await cliInstance.ask('Destinatario: ');
  const direccion_destino = await cliInstance.ask('Dirección destino: ');
  const peso = await cliInstance.ask('Peso (kg): ');

  const result = await createShipment({
    token: session.accessToken,
    idempotencyKey: buildIdempotencyKey(),
    payload: {
      remitente,
      destinatario,
      direccion_destino,
      peso,
    },
  });

  console.log(`\n✔ Envío registrado: ${result.envio.codigo_tracking}\n`);
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
  console.log(`Remitente: ${envio.remitente}`);
  console.log(`Destinatario: ${envio.destinatario}`);
  console.log();
}

export async function handleOption(option, cliInstance, session = null) {
  const canOperate = await ensureCliRole(session, {
    allowedRoles: ['MOSTRADOR', 'ADMIN'],
    actionLabel: 'operar en Host Mostrador',
    hostName: 'mostrador',
  });

  if (!canOperate && option !== '0') {
    return;
  }

  if (option === '1') {
    await registrarEnvio(cliInstance, session);
  } else if (option === '2') {
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
    printOptionsList(MOSTRADOR_OPTIONS);

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
    hostName: 'Host Mostrador',
    allowedRoles: ['MOSTRADOR', 'ADMIN'],
  });

  await runLoop(cliInstance, { session });
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error en host mostrador:', error);
    process.exit(1);
  });
}
